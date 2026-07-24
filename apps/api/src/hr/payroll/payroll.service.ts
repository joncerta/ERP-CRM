import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollRun, PayrollRunStatus } from './entities/payroll-run.entity';
import { PayrollRunLine } from './entities/payroll-run-line.entity';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { ProcessPayrollRunDto } from './dto/process-payroll-run.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Simplified, illustrative rates — see PayrollRunLine's doc comment for
// everything this deliberately does not model (ARL, parafiscales, legal
// caps/exonerations, cesantías/prima provisioning, the ~6 distinct
// Colombian overtime/holiday multipliers).
const HEALTH_DEDUCTION_RATE = 0.04;
const PENSION_DEDUCTION_RATE = 0.04;
const MONTHLY_LEGAL_HOURS = 240;
const OVERTIME_MULTIPLIER = 1.25;

@Injectable()
export class PayrollService extends TenantScopedService<PayrollRun> {
  constructor(
    @InjectRepository(PayrollRun) repo: Repository<PayrollRun>,
    @InjectRepository(PayrollRunLine) private readonly linesRepo: Repository<PayrollRunLine>,
    @InjectRepository(Employee) private readonly employeesRepo: Repository<Employee>,
  ) {
    super(repo);
  }

  create(tenantId: string, dto: CreatePayrollRunDto): Promise<PayrollRun> {
    const run = this.repository.create({ tenantId, ...dto, status: PayrollRunStatus.DRAFT });
    return this.repository.save(run);
  }

  async process(tenantId: string, id: string, dto: ProcessPayrollRunDto): Promise<PayrollRun> {
    const run = await this.findOneForTenant(tenantId, id);
    if (run.status !== PayrollRunStatus.DRAFT) {
      throw new BadRequestException('Esta liquidación ya fue procesada');
    }

    const overtimeByEmployee = new Map((dto.overtimeByEmployee ?? []).map((e) => [e.employeeId, e.hours]));
    const employees = await this.employeesRepo.find({ where: { tenantId, employmentStatus: EmploymentStatus.ACTIVE } });

    const lines = employees.map((employee) => {
      const baseSalary = Number(employee.baseSalary);
      const overtimeHours = overtimeByEmployee.get(employee.id) ?? 0;
      const hourlyRate = baseSalary / MONTHLY_LEGAL_HOURS;
      const overtimeAmount = round2(overtimeHours * hourlyRate * OVERTIME_MULTIPLIER);
      const grossPay = round2(baseSalary + overtimeAmount);
      const healthDeduction = round2(grossPay * HEALTH_DEDUCTION_RATE);
      const pensionDeduction = round2(grossPay * PENSION_DEDUCTION_RATE);
      const netPay = round2(grossPay - healthDeduction - pensionDeduction);

      return this.linesRepo.create({
        tenantId,
        payrollRunId: run.id,
        employeeId: employee.id,
        baseSalary,
        overtimeHours,
        overtimeAmount,
        healthDeduction,
        pensionDeduction,
        grossPay,
        netPay,
      });
    });
    await this.linesRepo.save(lines);

    run.status = PayrollRunStatus.PROCESSED;
    run.processedAt = new Date();
    return this.repository.save(run);
  }

  findLines(tenantId: string, runId: string): Promise<PayrollRunLine[]> {
    return this.linesRepo.find({ where: { tenantId, payrollRunId: runId } });
  }
}
