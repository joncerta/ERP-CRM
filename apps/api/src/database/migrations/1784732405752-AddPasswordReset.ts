import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordReset1784732405752 implements MigrationInterface {
    name = 'AddPasswordReset1784732405752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "password_reset_token" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password_reset_expires_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE INDEX "IDX_c0d176bcc1665dc7cb60482c81" ON "users"  ("password_reset_token") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c0d176bcc1665dc7cb60482c81"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_reset_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_reset_token"`);
    }

}
