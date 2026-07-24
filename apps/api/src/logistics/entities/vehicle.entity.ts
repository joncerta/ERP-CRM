import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum VehicleStatus {
  AVAILABLE = 'available',
  IN_ROUTE = 'in_route',
  MAINTENANCE = 'maintenance',
  OUT_OF_SERVICE = 'out_of_service',
}

@Entity('logistics_vehicles')
@Index(['tenantId', 'plate'], { unique: true })
export class Vehicle extends TenantScopedEntity {
  @Column()
  plate: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({ name: 'capacity_kg', type: 'numeric', precision: 10, scale: 2, nullable: true })
  capacityKg: number | null;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.AVAILABLE })
  status: VehicleStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
