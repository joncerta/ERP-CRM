import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum PayrollRunStatus {
  DRAFT = 'draft',
  PROCESSED = 'processed',
}

/** A monthly (or whatever cadence the tenant runs) payroll batch. No
 * scheduler triggers this — same manual-trigger pattern as depreciation,
 * recurring invoicing, nurture sequences and automations: someone calls
 * POST /hr/payroll/runs/:id/process when they're ready to liquidate. */
@Entity('hr_payroll_runs')
export class PayrollRun extends TenantScopedEntity {
  @Column({ name: 'period_label' })
  periodLabel: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({ type: 'enum', enum: PayrollRunStatus, default: PayrollRunStatus.DRAFT })
  status: PayrollRunStatus;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;
}
