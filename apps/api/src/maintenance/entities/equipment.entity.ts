import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum EquipmentStatus {
  OPERATIONAL = 'operational',
  UNDER_MAINTENANCE = 'under_maintenance',
  OUT_OF_SERVICE = 'out_of_service',
}

@Entity('maintenance_equipment')
@Index(['tenantId', 'code'], { unique: true })
export class Equipment extends TenantScopedEntity {
  @Column()
  name: string;

  @Column()
  code: string;

  @Column()
  category: string;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'enum', enum: EquipmentStatus, default: EquipmentStatus.OPERATIONAL })
  status: EquipmentStatus;

  @Column({ name: 'acquisition_date', type: 'date', nullable: true })
  acquisitionDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
