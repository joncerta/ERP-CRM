import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { WarehousesService } from './warehouses.service';
import { Warehouse } from './entities/warehouse.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';

function buildReposMock() {
  const warehousesRepo = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'warehouse-1', ...data })),
    remove: jest.fn(),
  } as unknown as jest.Mocked<Repository<Warehouse>>;
  const movementsRepo = { count: jest.fn().mockResolvedValue(0) } as unknown as jest.Mocked<Repository<StockMovement>>;
  return { warehousesRepo, movementsRepo };
}

describe('WarehousesService', () => {
  describe('remove', () => {
    it('refuses to delete a warehouse with recorded movements', async () => {
      const { warehousesRepo, movementsRepo } = buildReposMock();
      warehousesRepo.findOne.mockResolvedValue({ id: 'warehouse-1', tenantId: 'tenant-a' } as Warehouse);
      movementsRepo.count.mockResolvedValue(1);
      const service = new WarehousesService(warehousesRepo, movementsRepo);

      await expect(service.remove('tenant-a', 'warehouse-1')).rejects.toThrow(BadRequestException);
      expect(warehousesRepo.remove).not.toHaveBeenCalled();
    });

    it('deletes an unused warehouse', async () => {
      const { warehousesRepo, movementsRepo } = buildReposMock();
      warehousesRepo.findOne.mockResolvedValue({ id: 'warehouse-1', tenantId: 'tenant-a' } as Warehouse);
      movementsRepo.count.mockResolvedValue(0);
      const service = new WarehousesService(warehousesRepo, movementsRepo);

      await service.remove('tenant-a', 'warehouse-1');
      expect(warehousesRepo.remove).toHaveBeenCalled();
    });
  });
});
