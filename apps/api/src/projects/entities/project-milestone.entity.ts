import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum MilestoneStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  DELAYED = 'delayed',
}

@Entity('project_milestones')
export class ProjectMilestone extends TenantScopedEntity {
  @Index()
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column()
  name: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ type: 'enum', enum: MilestoneStatus, default: MilestoneStatus.PENDING })
  status: MilestoneStatus;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
