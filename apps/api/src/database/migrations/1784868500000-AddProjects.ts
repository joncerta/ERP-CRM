import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjects1784868500000 implements MigrationInterface {
    name = 'AddProjects1784868500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."projects_status_enum" AS ENUM('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "company_id" uuid, "leader_user_id" uuid NOT NULL, "description" text, "status" "public"."projects_status_enum" NOT NULL DEFAULT 'planning', "budget" numeric(14,2) NOT NULL DEFAULT 0, "currency_code" character varying(3) NOT NULL DEFAULT 'USD', "start_date" date NOT NULL, "planned_end_date" date, "actual_end_date" date, CONSTRAINT "PK_projects" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_projects_tenant" ON "projects"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_projects_company" ON "projects"  ("company_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_projects_leader" ON "projects"  ("leader_user_id") `);

        await queryRunner.query(`CREATE TYPE "public"."project_milestones_status_enum" AS ENUM('pending', 'completed', 'delayed')`);
        await queryRunner.query(`CREATE TABLE "project_milestones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid NOT NULL, "name" character varying NOT NULL, "due_date" date NOT NULL, "status" "public"."project_milestones_status_enum" NOT NULL DEFAULT 'pending', "completed_at" TIMESTAMP WITH TIME ZONE, "notes" text, CONSTRAINT "PK_project_milestones" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_project_milestones_tenant" ON "project_milestones"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_project_milestones_project" ON "project_milestones"  ("project_id") `);

        await queryRunner.query(`CREATE TABLE "project_resources" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role_label" character varying NOT NULL, "hourly_rate" numeric(12,2) NOT NULL DEFAULT 0, CONSTRAINT "PK_project_resources" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_project_resources_project" ON "project_resources"  ("project_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_project_resources_user" ON "project_resources"  ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_project_resources_tenant_project_user" ON "project_resources"  ("tenant_id", "project_id", "user_id") `);

        await queryRunner.query(`CREATE TABLE "project_time_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid NOT NULL, "resource_id" uuid NOT NULL, "date" date NOT NULL, "hours" numeric(8,2) NOT NULL, "description" text, "cost" numeric(14,2) NOT NULL, CONSTRAINT "PK_project_time_entries" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_project_time_entries_tenant" ON "project_time_entries"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_project_time_entries_project" ON "project_time_entries"  ("project_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_project_time_entries_resource" ON "project_time_entries"  ("resource_id") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('projects', 'Proyectos', 'Etapas, presupuesto y cronograma por proyecto, recursos asignados con registro de horas y costos, y avance/rentabilidad', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'projects'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_project_time_entries_resource"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_time_entries_project"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_time_entries_tenant"`);
        await queryRunner.query(`DROP TABLE "project_time_entries"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_project_resources_tenant_project_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_resources_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_resources_project"`);
        await queryRunner.query(`DROP TABLE "project_resources"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_project_milestones_project"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_project_milestones_tenant"`);
        await queryRunner.query(`DROP TABLE "project_milestones"`);
        await queryRunner.query(`DROP TYPE "public"."project_milestones_status_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_projects_leader"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_projects_company"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_projects_tenant"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);
    }

}
