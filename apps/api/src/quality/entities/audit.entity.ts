import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum AuditType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export enum AuditStatus {
  PLANNED = 'planned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/** "auditor" is free text like Technician.name — an external certifying
 * body's auditor is not necessarily a system User. */
@Entity('quality_audits')
export class Audit extends TenantScopedEntity {
  @Column({ type: 'enum', enum: AuditType })
  type: AuditType;

  @Column({ type: 'text' })
  scope: string;

  @Column()
  auditor: string;

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate: string;

  @Column({ type: 'enum', enum: AuditStatus, default: AuditStatus.PLANNED })
  status: AuditStatus;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: string | null;

  @Column({ type: 'text', nullable: true })
  findings: string | null;
}
