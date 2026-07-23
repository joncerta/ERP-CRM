import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccounting1784810316514 implements MigrationInterface {
    name = 'AddAccounting1784810316514'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."accounting_accounts_type_enum" AS ENUM('asset', 'liability', 'equity', 'income', 'expense')`);
        await queryRunner.query(`CREATE TABLE "accounting_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying NOT NULL, "name" character varying NOT NULL, "type" "public"."accounting_accounts_type_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_accounting_accounts_tenant_code" UNIQUE ("tenant_id", "code"), CONSTRAINT "PK_accounting_accounts" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_accounting_accounts_tenant" ON "accounting_accounts"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_accounting_accounts_code" ON "accounting_accounts"  ("code") `);

        await queryRunner.query(`CREATE TABLE "accounting_journal_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "entry_number" character varying NOT NULL, "date" date NOT NULL, "description" character varying NOT NULL, "source_type" character varying NOT NULL DEFAULT 'manual', "source_id" uuid, "created_by_user_id" uuid NOT NULL, CONSTRAINT "PK_accounting_journal_entries" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_accounting_journal_entries_tenant" ON "accounting_journal_entries"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_accounting_journal_entries_source_type" ON "accounting_journal_entries"  ("source_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_accounting_journal_entries_source_id" ON "accounting_journal_entries"  ("source_id") `);

        await queryRunner.query(`CREATE TABLE "accounting_journal_entry_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "journal_entry_id" uuid NOT NULL, "account_id" uuid NOT NULL, "debit" numeric(14,2) NOT NULL DEFAULT '0', "credit" numeric(14,2) NOT NULL DEFAULT '0', "description" character varying, CONSTRAINT "PK_accounting_journal_entry_lines" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "accounting_journal_entry_lines" ADD CONSTRAINT "FK_accounting_journal_entry_lines_entry" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting_journal_entries"("id") ON DELETE CASCADE`);

        await queryRunner.query(`CREATE TYPE "public"."accounting_cash_accounts_type_enum" AS ENUM('cash', 'bank')`);
        await queryRunner.query(`CREATE TABLE "accounting_cash_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "type" "public"."accounting_cash_accounts_type_enum" NOT NULL DEFAULT 'cash', "account_id" uuid NOT NULL, "currency_code" character varying(3) NOT NULL DEFAULT 'USD', "balance" numeric(14,2) NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_accounting_cash_accounts" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_accounting_cash_accounts_tenant" ON "accounting_cash_accounts"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_accounting_cash_accounts_account" ON "accounting_cash_accounts"  ("account_id") `);

        await queryRunner.query(`CREATE TYPE "public"."accounting_cash_transactions_type_enum" AS ENUM('deposit', 'withdrawal', 'transfer')`);
        await queryRunner.query(`CREATE TABLE "accounting_cash_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "cash_account_id" uuid NOT NULL, "type" "public"."accounting_cash_transactions_type_enum" NOT NULL, "amount" numeric(14,2) NOT NULL, "note" text, "transfer_group_id" uuid, "journal_entry_id" uuid, "created_by_user_id" uuid NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_accounting_cash_transactions" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_accounting_cash_transactions_tenant" ON "accounting_cash_transactions"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_accounting_cash_transactions_cash_account" ON "accounting_cash_transactions"  ("cash_account_id") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('accounting', 'Contabilidad y tesorería', 'Plan de cuentas, asientos contables, caja y bancos, y reportes financieros básicos', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'accounting'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_accounting_cash_transactions_cash_account"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_accounting_cash_transactions_tenant"`);
        await queryRunner.query(`DROP TABLE "accounting_cash_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."accounting_cash_transactions_type_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_accounting_cash_accounts_account"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_accounting_cash_accounts_tenant"`);
        await queryRunner.query(`DROP TABLE "accounting_cash_accounts"`);
        await queryRunner.query(`DROP TYPE "public"."accounting_cash_accounts_type_enum"`);

        await queryRunner.query(`ALTER TABLE "accounting_journal_entry_lines" DROP CONSTRAINT "FK_accounting_journal_entry_lines_entry"`);
        await queryRunner.query(`DROP TABLE "accounting_journal_entry_lines"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_accounting_journal_entries_source_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_accounting_journal_entries_source_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_accounting_journal_entries_tenant"`);
        await queryRunner.query(`DROP TABLE "accounting_journal_entries"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_accounting_accounts_code"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_accounting_accounts_tenant"`);
        await queryRunner.query(`DROP TABLE "accounting_accounts"`);
        await queryRunner.query(`DROP TYPE "public"."accounting_accounts_type_enum"`);
    }

}
