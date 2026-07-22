import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTenantLogo1784758755671 implements MigrationInterface {
    name = 'AddTenantLogo1784758755671'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" ADD "branding_logo_data" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "branding_logo_data"`);
    }

}
