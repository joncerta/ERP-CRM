import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFixedAssets1784811064880 implements MigrationInterface {
    name = 'AddFixedAssets1784811064880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."fixed_assets_status_enum" AS ENUM('active', 'under_maintenance', 'disposed')`);
        await queryRunner.query(`CREATE TABLE "fixed_assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "asset_number" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "purchase_date" date NOT NULL, "purchase_cost" numeric(14,2) NOT NULL, "useful_life_months" integer NOT NULL, "salvage_value" numeric(14,2) NOT NULL DEFAULT '0', "accumulated_depreciation" numeric(14,2) NOT NULL DEFAULT '0', "status" "public"."fixed_assets_status_enum" NOT NULL DEFAULT 'active', "location_branch_id" uuid, "responsible_user_id" uuid, "last_depreciated_period" date, CONSTRAINT "PK_fixed_assets" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fixed_assets_tenant" ON "fixed_assets"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fixed_assets_branch" ON "fixed_assets"  ("location_branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fixed_assets_responsible" ON "fixed_assets"  ("responsible_user_id") `);

        await queryRunner.query(`CREATE TYPE "public"."fixed_asset_movements_type_enum" AS ENUM('maintenance', 'transfer', 'disposal')`);
        await queryRunner.query(`CREATE TABLE "fixed_asset_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "fixed_asset_id" uuid NOT NULL, "type" "public"."fixed_asset_movements_type_enum" NOT NULL, "date" date NOT NULL, "note" text, "cost" numeric(14,2), "from_branch_id" uuid, "to_branch_id" uuid, "created_by_user_id" uuid NOT NULL, CONSTRAINT "PK_fixed_asset_movements" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fixed_asset_movements_tenant" ON "fixed_asset_movements"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fixed_asset_movements_asset" ON "fixed_asset_movements"  ("fixed_asset_id") `);

        await queryRunner.query(`CREATE TABLE "fixed_asset_depreciation_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "fixed_asset_id" uuid NOT NULL, "period" date NOT NULL, "amount" numeric(14,2) NOT NULL, "accumulated_after" numeric(14,2) NOT NULL, CONSTRAINT "PK_fixed_asset_depreciation_entries" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fixed_asset_depreciation_entries_tenant" ON "fixed_asset_depreciation_entries"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fixed_asset_depreciation_entries_asset" ON "fixed_asset_depreciation_entries"  ("fixed_asset_id") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('fixed_assets', 'Activos fijos', 'Registro de activos, depreciación, mantenimiento, traslado y baja', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'fixed_assets'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_fixed_asset_depreciation_entries_asset"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fixed_asset_depreciation_entries_tenant"`);
        await queryRunner.query(`DROP TABLE "fixed_asset_depreciation_entries"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_fixed_asset_movements_asset"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fixed_asset_movements_tenant"`);
        await queryRunner.query(`DROP TABLE "fixed_asset_movements"`);
        await queryRunner.query(`DROP TYPE "public"."fixed_asset_movements_type_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_fixed_assets_responsible"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fixed_assets_branch"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fixed_assets_tenant"`);
        await queryRunner.query(`DROP TABLE "fixed_assets"`);
        await queryRunner.query(`DROP TYPE "public"."fixed_assets_status_enum"`);
    }

}
