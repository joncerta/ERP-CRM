import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoicing1784807603437 implements MigrationInterface {
    name = 'AddInvoicing1784807603437'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."finance_invoices_status_enum" AS ENUM('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "finance_invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "invoice_number" character varying NOT NULL, "company_id" uuid NOT NULL, "contact_id" uuid, "quote_id" uuid, "status" "public"."finance_invoices_status_enum" NOT NULL DEFAULT 'draft', "currency_code" character varying(3) NOT NULL DEFAULT 'USD', "subtotal" numeric(14,2) NOT NULL DEFAULT '0', "tax" numeric(14,2) NOT NULL DEFAULT '0', "total" numeric(14,2) NOT NULL DEFAULT '0', "adjustments_total" numeric(14,2) NOT NULL DEFAULT '0', "amount_paid" numeric(14,2) NOT NULL DEFAULT '0', "issue_date" date NOT NULL, "due_date" date, "reminder_count" integer NOT NULL DEFAULT 0, "owner_user_id" uuid NOT NULL, CONSTRAINT "PK_finance_invoices" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_invoices_tenant" ON "finance_invoices"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_invoices_company" ON "finance_invoices"  ("company_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_invoices_contact" ON "finance_invoices"  ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_invoices_quote" ON "finance_invoices"  ("quote_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_invoices_owner" ON "finance_invoices"  ("owner_user_id") `);

        await queryRunner.query(`CREATE TABLE "finance_invoice_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoice_id" uuid NOT NULL, "description" character varying NOT NULL, "quantity" numeric(12,2) NOT NULL DEFAULT '1', "unit_price" numeric(14,2) NOT NULL, "total" numeric(14,2) NOT NULL, CONSTRAINT "PK_finance_invoice_items" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "finance_invoice_items" ADD CONSTRAINT "FK_finance_invoice_items_invoice" FOREIGN KEY ("invoice_id") REFERENCES "finance_invoices"("id") ON DELETE CASCADE`);

        await queryRunner.query(`CREATE TYPE "public"."finance_invoice_adjustments_type_enum" AS ENUM('credit', 'debit')`);
        await queryRunner.query(`CREATE TABLE "finance_invoice_adjustments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "invoice_id" uuid NOT NULL, "type" "public"."finance_invoice_adjustments_type_enum" NOT NULL, "amount" numeric(14,2) NOT NULL, "reason" text, "created_by_user_id" uuid NOT NULL, CONSTRAINT "PK_finance_invoice_adjustments" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_invoice_adjustments_tenant" ON "finance_invoice_adjustments"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_invoice_adjustments_invoice" ON "finance_invoice_adjustments"  ("invoice_id") `);

        await queryRunner.query(`CREATE TABLE "finance_invoice_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "invoice_id" uuid NOT NULL, "amount" numeric(14,2) NOT NULL, "method" character varying, "paid_at" TIMESTAMP WITH TIME ZONE NOT NULL, "note" text, "created_by_user_id" uuid NOT NULL, CONSTRAINT "PK_finance_invoice_payments" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_invoice_payments_tenant" ON "finance_invoice_payments"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_invoice_payments_invoice" ON "finance_invoice_payments"  ("invoice_id") `);

        await queryRunner.query(`CREATE TYPE "public"."finance_recurring_invoice_templates_frequency_enum" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly')`);
        await queryRunner.query(`CREATE TABLE "finance_recurring_invoice_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "company_id" uuid NOT NULL, "contact_id" uuid, "currency_code" character varying(3) NOT NULL DEFAULT 'USD', "frequency" "public"."finance_recurring_invoice_templates_frequency_enum" NOT NULL, "items" jsonb NOT NULL, "tax_rate" numeric(5,2) NOT NULL DEFAULT '0', "owner_user_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "last_generated_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_finance_recurring_invoice_templates" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_recurring_templates_tenant" ON "finance_recurring_invoice_templates"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_recurring_templates_company" ON "finance_recurring_invoice_templates"  ("company_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_recurring_templates_owner" ON "finance_recurring_invoice_templates"  ("owner_user_id") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('sales_invoicing', 'Facturación', 'Facturas, notas crédito/débito, pagos y facturación recurrente', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'sales_invoicing'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_finance_recurring_templates_owner"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_recurring_templates_company"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_recurring_templates_tenant"`);
        await queryRunner.query(`DROP TABLE "finance_recurring_invoice_templates"`);
        await queryRunner.query(`DROP TYPE "public"."finance_recurring_invoice_templates_frequency_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_finance_invoice_payments_invoice"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_invoice_payments_tenant"`);
        await queryRunner.query(`DROP TABLE "finance_invoice_payments"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_finance_invoice_adjustments_invoice"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_invoice_adjustments_tenant"`);
        await queryRunner.query(`DROP TABLE "finance_invoice_adjustments"`);
        await queryRunner.query(`DROP TYPE "public"."finance_invoice_adjustments_type_enum"`);

        await queryRunner.query(`ALTER TABLE "finance_invoice_items" DROP CONSTRAINT "FK_finance_invoice_items_invoice"`);
        await queryRunner.query(`DROP TABLE "finance_invoice_items"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_finance_invoices_owner"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_invoices_quote"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_invoices_contact"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_invoices_company"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_invoices_tenant"`);
        await queryRunner.query(`DROP TABLE "finance_invoices"`);
        await queryRunner.query(`DROP TYPE "public"."finance_invoices_status_enum"`);
    }

}
