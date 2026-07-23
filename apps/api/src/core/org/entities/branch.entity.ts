import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('org_branches')
export class Branch extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  code: string | null;

  @Column({ nullable: true })
  address: string | null;

  /** IANA timezone (e.g. "America/Bogota"). Null = falls back to the tenant's default timezone. */
  @Column({ nullable: true })
  timezone: string | null;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
