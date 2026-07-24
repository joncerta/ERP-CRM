import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryNote, DeliveryNoteStatus } from './entities/delivery-note.entity';
import { DeliveryNoteItem } from './entities/delivery-note-item.entity';
import { Vehicle, VehicleStatus } from './entities/vehicle.entity';
import { Driver } from './entities/driver.entity';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto';
import { UpdateDeliveryNoteDto } from './dto/update-delivery-note.dto';
import { DeliverDeliveryNoteDto } from './dto/deliver-delivery-note.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';
import { ProductsService } from '../inventory/products/products.service';
import { WarehousesService } from '../inventory/warehouses/warehouses.service';
import { StockService } from '../inventory/stock/stock.service';
import { StockMovementType } from '../inventory/stock/entities/stock-movement.entity';
import { InvoicesService } from '../finance/invoices/invoices.service';
import { DocumentSeriesService } from '../core/org/document-series.service';

@Injectable()
export class DeliveryNotesService extends TenantScopedService<DeliveryNote> {
  constructor(
    @InjectRepository(DeliveryNote) repo: Repository<DeliveryNote>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    private readonly productsService: ProductsService,
    private readonly warehousesService: WarehousesService,
    private readonly stockService: StockService,
    private readonly invoicesService: InvoicesService,
    private readonly documentSeriesService: DocumentSeriesService,
  ) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateDeliveryNoteDto): Promise<DeliveryNote> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: dto.vehicleId, tenantId } });
    if (!vehicle) throw new BadRequestException('Vehículo no encontrado');
    const driver = await this.driverRepo.findOne({ where: { id: dto.driverId, tenantId } });
    if (!driver) throw new BadRequestException('Conductor no encontrado');
    await this.warehousesService.findOneForTenant(tenantId, dto.warehouseId);
    if (dto.relatedInvoiceId) {
      await this.invoicesService.findOneForTenant(tenantId, dto.relatedInvoiceId);
    }
    for (const item of dto.items) {
      await this.productsService.findOneForTenant(tenantId, item.productId);
    }

    const noteNumber = await this.documentSeriesService.consumeNext(tenantId, 'delivery_note');
    const note = this.repository.create({
      tenantId,
      noteNumber,
      vehicleId: dto.vehicleId,
      driverId: dto.driverId,
      warehouseId: dto.warehouseId,
      relatedInvoiceId: dto.relatedInvoiceId ?? null,
      destinationAddress: dto.destinationAddress,
      status: DeliveryNoteStatus.PLANNED,
      notes: dto.notes ?? null,
      items: dto.items.map((i) => Object.assign(new DeliveryNoteItem(), i)),
    });
    return this.repository.save(note);
  }

  async update(tenantId: string, id: string, dto: UpdateDeliveryNoteDto): Promise<DeliveryNote> {
    const note = await this.findOneForTenant(tenantId, id);
    if (note.status !== DeliveryNoteStatus.PLANNED) {
      throw new BadRequestException('Solo se pueden editar guías planeadas');
    }
    if (dto.vehicleId) {
      const vehicle = await this.vehicleRepo.findOne({ where: { id: dto.vehicleId, tenantId } });
      if (!vehicle) throw new BadRequestException('Vehículo no encontrado');
      note.vehicleId = dto.vehicleId;
    }
    if (dto.driverId) {
      const driver = await this.driverRepo.findOne({ where: { id: dto.driverId, tenantId } });
      if (!driver) throw new BadRequestException('Conductor no encontrado');
      note.driverId = dto.driverId;
    }
    if (dto.destinationAddress !== undefined) note.destinationAddress = dto.destinationAddress;
    if (dto.notes !== undefined) note.notes = dto.notes ?? null;
    if (dto.items) {
      for (const item of dto.items) {
        await this.productsService.findOneForTenant(tenantId, item.productId);
      }
      note.items = dto.items.map((i) => Object.assign(new DeliveryNoteItem(), i));
    }
    return this.repository.save(note);
  }

  /** Stock leaves the warehouse right here, at dispatch — not at
   * creation (still just a plan) and not at markDelivered (already gone
   * by then). */
  async dispatch(tenantId: string, actingUserId: string, id: string): Promise<DeliveryNote> {
    const note = await this.findOneForTenant(tenantId, id);
    if (note.status !== DeliveryNoteStatus.PLANNED) {
      throw new BadRequestException('Solo se pueden despachar guías planeadas');
    }
    for (const item of note.items) {
      await this.stockService.recordMovement(tenantId, actingUserId, {
        productId: item.productId,
        warehouseId: note.warehouseId,
        type: StockMovementType.ADJUSTMENT,
        quantity: Number(item.quantity),
        direction: 'out',
        note: `Despacho de guía de entrega ${note.noteNumber}`,
      });
    }
    note.status = DeliveryNoteStatus.IN_TRANSIT;
    note.dispatchedAt = new Date();
    const saved = await this.repository.save(note);
    await this.vehicleRepo.update({ id: note.vehicleId, tenantId }, { status: VehicleStatus.IN_ROUTE });
    return saved;
  }

  async markDelivered(tenantId: string, id: string, dto: DeliverDeliveryNoteDto): Promise<DeliveryNote> {
    const note = await this.findOneForTenant(tenantId, id);
    if (note.status !== DeliveryNoteStatus.IN_TRANSIT) {
      throw new BadRequestException('Solo se pueden entregar guías en tránsito');
    }
    note.status = DeliveryNoteStatus.DELIVERED;
    note.deliveredAt = new Date();
    note.recipientName = dto.recipientName ?? null;
    const saved = await this.repository.save(note);
    await this.vehicleRepo.update({ id: note.vehicleId, tenantId }, { status: VehicleStatus.AVAILABLE });
    return saved;
  }

  async cancel(tenantId: string, id: string): Promise<DeliveryNote> {
    const note = await this.findOneForTenant(tenantId, id);
    if (note.status !== DeliveryNoteStatus.PLANNED) {
      throw new BadRequestException('Solo se pueden cancelar guías planeadas — una guía despachada ya movió stock');
    }
    note.status = DeliveryNoteStatus.CANCELLED;
    return this.repository.save(note);
  }

  findForVehicle(tenantId: string, vehicleId: string): Promise<DeliveryNote[]> {
    return this.repository.find({ where: { tenantId, vehicleId }, order: { createdAt: 'DESC' } });
  }
}
