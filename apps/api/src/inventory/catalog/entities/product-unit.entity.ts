import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('inventory_product_units')
@Index(['tenantId', 'name'], { unique: true })
export class ProductUnit extends TenantScopedEntity {
  @Column()
  name: string;
}
