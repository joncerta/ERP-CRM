import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

/** One raw-material line consumed when a ProductionOrder starts — a
 * record of what actually left stock and at what cost, independent of
 * the BOM (which can change later without rewriting past orders). */
@Entity('production_order_consumptions')
export class ProductionOrderConsumption extends TenantScopedEntity {
  @Index()
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'component_product_id', type: 'uuid' })
  componentProductId: string;

  @Column({ name: 'quantity_consumed', type: 'numeric', precision: 12, scale: 4 })
  quantityConsumed: number;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 14, scale: 4 })
  unitCost: number;

  @Column({ name: 'total_cost', type: 'numeric', precision: 14, scale: 2 })
  totalCost: number;
}
