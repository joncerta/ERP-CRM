import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/** For the segment of clients that sell services/time rather than
 * product — stages/budget/schedule, assigned resources with time
 * tracking, and progress/profitability, all computed off the existing
 * tables rather than a full project-accounting subledger. */
@Entity('projects')
export class Project extends TenantScopedEntity {
  @Column()
  name: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Index()
  @Column({ name: 'leader_user_id', type: 'uuid' })
  leaderUserId: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PLANNING })
  status: ProjectStatus;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  budget: number;

  @Column({ name: 'currency_code', length: 3, default: 'USD' })
  currencyCode: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'planned_end_date', type: 'date', nullable: true })
  plannedEndDate: string | null;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate: string | null;
}
