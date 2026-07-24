import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum PerformanceReviewStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
}

export interface ScoredItem {
  description: string;
  score: number; // 1-5
}

/** Objectives and competencies are free-form JSON arrays rather than
 * their own tables — this is a simple periodic scorecard, not a
 * configurable competency-framework builder. */
@Entity('hr_performance_reviews')
export class PerformanceReview extends TenantScopedEntity {
  @Index()
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ name: 'reviewer_user_id', type: 'uuid' })
  reviewerUserId: string;

  @Column({ name: 'period_label' })
  periodLabel: string;

  @Column({ type: 'jsonb', default: [] })
  objectives: ScoredItem[];

  @Column({ type: 'jsonb', default: [] })
  competencies: ScoredItem[];

  @Column({ name: 'overall_score', type: 'numeric', precision: 4, scale: 2, nullable: true })
  overallScore: number | null;

  @Column({ type: 'enum', enum: PerformanceReviewStatus, default: PerformanceReviewStatus.DRAFT })
  status: PerformanceReviewStatus;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  comments: string | null;
}
