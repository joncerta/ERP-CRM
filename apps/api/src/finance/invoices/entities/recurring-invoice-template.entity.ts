import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum RecurrenceFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export interface RecurringInvoiceItemTemplate {
  description: string;
  quantity: number;
  unitPrice: number;
}

/** A reusable "recipe" for a recurring invoice — generating the next
 * invoice is a manual action (POST .../generate), not an automatic cron;
 * this backend has no scheduler installed, so `lastGeneratedAt` and
 * `frequency` are informational for the person deciding when to click it,
 * not enforced server-side. */
@Entity('finance_recurring_invoice_templates')
export class RecurringInvoiceTemplate extends TenantScopedEntity {
  @Column()
  name: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Column({ name: 'currency_code', length: 3, default: 'USD' })
  currencyCode: string;

  @Column({ type: 'enum', enum: RecurrenceFrequency })
  frequency: RecurrenceFrequency;

  @Column({ type: 'jsonb' })
  items: RecurringInvoiceItemTemplate[];

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Index()
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_generated_at', type: 'timestamptz', nullable: true })
  lastGeneratedAt: Date | null;
}
