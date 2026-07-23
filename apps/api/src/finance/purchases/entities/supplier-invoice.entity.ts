import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum SupplierInvoiceStatus {
  PENDING = 'pending',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

/** The supplier's own invoice number is free text (it's their document,
 * not ours) — unlike Invoice.invoiceNumber, this isn't backed by
 * DocumentSeriesService. */
@Entity('finance_supplier_invoices')
export class SupplierInvoice extends TenantScopedEntity {
  @Index()
  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Index()
  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId: string | null;

  @Column({ name: 'supplier_invoice_number' })
  supplierInvoiceNumber: string;

  @Column({ name: 'currency_code', length: 3, default: 'USD' })
  currencyCode: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'amount_paid', type: 'numeric', precision: 14, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ type: 'enum', enum: SupplierInvoiceStatus, default: SupplierInvoiceStatus.PENDING })
  status: SupplierInvoiceStatus;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Index()
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId: string;
}
