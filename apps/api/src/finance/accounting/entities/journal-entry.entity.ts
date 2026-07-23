import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';
import { JournalEntryLine } from './journal-entry-line.entity';

/** Free-form (not an enum) so new automatic sources can be added later
 * without a migration — 'manual', 'invoice', 'invoice_payment',
 * 'supplier_invoice', 'supplier_payment', 'cash_transaction'. */
export type JournalEntrySourceType = string;

@Entity('accounting_journal_entries')
export class JournalEntry extends TenantScopedEntity {
  @Column({ name: 'entry_number' })
  entryNumber: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  description: string;

  @Index()
  @Column({ name: 'source_type', default: 'manual' })
  sourceType: JournalEntrySourceType;

  @Index()
  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string;

  @OneToMany(() => JournalEntryLine, (line) => line.journalEntry, { cascade: true, eager: true })
  lines: JournalEntryLine[];
}
