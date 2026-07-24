import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionOrder, ProductionOrderStatus } from './entities/production-order.entity';
import { ProductionOrderConsumption } from './entities/production-order-consumption.entity';
import { BillOfMaterial } from './entities/bill-of-material.entity';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { CompleteProductionOrderDto } from './dto/complete-production-order.dto';
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
export class ProductionOrdersService extends TenantScopedService<ProductionOrder> {
  constructor(
    @InjectRepository(ProductionOrder) repo: Repository<ProductionOrder>,
    @InjectRepository(ProductionOrderConsumption) private readonly consumptionsRepo: Repository<ProductionOrderConsumption>,
    @InjectRepository(BillOfMaterial) private readonly bomsRepo: Repository<BillOfMaterial>,
    private readonly productsService: ProductsService,
    private readonly warehousesService: WarehousesService,
    private readonly stockService: StockService,
    private readonly documentSeriesService: DocumentSeriesService,
  ) {
    super(repo);
  }

  async create(tenantId: string, dto: CreateProductionOrderDto): Promise<ProductionOrder> {
    await this.productsService.findOneForTenant(tenantId, dto.productId);
    await this.warehousesService.findOneForTenant(tenantId, dto.warehouseId);
    const bom = await this.bomsRepo.findOne({ where: { id: dto.bomId, tenantId } });
    if (!bom) throw new BadRequestException('Lista de materiales no encontrada');
    if (bom.productId !== dto.productId) {
      throw new BadRequestException('La lista de materiales seleccionada no corresponde a este producto');
    }

    const orderNumber = await this.documentSeriesService.consumeNext(tenantId, 'production_order');
    const order = this.repository.create({
      tenantId,
      orderNumber,
      productId: dto.productId,
      bomId: dto.bomId,
      warehouseId: dto.warehouseId,
      quantityPlanned: dto.quantityPlanned,
      status: ProductionOrderStatus.DRAFT,
      plannedStartDate: dto.plannedStartDate ?? null,
      plannedEndDate: dto.plannedEndDate ?? null,
      notes: dto.notes ?? null,
    });
    return this.repository.save(order);
  }

  /** Pulls raw materials from stock per the BOM, scaled to
   * quantityPlanned, and snapshots each component's cost at this moment
   * — a later change to the product's costPrice won't rewrite this
   * order's totalCost. Throws (via StockService) if any component lacks
   * enough stock, leaving the order untouched. */
  async start(tenantId: string, actingUserId: string, id: string): Promise<ProductionOrder> {
    const order = await this.findOneForTenant(tenantId, id);
    if (order.status !== ProductionOrderStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden iniciar órdenes en borrador');
    }
    const bom = await this.bomsRepo.findOne({ where: { id: order.bomId, tenantId } });
    if (!bom) throw new BadRequestException('Lista de materiales no encontrada');

    const scale = Number(order.quantityPlanned) / Number(bom.outputQuantity);
    let totalCost = 0;
    for (const line of bom.lines) {
      const component = await this.productsService.findOneForTenant(tenantId, line.componentProductId);
      const quantityConsumed = round2(Number(line.quantity) * scale);
      await this.stockService.recordMovement(tenantId, actingUserId, {
        productId: line.componentProductId,
        warehouseId: order.warehouseId,
        type: StockMovementType.ADJUSTMENT,
        quantity: quantityConsumed,
        direction: 'out',
        note: `Consumo de orden de producción ${order.orderNumber}`,
      });
      const unitCost = Number(component.costPrice);
      const lineCost = round2(quantityConsumed * unitCost);
      totalCost += lineCost;
      await this.consumptionsRepo.save(
        this.consumptionsRepo.create({
          tenantId,
          orderId: order.id,
          componentProductId: line.componentProductId,
          quantityConsumed,
          unitCost,
          totalCost: lineCost,
        }),
      );
    }

    order.status = ProductionOrderStatus.IN_PROGRESS;
    order.actualStartDate = new Date();
    order.totalCost = round2(totalCost);
    return this.repository.save(order);
  }

  /** Adds the finished-good output to stock. quantityProduced is entered
   * by hand rather than assumed equal to quantityPlanned — actual yield
   * can differ from what was planned. */
  async complete(tenantId: string, actingUserId: string, id: string, dto: CompleteProductionOrderDto): Promise<ProductionOrder> {
    const order = await this.findOneForTenant(tenantId, id);
    if (order.status !== ProductionOrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Solo se pueden completar órdenes en curso');
    }
    await this.stockService.recordMovement(tenantId, actingUserId, {
      productId: order.productId,
      warehouseId: order.warehouseId,
      type: StockMovementType.ADJUSTMENT,
      quantity: dto.quantityProduced,
      direction: 'in',
      note: `Rendimiento de orden de producción ${order.orderNumber}`,
    });
    order.quantityProduced = dto.quantityProduced;
    order.status = ProductionOrderStatus.COMPLETED;
    order.actualEndDate = new Date();
    return this.repository.save(order);
  }

  /** Only a still-untouched draft can be cancelled — once start() has
   * pulled stock, cancelling would need to reverse those movements, which
   * this "manageable scope" version doesn't implement. */
  async cancel(tenantId: string, id: string): Promise<ProductionOrder> {
    const order = await this.findOneForTenant(tenantId, id);
    if (order.status !== ProductionOrderStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden cancelar órdenes en borrador');
    }
    order.status = ProductionOrderStatus.CANCELLED;
    return this.repository.save(order);
  }

  findConsumptions(tenantId: string, orderId: string): Promise<ProductionOrderConsumption[]> {
    return this.consumptionsRepo.find({ where: { tenantId, orderId } });
  }
}
