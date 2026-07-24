import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { DeliveryNoteItem } from './delivery-note-item.entity';

export enum DeliveryNoteStatus {
  PLANNED = 'planned',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/** Items only leave stock at dispatch() — the moment the vehicle
 * physically pulls out of the warehouse — not at creation (still just a
 * plan) or at markDelivered() (already gone by then). That also means
 * cancel() is only safe while still "planned", same reasoning as
 * Production's draft-only cancel. "Tracking" here is the three
 * timestamps (planned → dispatchedAt → deliveredAt), not real GPS —
 * this project has no telemetry hardware to integrate. */
@Entity('logistics_delivery_notes')
export class DeliveryNote extends TenantScopedEntity {
  @Column({ name: 'note_number' })
  noteNumber: string;

  @Index()
  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Index()
  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Index()
  @Column({ name: 'related_invoice_id', type: 'uuid', nullable: true })
  relatedInvoiceId: string | null;

  @Column({ name: 'destination_address', type: 'text' })
  destinationAddress: string;

  @Column({ name: 'recipient_name', type: 'varchar', nullable: true })
  recipientName: string | null;

  @Column({ type: 'enum', enum: DeliveryNoteStatus, default: DeliveryNoteStatus.PLANNED })
  status: DeliveryNoteStatus;

  @Column({ name: 'dispatched_at', type: 'timestamptz', nullable: true })
  dispatchedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => DeliveryNoteItem, (item) => item.deliveryNote, { cascade: true, eager: true, orphanedRowAction: 'delete' })
  items: DeliveryNoteItem[];
}
