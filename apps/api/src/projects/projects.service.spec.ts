import { Repository } from 'typeorm';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { ProjectMilestone, MilestoneStatus } from './entities/project-milestone.entity';
import { ProjectTimeEntry } from './entities/project-time-entry.entity';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'project-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Project>>;
  const milestonesRepo = {
    find: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<Repository<ProjectMilestone>>;
  const timeEntriesRepo = {
    find: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<Repository<ProjectTimeEntry>>;
  return { repo, milestonesRepo, timeEntriesRepo };
}

function buildService() {
  const deps = buildDeps();
  const service = new ProjectsService(deps.repo, deps.milestonesRepo, deps.timeEntriesRepo);
  return { service, ...deps };
}

describe('ProjectsService', () => {
  describe('getSummary', () => {
    it('computes progress from milestones and profitability from budget minus logged cost', async () => {
      const { service, repo, milestonesRepo, timeEntriesRepo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'project-1', tenantId: 'tenant-a', budget: 10000 } as Project);
      milestonesRepo.find.mockResolvedValue([
        { id: 'm1', status: MilestoneStatus.COMPLETED } as ProjectMilestone,
        { id: 'm2', status: MilestoneStatus.COMPLETED } as ProjectMilestone,
        { id: 'm3', status: MilestoneStatus.DELAYED } as ProjectMilestone,
        { id: 'm4', status: MilestoneStatus.PENDING } as ProjectMilestone,
      ]);
      timeEntriesRepo.find.mockResolvedValue([{ cost: 1500 } as ProjectTimeEntry, { cost: 500 } as ProjectTimeEntry]);

      const summary = await service.getSummary('tenant-a', 'project-1');

      expect(summary).toEqual({
        totalMilestones: 4,
        completedMilestones: 2,
        delayedMilestones: 1,
        progressPercent: 50,
        totalCost: 2000,
        budget: 10000,
        profitability: 8000,
        marginPercent: 80,
      });
    });

    it('reports a null margin when the project has no budget set', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'project-1', tenantId: 'tenant-a', budget: 0 } as Project);

      const summary = await service.getSummary('tenant-a', 'project-1');

      expect(summary.marginPercent).toBeNull();
    });
  });
});
