import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

/**
 * Denormalized current balance per product+warehouse, kept in sync
 * transactionally by StockService every time a movement is recorded —
 * deliberately not computed on read by summing inventory_stock_movements,
 * so "what's my stock right now" stays a cheap lookup even as the
 * movement history grows.
 */
@Entity('inventory_stock_balances')
@Index(['tenantId', 'productId', 'warehouseId'], { unique: true })
export class StockBalance extends TenantScopedEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  quantity: number;
}
