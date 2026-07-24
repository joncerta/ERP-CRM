import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BillOfMaterial } from './bill-of-material.entity';

@Entity('production_bom_lines')
export class BillOfMaterialLine extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bom_id', type: 'uuid' })
  bomId: string;

  @ManyToOne(() => BillOfMaterial, (bom) => bom.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bom_id' })
  bom: BillOfMaterial;

  @Column({ name: 'component_product_id', type: 'uuid' })
  componentProductId: string;

  /** Quantity of the component consumed per BillOfMaterial.outputQuantity
   * batches — a production order scales this by (quantityPlanned /
   * outputQuantity) to get the actual amount to pull from stock. */
  @Column({ type: 'numeric', precision: 12, scale: 4 })
  quantity: number;
}
