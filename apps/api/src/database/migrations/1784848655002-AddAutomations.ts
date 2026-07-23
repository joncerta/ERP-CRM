import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAutomations1784848655002 implements MigrationInterface {
    name = 'AddAutomations1784848655002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "crm_leads" ADD "last_stale_reminder_at" TIMESTAMP WITH TIME ZONE`);

        await queryRunner.query(`CREATE TYPE "public"."automation_rules_type_enum" AS ENUM('lead_stale_reminder', 'auto_assign_lead')`);
        await queryRunner.query(`CREATE TABLE "automation_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "type" "public"."automation_rules_type_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "config" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_automation_rules" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_automation_rules_tenant" ON "automation_rules"  ("tenant_id") `);

        await queryRunner.query(`CREATE TYPE "public"."webhook_subscriptions_event_type_enum" AS ENUM('lead.created', 'quote.accepted', 'opportunity.won', 'invoice.overdue')`);
        await queryRunner.query(`CREATE TABLE "webhook_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "event_type" "public"."webhook_subscriptions_event_type_enum" NOT NULL, "url" character varying NOT NULL, "secret" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "last_triggered_at" TIMESTAMP WITH TIME ZONE, "last_status" character varying, CONSTRAINT "PK_webhook_subscriptions" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_webhook_subscriptions_tenant" ON "webhook_subscriptions"  ("tenant_id") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('automation', 'Automatizaciones y reportes', 'Reglas on/off, webhooks salientes y reportes por vendedor/cliente/campaña con forecast', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'automation'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_webhook_subscriptions_tenant"`);
        await queryRunner.query(`DROP TABLE "webhook_subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."webhook_subscriptions_event_type_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_automation_rules_tenant"`);
        await queryRunner.query(`DROP TABLE "automation_rules"`);
        await queryRunner.query(`DROP TYPE "public"."automation_rules_type_enum"`);

        await queryRunner.query(`ALTER TABLE "crm_leads" DROP COLUMN "last_stale_reminder_at"`);
    }

}
