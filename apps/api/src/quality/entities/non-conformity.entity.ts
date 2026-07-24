import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { CorrectiveAction } from './corrective-action.entity';

export enum Severity {
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical',
}

export enum NonConformityStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
}

/** inspectionId/auditId are optional — a non-conformity can also come from
 * a customer complaint or something noticed outside a formal inspection or
 * audit, so neither is required. Closing requires every corrective action
 * to be completed first (see NonConformitiesService.close). */
@Entity('quality_non_conformities')
export class NonConformity extends TenantScopedEntity {
  @Column({ name: 'nc_number' })
  ncNumber: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: Severity })
  severity: Severity;

  @Column({ type: 'enum', enum: NonConformityStatus, default: NonConformityStatus.OPEN })
  status: NonConformityStatus;

  @Column({ name: 'detected_date', type: 'date' })
  detectedDate: string;

  @Column({ name: 'closed_date', type: 'date', nullable: true })
  closedDate: string | null;

  @Index()
  @Column({ name: 'inspection_id', type: 'uuid', nullable: true })
  inspectionId: string | null;

  @Index()
  @Column({ name: 'audit_id', type: 'uuid', nullable: true })
  auditId: string | null;

  @OneToMany(() => CorrectiveAction, (action) => action.nonConformity, { cascade: true, eager: true, orphanedRowAction: 'delete' })
  actions: CorrectiveAction[];
}
