import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum StockMovementType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
}

@Entity('inventory_stock_movements')
export class StockMovement extends TenantScopedEntity {
  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Index()
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  /** Signed — positive increases the balance, negative decreases it. */
  @Column({ name: 'quantity_delta', type: 'numeric', precision: 14, scale: 2 })
  quantityDelta: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  /** Shared by both legs of a transfer (the OUT from source and the IN to
   * destination), so they can be displayed/reversed together. Null for
   * purchase/sale/adjustment movements. */
  @Index()
  @Column({ name: 'transfer_group_id', type: 'uuid', nullable: true })
  transferGroupId: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string;
}
