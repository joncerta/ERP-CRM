import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum ProductionOrderStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/** No scheduler triggers a start/completion — "planeación, tiempos" here
 * means recording planned vs. actual dates, not automated execution;
 * someone calls start()/complete() when it actually happens, same
 * manual-trigger pattern as every other time-based process in this
 * project. */
@Entity('production_orders')
export class ProductionOrder extends TenantScopedEntity {
  @Column({ name: 'order_number' })
  orderNumber: string;

  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Index()
  @Column({ name: 'bom_id', type: 'uuid' })
  bomId: string;

  @Index()
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'quantity_planned', type: 'numeric', precision: 12, scale: 2 })
  quantityPlanned: number;

  @Column({ name: 'quantity_produced', type: 'numeric', precision: 12, scale: 2, default: 0 })
  quantityProduced: number;

  @Column({ type: 'enum', enum: ProductionOrderStatus, default: ProductionOrderStatus.DRAFT })
  status: ProductionOrderStatus;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate: string | null;

  @Column({ name: 'planned_end_date', type: 'date', nullable: true })
  plannedEndDate: string | null;

  @Column({ name: 'actual_start_date', type: 'timestamptz', nullable: true })
  actualStartDate: Date | null;

  @Column({ name: 'actual_end_date', type: 'timestamptz', nullable: true })
  actualEndDate: Date | null;

  /** Sum of raw-material costs consumed at start() time (each snapshot at
   * the component's costPrice then, not recalculated if costs change
   * later) — divide by quantityProduced once completed for unit cost. */
  @Column({ name: 'total_cost', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalCost: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
