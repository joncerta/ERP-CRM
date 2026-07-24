import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceWorkOrder, WorkOrderStatus } from './entities/maintenance-work-order.entity';
import { WorkOrderPart } from './entities/work-order-part.entity';
import { Equipment, EquipmentStatus } from './entities/equipment.entity';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';
import { ProductsService } from '../inventory/products/products.service';
import { WarehousesService } from '../inventory/warehouses/warehouses.service';
import { StockService } from '../inventory/stock/stock.service';
import { StockMovementType } from '../inventory/stock/entities/stock-movement.entity';
import { DocumentSeriesService } from '../core/org/document-series.service';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class WorkOrdersService extends TenantScopedService<MaintenanceWorkOrder> {
  constructor(
    @InjectRepository(MaintenanceWorkOrder) repo: Repository<MaintenanceWorkOrder>,
    @InjectRepository(Equipment) private readonly equipmentRepo: Repository<Equipment>,
    private readonly productsService: ProductsService,
    private readonly warehousesService: WarehousesService,
    private readonly stockService: StockService,
    private readonly documentSeriesService: DocumentSeriesService,
  ) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateWorkOrderDto): Promise<MaintenanceWorkOrder> {
    const equipment = await this.equipmentRepo.findOne({ where: { id: dto.equipmentId, tenantId } });
    if (!equipment) throw new BadRequestException('Equipo no encontrado');
    await this.warehousesService.findOneForTenant(tenantId, dto.warehouseId);
    for (const part of dto.parts ?? []) {
      await this.productsService.findOneForTenant(tenantId, part.productId);
    }

    const orderNumber = await this.documentSeriesService.consumeNext(tenantId, 'maintenance_work_order');
    const order = this.repository.create({
      tenantId,
      orderNumber,
      equipmentId: dto.equipmentId,
      technicianId: dto.technicianId ?? null,
      warehouseId: dto.warehouseId,
      type: dto.type,
      priority: dto.priority,
      status: WorkOrderStatus.OPEN,
      scheduledDate: dto.scheduledDate ?? null,
      description: dto.description,
      parts: (dto.parts ?? []).map((p) => Object.assign(new WorkOrderPart(), p)),
    });
    return this.repository.save(order);
  }

  async update(tenantId: string, id: string, dto: UpdateWorkOrderDto): Promise<MaintenanceWorkOrder> {
    const order = await this.findOneForTenant(tenantId, id);
    if (order.status === WorkOrderStatus.COMPLETED || order.status === WorkOrderStatus.CANCELLED) {
      throw new BadRequestException('Esta orden ya fue cerrada y no se puede editar');
    }
    if (dto.technicianId !== undefined) order.technicianId = dto.technicianId ?? null;
    if (dto.scheduledDate !== undefined) order.scheduledDate = dto.scheduledDate;
    if (dto.parts) {
      for (const part of dto.parts) {
        await this.productsService.findOneForTenant(tenantId, part.productId);
      }
      order.parts = dto.parts.map((p) => Object.assign(new WorkOrderPart(), p));
    }
    return this.repository.save(order);
  }

  async start(tenantId: string, id: string): Promise<MaintenanceWorkOrder> {
    const order = await this.findOneForTenant(tenantId, id);
    if (order.status !== WorkOrderStatus.OPEN) {
      throw new BadRequestException('Solo se pueden iniciar órdenes abiertas');
    }
    order.status = WorkOrderStatus.IN_PROGRESS;
    order.startedAt = new Date();
    const saved = await this.repository.save(order);
    await this.equipmentRepo.update({ id: order.equipmentId, tenantId }, { status: EquipmentStatus.UNDER_MAINTENANCE });
    return saved;
  }

  /** Pulls every part from stock only now — a still-open or in-progress
   * order never touched inventory, so completing is the one moment parts
   * actually leave the shelf, snapshotting each product's costPrice at
   * that instant into totalPartsCost. */
  async complete(tenantId: string, actingUserId: string, id: string, dto: CompleteWorkOrderDto): Promise<MaintenanceWorkOrder> {
    const order = await this.findOneForTenant(tenantId, id);
    if (order.status !== WorkOrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Solo se pueden completar órdenes en curso');
    }

    let totalPartsCost = 0;
    for (const part of order.parts) {
      const product = await this.productsService.findOneForTenant(tenantId, part.productId);
      await this.stockService.recordMovement(tenantId, actingUserId, {
        productId: part.productId,
        warehouseId: order.warehouseId,
        type: StockMovementType.ADJUSTMENT,
        quantity: Number(part.quantity),
        direction: 'out',
        note: `Repuesto usado en orden de mantenimiento ${order.orderNumber}`,
      });
      totalPartsCost += Number(part.quantity) * Number(product.costPrice);
    }

    order.status = WorkOrderStatus.COMPLETED;
    order.completedAt = new Date();
    order.resolutionNotes = dto.resolutionNotes ?? null;
    order.totalPartsCost = round2(totalPartsCost);
    const saved = await this.repository.save(order);
    await this.equipmentRepo.update({ id: order.equipmentId, tenantId }, { status: EquipmentStatus.OPERATIONAL });
    return saved;
  }

  async cancel(tenantId: string, id: string): Promise<MaintenanceWorkOrder> {
    const order = await this.findOneForTenant(tenantId, id);
    if (order.status === WorkOrderStatus.COMPLETED || order.status === WorkOrderStatus.CANCELLED) {
      throw new BadRequestException('Esta orden ya fue cerrada');
    }
    order.status = WorkOrderStatus.CANCELLED;
    const saved = await this.repository.save(order);
    if (order.status === WorkOrderStatus.CANCELLED) {
      await this.equipmentRepo.update({ id: order.equipmentId, tenantId }, { status: EquipmentStatus.OPERATIONAL });
    }
    return saved;
  }

  findForEquipment(tenantId: string, equipmentId: string): Promise<MaintenanceWorkOrder[]> {
    return this.repository.find({ where: { tenantId, equipmentId }, order: { createdAt: 'DESC' } });
  }
}
