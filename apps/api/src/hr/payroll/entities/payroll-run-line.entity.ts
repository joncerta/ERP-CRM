import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

/** One employee's line within a PayrollRun. The deduction/net-pay math
 * here is an illustrative simplification — a single flat health (4%) and
 * pension (4%) employee deduction rate, no ARL/parafiscales, no legal
 * caps/exonerations, no cesantías or prima provisioning, and overtime
 * uses one flat 1.25x hourly multiplier instead of the ~6 legally
 * distinct Colombian overtime/holiday rates. Real payroll needs
 * certified software (e.g. an integration with a PILA-compliant
 * provider) that this project doesn't have — this is a "manageable
 * scope" demo calculation, not a legal liquidation. */
@Entity('hr_payroll_run_lines')
export class PayrollRunLine extends TenantScopedEntity {
  @Index()
  @Column({ name: 'payroll_run_id', type: 'uuid' })
  payrollRunId: string;

  @Index()
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ name: 'base_salary', type: 'numeric', precision: 14, scale: 2 })
  baseSalary: number;

  @Column({ name: 'overtime_hours', type: 'numeric', precision: 8, scale: 2, default: 0 })
  overtimeHours: number;

  @Column({ name: 'overtime_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  overtimeAmount: number;

  @Column({ name: 'health_deduction', type: 'numeric', precision: 14, scale: 2 })
  healthDeduction: number;

  @Column({ name: 'pension_deduction', type: 'numeric', precision: 14, scale: 2 })
  pensionDeduction: number;

  @Column({ name: 'gross_pay', type: 'numeric', precision: 14, scale: 2 })
  grossPay: number;

  @Column({ name: 'net_pay', type: 'numeric', precision: 14, scale: 2 })
  netPay: number;
}
