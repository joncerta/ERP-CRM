import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductWarehouse1784759330744 implements MigrationInterface {
    name = 'AddProductWarehouse1784759330744'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_products" ADD "warehouse_id" uuid`);

        // A tenant with existing products but no warehouse yet (shouldn't
        // normally happen, but the column has to be backfillable either way)
        // gets a default "Principal" warehouse created for it here.
        await queryRunner.query(`
            INSERT INTO "inventory_warehouses" ("tenant_id", "name")
            SELECT DISTINCT p."tenant_id", 'Principal'
            FROM "inventory_products" p
            WHERE NOT EXISTS (
                SELECT 1 FROM "inventory_warehouses" w WHERE w."tenant_id" = p."tenant_id"
            )
        `);

        await queryRunner.query(`
            UPDATE "inventory_products" p
            SET "warehouse_id" = w."id"
            FROM (
                SELECT DISTINCT ON ("tenant_id") "tenant_id", "id"
                FROM "inventory_warehouses"
                ORDER BY "tenant_id", "created_at" ASC
            ) w
            WHERE w."tenant_id" = p."tenant_id"
        `);

        await queryRunner.query(`ALTER TABLE "inventory_products" ALTER COLUMN "warehouse_id" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_products" DROP COLUMN "warehouse_id"`);
    }

}
