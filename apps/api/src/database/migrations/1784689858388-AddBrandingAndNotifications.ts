import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandingAndNotifications1784689858388 implements MigrationInterface {
    name = 'AddBrandingAndNotifications1784689858388'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "link" character varying, "is_read" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d93ddd7e1b890535ecafbb334e" ON "notifications"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9a8a82462cab47c73d25f49261" ON "notifications"  ("user_id") `);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "branding_primary_color" character varying`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "branding_secondary_color" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "branding_secondary_color"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "branding_primary_color"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9a8a82462cab47c73d25f49261"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d93ddd7e1b890535ecafbb334e"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
    }

}
