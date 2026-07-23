import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLeadCampaignAndQuoteVersions1784771096848 implements MigrationInterface {
    name = 'AddLeadCampaignAndQuoteVersions1784771096848'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "crm_leads" ADD "campaign" character varying`);

        await queryRunner.query(`ALTER TABLE "crm_quotes" ADD "version" integer NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "crm_quotes" ADD "previous_version_id" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_crm_quotes_previous_version" ON "crm_quotes"  ("previous_version_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_crm_quotes_previous_version"`);
        await queryRunner.query(`ALTER TABLE "crm_quotes" DROP COLUMN "previous_version_id"`);
        await queryRunner.query(`ALTER TABLE "crm_quotes" DROP COLUMN "version"`);

        await queryRunner.query(`ALTER TABLE "crm_leads" DROP COLUMN "campaign"`);
    }

}
