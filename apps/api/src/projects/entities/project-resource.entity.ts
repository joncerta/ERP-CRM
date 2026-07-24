import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

/** A team member assigned to a project, with the hourly rate used to
 * cost their logged time (ProjectTimeEntry snapshots this rate at entry
 * time, so a later rate change doesn't rewrite past costs). */
@Entity('project_resources')
@Index(['tenantId', 'projectId', 'userId'], { unique: true })
export class ProjectResource extends TenantScopedEntity {
  @Index()
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'role_label' })
  roleLabel: string;

  @Column({ name: 'hourly_rate', type: 'numeric', precision: 12, scale: 2, default: 0 })
  hourlyRate: number;
}
