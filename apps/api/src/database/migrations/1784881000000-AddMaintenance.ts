import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMaintenance1784881000000 implements MigrationInterface {
    name = 'AddMaintenance1784881000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."maintenance_equipment_status_enum" AS ENUM('operational', 'under_maintenance', 'out_of_service')`);
        await queryRunner.query(`CREATE TABLE "maintenance_equipment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "code" character varying NOT NULL, "category" character varying NOT NULL, "location" character varying, "status" "public"."maintenance_equipment_status_enum" NOT NULL DEFAULT 'operational', "acquisition_date" date, "notes" text, CONSTRAINT "PK_maintenance_equipment" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_maintenance_equipment_tenant" ON "maintenance_equipment"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_maintenance_equipment_tenant_code" ON "maintenance_equipment"  ("tenant_id", "code") `);

        await queryRunner.query(`CREATE TABLE "maintenance_technicians" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "phone" character varying, "email" character varying, "specialty" character varying, "user_id" uuid, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_maintenance_technicians" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_maintenance_technicians_tenant" ON "maintenance_technicians"  ("tenant_id") `);

        await queryRunner.query(`CREATE TYPE "public"."maintenance_work_orders_type_enum" AS ENUM('preventive', 'corrective')`);
        await queryRunner.query(`CREATE TYPE "public"."maintenance_work_orders_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TYPE "public"."maintenance_work_orders_status_enum" AS ENUM('open', 'in_progress', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "maintenance_work_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_number" character varying NOT NULL, "equipment_id" uuid NOT NULL, "technician_id" uuid, "warehouse_id" uuid NOT NULL, "type" "public"."maintenance_work_orders_type_enum" NOT NULL, "priority" "public"."maintenance_work_orders_priority_enum" NOT NULL DEFAULT 'medium', "status" "public"."maintenance_work_orders_status_enum" NOT NULL DEFAULT 'open', "scheduled_date" date, "started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "description" text NOT NULL, "resolution_notes" text, "total_parts_cost" numeric(14,2) NOT NULL DEFAULT 0, CONSTRAINT "PK_maintenance_work_orders" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_maintenance_work_orders_tenant" ON "maintenance_work_orders"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_maintenance_work_orders_equipment" ON "maintenance_work_orders"  ("equipment_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_maintenance_work_orders_technician" ON "maintenance_work_orders"  ("technician_id") `);

        await queryRunner.query(`CREATE TABLE "maintenance_work_order_parts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "work_order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "quantity" numeric(12,4) NOT NULL, CONSTRAINT "PK_maintenance_work_order_parts" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "maintenance_work_order_parts" ADD CONSTRAINT "FK_maintenance_work_order_parts_order" FOREIGN KEY ("work_order_id") REFERENCES "maintenance_work_orders"("id") ON DELETE CASCADE`);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('maintenance', 'Mantenimiento', 'Registro de equipos y técnicos, órdenes de trabajo preventivas/correctivas con repuestos, e historial por equipo', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'maintenance'`);

        await queryRunner.query(`ALTER TABLE "maintenance_work_order_parts" DROP CONSTRAINT "FK_maintenance_work_order_parts_order"`);
        await queryRunner.query(`DROP TABLE "maintenance_work_order_parts"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_work_orders_technician"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_work_orders_equipment"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_work_orders_tenant"`);
        await queryRunner.query(`DROP TABLE "maintenance_work_orders"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_work_orders_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_work_orders_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_work_orders_type_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_technicians_tenant"`);
        await queryRunner.query(`DROP TABLE "maintenance_technicians"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_equipment_tenant_code"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_equipment_tenant"`);
        await queryRunner.query(`DROP TABLE "maintenance_equipment"`);
        await queryRunner.query(`DROP TYPE "public"."maintenance_equipment_status_enum"`);
    }

}
