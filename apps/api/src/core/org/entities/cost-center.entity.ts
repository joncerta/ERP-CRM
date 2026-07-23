import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('org_cost_centers')
export class CostCenter extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  code: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
