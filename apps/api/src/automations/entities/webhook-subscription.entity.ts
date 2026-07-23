import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum WebhookEventType {
  LEAD_CREATED = 'lead.created',
  QUOTE_ACCEPTED = 'quote.accepted',
  OPPORTUNITY_WON = 'opportunity.won',
  INVOICE_OVERDUE = 'invoice.overdue',
}

/** A real outbound HTTP call (POST JSON, HMAC-SHA256 signed with `secret`
 * in the X-Webhook-Signature header) — not simulated, unlike SMS/WhatsApp
 * in Marketing, since a plain HTTP POST needs no third-party credentials
 * this project lacks. lastStatus/lastTriggeredAt are for visibility: a
 * webhook endpoint the tenant controls can go down, and that shouldn't be
 * silently invisible. */
@Entity('webhook_subscriptions')
export class WebhookSubscription extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ name: 'event_type', type: 'enum', enum: WebhookEventType })
  eventType: WebhookEventType;

  @Column()
  url: string;

  @Column()
  secret: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_triggered_at', type: 'timestamptz', nullable: true })
  lastTriggeredAt: Date | null;

  @Column({ name: 'last_status', type: 'varchar', nullable: true })
  lastStatus: string | null;
}
