import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum QuoteFollowUpStatus {
  PENDING = 'pending',
  DONE = 'done',
}

/**
 * A scheduled reminder to follow up on a quote — the "don't lose sales by
 * forgetting to follow up" pain point. One quote can have several, e.g. a
 * reminder 2 days after sending and another right before it expires.
 */
@Entity('crm_quote_follow_ups')
export class QuoteFollowUp extends TenantScopedEntity {
  @Index()
  @Column({ name: 'quote_id', type: 'uuid' })
  quoteId: string;

  @Column({ name: 'due_at', type: 'timestamptz' })
  dueAt: Date;

  @Column({ nullable: true })
  note: string;

  @Column({ type: 'enum', enum: QuoteFollowUpStatus, default: QuoteFollowUpStatus.PENDING })
  status: QuoteFollowUpStatus;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Index()
  @Column({ name: 'assigned_to_user_id', type: 'uuid' })
  assignedToUserId: string;
}
