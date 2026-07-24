import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { WorkOrderPart } from './work-order-part.entity';

export enum WorkOrderType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
}

export enum WorkOrderPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum WorkOrderStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/** Spare parts (also Inventory Products, same "consumed instead of sold"
 * idea as Production's raw materials) are only pulled from stock when
 * the order actually completes — a cancelled or still-open order never
 * touched stock, so cancel() stays safe at any point before completion. */
@Entity('maintenance_work_orders')
export class MaintenanceWorkOrder extends TenantScopedEntity {
  @Column({ name: 'order_number' })
  orderNumber: string;

  @Index()
  @Column({ name: 'equipment_id', type: 'uuid' })
  equipmentId: string;

  @Index()
  @Column({ name: 'technician_id', type: 'uuid', nullable: true })
  technicianId: string | null;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'enum', enum: WorkOrderType })
  type: WorkOrderType;

  @Column({ type: 'enum', enum: WorkOrderPriority, default: WorkOrderPriority.MEDIUM })
  priority: WorkOrderPriority;

  @Column({ type: 'enum', enum: WorkOrderStatus, default: WorkOrderStatus.OPEN })
  status: WorkOrderStatus;

  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ name: 'total_parts_cost', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalPartsCost: number;

  @OneToMany(() => WorkOrderPart, (part) => part.workOrder, { cascade: true, eager: true, orphanedRowAction: 'delete' })
  parts: WorkOrderPart[];
}
