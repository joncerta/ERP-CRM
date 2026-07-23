import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('finance_purchase_order_items')
export class PurchaseOrderItem extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  /** Links back to Inventory so a receipt can post a real stock movement.
   * Null means this line is a non-stocked expense (e.g. a service). */
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column()
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 1 })
  quantity: number;

  /** How much of `quantity` has actually arrived so far — drives whether
   * the order is partially or fully received. */
  @Column({ name: 'quantity_received', type: 'numeric', precision: 12, scale: 2, default: 0 })
  quantityReceived: number;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 14, scale: 2 })
  unitCost: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  total: number;
}
