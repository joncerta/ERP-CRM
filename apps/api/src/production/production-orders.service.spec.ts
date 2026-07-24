import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProductionOrdersService } from './production-orders.service';
import { ProductionOrder, ProductionOrderStatus } from './entities/production-order.entity';
import { ProductionOrderConsumption } from './entities/production-order-consumption.entity';
import { BillOfMaterial } from './entities/bill-of-material.entity';
import { BillOfMaterialLine } from './entities/bill-of-material-line.entity';
import { ProductsService } from '../inventory/products/products.service';
import { WarehousesService } from '../inventory/warehouses/warehouses.service';
import { StockService } from '../inventory/stock/stock.service';
import { DocumentSeriesService } from '../core/org/document-series.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'order-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<ProductionOrder>>;
  const consumptionsRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'consumption-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<ProductionOrderConsumption>>;
  const bomsRepo = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<BillOfMaterial>>;
  const productsService = {
    findOneForTenant: jest.fn(),
  } as unknown as jest.Mocked<ProductsService>;
  const warehousesService = {
    findOneForTenant: jest.fn(),
  } as unknown as jest.Mocked<WarehousesService>;
  const stockService = {
    recordMovement: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<StockService>;
  const documentSeriesService = {
    consumeNext: jest.fn().mockResolvedValue('OP-000001'),
  } as unknown as jest.Mocked<DocumentSeriesService>;
  return { repo, consumptionsRepo, bomsRepo, productsService, warehousesService, stockService, documentSeriesService };
}

function buildService() {
  const deps = buildDeps();
  const service = new ProductionOrdersService(
    deps.repo,
    deps.consumptionsRepo,
    deps.bomsRepo,
    deps.productsService,
    deps.warehousesService,
    deps.stockService,
    deps.documentSeriesService,
  );
  return { service, ...deps };
}

describe('ProductionOrdersService', () => {
  describe('create', () => {
    it('refuses a BOM that belongs to a different product', async () => {
      const { service, bomsRepo } = buildService();
      bomsRepo.findOne.mockResolvedValue({ id: 'bom-1', tenantId: 'tenant-a', productId: 'product-other' } as BillOfMaterial);

      await expect(
        service.create('tenant-a', { productId: 'product-1', bomId: 'bom-1', warehouseId: 'wh-1', quantityPlanned: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('start', () => {
    it('consumes raw materials scaled to quantityPlanned and snapshots their cost', async () => {
      const { service, repo, bomsRepo, productsService, stockService, consumptionsRepo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'order-1',
        tenantId: 'tenant-a',
        orderNumber: 'OP-000001',
        bomId: 'bom-1',
        warehouseId: 'wh-1',
        quantityPlanned: 20,
        status: ProductionOrderStatus.DRAFT,
      } as ProductionOrder);
      bomsRepo.findOne.mockResolvedValue({
        id: 'bom-1',
        tenantId: 'tenant-a',
        outputQuantity: 10,
        lines: [{ componentProductId: 'comp-1', quantity: 2 } as BillOfMaterialLine],
      } as BillOfMaterial);
      productsService.findOneForTenant.mockResolvedValue({ id: 'comp-1', costPrice: 5 } as never);

      const order = await service.start('tenant-a', 'user-1', 'order-1');

      // scale = 20/10 = 2; consumed = 2 * 2 = 4; cost = 4 * 5 = 20
      expect(stockService.recordMovement).toHaveBeenCalledWith('tenant-a', 'user-1', expect.objectContaining({
        productId: 'comp-1',
        warehouseId: 'wh-1',
        quantity: 4,
        direction: 'out',
      }));
      expect(consumptionsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantityConsumed: 4, unitCost: 5, totalCost: 20 }));
      expect(order.totalCost).toBe(20);
      expect(order.status).toBe(ProductionOrderStatus.IN_PROGRESS);
    });

    it('refuses to start an order that is not a draft', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'order-1', tenantId: 'tenant-a', status: ProductionOrderStatus.COMPLETED } as ProductionOrder);

      await expect(service.start('tenant-a', 'user-1', 'order-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('adds the produced quantity to stock and records the actual yield', async () => {
      const { service, repo, stockService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'order-1',
        tenantId: 'tenant-a',
        orderNumber: 'OP-000001',
        productId: 'product-1',
        warehouseId: 'wh-1',
        status: ProductionOrderStatus.IN_PROGRESS,
      } as ProductionOrder);

      const order = await service.complete('tenant-a', 'user-1', 'order-1', { quantityProduced: 18 });

      expect(stockService.recordMovement).toHaveBeenCalledWith('tenant-a', 'user-1', expect.objectContaining({
        productId: 'product-1',
        warehouseId: 'wh-1',
        quantity: 18,
        direction: 'in',
      }));
      expect(order.quantityProduced).toBe(18);
      expect(order.status).toBe(ProductionOrderStatus.COMPLETED);
    });
  });

  describe('cancel', () => {
    it('refuses to cancel an order that already started consuming stock', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'order-1', tenantId: 'tenant-a', status: ProductionOrderStatus.IN_PROGRESS } as ProductionOrder);

      await expect(service.cancel('tenant-a', 'order-1')).rejects.toThrow(BadRequestException);
    });
  });
});
