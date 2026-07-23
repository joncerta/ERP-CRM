import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export interface NurtureStep {
  delayDays: number;
  subject: string;
  content: string;
}

/** Steps stored as jsonb rather than a child table — a sequence is edited
 * as a whole (no per-step history/audit needed), so one column is simpler
 * than a one-to-many with its own CRUD. */
@Entity('marketing_nurture_sequences')
export class NurtureSequence extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'jsonb', default: [] })
  steps: NurtureStep[];
}
