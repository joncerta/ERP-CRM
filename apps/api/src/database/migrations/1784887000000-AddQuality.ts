import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuality1784887000000 implements MigrationInterface {
    name = 'AddQuality1784887000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."quality_inspections_type_enum" AS ENUM('incoming', 'in_process', 'final')`);
        await queryRunner.query(`CREATE TYPE "public"."quality_inspections_result_enum" AS ENUM('pass', 'fail', 'conditional')`);
        await queryRunner.query(`CREATE TABLE "quality_inspections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" "public"."quality_inspections_type_enum" NOT NULL, "subject" character varying NOT NULL, "related_production_order_id" uuid, "related_equipment_id" uuid, "inspector_user_id" uuid, "inspection_date" date NOT NULL, "result" "public"."quality_inspections_result_enum" NOT NULL, "notes" text, CONSTRAINT "PK_quality_inspections" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_quality_inspections_tenant" ON "quality_inspections"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_quality_inspections_production_order" ON "quality_inspections"  ("related_production_order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_quality_inspections_equipment" ON "quality_inspections"  ("related_equipment_id") `);

        await queryRunner.query(`CREATE TYPE "public"."quality_audits_type_enum" AS ENUM('internal', 'external')`);
        await queryRunner.query(`CREATE TYPE "public"."quality_audits_status_enum" AS ENUM('planned', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "quality_audits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" "public"."quality_audits_type_enum" NOT NULL, "scope" text NOT NULL, "auditor" character varying NOT NULL, "scheduled_date" date NOT NULL, "status" "public"."quality_audits_status_enum" NOT NULL DEFAULT 'planned', "completed_date" date, "findings" text, CONSTRAINT "PK_quality_audits" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_quality_audits_tenant" ON "quality_audits"  ("tenant_id") `);

        await queryRunner.query(`CREATE TYPE "public"."quality_non_conformities_severity_enum" AS ENUM('minor', 'major', 'critical')`);
        await queryRunner.query(`CREATE TYPE "public"."quality_non_conformities_status_enum" AS ENUM('open', 'in_progress', 'closed')`);
        await queryRunner.query(`CREATE TABLE "quality_non_conformities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "nc_number" character varying NOT NULL, "description" text NOT NULL, "severity" "public"."quality_non_conformities_severity_enum" NOT NULL, "status" "public"."quality_non_conformities_status_enum" NOT NULL DEFAULT 'open', "detected_date" date NOT NULL, "closed_date" date, "inspection_id" uuid, "audit_id" uuid, CONSTRAINT "PK_quality_non_conformities" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_quality_non_conformities_tenant" ON "quality_non_conformities"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_quality_non_conformities_inspection" ON "quality_non_conformities"  ("inspection_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_quality_non_conformities_audit" ON "quality_non_conformities"  ("audit_id") `);

        await queryRunner.query(`CREATE TYPE "public"."quality_corrective_actions_status_enum" AS ENUM('pending', 'in_progress', 'completed')`);
        await queryRunner.query(`CREATE TABLE "quality_corrective_actions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "non_conformity_id" uuid NOT NULL, "description" text NOT NULL, "responsible_user_id" uuid, "due_date" date, "status" "public"."quality_corrective_actions_status_enum" NOT NULL DEFAULT 'pending', "completed_date" date, "completion_notes" text, CONSTRAINT "PK_quality_corrective_actions" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "quality_corrective_actions" ADD CONSTRAINT "FK_quality_corrective_actions_nc" FOREIGN KEY ("non_conformity_id") REFERENCES "quality_non_conformities"("id") ON DELETE CASCADE`);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('quality', 'Calidad', 'Inspecciones, no conformidades con acciones correctivas, auditorías internas/externas e indicadores — complementa Producción y Mantenimiento', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'quality'`);

        await queryRunner.query(`ALTER TABLE "quality_corrective_actions" DROP CONSTRAINT "FK_quality_corrective_actions_nc"`);
        await queryRunner.query(`DROP TABLE "quality_corrective_actions"`);
        await queryRunner.query(`DROP TYPE "public"."quality_corrective_actions_status_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_quality_non_conformities_audit"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_quality_non_conformities_inspection"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_quality_non_conformities_tenant"`);
        await queryRunner.query(`DROP TABLE "quality_non_conformities"`);
        await queryRunner.query(`DROP TYPE "public"."quality_non_conformities_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."quality_non_conformities_severity_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_quality_audits_tenant"`);
        await queryRunner.query(`DROP TABLE "quality_audits"`);
        await queryRunner.query(`DROP TYPE "public"."quality_audits_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."quality_audits_type_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_quality_inspections_equipment"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_quality_inspections_production_order"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_quality_inspections_tenant"`);
        await queryRunner.query(`DROP TABLE "quality_inspections"`);
        await queryRunner.query(`DROP TYPE "public"."quality_inspections_result_enum"`);
        await queryRunner.query(`DROP TYPE "public"."quality_inspections_type_enum"`);
    }

}
