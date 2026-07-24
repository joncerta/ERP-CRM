import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NonConformity } from './non-conformity.entity';

export enum ActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('quality_corrective_actions')
export class CorrectiveAction extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'non_conformity_id', type: 'uuid' })
  nonConformityId: string;

  @ManyToOne(() => NonConformity, (nc) => nc.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'non_conformity_id' })
  nonConformity: NonConformity;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'responsible_user_id', type: 'uuid', nullable: true })
  responsibleUserId: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'enum', enum: ActionStatus, default: ActionStatus.PENDING })
  status: ActionStatus;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: string | null;

  @Column({ name: 'completion_notes', type: 'text', nullable: true })
  completionNotes: string | null;
}
