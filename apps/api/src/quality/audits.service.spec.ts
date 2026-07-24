import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditsService } from './audits.service';
import { Audit, AuditStatus } from './entities/audit.entity';

function buildService() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'audit-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Audit>>;
  const service = new AuditsService(repo);
  return { service, repo };
}

describe('AuditsService', () => {
  describe('complete', () => {
    it('closes a planned audit with findings', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'audit-1', tenantId: 'tenant-a', status: AuditStatus.PLANNED } as Audit);

      const audit = await service.complete('tenant-a', 'audit-1', { findings: 'Todo en orden' });

      expect(audit.status).toBe(AuditStatus.COMPLETED);
      expect(audit.findings).toBe('Todo en orden');
      expect(audit.completedDate).toBeTruthy();
    });

    it('refuses to complete an audit that is not planned', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'audit-1', tenantId: 'tenant-a', status: AuditStatus.COMPLETED } as Audit);

      await expect(service.complete('tenant-a', 'audit-1', { findings: 'x' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('refuses to cancel an audit that is not planned', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'audit-1', tenantId: 'tenant-a', status: AuditStatus.CANCELLED } as Audit);

      await expect(service.cancel('tenant-a', 'audit-1')).rejects.toThrow(BadRequestException);
    });
  });
});
