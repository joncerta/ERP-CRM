import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MilestonesService } from './milestones.service';
import { ProjectMilestone, MilestoneStatus } from './entities/project-milestone.entity';
import { Project } from './entities/project.entity';
import { NotificationsService } from '../notifications/notifications.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'milestone-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<ProjectMilestone>>;
  const projectsRepo = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Project>>;
  const notificationsService = {
    notify: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationsService>;
  return { repo, projectsRepo, notificationsService };
}

function buildService() {
  const deps = buildDeps();
  const service = new MilestonesService(deps.repo, deps.projectsRepo, deps.notificationsService);
  return { service, ...deps };
}

describe('MilestonesService', () => {
  describe('complete', () => {
    it('marks the milestone completed and notifies the project leader directly', async () => {
      const { service, repo, projectsRepo, notificationsService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'milestone-1',
        tenantId: 'tenant-a',
        projectId: 'project-1',
        name: 'Entrega fase 1',
        status: MilestoneStatus.PENDING,
      } as ProjectMilestone);
      projectsRepo.findOne.mockResolvedValue({ id: 'project-1', tenantId: 'tenant-a', leaderUserId: 'leader-1' } as Project);

      const completed = await service.complete('tenant-a', 'milestone-1');

      expect(completed.status).toBe(MilestoneStatus.COMPLETED);
      expect(completed.completedAt).toBeInstanceOf(Date);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'tenant-a',
        'leader-1',
        'project.milestone.completed',
        expect.any(String),
        expect.stringContaining('Entrega fase 1'),
        '/projects',
      );
    });

    it('refuses to re-complete an already-completed milestone', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'milestone-1', tenantId: 'tenant-a', status: MilestoneStatus.COMPLETED } as ProjectMilestone);

      await expect(service.complete('tenant-a', 'milestone-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('delay', () => {
    it('marks the milestone delayed with notes and notifies the leader', async () => {
      const { service, repo, projectsRepo, notificationsService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'milestone-1',
        tenantId: 'tenant-a',
        projectId: 'project-1',
        name: 'Entrega fase 1',
        status: MilestoneStatus.PENDING,
      } as ProjectMilestone);
      projectsRepo.findOne.mockResolvedValue({ id: 'project-1', tenantId: 'tenant-a', leaderUserId: 'leader-1' } as Project);

      const delayed = await service.delay('tenant-a', 'milestone-1', { notes: 'Falta un proveedor' });

      expect(delayed.status).toBe(MilestoneStatus.DELAYED);
      expect(delayed.notes).toBe('Falta un proveedor');
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'tenant-a',
        'leader-1',
        'project.milestone.delayed',
        expect.any(String),
        expect.stringContaining('Falta un proveedor'),
        '/projects',
      );
    });
  });
});
