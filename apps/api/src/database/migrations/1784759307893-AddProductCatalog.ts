import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductCatalog1784759307893 implements MigrationInterface {
    name = 'AddProductCatalog1784759307893'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inventory_product_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, CONSTRAINT "PK_inv_prod_categories" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_inv_prod_categories_tenant" ON "inventory_product_categories"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_inv_prod_categories_tenant_name" ON "inventory_product_categories"  ("tenant_id", "name") `);

        await queryRunner.query(`CREATE TABLE "inventory_product_units" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, CONSTRAINT "PK_inv_prod_units" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_inv_prod_units_tenant" ON "inventory_product_units"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_inv_prod_units_tenant_name" ON "inventory_product_units"  ("tenant_id", "name") `);

        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "category_id" uuid`);
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "unit_id" uuid`);

        // Backfill: turn every distinct free-text category/unit already on a
        // product into a catalog row, then point the product at it — existing
        // data survives the move to a dropdown-driven catalog instead of
        // silently disappearing.
        await queryRunner.query(`
            INSERT INTO "inventory_product_categories" ("tenant_id", "name")
            SELECT DISTINCT "tenant_id", "category" FROM "inventory_products" WHERE "category" IS NOT NULL
        `);
        await queryRunner.query(`
            UPDATE "inventory_products" p
            SET "category_id" = c."id"
            FROM "inventory_product_categories" c
            WHERE c."tenant_id" = p."tenant_id" AND c."name" = p."category"
        `);

        await queryRunner.query(`
            INSERT INTO "inventory_product_units" ("tenant_id", "name")
            SELECT DISTINCT "tenant_id", "unit" FROM "inventory_products"
        `);
        await queryRunner.query(`
            UPDATE "inventory_products" p
            SET "unit_id" = u."id"
            FROM "inventory_product_units" u
            WHERE u."tenant_id" = p."tenant_id" AND u."name" = p."unit"
        `);

        await queryRunner.query(`ALTER TABLE "inventory_products" ALTER COLUMN "unit_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "category"`);
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "unit"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "unit" character varying NOT NULL DEFAULT 'unidad'`);
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "category" character varying`);

        await queryRunner.query(`
            UPDATE "inventory_products" p
            SET "category" = c."name"
            FROM "inventory_product_categories" c
            WHERE c."id" = p."category_id"
        `);
        await queryRunner.query(`
            UPDATE "inventory_products" p
            SET "unit" = u."name"
            FROM "inventory_product_units" u
            WHERE u."id" = p."unit_id"
        `);

        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "unit_id"`);
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "category_id"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_inv_prod_units_tenant_name"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_inv_prod_units_tenant"`);
        await queryRunner.query(`DROP TABLE "inventory_product_units"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_inv_prod_categories_tenant_name"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_inv_prod_categories_tenant"`);
        await queryRunner.query(`DROP TABLE "inventory_product_categories"`);
    }

}
