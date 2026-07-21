import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

/**
 * Permissions are stored as a flat array of codes (e.g. "crm.leads.write")
 * instead of a normalized join table — simplest thing that works for the
 * MVP's permission set; revisit if the catalog grows large.
 */
@Entity('roles')
export class Role extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  permissions: string[];
}
