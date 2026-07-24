import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocuments1784855900000 implements MigrationInterface {
    name = 'AddDocuments1784855900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "crm_quotes" ADD "signed_by_name" character varying`);

        await queryRunner.query(`CREATE TYPE "public"."documents_category_enum" AS ENUM('contract', 'presentation', 'photo', 'other')`);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "category" "public"."documents_category_enum" NOT NULL DEFAULT 'other', "mime_type" character varying NOT NULL, "file_data" text NOT NULL, "file_size" integer NOT NULL, "company_id" uuid, "contact_id" uuid, "opportunity_id" uuid, "uploaded_by_user_id" uuid NOT NULL, CONSTRAINT "PK_documents" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_documents_tenant" ON "documents"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_documents_company" ON "documents"  ("company_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_documents_contact" ON "documents"  ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_documents_opportunity" ON "documents"  ("opportunity_id") `);

        await queryRunner.query(`CREATE TYPE "public"."communication_log_entries_channel_enum" AS ENUM('email', 'whatsapp', 'call', 'sms')`);
        await queryRunner.query(`CREATE TYPE "public"."communication_log_entries_direction_enum" AS ENUM('inbound', 'outbound')`);
        await queryRunner.query(`CREATE TABLE "communication_log_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "contact_id" uuid NOT NULL, "channel" "public"."communication_log_entries_channel_enum" NOT NULL, "direction" "public"."communication_log_entries_direction_enum" NOT NULL, "summary" text NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "logged_by_user_id" uuid, CONSTRAINT "PK_communication_log_entries" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_communication_log_entries_tenant" ON "communication_log_entries"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_communication_log_entries_contact" ON "communication_log_entries"  ("contact_id") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('documents', 'Documentos y comunicaciones', 'Archivos adjuntos por empresa/contacto/oportunidad y bitácora unificada de comunicaciones por contacto', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'documents'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_communication_log_entries_contact"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_communication_log_entries_tenant"`);
        await queryRunner.query(`DROP TABLE "communication_log_entries"`);
        await queryRunner.query(`DROP TYPE "public"."communication_log_entries_direction_enum"`);
        await queryRunner.query(`DROP TYPE "public"."communication_log_entries_channel_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_documents_opportunity"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_documents_contact"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_documents_company"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_documents_tenant"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TYPE "public"."documents_category_enum"`);

        await queryRunner.query(`ALTER TABLE "crm_quotes" DROP COLUMN "signed_by_name"`);
    }

}
