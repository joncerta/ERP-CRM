import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784653640267 implements MigrationInterface {
    name = 'InitialSchema1784653640267'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "currencies" ("code" character varying(3) NOT NULL, "name" character varying NOT NULL, "symbol" character varying NOT NULL, "decimal_places" integer NOT NULL DEFAULT '2', CONSTRAINT "PK_9f8d0972aeeb5a2277e40332d29" PRIMARY KEY ("code"))`);
        await queryRunner.query(`CREATE TABLE "module_definitions" ("code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "is_core" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_307411da17a374516fe146ab9e1" PRIMARY KEY ("code"))`);
        await queryRunner.query(`CREATE TABLE "tenant_modules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "module_code" character varying NOT NULL, "is_enabled" boolean NOT NULL DEFAULT false, "enabled_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b0d534b6c523b8b1d5e64aa23c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a5b7a4c8027dea979f5f731c52" ON "tenant_modules"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e3a654f95f799f92651228a27c" ON "tenant_modules"  ("tenant_id", "module_code") `);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "is_system" boolean NOT NULL DEFAULT false, "permissions" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e59a01f4fe46ebbece575d9a0f" ON "roles"  ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying NOT NULL, "name" character varying NOT NULL, "default_locale" character varying NOT NULL DEFAULT 'es', "default_currency_code" character varying NOT NULL DEFAULT 'USD', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "full_name" character varying NOT NULL, "role_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "preferred_locale" character varying NOT NULL DEFAULT 'es', CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_109638590074998bb72a2f2cf0" ON "users"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e9f4c2efab52114c4e99e28efb" ON "users"  ("tenant_id", "email") `);
        await queryRunner.query(`CREATE TABLE "crm_companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "tax_id" character varying, "industry" character varying, "phone" character varying, "email" character varying, "address" character varying, "city" character varying, "country" character varying, CONSTRAINT "PK_c1484fa0e0298c578ff62445ce4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_13b39dc992162cf784d57d1f8d" ON "crm_companies"  ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "crm_contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "company_id" uuid, "first_name" character varying NOT NULL, "last_name" character varying, "position" character varying, "email" character varying, "phone" character varying, "whatsapp" character varying, CONSTRAINT "PK_bb46ecfcdfc9e97ef0df2905d14" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_50e8d9417b5c4eb026ca03d3a2" ON "crm_contacts"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_02543fb543c9445acce75c760f" ON "crm_contacts"  ("company_id") `);
        await queryRunner.query(`CREATE TYPE "public"."crm_leads_status_enum" AS ENUM('new', 'contacted', 'qualified', 'disqualified', 'converted')`);
        await queryRunner.query(`CREATE TYPE "public"."crm_leads_priority_enum" AS ENUM('low', 'medium', 'high')`);
        await queryRunner.query(`CREATE TABLE "crm_leads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "company_id" uuid, "contact_id" uuid, "source" character varying, "interest" character varying, "estimated_budget" numeric(14,2), "status" "public"."crm_leads_status_enum" NOT NULL DEFAULT 'new', "priority" "public"."crm_leads_priority_enum" NOT NULL DEFAULT 'medium', "owner_user_id" uuid, CONSTRAINT "PK_023c67e7150b04458c964631db3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d2eb6f7e9dc166bd6b058f2c2f" ON "crm_leads"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2fb6cfd36f0c764736663c351e" ON "crm_leads"  ("company_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_79cda0e21d7baa909307049564" ON "crm_leads"  ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_539f2ccd47a74f829f23da0dea" ON "crm_leads"  ("owner_user_id") `);
        await queryRunner.query(`CREATE TYPE "public"."crm_opportunities_status_enum" AS ENUM('open', 'won', 'lost')`);
        await queryRunner.query(`CREATE TABLE "crm_opportunities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "lead_id" uuid, "company_id" uuid, "contact_id" uuid, "stage_id" uuid NOT NULL, "value" numeric(14,2) NOT NULL DEFAULT '0', "currency_code" character varying(3) NOT NULL DEFAULT 'USD', "probability" integer NOT NULL DEFAULT '0', "expected_close_date" date, "status" "public"."crm_opportunities_status_enum" NOT NULL DEFAULT 'open', "lost_reason" character varying, "owner_user_id" uuid, CONSTRAINT "PK_4c6b908ec71ff04148b38b24861" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bd290848e59dbe7e6fb8c4defd" ON "crm_opportunities"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b377681469985324b92c6aa777" ON "crm_opportunities"  ("lead_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6c738fd0889692507ec2e1215c" ON "crm_opportunities"  ("company_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_64551f52365d880e54c39e40b9" ON "crm_opportunities"  ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_a431e7406a868b0273c9b5c9e9" ON "crm_opportunities"  ("stage_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_11fe3e74cbb7b93edd16e48a30" ON "crm_opportunities"  ("owner_user_id") `);
        await queryRunner.query(`CREATE TABLE "crm_pipeline_stages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "order" integer NOT NULL, "probability" integer NOT NULL DEFAULT '0', "is_won" boolean NOT NULL DEFAULT false, "is_lost" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_dc2b3beb9782796f74d8a91dcf7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7fe506bab414d7df9f9a5c4279" ON "crm_pipeline_stages"  ("tenant_id") `);
        await queryRunner.query(`CREATE TYPE "public"."crm_quote_follow_ups_status_enum" AS ENUM('pending', 'done')`);
        await queryRunner.query(`CREATE TABLE "crm_quote_follow_ups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "quote_id" uuid NOT NULL, "due_at" TIMESTAMP WITH TIME ZONE NOT NULL, "note" character varying, "status" "public"."crm_quote_follow_ups_status_enum" NOT NULL DEFAULT 'pending', "completed_at" TIMESTAMP WITH TIME ZONE, "assigned_to_user_id" uuid NOT NULL, CONSTRAINT "PK_bbaf418b580ea90aaf7908ff821" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8cc445c726b73dc68e246f0fb9" ON "crm_quote_follow_ups"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b64c5e778e2134e17eb477db9e" ON "crm_quote_follow_ups"  ("quote_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ba0407164278cdfb48cc7cd7c5" ON "crm_quote_follow_ups"  ("assigned_to_user_id") `);
        await queryRunner.query(`CREATE TYPE "public"."crm_quotes_status_enum" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')`);
        await queryRunner.query(`CREATE TABLE "crm_quotes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "quote_number" character varying NOT NULL, "opportunity_id" uuid, "company_id" uuid NOT NULL, "contact_id" uuid, "status" "public"."crm_quotes_status_enum" NOT NULL DEFAULT 'draft', "currency_code" character varying(3) NOT NULL DEFAULT 'USD', "subtotal" numeric(14,2) NOT NULL DEFAULT '0', "tax" numeric(14,2) NOT NULL DEFAULT '0', "total" numeric(14,2) NOT NULL DEFAULT '0', "valid_until" date, "sent_at" TIMESTAMP WITH TIME ZONE, "viewed_at" TIMESTAMP WITH TIME ZONE, "view_count" integer NOT NULL DEFAULT '0', "responded_at" TIMESTAMP WITH TIME ZONE, "access_token" character varying NOT NULL, "owner_user_id" uuid NOT NULL, CONSTRAINT "UQ_3ade131e2053003d8f0d1e8d8e9" UNIQUE ("access_token"), CONSTRAINT "PK_4b52a36ced8a8b367667084a521" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2be18e62c554efee2fea420a30" ON "crm_quotes"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b6d117a7fff56e0dd19be930f3" ON "crm_quotes"  ("opportunity_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_43bbbbf397191cbaab53ca2139" ON "crm_quotes"  ("company_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e6dbff2251e55fffc5a38b9011" ON "crm_quotes"  ("contact_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_577a558fa56d2f98a9d8680488" ON "crm_quotes"  ("owner_user_id") `);
        await queryRunner.query(`CREATE TABLE "crm_quote_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quote_id" uuid NOT NULL, "description" character varying NOT NULL, "quantity" numeric(12,2) NOT NULL DEFAULT '1', "unit_price" numeric(14,2) NOT NULL, "total" numeric(14,2) NOT NULL, CONSTRAINT "PK_28008fb01df78079265ff02f5a5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "crm_quote_items" ADD CONSTRAINT "FK_a1a8a5633d8f3d5d9e555d43705" FOREIGN KEY ("quote_id") REFERENCES "crm_quotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "crm_quote_items" DROP CONSTRAINT "FK_a1a8a5633d8f3d5d9e555d43705"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
        await queryRunner.query(`DROP TABLE "crm_quote_items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_577a558fa56d2f98a9d8680488"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e6dbff2251e55fffc5a38b9011"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_43bbbbf397191cbaab53ca2139"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b6d117a7fff56e0dd19be930f3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2be18e62c554efee2fea420a30"`);
        await queryRunner.query(`DROP TABLE "crm_quotes"`);
        await queryRunner.query(`DROP TYPE "public"."crm_quotes_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba0407164278cdfb48cc7cd7c5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b64c5e778e2134e17eb477db9e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8cc445c726b73dc68e246f0fb9"`);
        await queryRunner.query(`DROP TABLE "crm_quote_follow_ups"`);
        await queryRunner.query(`DROP TYPE "public"."crm_quote_follow_ups_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7fe506bab414d7df9f9a5c4279"`);
        await queryRunner.query(`DROP TABLE "crm_pipeline_stages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_11fe3e74cbb7b93edd16e48a30"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a431e7406a868b0273c9b5c9e9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_64551f52365d880e54c39e40b9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6c738fd0889692507ec2e1215c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b377681469985324b92c6aa777"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bd290848e59dbe7e6fb8c4defd"`);
        await queryRunner.query(`DROP TABLE "crm_opportunities"`);
        await queryRunner.query(`DROP TYPE "public"."crm_opportunities_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_539f2ccd47a74f829f23da0dea"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_79cda0e21d7baa909307049564"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2fb6cfd36f0c764736663c351e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d2eb6f7e9dc166bd6b058f2c2f"`);
        await queryRunner.query(`DROP TABLE "crm_leads"`);
        await queryRunner.query(`DROP TYPE "public"."crm_leads_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."crm_leads_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_02543fb543c9445acce75c760f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_50e8d9417b5c4eb026ca03d3a2"`);
        await queryRunner.query(`DROP TABLE "crm_contacts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_13b39dc992162cf784d57d1f8d"`);
        await queryRunner.query(`DROP TABLE "crm_companies"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e9f4c2efab52114c4e99e28efb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_109638590074998bb72a2f2cf0"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e59a01f4fe46ebbece575d9a0f"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3a654f95f799f92651228a27c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a5b7a4c8027dea979f5f731c52"`);
        await queryRunner.query(`DROP TABLE "tenant_modules"`);
        await queryRunner.query(`DROP TABLE "module_definitions"`);
        await queryRunner.query(`DROP TABLE "currencies"`);
    }

}
