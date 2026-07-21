import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum OpportunityStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
}

@Entity('crm_opportunities')
export class Opportunity extends TenantScopedEntity {
  @Column()
  name: string;

  @Index()
  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @Index()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Index()
  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Index()
  @Column({ name: 'stage_id', type: 'uuid' })
  stageId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  value: number;

  @Column({ name: 'currency_code', length: 3, default: 'USD' })
  currencyCode: string;

  @Column({ default: 0 })
  probability: number;

  @Column({ name: 'expected_close_date', type: 'date', nullable: true })
  expectedCloseDate: string | null;

  @Column({ type: 'enum', enum: OpportunityStatus, default: OpportunityStatus.OPEN })
  status: OpportunityStatus;

  @Column({ name: 'lost_reason', nullable: true })
  lostReason: string;

  @Index()
  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId: string | null;
}
