import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMarketing1784841364139 implements MigrationInterface {
    name = 'AddMarketing1784841364139'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "crm_companies" ADD "employee_count" integer`);

        await queryRunner.query(`CREATE TYPE "public"."marketing_campaigns_channel_enum" AS ENUM('email', 'sms', 'whatsapp')`);
        await queryRunner.query(`CREATE TYPE "public"."marketing_campaigns_status_enum" AS ENUM('draft', 'sent', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "marketing_campaigns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "channel" "public"."marketing_campaigns_channel_enum" NOT NULL, "status" "public"."marketing_campaigns_status_enum" NOT NULL DEFAULT 'draft', "subject" character varying, "content" text NOT NULL, "sent_at" TIMESTAMP WITH TIME ZONE, "created_by_user_id" uuid NOT NULL, CONSTRAINT "PK_marketing_campaigns" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_marketing_campaigns_tenant" ON "marketing_campaigns"  ("tenant_id") `);

        await queryRunner.query(`CREATE TYPE "public"."marketing_campaign_recipients_status_enum" AS ENUM('pending', 'sent', 'simulated', 'failed')`);
        await queryRunner.query(`CREATE TABLE "marketing_campaign_recipients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "campaign_id" uuid NOT NULL, "contact_id" uuid NOT NULL, "status" "public"."marketing_campaign_recipients_status_enum" NOT NULL DEFAULT 'pending', "failure_reason" character varying, "sent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_marketing_campaign_recipients" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_marketing_campaign_recipients_tenant" ON "marketing_campaign_recipients"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_marketing_campaign_recipients_campaign" ON "marketing_campaign_recipients"  ("campaign_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_marketing_campaign_recipients_contact" ON "marketing_campaign_recipients"  ("contact_id") `);

        await queryRunner.query(`CREATE TABLE "marketing_landing_forms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "campaign_name" character varying, "active" boolean NOT NULL DEFAULT true, "submission_count" integer NOT NULL DEFAULT 0, CONSTRAINT "PK_marketing_landing_forms" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_marketing_landing_forms_tenant" ON "marketing_landing_forms"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_marketing_landing_forms_tenant_slug" ON "marketing_landing_forms"  ("tenant_id", "slug") `);

        await queryRunner.query(`CREATE TABLE "marketing_nurture_sequences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "steps" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_marketing_nurture_sequences" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_marketing_nurture_sequences_tenant" ON "marketing_nurture_sequences"  ("tenant_id") `);

        await queryRunner.query(`CREATE TYPE "public"."marketing_nurture_enrollments_status_enum" AS ENUM('active', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "marketing_nurture_enrollments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "sequence_id" uuid NOT NULL, "contact_id" uuid NOT NULL, "status" "public"."marketing_nurture_enrollments_status_enum" NOT NULL DEFAULT 'active', "current_step" integer NOT NULL DEFAULT 0, "next_step_due_at" TIMESTAMP WITH TIME ZONE, "last_step_sent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_marketing_nurture_enrollments" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_marketing_nurture_enrollments_tenant" ON "marketing_nurture_enrollments"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_marketing_nurture_enrollments_sequence" ON "marketing_nurture_enrollments"  ("sequence_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_marketing_nurture_enrollments_contact" ON "marketing_nurture_enrollments"  ("contact_id") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('marketing', 'Marketing', 'Campañas de email/SMS/WhatsApp, formularios de captura de leads, segmentación y secuencias de nutrición', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'marketing'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_marketing_nurture_enrollments_contact"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_marketing_nurture_enrollments_sequence"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_marketing_nurture_enrollments_tenant"`);
        await queryRunner.query(`DROP TABLE "marketing_nurture_enrollments"`);
        await queryRunner.query(`DROP TYPE "public"."marketing_nurture_enrollments_status_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_marketing_nurture_sequences_tenant"`);
        await queryRunner.query(`DROP TABLE "marketing_nurture_sequences"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_marketing_landing_forms_tenant_slug"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_marketing_landing_forms_tenant"`);
        await queryRunner.query(`DROP TABLE "marketing_landing_forms"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_marketing_campaign_recipients_contact"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_marketing_campaign_recipients_campaign"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_marketing_campaign_recipients_tenant"`);
        await queryRunner.query(`DROP TABLE "marketing_campaign_recipients"`);
        await queryRunner.query(`DROP TYPE "public"."marketing_campaign_recipients_status_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_marketing_campaigns_tenant"`);
        await queryRunner.query(`DROP TABLE "marketing_campaigns"`);
        await queryRunner.query(`DROP TYPE "public"."marketing_campaigns_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."marketing_campaigns_channel_enum"`);

        await queryRunner.query(`ALTER TABLE "crm_companies" DROP COLUMN "employee_count"`);
    }

}
