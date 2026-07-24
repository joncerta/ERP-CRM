import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NonConformitiesService } from './non-conformities.service';
import { NonConformity, NonConformityStatus } from './entities/non-conformity.entity';
import { CorrectiveAction, ActionStatus } from './entities/corrective-action.entity';
import { QualityInspection } from './entities/quality-inspection.entity';
import { Audit } from './entities/audit.entity';
import { DocumentSeriesService } from '../core/org/document-series.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'nc-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<NonConformity>>;
  const inspectionsRepo = { findOne: jest.fn() } as unknown as jest.Mocked<Repository<QualityInspection>>;
  const auditsRepo = { findOne: jest.fn() } as unknown as jest.Mocked<Repository<Audit>>;
  const documentSeriesService = {
    consumeNext: jest.fn().mockResolvedValue('NC-000001'),
  } as unknown as jest.Mocked<DocumentSeriesService>;
  return { repo, inspectionsRepo, auditsRepo, documentSeriesService };
}

function buildService() {
  const deps = buildDeps();
  const service = new NonConformitiesService(deps.repo, deps.inspectionsRepo, deps.auditsRepo, deps.documentSeriesService);
  return { service, ...deps };
}

describe('NonConformitiesService', () => {
  describe('close', () => {
    it('refuses to close while a corrective action is still pending', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'nc-1',
        tenantId: 'tenant-a',
        status: NonConformityStatus.IN_PROGRESS,
        actions: [{ id: 'a-1', status: ActionStatus.COMPLETED }, { id: 'a-2', status: ActionStatus.PENDING }] as CorrectiveAction[],
      } as NonConformity);

      await expect(service.close('tenant-a', 'nc-1')).rejects.toThrow(BadRequestException);
    });

    it('closes once every corrective action is completed', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'nc-1',
        tenantId: 'tenant-a',
        status: NonConformityStatus.IN_PROGRESS,
        actions: [{ id: 'a-1', status: ActionStatus.COMPLETED }] as CorrectiveAction[],
      } as NonConformity);

      const nc = await service.close('tenant-a', 'nc-1');

      expect(nc.status).toBe(NonConformityStatus.CLOSED);
      expect(nc.closedDate).toBeTruthy();
    });

    it('refuses to close an already-closed non-conformity', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'nc-1', tenantId: 'tenant-a', status: NonConformityStatus.CLOSED, actions: [] } as unknown as NonConformity);

      await expect(service.close('tenant-a', 'nc-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateAction', () => {
    it('marks the action completed, stamps its date, and bumps an open NC to in_progress', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'nc-1',
        tenantId: 'tenant-a',
        status: NonConformityStatus.OPEN,
        actions: [{ id: 'a-1', status: ActionStatus.PENDING, completedDate: null }] as CorrectiveAction[],
      } as NonConformity);

      const nc = await service.updateAction('tenant-a', 'nc-1', 'a-1', { status: ActionStatus.COMPLETED });

      expect(nc.actions[0].status).toBe(ActionStatus.COMPLETED);
      expect(nc.actions[0].completedDate).toBeTruthy();
      expect(nc.status).toBe(NonConformityStatus.IN_PROGRESS);
    });

    it('throws when the action does not belong to the non-conformity', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'nc-1', tenantId: 'tenant-a', status: NonConformityStatus.OPEN, actions: [] } as unknown as NonConformity);

      await expect(service.updateAction('tenant-a', 'nc-1', 'missing', { status: ActionStatus.COMPLETED })).rejects.toThrow(NotFoundException);
    });
  });
});
