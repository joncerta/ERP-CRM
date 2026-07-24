import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { WorkOrdersService } from './work-orders.service';
import { MaintenanceWorkOrder, WorkOrderStatus } from './entities/maintenance-work-order.entity';
import { WorkOrderPart } from './entities/work-order-part.entity';
import { Equipment, EquipmentStatus } from './entities/equipment.entity';
import { ProductsService } from '../inventory/products/products.service';
import { WarehousesService } from '../inventory/warehouses/warehouses.service';
import { StockService } from '../inventory/stock/stock.service';
import { DocumentSeriesService } from '../core/org/document-series.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'order-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<MaintenanceWorkOrder>>;
  const equipmentRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<Repository<Equipment>>;
  const productsService = {
    findOneForTenant: jest.fn(),
  } as unknown as jest.Mocked<ProductsService>;
  const warehousesService = {
    findOneForTenant: jest.fn().mockResolvedValue({ id: 'wh-1' }),
  } as unknown as jest.Mocked<WarehousesService>;
  const stockService = {
    recordMovement: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<StockService>;
  const documentSeriesService = {
    consumeNext: jest.fn().mockResolvedValue('OM-000001'),
  } as unknown as jest.Mocked<DocumentSeriesService>;
  return { repo, equipmentRepo, productsService, warehousesService, stockService, documentSeriesService };
}

function buildService() {
  const deps = buildDeps();
  const service = new WorkOrdersService(
    deps.repo,
    deps.equipmentRepo,
    deps.productsService,
    deps.warehousesService,
    deps.stockService,
    deps.documentSeriesService,
  );
  return { service, ...deps };
}

describe('WorkOrdersService', () => {
  describe('start', () => {
    it('transitions to in_progress and flags the equipment under maintenance', async () => {
      const { service, repo, equipmentRepo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'order-1', tenantId: 'tenant-a', equipmentId: 'eq-1', status: WorkOrderStatus.OPEN } as MaintenanceWorkOrder);

      const order = await service.start('tenant-a', 'order-1');

      expect(order.status).toBe(WorkOrderStatus.IN_PROGRESS);
      expect(order.startedAt).toBeInstanceOf(Date);
      expect(equipmentRepo.update).toHaveBeenCalledWith({ id: 'eq-1', tenantId: 'tenant-a' }, { status: EquipmentStatus.UNDER_MAINTENANCE });
    });

    it('refuses to start an order that is not open', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'order-1', tenantId: 'tenant-a', status: WorkOrderStatus.COMPLETED } as MaintenanceWorkOrder);

      await expect(service.start('tenant-a', 'order-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('pulls every part from stock, sums their snapshot cost, and puts the equipment back in service', async () => {
      const { service, repo, equipmentRepo, productsService, stockService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'order-1',
        tenantId: 'tenant-a',
        orderNumber: 'OM-000001',
        equipmentId: 'eq-1',
        warehouseId: 'wh-1',
        status: WorkOrderStatus.IN_PROGRESS,
        parts: [{ productId: 'part-1', quantity: 3 } as WorkOrderPart],
      } as MaintenanceWorkOrder);
      productsService.findOneForTenant.mockResolvedValue({ id: 'part-1', costPrice: 7 } as never);

      const order = await service.complete('tenant-a', 'user-1', 'order-1', { resolutionNotes: 'Cambio de rodamiento' });

      expect(stockService.recordMovement).toHaveBeenCalledWith('tenant-a', 'user-1', expect.objectContaining({
        productId: 'part-1',
        warehouseId: 'wh-1',
        quantity: 3,
        direction: 'out',
      }));
      expect(order.totalPartsCost).toBe(21);
      expect(order.status).toBe(WorkOrderStatus.COMPLETED);
      expect(equipmentRepo.update).toHaveBeenCalledWith({ id: 'eq-1', tenantId: 'tenant-a' }, { status: EquipmentStatus.OPERATIONAL });
    });

    it('refuses to complete an order that has not been started', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'order-1', tenantId: 'tenant-a', status: WorkOrderStatus.OPEN } as MaintenanceWorkOrder);

      await expect(service.complete('tenant-a', 'user-1', 'order-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('refuses to cancel an already-closed order', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'order-1', tenantId: 'tenant-a', status: WorkOrderStatus.COMPLETED } as MaintenanceWorkOrder);

      await expect(service.cancel('tenant-a', 'order-1')).rejects.toThrow(BadRequestException);
    });
  });
});
