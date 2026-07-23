import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerService1784835134560 implements MigrationInterface {
    name = 'AddCustomerService1784835134560'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."support_tickets_status_enum" AS ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')`);
        await queryRunner.query(`CREATE TYPE "public"."support_tickets_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TABLE "support_tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "ticket_number" character varying NOT NULL, "subject" character varying NOT NULL, "description" text NOT NULL, "status" "public"."support_tickets_status_enum" NOT NULL DEFAULT 'open', "priority" "public"."support_tickets_priority_enum" NOT NULL DEFAULT 'medium', "contact_id" uuid, "company_id" uuid, "reporter_name" character varying, "reporter_email" character varying, "access_token" character varying NOT NULL, "assigned_to_user_id" uuid, "sla_due_at" TIMESTAMP WITH TIME ZONE, "resolved_at" TIMESTAMP WITH TIME ZONE, "closed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_support_tickets_access_token" UNIQUE ("access_token"), CONSTRAINT "PK_support_tickets" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_support_tickets_tenant" ON "support_tickets"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_support_tickets_contact" ON "support_tickets"  ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_support_tickets_company" ON "support_tickets"  ("company_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_support_tickets_assigned" ON "support_tickets"  ("assigned_to_user_id") `);

        await queryRunner.query(`CREATE TABLE "support_ticket_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "ticket_id" uuid NOT NULL, "author_user_id" uuid, "body" text NOT NULL, "is_internal" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_support_ticket_comments" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_support_ticket_comments_tenant" ON "support_ticket_comments"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_support_ticket_comments_ticket" ON "support_ticket_comments"  ("ticket_id") `);

        await queryRunner.query(`CREATE TABLE "support_knowledge_articles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "slug" character varying NOT NULL, "content" text NOT NULL, "category" character varying, "is_published" boolean NOT NULL DEFAULT false, "view_count" integer NOT NULL DEFAULT 0, "created_by_user_id" uuid NOT NULL, CONSTRAINT "PK_support_knowledge_articles" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_support_knowledge_articles_tenant_slug" ON "support_knowledge_articles"  ("tenant_id", "slug") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('customer_service', 'Servicio al cliente', 'Tickets y PQRS con SLA, base de conocimiento y sugerencias automáticas de artículos', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'customer_service'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_support_knowledge_articles_tenant_slug"`);
        await queryRunner.query(`DROP TABLE "support_knowledge_articles"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_support_ticket_comments_ticket"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_support_ticket_comments_tenant"`);
        await queryRunner.query(`DROP TABLE "support_ticket_comments"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_support_tickets_assigned"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_support_tickets_company"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_support_tickets_contact"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_support_tickets_tenant"`);
        await queryRunner.query(`DROP TABLE "support_tickets"`);
        await queryRunner.query(`DROP TYPE "public"."support_tickets_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."support_tickets_status_enum"`);
    }

}
