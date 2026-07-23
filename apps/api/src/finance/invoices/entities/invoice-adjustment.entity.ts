import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum InvoiceAdjustmentType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

/** Nota crédito (reduces what's owed) or nota débito (increases it) against
 * an already-issued invoice — the invoice's own lines stay untouched, this
 * is a separate adjustment layered on top. */
@Entity('finance_invoice_adjustments')
export class InvoiceAdjustment extends TenantScopedEntity {
  @Index()
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId: string;

  @Column({ type: 'enum', enum: InvoiceAdjustmentType })
  type: InvoiceAdjustmentType;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string;
}
