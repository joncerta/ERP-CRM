import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum CashTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
}

/** A transfer between two cash accounts posts two rows sharing the same
 * transferGroupId (one withdrawal-side, one deposit-side) — the same
 * pattern StockMovement uses for warehouse-to-warehouse transfers. */
@Entity('accounting_cash_transactions')
export class CashTransaction extends TenantScopedEntity {
  @Index()
  @Column({ name: 'cash_account_id', type: 'uuid' })
  cashAccountId: string;

  @Column({ type: 'enum', enum: CashTransactionType })
  type: CashTransactionType;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'transfer_group_id', type: 'uuid', nullable: true })
  transferGroupId: string | null;

  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
  journalEntryId: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;
}
