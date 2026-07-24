import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

@Entity('project_time_entries')
export class ProjectTimeEntry extends TenantScopedEntity {
  @Index()
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Index()
  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  hours: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** hours × the resource's hourlyRate at the moment this entry was
   * logged — a snapshot, not a live join, so past costs stay accurate
   * if the resource's rate changes later. */
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  cost: number;
}
