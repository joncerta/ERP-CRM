import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/** Wall-clock SLA targets (no business-hours calendar) — deliberately
 * simple, same "manageable scope" call made throughout this project. */
export const SLA_HOURS_BY_PRIORITY: Record<TicketPriority, number> = {
  [TicketPriority.URGENT]: 4,
  [TicketPriority.HIGH]: 8,
  [TicketPriority.MEDIUM]: 24,
  [TicketPriority.LOW]: 72,
};

@Entity('support_tickets')
export class Ticket extends TenantScopedEntity {
  @Column({ name: 'ticket_number' })
  ticketNumber: string;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Index()
  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Index()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  /** Set when the ticket came in through the public PQRS link rather than
   * from an internal agent creating it on a known contact. */
  @Column({ name: 'reporter_name', type: 'varchar', nullable: true })
  reporterName: string | null;

  @Column({ name: 'reporter_email', type: 'varchar', nullable: true })
  reporterEmail: string | null;

  /** Lets an external reporter check status/reply without an account —
   * same pattern as Quote.accessToken. */
  @Column({ name: 'access_token', unique: true })
  accessToken: string;

  @Index()
  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @Column({ name: 'sla_due_at', type: 'timestamptz', nullable: true })
  slaDueAt: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;
}
