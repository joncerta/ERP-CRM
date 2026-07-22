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
