import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('support_ticket_comments')
export class TicketComment extends TenantScopedEntity {
  @Index()
  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  /** Null means the comment came from the reporter via the public link. */
  @Column({ name: 'author_user_id', type: 'uuid', nullable: true })
  authorUserId: string | null;

  @Column({ type: 'text' })
  body: string;

  /** Internal notes are never shown on the public tracking page. */
  @Column({ name: 'is_internal', default: false })
  isInternal: boolean;
}
