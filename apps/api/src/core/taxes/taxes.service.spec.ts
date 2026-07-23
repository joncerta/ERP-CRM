import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TaxesService } from './taxes.service';
import { Tax } from './entities/tax.entity';

function buildService() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'tax-new', ...data })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Tax>>;
  const service = new TaxesService(repo);
  return { service, repo };
}

describe('TaxesService', () => {
  describe('create', () => {
    it('refuses a duplicate name within the same tenant', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'tax-1', name: 'IVA 19%' } as Tax);

      await expect(service.create('tenant-a', { name: 'IVA 19%', rate: 19 })).rejects.toThrow(ConflictException);
    });

    it('clears any previous default when the new tax is marked default', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(null);
      repo.find.mockResolvedValue([{ id: 'tax-old', tenantId: 'tenant-a', isDefault: true } as Tax]);

      await service.create('tenant-a', { name: 'IVA 5%', rate: 5, isDefault: true });

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'tax-old', isDefault: false }));
    });
  });

  describe('update', () => {
    it('refuses renaming to a name already used by another tax', async () => {
      const { service, repo } = buildService();
      repo.findOne
        .mockResolvedValueOnce({ id: 'tax-1', tenantId: 'tenant-a', name: 'IVA 19%' } as Tax) // findOneForTenant
        .mockResolvedValueOnce({ id: 'tax-2', name: 'Exento' } as Tax); // duplicate-name lookup

      await expect(service.update('tenant-a', 'tax-1', { name: 'Exento' })).rejects.toThrow(ConflictException);
    });
  });
});
