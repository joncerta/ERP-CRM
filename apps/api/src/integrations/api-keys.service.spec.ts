import { Repository } from 'typeorm';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';

function buildService() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'key-1', ...data })),
    findOne: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<Repository<ApiKey>>;
  const service = new ApiKeysService(repo);
  return { service, repo };
}

describe('ApiKeysService', () => {
  describe('create', () => {
    it('returns the plaintext key only once, and never echoes its hash back', async () => {
      const { service, repo } = buildService();

      const { apiKey, plainKey } = await service.create('tenant-a', 'user-1', { name: 'Sitio web', scopes: ['leads:write'] });

      expect(plainKey).toMatch(/^ak_live_[0-9a-f]{48}$/);
      expect(apiKey.keyPrefix).toBe(plainKey.slice(0, 12));
      expect(apiKey).not.toHaveProperty('keyHash');
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('findActiveByPlainKey', () => {
    it('looks up by the sha256 hash of the provided plaintext, not the plaintext itself', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'key-1', tenantId: 'tenant-a', scopes: ['leads:write'] } as ApiKey);

      const result = await service.findActiveByPlainKey('ak_live_abcdef');

      expect(result).toEqual({ id: 'key-1', tenantId: 'tenant-a', scopes: ['leads:write'] });
      const whereArg = repo.findOne.mock.calls[0][0] as { where: { keyHash: string; isActive: boolean } };
      expect(whereArg.where.keyHash).not.toBe('ak_live_abcdef');
      expect(whereArg.where.isActive).toBe(true);
    });
  });

  describe('revoke', () => {
    it('deactivates the key', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'key-1', tenantId: 'tenant-a', isActive: true } as ApiKey);

      const result = await service.revoke('tenant-a', 'key-1');

      expect(result.isActive).toBe(false);
    });
  });
});
