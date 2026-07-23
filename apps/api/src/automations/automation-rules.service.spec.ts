import { Repository } from 'typeorm';
import { AutomationRulesService } from './automation-rules.service';
import { AutomationRule } from './entities/automation-rule.entity';
import { User } from '../core/users/entities/user.entity';
import { Lead } from '../crm/leads/entities/lead.entity';

function buildDeps() {
  const repo = {} as unknown as jest.Mocked<Repository<AutomationRule>>;
  const usersRepo = {
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<User>>;
  const leadCountsQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  const leadsRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(leadCountsQb),
  } as unknown as jest.Mocked<Repository<Lead>>;
  return { repo, usersRepo, leadsRepo, leadCountsQb };
}

function buildService() {
  const deps = buildDeps();
  const service = new AutomationRulesService(deps.repo, deps.usersRepo, deps.leadsRepo);
  return { service, ...deps };
}

describe('AutomationRulesService', () => {
  describe('pickNextOwner', () => {
    it('assigns to whichever active user currently owns the fewest leads', async () => {
      const { service, usersRepo, leadCountsQb } = buildService();
      usersRepo.find.mockResolvedValue([
        { id: 'user-1', isActive: true } as User,
        { id: 'user-2', isActive: true } as User,
        { id: 'user-3', isActive: true } as User,
      ]);
      leadCountsQb.getRawMany.mockResolvedValue([
        { ownerUserId: 'user-1', count: '5' },
        { ownerUserId: 'user-2', count: '1' },
        { ownerUserId: 'user-3', count: '2' },
      ]);

      const owner = await service.pickNextOwner('tenant-a');

      expect(owner).toBe('user-2');
    });

    it('picks a user with zero leads over one already carrying leads', async () => {
      const { service, usersRepo, leadCountsQb } = buildService();
      usersRepo.find.mockResolvedValue([{ id: 'user-1', isActive: true } as User, { id: 'user-2', isActive: true } as User]);
      leadCountsQb.getRawMany.mockResolvedValue([{ ownerUserId: 'user-1', count: '3' }]);

      const owner = await service.pickNextOwner('tenant-a');

      expect(owner).toBe('user-2');
    });

    it('returns null when there are no active users to assign to', async () => {
      const { service, usersRepo } = buildService();
      usersRepo.find.mockResolvedValue([]);

      const owner = await service.pickNextOwner('tenant-a');

      expect(owner).toBeNull();
    });
  });
});
