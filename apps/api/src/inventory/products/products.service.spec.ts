import { BadRequestException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';

function buildReposMock() {
  const productsRepo = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'product-1', ...data })),
    remove: jest.fn(),
  } as unknown as jest.Mocked<Repository<Product>>;
  const movementsRepo = { count: jest.fn().mockResolvedValue(0) } as unknown as jest.Mocked<Repository<StockMovement>>;
  return { productsRepo, movementsRepo };
}

describe('ProductsService', () => {
  describe('create', () => {
    it('rejects a duplicate SKU within the same tenant', async () => {
      const { productsRepo, movementsRepo } = buildReposMock();
      productsRepo.findOne.mockResolvedValue({ id: 'existing' } as Product);
      const service = new ProductsService(productsRepo, movementsRepo);

      await expect(service.create('tenant-a', { sku: 'ABC-1', name: 'Widget' })).rejects.toThrow(ConflictException);
    });

    it('creates a product when the SKU is free', async () => {
      const { productsRepo, movementsRepo } = buildReposMock();
      productsRepo.findOne.mockResolvedValue(null);
      const service = new ProductsService(productsRepo, movementsRepo);

      const product = await service.create('tenant-a', { sku: 'ABC-1', name: 'Widget' });
      expect(product).toEqual(expect.objectContaining({ sku: 'ABC-1', tenantId: 'tenant-a' }));
    });
  });

  describe('remove', () => {
    it('refuses to delete a product with movement history', async () => {
      const { productsRepo, movementsRepo } = buildReposMock();
      productsRepo.findOne.mockResolvedValue({ id: 'product-1', tenantId: 'tenant-a' } as Product);
      movementsRepo.count.mockResolvedValue(3);
      const service = new ProductsService(productsRepo, movementsRepo);

      await expect(service.remove('tenant-a', 'product-1')).rejects.toThrow(BadRequestException);
      expect(productsRepo.remove).not.toHaveBeenCalled();
    });

    it('deletes a product with no movement history', async () => {
      const { productsRepo, movementsRepo } = buildReposMock();
      productsRepo.findOne.mockResolvedValue({ id: 'product-1', tenantId: 'tenant-a' } as Product);
      movementsRepo.count.mockResolvedValue(0);
      const service = new ProductsService(productsRepo, movementsRepo);

      await service.remove('tenant-a', 'product-1');
      expect(productsRepo.remove).toHaveBeenCalled();
    });
  });
});
