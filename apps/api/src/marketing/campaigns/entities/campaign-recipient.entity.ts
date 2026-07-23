import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum CampaignRecipientStatus {
  PENDING = 'pending',
  SENT = 'sent',
  SIMULATED = 'simulated',
  FAILED = 'failed',
}

@Entity('marketing_campaign_recipients')
export class CampaignRecipient extends TenantScopedEntity {
  @Index()
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @Index()
  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @Column({ type: 'enum', enum: CampaignRecipientStatus, default: CampaignRecipientStatus.PENDING })
  status: CampaignRecipientStatus;

  @Column({ name: 'failure_reason', type: 'varchar', nullable: true })
  failureReason: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;
}
