import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrgStructure1784769946052 implements MigrationInterface {
    name = 'AddOrgStructure1784769946052'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "org_branches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "code" character varying, "address" character varying, "timezone" character varying, "is_default" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_org_branches" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_org_branches_tenant" ON "org_branches"  ("tenant_id") `);

        await queryRunner.query(`CREATE TABLE "org_cost_centers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "code" character varying, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_org_cost_centers" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_org_cost_centers_tenant" ON "org_cost_centers"  ("tenant_id") `);

        await queryRunner.query(`CREATE TABLE "org_departments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "branch_id" uuid, "cost_center_id" uuid, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_org_departments" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_org_departments_tenant" ON "org_departments"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_org_departments_branch" ON "org_departments"  ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_org_departments_cost_center" ON "org_departments"  ("cost_center_id") `);

        await queryRunner.query(`CREATE TABLE "org_positions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "department_id" uuid, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_org_positions" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_org_positions_tenant" ON "org_positions"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_org_positions_department" ON "org_positions"  ("department_id") `);

        await queryRunner.query(`CREATE TABLE "org_document_series" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "document_type" character varying NOT NULL, "branch_id" uuid, "prefix" character varying NOT NULL, "next_number" integer NOT NULL DEFAULT 1, "padding" integer NOT NULL DEFAULT 6, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_org_document_series" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_org_document_series_tenant" ON "org_document_series"  ("tenant_id") `);
        // Two partial unique indexes instead of one composite: Postgres treats
        // every NULL as distinct in a plain unique index, so a straight
        // (tenant_id, document_type, branch_id) unique constraint would let a
        // tenant accumulate multiple "no branch" default series by accident.
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_org_document_series_default" ON "org_document_series" ("tenant_id", "document_type") WHERE "branch_id" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_org_document_series_branch" ON "org_document_series" ("tenant_id", "document_type", "branch_id") WHERE "branch_id" IS NOT NULL`);

        await queryRunner.query(`ALTER TABLE "users" ADD "manager_id" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ADD "branch_id" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ADD "department_id" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ADD "position_id" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_users_manager" ON "users"  ("manager_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_branch" ON "users"  ("branch_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_department" ON "users"  ("department_id") `);

        await queryRunner.query(`ALTER TABLE "tenants" ADD "timezone" character varying NOT NULL DEFAULT 'America/Bogota'`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "tax_label" character varying`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "tax_rate_percent" numeric(5,2)`);

        // Quote numbering moves from "count existing quotes" to a real
        // sequence (DocumentSeriesService.consumeNext) — backfill each
        // tenant's default "quote" series so numbering continues where its
        // existing quotes left off instead of restarting at COT-000001.
        await queryRunner.query(`
            INSERT INTO "org_document_series" ("tenant_id", "document_type", "branch_id", "prefix", "next_number", "padding")
            SELECT "tenant_id", 'quote', NULL, 'COT', COUNT(*) + 1, 6
            FROM "crm_quotes"
            GROUP BY "tenant_id"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "tax_rate_percent"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "tax_label"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "timezone"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_users_department"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_branch"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_manager"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "position_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "department_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "branch_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "manager_id"`);

        await queryRunner.query(`DROP INDEX "public"."UQ_org_document_series_branch"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_org_document_series_default"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_org_document_series_tenant"`);
        await queryRunner.query(`DROP TABLE "org_document_series"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_org_positions_department"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_org_positions_tenant"`);
        await queryRunner.query(`DROP TABLE "org_positions"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_org_departments_cost_center"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_org_departments_branch"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_org_departments_tenant"`);
        await queryRunner.query(`DROP TABLE "org_departments"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_org_cost_centers_tenant"`);
        await queryRunner.query(`DROP TABLE "org_cost_centers"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_org_branches_tenant"`);
        await queryRunner.query(`DROP TABLE "org_branches"`);
    }

}
