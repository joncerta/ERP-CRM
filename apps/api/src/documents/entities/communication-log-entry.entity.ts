import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum CommunicationChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  CALL = 'call',
  SMS = 'sms',
}

export enum CommunicationDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

/** The "unified inbox" per contact — a logged timeline, not a live-syncing
 * inbox. Outbound emails this project actually sends (quotes, campaigns)
 * get logged here automatically via logAutomatic(); everything else
 * (calls, WhatsApp, SMS, and any inbound message) is logged manually by
 * whoever handled it — same as an Activity note. Real inbound sync would
 * need IMAP/Gmail API, the WhatsApp Business API, and an SMS gateway
 * (Twilio et al.), none of which this project has credentials for. */
@Entity('communication_log_entries')
export class CommunicationLogEntry extends TenantScopedEntity {
  @Index()
  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @Column({ type: 'enum', enum: CommunicationChannel })
  channel: CommunicationChannel;

  @Column({ type: 'enum', enum: CommunicationDirection })
  direction: CommunicationDirection;

  @Column({ type: 'text' })
  summary: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  /** Null for entries the system logged automatically (e.g. an outbound
   * campaign email) rather than a person typing it in. */
  @Column({ name: 'logged_by_user_id', type: 'uuid', nullable: true })
  loggedByUserId: string | null;
}
