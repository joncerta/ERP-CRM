import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLogs1784767558796 implements MigrationInterface {
    name = 'AddAuditLogs1784767558796'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "entity_type" character varying NOT NULL, "entity_id" uuid, "action" character varying NOT NULL, "actor_user_id" uuid, "changes" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_tenant_created" ON "audit_logs"  ("tenant_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_tenant_entity" ON "audit_logs"  ("tenant_id", "entity_type", "entity_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_tenant_entity"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_tenant_created"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
    }

}
