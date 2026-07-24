import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIntegrations1784905000000 implements MigrationInterface {
    name = 'AddIntegrations1784905000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "key_prefix" character varying NOT NULL, "key_hash" character varying NOT NULL, "scopes" text NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_by_user_id" uuid, "last_used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_api_keys" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_api_keys_tenant" ON "api_keys"  ("tenant_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_api_keys_key_hash" ON "api_keys"  ("key_hash") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('integrations', 'API pública e integraciones', 'Claves de API con alcance por tenant para un subconjunto de endpoints públicos (leads, contactos, facturas). Los webhooks salientes se configuran en Automatizaciones', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'integrations'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_api_keys_key_hash"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_api_keys_tenant"`);
        await queryRunner.query(`DROP TABLE "api_keys"`);
    }

}
