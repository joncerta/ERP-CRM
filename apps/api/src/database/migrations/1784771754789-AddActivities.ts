import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActivities1784771754789 implements MigrationInterface {
    name = 'AddActivities1784771754789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."crm_activities_type_enum" AS ENUM('call', 'meeting', 'email', 'note', 'visit', 'task')`);
        await queryRunner.query(`CREATE TABLE "crm_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" "public"."crm_activities_type_enum" NOT NULL, "subject" character varying NOT NULL, "notes" text, "contact_id" uuid, "lead_id" uuid, "opportunity_id" uuid, "owner_user_id" uuid NOT NULL, "scheduled_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "outcome" text, "next_action" text, CONSTRAINT "PK_crm_activities" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_activities_tenant" ON "crm_activities"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_crm_activities_contact" ON "crm_activities"  ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_crm_activities_lead" ON "crm_activities"  ("lead_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_crm_activities_opportunity" ON "crm_activities"  ("opportunity_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_crm_activities_owner" ON "crm_activities"  ("owner_user_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_crm_activities_owner"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_crm_activities_opportunity"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_crm_activities_lead"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_crm_activities_contact"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_crm_activities_tenant"`);
        await queryRunner.query(`DROP TABLE "crm_activities"`);
        await queryRunner.query(`DROP TYPE "public"."crm_activities_type_enum"`);
    }

}
