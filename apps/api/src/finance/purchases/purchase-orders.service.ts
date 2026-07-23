import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders-query.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Paginated } from '../../common/pagination/pagination.types';
import { DocumentSeriesService } from '../../core/org/document-series.service';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';
import { StockService } from '../../inventory/stock/stock.service';
import { StockMovementType } from '../../inventory/stock/entities/stock-movement.entity';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class PurchaseOrdersService extends TenantScopedService<PurchaseOrder> {
  constructor(
    @InjectRepository(PurchaseOrder) repo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem) private readonly itemsRepo: Repository<PurchaseOrderItem>,
    private readonly documentSeriesService: DocumentSeriesService,
    private readonly notificationEscalationService: NotificationEscalationService,
    private readonly stockService: StockService,
  ) {
    super(repo);
  }

  private buildItemsAndTotals(items: { productId?: string; description: string; quantity: number; unitCost: number }[]) {
    const orderItems = items.map((item) =>
      Object.assign(new PurchaseOrderItem(), {
        productId: item.productId ?? null,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitCost,
        total: round2(item.quantity * item.unitCost),
      }),
    );
    const subtotal = round2(orderItems.reduce((sum, item) => sum + Number(item.total), 0));
    return { orderItems, subtotal };
  }

  private nextOrderNumber(tenantId: string): Promise<string> {
    return this.documentSeriesService.consumeNext(tenantId, 'purchase_order');
  }

  findPaginated(tenantId: string, query: ListPurchaseOrdersQueryDto): Promise<Paginated<PurchaseOrder>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'purchaseOrder',
      searchColumns: ['orderNumber'],
      sortableColumns: ['orderNumber', 'status', 'total', 'expectedDate', 'createdAt'],
      defaultSortBy: 'createdAt',
      applyFilters: (qb) => {
        if (query.status) qb.andWhere('purchaseOrder.status = :status', { status: query.status });
        if (query.ownerUserId) qb.andWhere('purchaseOrder.ownerUserId = :ownerUserId', { ownerUserId: query.ownerUserId });
        if (query.supplierId) qb.andWhere('purchaseOrder.supplierId = :supplierId', { supplierId: query.supplierId });
      },
    });
  }

  async create(tenantId: string, ownerUserId: string, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const { orderItems, subtotal } = this.buildItemsAndTotals(dto.items);
    const order = this.repository.create({
      tenantId,
      ownerUserId,
      supplierId: dto.supplierId,
      currencyCode: dto.currencyCode ?? 'USD',
      expectedDate: dto.expectedDate ?? null,
      status: PurchaseOrderStatus.DRAFT,
      orderNumber: await this.nextOrderNumber(tenantId),
      items: orderItems,
      subtotal,
      tax: 0,
      total: subtotal,
    });
    return this.repository.save(order);
  }

  async update(tenantId: string, id: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const order = await this.findOneForTenant(tenantId, id);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden editar órdenes en borrador');
    }
    if (dto.items) {
      const { orderItems, subtotal } = this.buildItemsAndTotals(dto.items);
      order.items = orderItems;
      order.subtotal = subtotal;
      order.total = subtotal;
    }
    if (dto.supplierId) order.supplierId = dto.supplierId;
    if (dto.currencyCode) order.currencyCode = dto.currencyCode;
    if (dto.expectedDate) order.expectedDate = dto.expectedDate;
    return this.repository.save(order);
  }

  async send(tenantId: string, id: string): Promise<PurchaseOrder> {
    const order = await this.findOneForTenant(tenantId, id);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('La orden ya fue enviada');
    }
    order.status = PurchaseOrderStatus.SENT;
    return this.repository.save(order);
  }

  async cancel(tenantId: string, id: string): Promise<PurchaseOrder> {
    const order = await this.findOneForTenant(tenantId, id);
    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('No se puede cancelar una orden ya recibida por completo');
    }
    order.status = PurchaseOrderStatus.CANCELLED;
    return this.repository.save(order);
  }

  /** Records a (possibly partial) receipt of goods against an order: bumps
   * each line's quantityReceived, posts a real stock movement for lines
   * linked to an inventory product, and flips the order's status to
   * PARTIALLY_RECEIVED or RECEIVED depending on whether every line is now
   * complete. Notifies the order owner (and their manager) either way. */
  async receive(
    tenantId: string,
    orderId: string,
    actingUserId: string,
    dto: ReceivePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const order = await this.findOneForTenant(tenantId, orderId);
    if (![PurchaseOrderStatus.SENT, PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(order.status)) {
      throw new BadRequestException('Esta orden no admite recepción de mercancía en su estado actual');
    }

    for (const line of dto.lines) {
      const item = order.items.find((candidate) => candidate.id === line.itemId);
      if (!item) {
        throw new BadRequestException(`La línea ${line.itemId} no pertenece a esta orden`);
      }
      const remaining = Number(item.quantity) - Number(item.quantityReceived);
      if (line.quantity > remaining) {
        throw new BadRequestException(`La cantidad recibida excede lo pendiente para "${item.description}"`);
      }

      item.quantityReceived = round2(Number(item.quantityReceived) + line.quantity);
      await this.itemsRepo.save(item);

      if (item.productId) {
        await this.stockService.recordMovement(tenantId, actingUserId, {
          productId: item.productId,
          warehouseId: line.warehouseId,
          type: StockMovementType.PURCHASE,
          quantity: line.quantity,
          direction: 'in',
          note: `Recepción de orden de compra ${order.orderNumber}`,
        });
      }
    }

    const allReceived = order.items.every((item) => Number(item.quantityReceived) >= Number(item.quantity));
    order.status = allReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED;
    await this.repository.save(order);

    await this.notificationEscalationService.notifyWithEscalation(
      tenantId,
      order.ownerUserId,
      'purchase_order.received',
      allReceived ? 'Orden de compra recibida completa' : 'Recepción parcial registrada',
      `Se registró una recepción de mercancía para la orden ${order.orderNumber}.`,
      '/purchases',
    );

    return this.findOneForTenant(tenantId, orderId);
  }
}
