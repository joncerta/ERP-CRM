import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

/** A form definition a tenant can embed on their own site/landing page.
 * Field capture is generic (name/email/phone/company/message) rather than
 * a form-builder, since every campaign so far only needs basic contact
 * data — enough to create a Lead, nothing more. */
@Entity('marketing_landing_forms')
export class LandingForm extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar' })
  slug: string;

  @Column({ name: 'campaign_name', type: 'varchar', nullable: true })
  campaignName: string | null;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'submission_count', type: 'int', default: 0 })
  submissionCount: number;
}
