import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DeliveryNotesService } from './delivery-notes.service';
import { DeliveryNote, DeliveryNoteStatus } from './entities/delivery-note.entity';
import { DeliveryNoteItem } from './entities/delivery-note-item.entity';
import { Vehicle, VehicleStatus } from './entities/vehicle.entity';
import { Driver } from './entities/driver.entity';
import { ProductsService } from '../inventory/products/products.service';
import { WarehousesService } from '../inventory/warehouses/warehouses.service';
import { StockService } from '../inventory/stock/stock.service';
import { InvoicesService } from '../finance/invoices/invoices.service';
import { DocumentSeriesService } from '../core/org/document-series.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'note-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<DeliveryNote>>;
  const vehicleRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<Repository<Vehicle>>;
  const driverRepo = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Driver>>;
  const productsService = { findOneForTenant: jest.fn() } as unknown as jest.Mocked<ProductsService>;
  const warehousesService = { findOneForTenant: jest.fn().mockResolvedValue({ id: 'wh-1' }) } as unknown as jest.Mocked<WarehousesService>;
  const stockService = { recordMovement: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<StockService>;
  const invoicesService = { findOneForTenant: jest.fn() } as unknown as jest.Mocked<InvoicesService>;
  const documentSeriesService = { consumeNext: jest.fn().mockResolvedValue('GD-000001') } as unknown as jest.Mocked<DocumentSeriesService>;
  return { repo, vehicleRepo, driverRepo, productsService, warehousesService, stockService, invoicesService, documentSeriesService };
}

function buildService() {
  const deps = buildDeps();
  const service = new DeliveryNotesService(
    deps.repo,
    deps.vehicleRepo,
    deps.driverRepo,
    deps.productsService,
    deps.warehousesService,
    deps.stockService,
    deps.invoicesService,
    deps.documentSeriesService,
  );
  return { service, ...deps };
}

describe('DeliveryNotesService', () => {
  describe('dispatch', () => {
    it('pulls every item from stock and puts the vehicle in route', async () => {
      const { service, repo, vehicleRepo, stockService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'note-1',
        tenantId: 'tenant-a',
        noteNumber: 'GD-000001',
        vehicleId: 'veh-1',
        warehouseId: 'wh-1',
        status: DeliveryNoteStatus.PLANNED,
        items: [{ productId: 'prod-1', quantity: 5 } as DeliveryNoteItem],
      } as DeliveryNote);

      const note = await service.dispatch('tenant-a', 'user-1', 'note-1');

      expect(stockService.recordMovement).toHaveBeenCalledWith('tenant-a', 'user-1', expect.objectContaining({
        productId: 'prod-1',
        warehouseId: 'wh-1',
        quantity: 5,
        direction: 'out',
      }));
      expect(note.status).toBe(DeliveryNoteStatus.IN_TRANSIT);
      expect(note.dispatchedAt).toBeInstanceOf(Date);
      expect(vehicleRepo.update).toHaveBeenCalledWith({ id: 'veh-1', tenantId: 'tenant-a' }, { status: VehicleStatus.IN_ROUTE });
    });

    it('refuses to dispatch a note that is not planned', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'note-1', tenantId: 'tenant-a', status: DeliveryNoteStatus.DELIVERED } as DeliveryNote);

      await expect(service.dispatch('tenant-a', 'user-1', 'note-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markDelivered', () => {
    it('refuses to deliver a note that is not in transit', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'note-1', tenantId: 'tenant-a', status: DeliveryNoteStatus.PLANNED } as DeliveryNote);

      await expect(service.markDelivered('tenant-a', 'note-1', {})).rejects.toThrow(BadRequestException);
    });

    it('frees the vehicle once delivered', async () => {
      const { service, repo, vehicleRepo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'note-1', tenantId: 'tenant-a', vehicleId: 'veh-1', status: DeliveryNoteStatus.IN_TRANSIT } as DeliveryNote);

      const note = await service.markDelivered('tenant-a', 'note-1', { recipientName: 'Juan Pérez' });

      expect(note.status).toBe(DeliveryNoteStatus.DELIVERED);
      expect(note.recipientName).toBe('Juan Pérez');
      expect(vehicleRepo.update).toHaveBeenCalledWith({ id: 'veh-1', tenantId: 'tenant-a' }, { status: VehicleStatus.AVAILABLE });
    });
  });

  describe('cancel', () => {
    it('refuses to cancel a note that has already been dispatched', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'note-1', tenantId: 'tenant-a', status: DeliveryNoteStatus.IN_TRANSIT } as DeliveryNote);

      await expect(service.cancel('tenant-a', 'note-1')).rejects.toThrow(BadRequestException);
    });
  });
});
