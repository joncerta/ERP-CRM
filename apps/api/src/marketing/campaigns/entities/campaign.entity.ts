import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum CampaignChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  CANCELLED = 'cancelled',
}

@Entity('marketing_campaigns')
export class Campaign extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: CampaignChannel })
  channel: CampaignChannel;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  /** Only meaningful for the email channel — SMS/WhatsApp messages don't
   * have a separate subject line. */
  @Column({ type: 'varchar', nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string;
}
