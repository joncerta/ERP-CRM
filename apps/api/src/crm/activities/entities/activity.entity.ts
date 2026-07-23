import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum ActivityType {
  CALL = 'call',
  MEETING = 'meeting',
  EMAIL = 'email',
  NOTE = 'note',
  VISIT = 'visit',
  TASK = 'task',
}

/** A logged (or scheduled) piece of commercial activity — call, meeting,
 * visit, task, note — attached to a contact, lead and/or opportunity.
 * Nothing here is tied to a quote, unlike QuoteFollowUp. */
@Entity('crm_activities')
export class Activity extends TenantScopedEntity {
  @Column({ type: 'enum', enum: ActivityType })
  type: ActivityType;

  @Column()
  subject: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Index()
  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Index()
  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @Index()
  @Column({ name: 'opportunity_id', type: 'uuid', nullable: true })
  opportunityId: string | null;

  @Index()
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId: string;

  /** When it's planned for — meetings, visits, tasks with a due date. Null for a note/call logged after the fact. */
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  /** Set once the activity actually happened / the task is done. */
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  outcome: string | null;

  @Column({ name: 'next_action', type: 'text', nullable: true })
  nextAction: string | null;
}
