import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BranchesService } from './branches.service';
import { Branch } from './entities/branch.entity';
import { Department } from './entities/department.entity';

function buildReposMock() {
  const updateExec = jest.fn().mockResolvedValue(undefined);
  const updateQb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: updateExec,
  };
  const branchesRepo = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'branch-1', ...data })),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(updateQb),
  } as unknown as jest.Mocked<Repository<Branch>>;
  const departmentsRepo = { count: jest.fn().mockResolvedValue(0) } as unknown as jest.Mocked<Repository<Department>>;
  return { branchesRepo, departmentsRepo, updateQb };
}

describe('BranchesService', () => {
  describe('create', () => {
    it('clears other default branches when creating a new default one', async () => {
      const { branchesRepo, departmentsRepo, updateQb } = buildReposMock();
      const service = new BranchesService(branchesRepo, departmentsRepo);

      await service.create('tenant-a', { name: 'Sede Norte', isDefault: true });

      expect(updateQb.set).toHaveBeenCalledWith({ isDefault: false });
      expect(updateQb.where).toHaveBeenCalledWith('tenant_id = :tenantId', { tenantId: 'tenant-a' });
    });

    it('does not touch other defaults when not creating a default branch', async () => {
      const { branchesRepo, departmentsRepo } = buildReposMock();
      const service = new BranchesService(branchesRepo, departmentsRepo);

      await service.create('tenant-a', { name: 'Sede Sur' });

      expect(branchesRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('refuses to delete a branch with departments assigned', async () => {
      const { branchesRepo, departmentsRepo } = buildReposMock();
      branchesRepo.findOne.mockResolvedValue({ id: 'branch-1', tenantId: 'tenant-a' } as Branch);
      departmentsRepo.count.mockResolvedValue(2);
      const service = new BranchesService(branchesRepo, departmentsRepo);

      await expect(service.remove('tenant-a', 'branch-1')).rejects.toThrow(BadRequestException);
      expect(branchesRepo.remove).not.toHaveBeenCalled();
    });

    it('deletes a branch with no departments', async () => {
      const { branchesRepo, departmentsRepo } = buildReposMock();
      branchesRepo.findOne.mockResolvedValue({ id: 'branch-1', tenantId: 'tenant-a' } as Branch);
      const service = new BranchesService(branchesRepo, departmentsRepo);

      await service.remove('tenant-a', 'branch-1');
      expect(branchesRepo.remove).toHaveBeenCalled();
    });
  });
});
