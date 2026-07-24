import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

/** userId is optional, same idea as Technician — an outsourced or
 * contracted driver is not necessarily a system User. */
@Entity('logistics_drivers')
export class Driver extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ name: 'license_number', type: 'varchar', nullable: true })
  licenseNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
