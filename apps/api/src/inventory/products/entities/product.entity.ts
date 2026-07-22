import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('inventory_products')
@Index(['tenantId', 'sku'], { unique: true })
export class Product extends TenantScopedEntity {
  @Column()
  sku: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  /** Home warehouse for this product — separate from the multi-warehouse
   * stock balances in StockBalance, which still track quantity per
   * (product, warehouse) pair independently of this. */
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'cost_price', type: 'numeric', precision: 14, scale: 2, default: 0 })
  costPrice: number;

  @Column({ name: 'sale_price', type: 'numeric', precision: 14, scale: 2, default: 0 })
  salePrice: number;

  /** Reorder point — informational only for now, no automatic alerts yet. */
  @Column({ name: 'min_stock', type: 'numeric', precision: 14, scale: 2, nullable: true })
  minStock: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
