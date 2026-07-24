import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAi1784899000000 implements MigrationInterface {
    name = 'AddAi1784899000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('ai', 'IA', 'Redacción asistida (seguimientos, respuestas, descripciones), resúmenes de clientes y del pipeline, priorización de leads, y un asistente interno de preguntas sobre los datos del tenant', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'ai'`);
    }

}
