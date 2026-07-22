import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

function buildRepoMock() {
  return {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'user-1', ...data })),
  } as unknown as jest.Mocked<Repository<User>>;
}

describe('UsersService', () => {
  let repo: jest.Mocked<Repository<User>>;
  let service: UsersService;

  beforeEach(() => {
    repo = buildRepoMock();
    service = new UsersService(repo);
  });

  describe('setActive', () => {
    it('throws when the user does not exist in this tenant', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.setActive('tenant-a', 'missing', false)).rejects.toThrow(NotFoundException);
    });

    it('flips isActive and persists it', async () => {
      repo.findOne.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-a', isActive: true } as User);
      const result = await service.setActive('tenant-a', 'user-1', false);
      expect(result.isActive).toBe(false);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });
  });
});
