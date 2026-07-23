import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';
import { InvoiceItem } from './invoice-item.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity('finance_invoices')
export class Invoice extends TenantScopedEntity {
  @Column({ name: 'invoice_number' })
  invoiceNumber: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Index()
  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  /** The quote this invoice was converted from, if any. */
  @Index()
  @Column({ name: 'quote_id', type: 'uuid', nullable: true })
  quoteId: string | null;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ name: 'currency_code', length: 3, default: 'USD' })
  currencyCode: string;

  /** Which catalog tax (core.taxes) was applied, if any — its rate at
   * creation time is what actually got baked into `tax`/`total` below. */
  @Index()
  @Column({ name: 'tax_id', type: 'uuid', nullable: true })
  taxId: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  total: number;

  /** Net effect of credit/debit notes — credit notes subtract, debit notes add. */
  @Column({ name: 'adjustments_total', type: 'numeric', precision: 14, scale: 2, default: 0 })
  adjustmentsTotal: number;

  @Column({ name: 'amount_paid', type: 'numeric', precision: 14, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  /** How many collection reminders have gone out — the next one escalates in tone. */
  @Column({ name: 'reminder_count', default: 0 })
  reminderCount: number;

  @Index()
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true, eager: true })
  items: InvoiceItem[];
}
