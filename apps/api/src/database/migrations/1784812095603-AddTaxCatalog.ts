import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaxCatalog1784812095603 implements MigrationInterface {
    name = 'AddTaxCatalog1784812095603'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "core_taxes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "rate" numeric(5,2) NOT NULL, "is_default" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_core_taxes" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_core_taxes_tenant_name" ON "core_taxes"  ("tenant_id", "name") `);

        await queryRunner.query(`ALTER TABLE "crm_quotes" ADD "tax_id" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_quotes_tax" ON "crm_quotes"  ("tax_id") `);

        await queryRunner.query(`ALTER TABLE "finance_invoices" ADD "tax_id" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_invoices_tax" ON "finance_invoices"  ("tax_id") `);

        // Replaced by the core_taxes catalog — a tenant can now have several
        // taxes instead of a single default label/rate pair.
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "tax_label"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "tax_rate_percent"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" ADD "tax_rate_percent" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "tax_label" character varying`);

        await queryRunner.query(`DROP INDEX "public"."IDX_finance_invoices_tax"`);
        await queryRunner.query(`ALTER TABLE "finance_invoices" DROP COLUMN "tax_id"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_crm_quotes_tax"`);
        await queryRunner.query(`ALTER TABLE "crm_quotes" DROP COLUMN "tax_id"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_core_taxes_tenant_name"`);
        await queryRunner.query(`DROP TABLE "core_taxes"`);
    }

}
