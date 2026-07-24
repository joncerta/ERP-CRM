import { Repository } from 'typeorm';
import { BomService } from './bom.service';
import { BillOfMaterial } from './entities/bill-of-material.entity';
import { ProductsService } from '../inventory/products/products.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'bom-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<BillOfMaterial>>;
  const productsService = {
    findOneForTenant: jest.fn().mockResolvedValue({ id: 'product-1' }),
  } as unknown as jest.Mocked<ProductsService>;
  return { repo, productsService };
}

function buildService() {
  const deps = buildDeps();
  const service = new BomService(deps.repo, deps.productsService);
  return { service, ...deps };
}

describe('BomService', () => {
  describe('create', () => {
    it('validates the finished product and every component before saving', async () => {
      const { service, productsService } = buildService();

      await service.create('tenant-a', {
        productId: 'product-1',
        name: 'Receta v1',
        lines: [{ componentProductId: 'comp-1', quantity: 2 }],
      });

      expect(productsService.findOneForTenant).toHaveBeenCalledWith('tenant-a', 'product-1');
      expect(productsService.findOneForTenant).toHaveBeenCalledWith('tenant-a', 'comp-1');
    });

    it('defaults outputQuantity to 1 when not provided', async () => {
      const { service } = buildService();

      const bom = await service.create('tenant-a', {
        productId: 'product-1',
        name: 'Receta v1',
        lines: [{ componentProductId: 'comp-1', quantity: 2 }],
      });

      expect(bom).toMatchObject({ outputQuantity: 1 });
    });
  });
});
