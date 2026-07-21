import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('tenant_modules')
@Index(['tenantId', 'moduleCode'], { unique: true })
export class TenantModule extends TenantScopedEntity {
  @Column({ name: 'module_code' })
  moduleCode: string;

  @Column({ name: 'is_enabled', default: false })
  isEnabled: boolean;

  @Column({ name: 'enabled_at', type: 'timestamptz', nullable: true })
  enabledAt: Date | null;
}
