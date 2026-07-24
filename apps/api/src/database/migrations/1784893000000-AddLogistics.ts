import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLogistics1784893000000 implements MigrationInterface {
    name = 'AddLogistics1784893000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."logistics_vehicles_status_enum" AS ENUM('available', 'in_route', 'maintenance', 'out_of_service')`);
        await queryRunner.query(`CREATE TABLE "logistics_vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "plate" character varying NOT NULL, "brand" character varying NOT NULL, "model" character varying NOT NULL, "capacity_kg" numeric(10,2), "status" "public"."logistics_vehicles_status_enum" NOT NULL DEFAULT 'available', "notes" text, CONSTRAINT "PK_logistics_vehicles" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_logistics_vehicles_tenant" ON "logistics_vehicles"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_logistics_vehicles_tenant_plate" ON "logistics_vehicles"  ("tenant_id", "plate") `);

        await queryRunner.query(`CREATE TABLE "logistics_drivers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "license_number" character varying, "phone" character varying, "user_id" uuid, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_logistics_drivers" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_logistics_drivers_tenant" ON "logistics_drivers"  ("tenant_id") `);

        await queryRunner.query(`CREATE TYPE "public"."logistics_delivery_notes_status_enum" AS ENUM('planned', 'in_transit', 'delivered', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "logistics_delivery_notes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "note_number" character varying NOT NULL, "vehicle_id" uuid NOT NULL, "driver_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "related_invoice_id" uuid, "destination_address" text NOT NULL, "recipient_name" character varying, "status" "public"."logistics_delivery_notes_status_enum" NOT NULL DEFAULT 'planned', "dispatched_at" TIMESTAMP WITH TIME ZONE, "delivered_at" TIMESTAMP WITH TIME ZONE, "notes" text, CONSTRAINT "PK_logistics_delivery_notes" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_logistics_delivery_notes_tenant" ON "logistics_delivery_notes"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_logistics_delivery_notes_vehicle" ON "logistics_delivery_notes"  ("vehicle_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_logistics_delivery_notes_driver" ON "logistics_delivery_notes"  ("driver_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_logistics_delivery_notes_invoice" ON "logistics_delivery_notes"  ("related_invoice_id") `);

        await queryRunner.query(`CREATE TABLE "logistics_delivery_note_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "delivery_note_id" uuid NOT NULL, "product_id" uuid NOT NULL, "quantity" numeric(12,4) NOT NULL, CONSTRAINT "PK_logistics_delivery_note_items" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "logistics_delivery_note_items" ADD CONSTRAINT "FK_logistics_delivery_note_items_note" FOREIGN KEY ("delivery_note_id") REFERENCES "logistics_delivery_notes"("id") ON DELETE CASCADE`);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('logistics', 'Logística', 'Flota de vehículos y conductores, guías de entrega con seguimiento por estado y despacho desde bodega — para clientes que distribuyen', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'logistics'`);

        await queryRunner.query(`ALTER TABLE "logistics_delivery_note_items" DROP CONSTRAINT "FK_logistics_delivery_note_items_note"`);
        await queryRunner.query(`DROP TABLE "logistics_delivery_note_items"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_logistics_delivery_notes_invoice"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_logistics_delivery_notes_driver"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_logistics_delivery_notes_vehicle"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_logistics_delivery_notes_tenant"`);
        await queryRunner.query(`DROP TABLE "logistics_delivery_notes"`);
        await queryRunner.query(`DROP TYPE "public"."logistics_delivery_notes_status_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_logistics_drivers_tenant"`);
        await queryRunner.query(`DROP TABLE "logistics_drivers"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_logistics_vehicles_tenant_plate"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_logistics_vehicles_tenant"`);
        await queryRunner.query(`DROP TABLE "logistics_vehicles"`);
        await queryRunner.query(`DROP TYPE "public"."logistics_vehicles_status_enum"`);
    }

}
