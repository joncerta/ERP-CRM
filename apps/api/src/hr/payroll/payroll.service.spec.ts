import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PayrollService } from './payroll.service';
import { PayrollRun, PayrollRunStatus } from './entities/payroll-run.entity';
import { PayrollRunLine } from './entities/payroll-run-line.entity';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'run-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<PayrollRun>>;
  const linesRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => data),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<PayrollRunLine>>;
  const employeesRepo = {
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<Employee>>;
  return { repo, linesRepo, employeesRepo };
}

function buildService() {
  const deps = buildDeps();
  const service = new PayrollService(deps.repo, deps.linesRepo, deps.employeesRepo);
  return { service, ...deps };
}

describe('PayrollService', () => {
  describe('process', () => {
    it('computes gross/net pay with the simplified 4%+4% deductions and no overtime by default', async () => {
      const { service, repo, linesRepo, employeesRepo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'run-1',
        tenantId: 'tenant-a',
        status: PayrollRunStatus.DRAFT,
      } as PayrollRun);
      employeesRepo.find.mockResolvedValue([
        { id: 'emp-1', tenantId: 'tenant-a', baseSalary: 2400000, employmentStatus: EmploymentStatus.ACTIVE } as Employee,
      ]);

      const run = await service.process('tenant-a', 'run-1', {});

      expect(linesRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({
          employeeId: 'emp-1',
          baseSalary: 2400000,
          overtimeHours: 0,
          overtimeAmount: 0,
          grossPay: 2400000,
          healthDeduction: 96000,
          pensionDeduction: 96000,
          netPay: 2208000,
        }),
      ]);
      expect(run.status).toBe(PayrollRunStatus.PROCESSED);
      expect(run.processedAt).toBeInstanceOf(Date);
    });

    it('factors in overtime hours at the flat 1.25x rate on a 240-hour month', async () => {
      const { service, repo, linesRepo, employeesRepo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'run-1', tenantId: 'tenant-a', status: PayrollRunStatus.DRAFT } as PayrollRun);
      employeesRepo.find.mockResolvedValue([
        { id: 'emp-1', tenantId: 'tenant-a', baseSalary: 2400000, employmentStatus: EmploymentStatus.ACTIVE } as Employee,
      ]);

      await service.process('tenant-a', 'run-1', { overtimeByEmployee: [{ employeeId: 'emp-1', hours: 10 }] });

      // hourlyRate = 2,400,000 / 240 = 10,000; overtime = 10 * 10,000 * 1.25 = 125,000
      expect(linesRepo.save).toHaveBeenCalledWith([expect.objectContaining({ overtimeHours: 10, overtimeAmount: 125000, grossPay: 2525000 })]);
    });

    it('refuses to re-process an already-processed run', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'run-1', tenantId: 'tenant-a', status: PayrollRunStatus.PROCESSED } as PayrollRun);

      await expect(service.process('tenant-a', 'run-1', {})).rejects.toThrow(BadRequestException);
    });

    it('only pays employees who are currently active', async () => {
      const { service, repo, linesRepo, employeesRepo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'run-1', tenantId: 'tenant-a', status: PayrollRunStatus.DRAFT } as PayrollRun);
      employeesRepo.find.mockResolvedValue([]);

      await service.process('tenant-a', 'run-1', {});

      expect(employeesRepo.find).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a', employmentStatus: EmploymentStatus.ACTIVE } });
      expect(linesRepo.save).toHaveBeenCalledWith([]);
    });
  });
});
