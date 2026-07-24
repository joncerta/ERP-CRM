import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';
import { BillOfMaterialLine } from './bill-of-material-line.entity';

/** Recipe for producing one batch of a finished-good Product from raw
 * materials — also Products, just consumed instead of sold. A product can
 * have several BOMs (versions); production orders pick one explicitly. */
@Entity('production_boms')
export class BillOfMaterial extends TenantScopedEntity {
  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column()
  name: string;

  @Column({ name: 'output_quantity', type: 'numeric', precision: 12, scale: 2, default: 1 })
  outputQuantity: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => BillOfMaterialLine, (line) => line.bom, { cascade: true, eager: true, orphanedRowAction: 'delete' })
  lines: BillOfMaterialLine[];
}
