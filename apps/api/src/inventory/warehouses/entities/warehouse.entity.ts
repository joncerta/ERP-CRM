import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('inventory_warehouses')
export class Warehouse extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
