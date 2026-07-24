import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProduction1784875000000 implements MigrationInterface {
    name = 'AddProduction1784875000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "production_boms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "name" character varying NOT NULL, "output_quantity" numeric(12,2) NOT NULL DEFAULT 1, "is_active" boolean NOT NULL DEFAULT true, "notes" text, CONSTRAINT "PK_production_boms" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_production_boms_tenant" ON "production_boms"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_production_boms_product" ON "production_boms"  ("product_id") `);

        await queryRunner.query(`CREATE TABLE "production_bom_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bom_id" uuid NOT NULL, "component_product_id" uuid NOT NULL, "quantity" numeric(12,4) NOT NULL, CONSTRAINT "PK_production_bom_lines" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "production_bom_lines" ADD CONSTRAINT "FK_production_bom_lines_bom" FOREIGN KEY ("bom_id") REFERENCES "production_boms"("id") ON DELETE CASCADE`);

        await queryRunner.query(`CREATE TYPE "public"."production_orders_status_enum" AS ENUM('draft', 'in_progress', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "production_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_number" character varying NOT NULL, "product_id" uuid NOT NULL, "bom_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "quantity_planned" numeric(12,2) NOT NULL, "quantity_produced" numeric(12,2) NOT NULL DEFAULT 0, "status" "public"."production_orders_status_enum" NOT NULL DEFAULT 'draft', "planned_start_date" date, "planned_end_date" date, "actual_start_date" TIMESTAMP WITH TIME ZONE, "actual_end_date" TIMESTAMP WITH TIME ZONE, "total_cost" numeric(14,2) NOT NULL DEFAULT 0, "notes" text, CONSTRAINT "PK_production_orders" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_production_orders_tenant" ON "production_orders"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_production_orders_product" ON "production_orders"  ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_production_orders_bom" ON "production_orders"  ("bom_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_production_orders_warehouse" ON "production_orders"  ("warehouse_id") `);

        await queryRunner.query(`CREATE TABLE "production_order_consumptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" uuid NOT NULL, "component_product_id" uuid NOT NULL, "quantity_consumed" numeric(12,4) NOT NULL, "unit_cost" numeric(14,4) NOT NULL, "total_cost" numeric(14,2) NOT NULL, CONSTRAINT "PK_production_order_consumptions" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_production_order_consumptions_tenant" ON "production_order_consumptions"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_production_order_consumptions_order" ON "production_order_consumptions"  ("order_id") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('production', 'Producción', 'Lista de materiales (BOM), órdenes de producción con consumos y rendimientos, y costeo — solo para clientes que fabrican', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'production'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_production_order_consumptions_order"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_production_order_consumptions_tenant"`);
        await queryRunner.query(`DROP TABLE "production_order_consumptions"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_production_orders_warehouse"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_production_orders_bom"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_production_orders_product"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_production_orders_tenant"`);
        await queryRunner.query(`DROP TABLE "production_orders"`);
        await queryRunner.query(`DROP TYPE "public"."production_orders_status_enum"`);

        await queryRunner.query(`ALTER TABLE "production_bom_lines" DROP CONSTRAINT "FK_production_bom_lines_bom"`);
        await queryRunner.query(`DROP TABLE "production_bom_lines"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_production_boms_product"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_production_boms_tenant"`);
        await queryRunner.query(`DROP TABLE "production_boms"`);
    }

}
