import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum NurtureEnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('marketing_nurture_enrollments')
export class NurtureEnrollment extends TenantScopedEntity {
  @Index()
  @Column({ name: 'sequence_id', type: 'uuid' })
  sequenceId: string;

  @Index()
  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @Column({ type: 'enum', enum: NurtureEnrollmentStatus, default: NurtureEnrollmentStatus.ACTIVE })
  status: NurtureEnrollmentStatus;

  @Column({ name: 'current_step', type: 'int', default: 0 })
  currentStep: number;

  @Column({ name: 'next_step_due_at', type: 'timestamptz', nullable: true })
  nextStepDueAt: Date | null;

  @Column({ name: 'last_step_sent_at', type: 'timestamptz', nullable: true })
  lastStepSentAt: Date | null;
}
