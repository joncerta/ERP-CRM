import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MaintenanceWorkOrder } from './maintenance-work-order.entity';

@Entity('maintenance_work_order_parts')
export class WorkOrderPart extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'work_order_id', type: 'uuid' })
  workOrderId: string;

  @ManyToOne(() => MaintenanceWorkOrder, (order) => order.parts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: MaintenanceWorkOrder;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  quantity: number;
}
