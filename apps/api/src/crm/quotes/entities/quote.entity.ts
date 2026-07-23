import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';
import { QuoteItem } from './quote-item.entity';

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('crm_quotes')
export class Quote extends TenantScopedEntity {
  @Column({ name: 'quote_number' })
  quoteNumber: string;

  @Index()
  @Column({ name: 'opportunity_id', type: 'uuid', nullable: true })
  opportunityId: string | null;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Index()
  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @Column({ name: 'currency_code', length: 3, default: 'USD' })
  currencyCode: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'viewed_at', type: 'timestamptz', nullable: true })
  viewedAt: Date | null;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @Column({ name: 'access_token', unique: true })
  accessToken: string; // used for the public "view as customer" link

  @Index()
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId: string;

  /** Renegotiation lineage: version 1 is the original quote; each
   * "revise" action clones it into a new draft with version+1, pointing
   * back at the quote it was revised from (not necessarily the original —
   * a chain, not a star). */
  @Column({ default: 1 })
  version: number;

  @Index()
  @Column({ name: 'previous_version_id', type: 'uuid', nullable: true })
  previousVersionId: string | null;

  @OneToMany(() => QuoteItem, (item) => item.quote, { cascade: true, eager: true })
  items: QuoteItem[];
}
