import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { DocumentSeriesService } from '../../core/org/document-series.service';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';
import { StockService } from '../../inventory/stock/stock.service';
import { StockMovementType } from '../../inventory/stock/entities/stock-movement.entity';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'order-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<PurchaseOrder>>;
  const itemsRepo = {
    save: jest.fn(async (data) => data),
  } as unknown as jest.Mocked<Repository<PurchaseOrderItem>>;
  const documentSeriesService = {
    consumeNext: jest.fn().mockResolvedValue('OC-000001'),
  } as unknown as jest.Mocked<DocumentSeriesService>;
  const notificationEscalationService = {
    notifyWithEscalation: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationEscalationService>;
  const stockService = {
    recordMovement: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<StockService>;
  return { repo, itemsRepo, documentSeriesService, notificationEscalationService, stockService };
}

function buildService() {
  const deps = buildDeps();
  const service = new PurchaseOrdersService(
    deps.repo,
    deps.itemsRepo,
    deps.documentSeriesService,
    deps.notificationEscalationService,
    deps.stockService,
  );
  return { service, ...deps };
}

describe('PurchaseOrdersService', () => {
  describe('create', () => {
    it('computes totals from items and claims a number from the document series', async () => {
      const { service, documentSeriesService } = buildService();

      const order = await service.create('tenant-a', 'user-1', {
        supplierId: 'supplier-1',
        items: [{ description: 'Cajas', quantity: 10, unitCost: 5 }],
      });

      expect(documentSeriesService.consumeNext).toHaveBeenCalledWith('tenant-a', 'purchase_order');
      expect(order).toMatchObject({ subtotal: 50, total: 50, status: PurchaseOrderStatus.DRAFT });
    });
  });

  describe('receive', () => {
    function orderFixture(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
      return {
        id: 'order-1',
        tenantId: 'tenant-a',
        orderNumber: 'OC-000001',
        status: PurchaseOrderStatus.SENT,
        ownerUserId: 'user-1',
        items: [
          { id: 'item-1', productId: 'product-1', description: 'Cajas', quantity: 10, quantityReceived: 0, unitCost: 5, total: 50 },
          { id: 'item-2', productId: null, description: 'Servicio', quantity: 1, quantityReceived: 0, unitCost: 20, total: 20 },
        ],
        ...overrides,
      } as PurchaseOrder;
    }

    it('posts a stock movement only for lines linked to a product, and marks partially received', async () => {
      const { service, repo, stockService, notificationEscalationService } = buildService();
      repo.findOne.mockResolvedValue(orderFixture());

      await service.receive('tenant-a', 'order-1', 'user-2', {
        lines: [{ itemId: 'item-1', quantity: 4, warehouseId: 'wh-1' }],
      });

      expect(stockService.recordMovement).toHaveBeenCalledWith('tenant-a', 'user-2', {
        productId: 'product-1',
        warehouseId: 'wh-1',
        type: StockMovementType.PURCHASE,
        quantity: 4,
        direction: 'in',
        note: expect.stringContaining('OC-000001'),
      });
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: PurchaseOrderStatus.PARTIALLY_RECEIVED }));
      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalledWith(
        'tenant-a',
        'user-1',
        'purchase_order.received',
        expect.any(String),
        expect.any(String),
        '/purchases',
      );
    });

    it('marks the order fully received once every line is complete', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(orderFixture());

      await service.receive('tenant-a', 'order-1', 'user-2', {
        lines: [
          { itemId: 'item-1', quantity: 10, warehouseId: 'wh-1' },
          { itemId: 'item-2', quantity: 1, warehouseId: 'wh-1' },
        ],
      });

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: PurchaseOrderStatus.RECEIVED }));
    });

    it('refuses to receive more than what remains pending on a line', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(orderFixture());

      await expect(
        service.receive('tenant-a', 'order-1', 'user-2', {
          lines: [{ itemId: 'item-1', quantity: 99, warehouseId: 'wh-1' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses to receive a draft order', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue(orderFixture({ status: PurchaseOrderStatus.DRAFT }));

      await expect(
        service.receive('tenant-a', 'order-1', 'user-2', {
          lines: [{ itemId: 'item-1', quantity: 1, warehouseId: 'wh-1' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
