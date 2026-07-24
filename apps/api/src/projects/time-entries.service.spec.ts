import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TimeEntriesService } from './time-entries.service';
import { ProjectTimeEntry } from './entities/project-time-entry.entity';
import { ProjectResource } from './entities/project-resource.entity';
import type { AuthenticatedUser } from '../core/auth/auth.types';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'entry-1', ...data })),
  } as unknown as jest.Mocked<Repository<ProjectTimeEntry>>;
  const resourcesRepo = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<ProjectResource>>;
  return { repo, resourcesRepo };
}

function buildService() {
  const deps = buildDeps();
  const service = new TimeEntriesService(deps.repo, deps.resourcesRepo);
  return { service, ...deps };
}

function actingUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return { userId: 'user-1', tenantId: 'tenant-a', email: 'a@b.com', roleId: 'role-1', permissions: [], sessionId: 's1', ...overrides };
}

describe('TimeEntriesService', () => {
  describe('create', () => {
    it('computes cost as hours times the resource hourly rate', async () => {
      const { service, resourcesRepo } = buildService();
      resourcesRepo.findOne.mockResolvedValue({ id: 'res-1', tenantId: 'tenant-a', projectId: 'project-1', userId: 'user-1', hourlyRate: 40 } as ProjectResource);

      const entry = await service.create('tenant-a', actingUser(), 'project-1', { resourceId: 'res-1', date: '2026-07-01', hours: 3 });

      expect(entry).toMatchObject({ cost: 120, hours: 3 });
    });

    it('refuses to let someone log time for a resource that is not their own', async () => {
      const { service, resourcesRepo } = buildService();
      resourcesRepo.findOne.mockResolvedValue({ id: 'res-1', tenantId: 'tenant-a', projectId: 'project-1', userId: 'user-2', hourlyRate: 40 } as ProjectResource);

      await expect(
        service.create('tenant-a', actingUser({ userId: 'user-1' }), 'project-1', { resourceId: 'res-1', date: '2026-07-01', hours: 3 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a full admin to log time on behalf of another resource', async () => {
      const { service, resourcesRepo } = buildService();
      resourcesRepo.findOne.mockResolvedValue({ id: 'res-1', tenantId: 'tenant-a', projectId: 'project-1', userId: 'user-2', hourlyRate: 40 } as ProjectResource);

      await expect(
        service.create('tenant-a', actingUser({ userId: 'admin-1', permissions: ['*'] }), 'project-1', { resourceId: 'res-1', date: '2026-07-01', hours: 2 }),
      ).resolves.toMatchObject({ cost: 80 });
    });
  });
});
