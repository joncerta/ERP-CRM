import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

/** "Cargo" — a job title/role within a department, distinct from the
 * permissions-bearing `Role` entity used for access control. */
@Entity('org_positions')
export class Position extends TenantScopedEntity {
  @Column()
  name: string;

  @Index()
  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
