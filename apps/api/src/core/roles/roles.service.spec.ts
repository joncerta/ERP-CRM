import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

function buildRepoMock() {
  return {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'role-1', ...data })),
    remove: jest.fn(),
  } as unknown as jest.Mocked<Repository<Role>>;
}

function buildUsersServiceMock() {
  return { findAllForTenant: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<UsersService>;
}

describe('RolesService', () => {
  let repo: jest.Mocked<Repository<Role>>;
  let usersService: jest.Mocked<UsersService>;
  let service: RolesService;

  beforeEach(() => {
    repo = buildRepoMock();
    usersService = buildUsersServiceMock();
    service = new RolesService(repo, usersService);
  });

  describe('create', () => {
    it('rejects a custom role that tries to grant a platform.* permission, even spelled out literally', async () => {
      await expect(
        service.create('tenant-a', { name: 'Impostor', permissions: ['platform.tenants.manage'] }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('creates a normal tenant-scoped role and forces isSystem to false', async () => {
      const role = await service.create('tenant-a', { name: 'Soporte', permissions: ['crm.leads.read'] });
      expect(role).toEqual(expect.objectContaining({ isSystem: false, tenantId: 'tenant-a' }));
    });
  });

  describe('update', () => {
    it('refuses to modify a system role', async () => {
      repo.findOne.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-a', isSystem: true } as Role);
      await expect(service.update('tenant-a', 'role-1', { name: 'Hacked' })).rejects.toThrow(BadRequestException);
    });

    it('rejects adding a platform.* permission on update too', async () => {
      repo.findOne.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-a', isSystem: false } as Role);
      await expect(
        service.update('tenant-a', 'role-1', { permissions: ['platform.tenants.manage'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates a normal custom role', async () => {
      repo.findOne.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-a', isSystem: false, name: 'Old' } as Role);
      const result = await service.update('tenant-a', 'role-1', { name: 'New' });
      expect(result.name).toBe('New');
    });
  });

  describe('removeRole', () => {
    it('refuses to delete a system role', async () => {
      repo.findOne.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-a', isSystem: true } as Role);
      await expect(service.removeRole('tenant-a', 'role-1')).rejects.toThrow(BadRequestException);
    });

    it('refuses to delete a role that still has users assigned', async () => {
      repo.findOne.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-a', isSystem: false } as Role);
      usersService.findAllForTenant.mockResolvedValue([{ id: 'u1', roleId: 'role-1' } as User]);
      await expect(service.removeRole('tenant-a', 'role-1')).rejects.toThrow(BadRequestException);
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('deletes an unused custom role', async () => {
      repo.findOne.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-a', isSystem: false } as Role);
      usersService.findAllForTenant.mockResolvedValue([]);
      await service.removeRole('tenant-a', 'role-1');
      expect(repo.remove).toHaveBeenCalled();
    });
  });
});
