import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DeliveryNote } from './delivery-note.entity';

@Entity('logistics_delivery_note_items')
export class DeliveryNoteItem extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'delivery_note_id', type: 'uuid' })
  deliveryNoteId: string;

  @ManyToOne(() => DeliveryNote, (note) => note.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_note_id' })
  deliveryNote: DeliveryNote;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  quantity: number;
}
