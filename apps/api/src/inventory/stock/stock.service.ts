import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { StockBalance } from './entities/stock-balance.entity';
import { StockMovement, StockMovementType } from './entities/stock-movement.entity';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { Paginated } from '../../common/pagination/pagination.types';

export interface StockFilters {
  productId?: string;
  warehouseId?: string;
}

export interface StockListQuery extends ListQueryDto, StockFilters {}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockBalance) private readonly balancesRepo: Repository<StockBalance>,
    @InjectRepository(StockMovement) private readonly movementsRepo: Repository<StockMovement>,
  ) {}

  findBalances(tenantId: string, filters: StockFilters = {}): Promise<StockBalance[]> {
    return this.balancesRepo.find({ where: { tenantId, ...this.compactFilters(filters) } });
  }

  findMovements(tenantId: string, filters: StockFilters = {}): Promise<StockMovement[]> {
    return this.movementsRepo.find({
      where: { tenantId, ...this.compactFilters(filters) },
      order: { createdAt: 'DESC' },
    });
  }

  async findBalancesPaginated(tenantId: string, query: StockListQuery): Promise<Paginated<StockBalance>> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 200);
    const qb = this.balancesRepo.createQueryBuilder('balance').where('balance.tenantId = :tenantId', { tenantId });
    if (query.productId) qb.andWhere('balance.productId = :productId', { productId: query.productId });
    if (query.warehouseId) qb.andWhere('balance.warehouseId = :warehouseId', { warehouseId: query.warehouseId });
    qb.orderBy('balance.quantity', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findMovementsPaginated(tenantId: string, query: StockListQuery): Promise<Paginated<StockMovement>> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 200);
    const qb = this.movementsRepo.createQueryBuilder('movement').where('movement.tenantId = :tenantId', { tenantId });
    if (query.productId) qb.andWhere('movement.productId = :productId', { productId: query.productId });
    if (query.warehouseId) qb.andWhere('movement.warehouseId = :warehouseId', { warehouseId: query.warehouseId });
    qb.orderBy('movement.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  /** TypeORM (this version) throws on an explicit `undefined` in a where
   * clause instead of ignoring it — strip unset optional query filters
   * before they reach `find()`. */
  private compactFilters(filters: StockFilters): StockFilters {
    const result: StockFilters = {};
    if (filters.productId) result.productId = filters.productId;
    if (filters.warehouseId) result.warehouseId = filters.warehouseId;
    return result;
  }

  async recordMovement(tenantId: string, userId: string, dto: CreateMovementDto): Promise<StockMovement> {
    const delta = dto.direction === 'in' ? dto.quantity : -dto.quantity;
    return this.movementsRepo.manager.transaction(async (manager) => {
      await this.applyDelta(manager, tenantId, dto.productId, dto.warehouseId, delta);
      const movement = manager.create(StockMovement, {
        tenantId,
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        type: dto.type,
        quantityDelta: delta,
        note: dto.note ?? null,
        createdByUserId: userId,
        transferGroupId: null,
      });
      return manager.save(movement);
    });
  }

  async transfer(tenantId: string, userId: string, dto: CreateTransferDto): Promise<{ out: StockMovement; in: StockMovement }> {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('La bodega de origen y destino no pueden ser la misma');
    }
    const transferGroupId = randomUUID();

    return this.movementsRepo.manager.transaction(async (manager) => {
      await this.applyDelta(manager, tenantId, dto.productId, dto.fromWarehouseId, -dto.quantity);
      await this.applyDelta(manager, tenantId, dto.productId, dto.toWarehouseId, dto.quantity);

      const out = await manager.save(
        manager.create(StockMovement, {
          tenantId,
          productId: dto.productId,
          warehouseId: dto.fromWarehouseId,
          type: StockMovementType.TRANSFER,
          quantityDelta: -dto.quantity,
          note: dto.note ?? null,
          createdByUserId: userId,
          transferGroupId,
        }),
      );
      const inMovement = await manager.save(
        manager.create(StockMovement, {
          tenantId,
          productId: dto.productId,
          warehouseId: dto.toWarehouseId,
          type: StockMovementType.TRANSFER,
          quantityDelta: dto.quantity,
          note: dto.note ?? null,
          createdByUserId: userId,
          transferGroupId,
        }),
      );
      return { out, in: inMovement };
    });
  }

  /** Creates the balance row on first movement if needed, and refuses to
   * let a product/warehouse go negative — that would mean less stock than
   * physically exists. */
  private async applyDelta(
    manager: EntityManager,
    tenantId: string,
    productId: string,
    warehouseId: string,
    delta: number,
  ): Promise<void> {
    let balance = await manager.findOne(StockBalance, { where: { tenantId, productId, warehouseId } });
    if (!balance) {
      balance = manager.create(StockBalance, { tenantId, productId, warehouseId, quantity: 0 });
    }
    const newQuantity = Number(balance.quantity) + delta;
    if (newQuantity < 0) {
      throw new BadRequestException('Stock insuficiente para esta operación');
    }
    balance.quantity = newQuantity;
    await manager.save(balance);
  }
}
