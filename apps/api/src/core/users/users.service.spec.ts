import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
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

  describe('requestPasswordReset', () => {
    it('returns null without revealing whether the account exists, for an unknown user', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.requestPasswordReset('tenant-a', 'nobody@x.com')).resolves.toBeNull();
    });

    it('returns null for a deactivated user too', async () => {
      repo.findOne.mockResolvedValue({ id: 'user-1', isActive: false } as User);
      await expect(service.requestPasswordReset('tenant-a', 'inactive@x.com')).resolves.toBeNull();
    });

    it('generates and persists a reset token for an active user', async () => {
      repo.findOne.mockResolvedValue({ id: 'user-1', isActive: true } as User);
      const result = await service.requestPasswordReset('tenant-a', 'active@x.com');
      expect(result?.token).toEqual(expect.any(String));
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ passwordResetToken: result?.token, passwordResetExpiresAt: expect.any(Date) }),
      );
    });
  });

  describe('resetPassword', () => {
    it('rejects an unknown or expired token', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.resetPassword('bad-token', 'NewPassword123!')).rejects.toThrow(BadRequestException);
    });

    it('hashes the new password and clears the token', async () => {
      repo.findOne.mockResolvedValue({
        id: 'user-1',
        passwordResetToken: 'good-token',
        passwordResetExpiresAt: new Date(Date.now() + 60_000),
      } as User);

      const result = await service.resetPassword('good-token', 'NewPassword123!');

      expect(result.passwordResetToken).toBeNull();
      expect(result.passwordResetExpiresAt).toBeNull();
      expect(await bcrypt.compare('NewPassword123!', result.passwordHash)).toBe(true);
    });
  });

  describe('findManagerOf', () => {
    it('returns null when the user has no manager assigned', async () => {
      repo.findOne.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-a', managerId: null } as User);
      await expect(service.findManagerOf('tenant-a', 'user-1')).resolves.toBeNull();
    });

    it('returns null when the user itself is not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findManagerOf('tenant-a', 'ghost')).resolves.toBeNull();
    });

    it('returns the manager user when one is assigned', async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-a', managerId: 'manager-1' } as User)
        .mockResolvedValueOnce({ id: 'manager-1', tenantId: 'tenant-a', fullName: 'Líder' } as User);
      const manager = await service.findManagerOf('tenant-a', 'user-1');
      expect(manager?.id).toBe('manager-1');
    });
  });

  describe('assignOrg', () => {
    it('throws when the user does not exist in this tenant', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.assignOrg('tenant-a', 'missing', { branchId: 'branch-1' })).rejects.toThrow(NotFoundException);
    });

    it('rejects a user being assigned as their own manager', async () => {
      repo.findOne.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-a' } as User);
      await expect(service.assignOrg('tenant-a', 'user-1', { managerId: 'user-1' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a manager that does not exist in this tenant', async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-a' } as User) // the user being assigned
        .mockResolvedValueOnce(null); // the manager lookup
      await expect(service.assignOrg('tenant-a', 'user-1', { managerId: 'ghost' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a manager assignment that would create a reporting cycle', async () => {
      // user-1 reports to user-2, which would make user-2 -> user-1 a loop.
      repo.findOne.mockImplementation(({ where }: any) => {
        const id = where.id;
        if (id === 'user-2') return Promise.resolve({ id: 'user-2', tenantId: 'tenant-a', managerId: 'user-1' } as User);
        if (id === 'user-1') return Promise.resolve({ id: 'user-1', tenantId: 'tenant-a', managerId: null } as User);
        return Promise.resolve(null);
      });
      await expect(service.assignOrg('tenant-a', 'user-1', { managerId: 'user-2' })).rejects.toThrow(BadRequestException);
    });

    it('assigns manager, branch, department and position', async () => {
      repo.findOne.mockImplementation(({ where }: any) => {
        const id = where.id;
        if (id === 'user-1') return Promise.resolve({ id: 'user-1', tenantId: 'tenant-a', managerId: null } as User);
        if (id === 'user-2') return Promise.resolve({ id: 'user-2', tenantId: 'tenant-a', managerId: null } as User);
        return Promise.resolve(null);
      });

      const result = await service.assignOrg('tenant-a', 'user-1', {
        managerId: 'user-2',
        branchId: 'branch-1',
        departmentId: 'dept-1',
        positionId: 'pos-1',
      });

      expect(result.managerId).toBe('user-2');
      expect(result.branchId).toBe('branch-1');
      expect(result.departmentId).toBe('dept-1');
      expect(result.positionId).toBe('pos-1');
    });
  });

  describe('changeOwnPassword', () => {
    it('throws when the current password does not match', async () => {
      const hash = await bcrypt.hash('CorrectPassword1!', 4);
      repo.findOne.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-a', passwordHash: hash } as User);
      await expect(
        service.changeOwnPassword('tenant-a', 'user-1', 'WrongPassword', 'NewPassword123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates the password hash when the current password matches', async () => {
      const hash = await bcrypt.hash('CorrectPassword1!', 4);
      repo.findOne.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-a', passwordHash: hash } as User);
      const result = await service.changeOwnPassword('tenant-a', 'user-1', 'CorrectPassword1!', 'NewPassword123!');
      expect(await bcrypt.compare('NewPassword123!', result.passwordHash)).toBe(true);
    });
  });
});
