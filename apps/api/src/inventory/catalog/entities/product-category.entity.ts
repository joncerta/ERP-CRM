import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('inventory_product_categories')
@Index(['tenantId', 'name'], { unique: true })
export class ProductCategory extends TenantScopedEntity {
  @Column()
  name: string;
}
