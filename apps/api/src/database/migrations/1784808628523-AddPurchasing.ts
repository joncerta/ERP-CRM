import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchasing1784808628523 implements MigrationInterface {
    name = 'AddPurchasing1784808628523'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "finance_suppliers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "tax_id" character varying, "email" character varying, "phone" character varying, "address" character varying, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_finance_suppliers" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_suppliers_tenant" ON "finance_suppliers"  ("tenant_id") `);

        await queryRunner.query(`CREATE TYPE "public"."finance_purchase_orders_status_enum" AS ENUM('draft', 'sent', 'partially_received', 'received', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "finance_purchase_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_number" character varying NOT NULL, "supplier_id" uuid NOT NULL, "status" "public"."finance_purchase_orders_status_enum" NOT NULL DEFAULT 'draft', "currency_code" character varying(3) NOT NULL DEFAULT 'USD', "subtotal" numeric(14,2) NOT NULL DEFAULT '0', "tax" numeric(14,2) NOT NULL DEFAULT '0', "total" numeric(14,2) NOT NULL DEFAULT '0', "expected_date" date, "owner_user_id" uuid NOT NULL, CONSTRAINT "PK_finance_purchase_orders" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_purchase_orders_tenant" ON "finance_purchase_orders"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_purchase_orders_supplier" ON "finance_purchase_orders"  ("supplier_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_purchase_orders_owner" ON "finance_purchase_orders"  ("owner_user_id") `);

        await queryRunner.query(`CREATE TABLE "finance_purchase_order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "purchase_order_id" uuid NOT NULL, "product_id" uuid, "description" character varying NOT NULL, "quantity" numeric(12,2) NOT NULL DEFAULT '1', "quantity_received" numeric(12,2) NOT NULL DEFAULT '0', "unit_cost" numeric(14,2) NOT NULL, "total" numeric(14,2) NOT NULL, CONSTRAINT "PK_finance_purchase_order_items" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "finance_purchase_order_items" ADD CONSTRAINT "FK_finance_purchase_order_items_order" FOREIGN KEY ("purchase_order_id") REFERENCES "finance_purchase_orders"("id") ON DELETE CASCADE`);

        await queryRunner.query(`CREATE TYPE "public"."finance_supplier_invoices_status_enum" AS ENUM('pending', 'partially_paid', 'paid', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "finance_supplier_invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "supplier_id" uuid NOT NULL, "purchase_order_id" uuid, "supplier_invoice_number" character varying NOT NULL, "currency_code" character varying(3) NOT NULL DEFAULT 'USD', "amount" numeric(14,2) NOT NULL, "amount_paid" numeric(14,2) NOT NULL DEFAULT '0', "status" "public"."finance_supplier_invoices_status_enum" NOT NULL DEFAULT 'pending', "issue_date" date NOT NULL, "due_date" date, "owner_user_id" uuid NOT NULL, CONSTRAINT "PK_finance_supplier_invoices" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_supplier_invoices_tenant" ON "finance_supplier_invoices"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_supplier_invoices_supplier" ON "finance_supplier_invoices"  ("supplier_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_supplier_invoices_po" ON "finance_supplier_invoices"  ("purchase_order_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_supplier_invoices_owner" ON "finance_supplier_invoices"  ("owner_user_id") `);

        await queryRunner.query(`CREATE TABLE "finance_supplier_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "supplier_invoice_id" uuid NOT NULL, "amount" numeric(14,2) NOT NULL, "method" character varying, "paid_at" TIMESTAMP WITH TIME ZONE NOT NULL, "note" text, "created_by_user_id" uuid NOT NULL, CONSTRAINT "PK_finance_supplier_payments" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_supplier_payments_tenant" ON "finance_supplier_payments"  ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_supplier_payments_invoice" ON "finance_supplier_payments"  ("supplier_invoice_id") `);

        await queryRunner.query(`
            INSERT INTO "module_definitions" ("code", "name", "description", "is_core")
            VALUES ('purchasing', 'Compras y proveedores', 'Proveedores, órdenes de compra, recepción de mercancía y facturas de proveedor', false)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "module_definitions" WHERE "code" = 'purchasing'`);

        await queryRunner.query(`DROP INDEX "public"."IDX_finance_supplier_payments_invoice"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_supplier_payments_tenant"`);
        await queryRunner.query(`DROP TABLE "finance_supplier_payments"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_finance_supplier_invoices_owner"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_supplier_invoices_po"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_supplier_invoices_supplier"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_supplier_invoices_tenant"`);
        await queryRunner.query(`DROP TABLE "finance_supplier_invoices"`);
        await queryRunner.query(`DROP TYPE "public"."finance_supplier_invoices_status_enum"`);

        await queryRunner.query(`ALTER TABLE "finance_purchase_order_items" DROP CONSTRAINT "FK_finance_purchase_order_items_order"`);
        await queryRunner.query(`DROP TABLE "finance_purchase_order_items"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_finance_purchase_orders_owner"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_purchase_orders_supplier"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_finance_purchase_orders_tenant"`);
        await queryRunner.query(`DROP TABLE "finance_purchase_orders"`);
        await queryRunner.query(`DROP TYPE "public"."finance_purchase_orders_status_enum"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_finance_suppliers_tenant"`);
        await queryRunner.query(`DROP TABLE "finance_suppliers"`);
    }

}
