import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventory1784734784960 implements MigrationInterface {
    name = 'AddInventory1784734784960'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inventory_products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "sku" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "unit" character varying NOT NULL DEFAULT 'unidad', "category" character varying, "cost_price" numeric(14,2) NOT NULL DEFAULT '0', "sale_price" numeric(14,2) NOT NULL DEFAULT '0', "min_stock" numeric(14,2), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_f0025e3643d268bfda5f6cf9028" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_02410d9600ffd11edf0d29e748" ON "inventory_products"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2192ec704c04a05318cd4fd955" ON "inventory_products"  ("tenant_id", "sku") `);
        await queryRunner.query(`CREATE TABLE "inventory_stock_balances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "quantity" numeric(14,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_911754bf080170090d6a25cf862" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_01ff8175ef56dd9b211e412a93" ON "inventory_stock_balances"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97201b1435804722ce02b24a2e" ON "inventory_stock_balances"  ("tenant_id", "product_id", "warehouse_id") `);
        await queryRunner.query(`CREATE TYPE "public"."inventory_stock_movements_type_enum" AS ENUM('purchase', 'sale', 'adjustment', 'transfer')`);
        await queryRunner.query(`CREATE TABLE "inventory_stock_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "type" "public"."inventory_stock_movements_type_enum" NOT NULL, "quantity_delta" numeric(14,2) NOT NULL, "note" text, "transfer_group_id" uuid, "created_by_user_id" uuid NOT NULL, CONSTRAINT "PK_798fae89496e9e99ce4614b7101" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_56528c876762a9bf00cc766a40" ON "inventory_stock_movements"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3d331939433b148b7c27880902" ON "inventory_stock_movements"  ("product_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_07eca6beced72dd91ac36d5807" ON "inventory_stock_movements"  ("warehouse_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c35b8bfbb7cfaef1b6418328e5" ON "inventory_stock_movements"  ("transfer_group_id") `);
        await queryRunner.query(`CREATE TABLE "inventory_warehouses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "address" character varying, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_08f9ba4f704ae669bb91b519a0b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_914e4c8f2ba6d558dbb51f335b" ON "inventory_warehouses"  ("tenant_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_914e4c8f2ba6d558dbb51f335b"`);
        await queryRunner.query(`DROP TABLE "inventory_warehouses"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c35b8bfbb7cfaef1b6418328e5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07eca6beced72dd91ac36d5807"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d331939433b148b7c27880902"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_56528c876762a9bf00cc766a40"`);
        await queryRunner.query(`DROP TABLE "inventory_stock_movements"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_stock_movements_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97201b1435804722ce02b24a2e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_01ff8175ef56dd9b211e412a93"`);
        await queryRunner.query(`DROP TABLE "inventory_stock_balances"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2192ec704c04a05318cd4fd955"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_02410d9600ffd11edf0d29e748"`);
        await queryRunner.query(`DROP TABLE "inventory_products"`);
    }

}
