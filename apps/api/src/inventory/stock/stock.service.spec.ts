import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { StockService } from './stock.service';
import { StockBalance } from './entities/stock-balance.entity';
import { StockMovement, StockMovementType } from './entities/stock-movement.entity';

/**
 * Simulates the EntityManager passed into `manager.transaction(cb)` with an
 * in-memory balances map, keyed the same way the real unique index is
 * (tenantId+productId+warehouseId) — good enough to exercise the actual
 * balance-adjustment logic without a real Postgres transaction.
 */
function buildManagerMock(initialBalances: StockBalance[] = []) {
  const balances = new Map<string, StockBalance>(
    initialBalances.map((b) => [`${b.tenantId}:${b.productId}:${b.warehouseId}`, { ...b } as StockBalance]),
  );

  return {
    balances,
    findOne: jest.fn(async (_entity: unknown, opts: { where: { tenantId: string; productId: string; warehouseId: string } }) => {
      const key = `${opts.where.tenantId}:${opts.where.productId}:${opts.where.warehouseId}`;
      return balances.get(key) ?? null;
    }),
    create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
    save: jest.fn(async (data: StockBalance | StockMovement) => {
      if ('quantity' in data) {
        const key = `${data.tenantId}:${data.productId}:${data.warehouseId}`;
        balances.set(key, data as StockBalance);
      }
      return data;
    }),
  };
}

function buildReposMock(initialBalances: StockBalance[] = []) {
  const manager = buildManagerMock(initialBalances);
  const movementsRepo = {
    manager: { transaction: jest.fn(async (cb: (m: typeof manager) => unknown) => cb(manager)) },
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<StockMovement>>;
  const balancesRepo = { find: jest.fn() } as unknown as jest.Mocked<Repository<StockBalance>>;
  return { manager, movementsRepo, balancesRepo };
}

describe('StockService', () => {
  describe('recordMovement', () => {
    it('creates the balance from zero on a first purchase', async () => {
      const { manager, movementsRepo, balancesRepo } = buildReposMock();
      const service = new StockService(balancesRepo, movementsRepo);

      const movement = await service.recordMovement('tenant-a', 'user-1', {
        productId: 'p1',
        warehouseId: 'w1',
        type: StockMovementType.PURCHASE,
        quantity: 10,
        direction: 'in',
      });

      expect(movement.quantityDelta).toBe(10);
      expect(manager.balances.get('tenant-a:p1:w1')?.quantity).toBe(10);
    });

    it('rejects a sale that would take stock negative', async () => {
      const { movementsRepo, balancesRepo } = buildReposMock([
        { tenantId: 'tenant-a', productId: 'p1', warehouseId: 'w1', quantity: 5 } as StockBalance,
      ]);
      const service = new StockService(balancesRepo, movementsRepo);

      await expect(
        service.recordMovement('tenant-a', 'user-1', {
          productId: 'p1',
          warehouseId: 'w1',
          type: StockMovementType.SALE,
          quantity: 10,
          direction: 'out',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('decrements the balance on a sale within available stock', async () => {
      const { manager, movementsRepo, balancesRepo } = buildReposMock([
        { tenantId: 'tenant-a', productId: 'p1', warehouseId: 'w1', quantity: 10 } as StockBalance,
      ]);
      const service = new StockService(balancesRepo, movementsRepo);

      await service.recordMovement('tenant-a', 'user-1', {
        productId: 'p1',
        warehouseId: 'w1',
        type: StockMovementType.SALE,
        quantity: 4,
        direction: 'out',
      });

      expect(manager.balances.get('tenant-a:p1:w1')?.quantity).toBe(6);
    });

    it('allows a negative-direction adjustment to correct a count', async () => {
      const { manager, movementsRepo, balancesRepo } = buildReposMock([
        { tenantId: 'tenant-a', productId: 'p1', warehouseId: 'w1', quantity: 20 } as StockBalance,
      ]);
      const service = new StockService(balancesRepo, movementsRepo);

      await service.recordMovement('tenant-a', 'user-1', {
        productId: 'p1',
        warehouseId: 'w1',
        type: StockMovementType.ADJUSTMENT,
        quantity: 3,
        direction: 'out',
      });

      expect(manager.balances.get('tenant-a:p1:w1')?.quantity).toBe(17);
    });
  });

  describe('transfer', () => {
    it('rejects transferring a product to the same warehouse', async () => {
      const { movementsRepo, balancesRepo } = buildReposMock();
      const service = new StockService(balancesRepo, movementsRepo);

      await expect(
        service.transfer('tenant-a', 'user-1', { productId: 'p1', fromWarehouseId: 'w1', toWarehouseId: 'w1', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('moves stock atomically from one warehouse to another, sharing a transfer group id', async () => {
      const { manager, movementsRepo, balancesRepo } = buildReposMock([
        { tenantId: 'tenant-a', productId: 'p1', warehouseId: 'w1', quantity: 10 } as StockBalance,
      ]);
      const service = new StockService(balancesRepo, movementsRepo);

      const result = await service.transfer('tenant-a', 'user-1', {
        productId: 'p1',
        fromWarehouseId: 'w1',
        toWarehouseId: 'w2',
        quantity: 4,
      });

      expect(manager.balances.get('tenant-a:p1:w1')?.quantity).toBe(6);
      expect(manager.balances.get('tenant-a:p1:w2')?.quantity).toBe(4);
      expect(result.out.transferGroupId).toBe(result.in.transferGroupId);
      expect(result.out.quantityDelta).toBe(-4);
      expect(result.in.quantityDelta).toBe(4);
    });

    it('rejects a transfer that would leave the source warehouse negative', async () => {
      const { movementsRepo, balancesRepo } = buildReposMock([
        { tenantId: 'tenant-a', productId: 'p1', warehouseId: 'w1', quantity: 2 } as StockBalance,
      ]);
      const service = new StockService(balancesRepo, movementsRepo);

      await expect(
        service.transfer('tenant-a', 'user-1', { productId: 'p1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
