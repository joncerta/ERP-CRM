import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

/** Not every technician is necessarily a system User — external
 * contractors are common in maintenance, so userId is optional rather
 * than required like Project resources or HR employees. */
@Entity('maintenance_technicians')
export class Technician extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  specialty: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
