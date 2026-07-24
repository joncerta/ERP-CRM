import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHr1784862000000 implements MigrationInterface {
    name = 'AddHr1784862000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."hr_employees_document_type_enum" AS ENUM('cc', 'ce', 'passport', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."hr_employees_contract_type_enum" AS ENUM('indefinite', 'fixed_term', 'service_provision', 'apprenticeship')`);
        await queryRunner.query(`CREATE TYPE "public"."hr_employees_employment_status_enum" AS ENUM('active', 'on_leave', 'terminated')`);
        await queryRunner.query(`CREATE TABLE "hr_employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "document_type" "public"."hr_employees_document_type_enum" NOT NULL DEFAULT 'cc', "document_id" character varying NOT NULL, "birth_date" date, "address" character varying, "phone" character varying, "emergency_contact_name" character varying, "emergency_contact_phone" character varying, "contract_type" "public"."hr_employees_contract_type_enum" NOT NULL DEFAULT 'indefinite', "base_salary" numeric(14,2) NOT NULL, "hire_date" date NOT NULL, "termination_date" date, "vacation_days_per_year" integer NOT NULL DEFAULT 15, "employment_status" "public"."hr_employees_employment_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_hr_employees" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_hr_employees_tenant" ON "hr_employees"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_hr_employees_user" ON "hr_employees"  ("user_id") `);

        await queryRunner.query(`CREATE TYPE "public"."hr_leave_requests_type_enum" AS ENUM('vacation', 'sick_leave', 'unpaid_leave', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."hr_leave_requests_status_enum" AS ENUM('pending', 'approved', 'rejected', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "hr_leave_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "type" "public"."hr_leave_requests_type_enum" NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "days_requested" integer NOT NULL, "reason" text, "status" "public"."hr_leave_requests_status_enum" NOT NULL DEFAULT 'pending', "reviewed_by_user_id" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "review_note" text, CONSTRAINT "PK_hr_leave_requests" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_hr_leave_requests_tenant" ON "hr_leave_requests"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_hr_leave_requests_employee" ON "hr_leave_requests"  ("employee_id") `);

        await queryRunner.query(`CREATE TYPE "public"."hr_payroll_runs_status_enum" AS ENUM('draft', 'processed')`);
        await queryRunner.query(`CREATE TABLE "hr_payroll_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "period_label" character varying NOT NULL, "period_start" date NOT NULL, "period_end" date NOT NULL, "status" "public"."hr_payroll_runs_status_enum" NOT NULL DEFAULT 'draft', "processed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_hr_payroll_runs" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_hr_payroll_runs_tenant" ON "hr_payroll_runs"  ("tenant_id") `);

        await queryRunner.query(`CREATE TABLE "hr_payroll_run_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "payroll_run_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "base_salary" numeric(14,2) NOT NULL, "overtime_hours" numeric(8,2) NOT NULL DEFAULT 0, "overtime_amount" numeric(14,2) NOT NULL DEFAULT 0, "health_deduction" numeric(14,2) NOT NULL, "pension_deduction" numeric(14,2) NOT NULL, "gross_pay" numeric(14,2) NOT NULL, "net_pay" numeric(14,2) NOT NULL, CONSTRAINT "PK_hr_payroll_run_lines" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_hr_payroll_run_lines_tenant" ON "hr_payroll_run_lines"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_hr_payroll_run_lines_run" ON "hr_payroll_run_lines"  ("payroll_run_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_hr_payroll_run_lines_employee" ON "hr_payroll_run_lines"  ("employee_id") `);

        await queryRunner.query(`CREATE TYPE "public"."hr_performance_reviews_status_enum" AS ENUM('draft', 'submitted')`);
        await queryRunner.query(`CREATE TABLE "hr_performance_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "employee_id" uuid NOT NULL, "reviewer_user_id" uuid NOT NULL, "period_label" character varying NOT NULL, "objectives" jsonb NOT NULL DEFAULT '[]', "competencies" jsonb NOT NULL DEFAULT '[]', "overall_score" numeric(4,2), "status" "public"."hr_performance_reviews_status_enum" NOT NULL DEFAULT 'draft', "submitted_at" TIMESTAMP WITH TIME ZONE, "comments" text, CONSTRAINT "PK_hr_performance_reviews" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_hr_performance_reviews_tenant" ON "hr_performance_reviews"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_hr_performance_reviews_employee" ON "hr_performance_reviews"  ("employee_id") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('hr', 'Recursos humanos y nómina', 'Expedientes de empleados, vacaciones y licencias con aprobación del líder, liquidación de nómina simplificada y evaluaciones de desempeño', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'hr'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_hr_performance_reviews_employee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_hr_performance_reviews_tenant"`);
        await queryRunner.query(`DROP TABLE "hr_performance_reviews"`);
        await queryRunner.query(`DROP TYPE "public"."hr_performance_reviews_status_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_hr_payroll_run_lines_employee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_hr_payroll_run_lines_run"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_hr_payroll_run_lines_tenant"`);
        await queryRunner.query(`DROP TABLE "hr_payroll_run_lines"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_hr_payroll_runs_tenant"`);
        await queryRunner.query(`DROP TABLE "hr_payroll_runs"`);
        await queryRunner.query(`DROP TYPE "public"."hr_payroll_runs_status_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_hr_leave_requests_employee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_hr_leave_requests_tenant"`);
        await queryRunner.query(`DROP TABLE "hr_leave_requests"`);
        await queryRunner.query(`DROP TYPE "public"."hr_leave_requests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."hr_leave_requests_type_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_hr_employees_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_hr_employees_tenant"`);
        await queryRunner.query(`DROP TABLE "hr_employees"`);
        await queryRunner.query(`DROP TYPE "public"."hr_employees_employment_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."hr_employees_contract_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."hr_employees_document_type_enum"`);
    }

}
