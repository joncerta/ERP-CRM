import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum InspectionType {
  INCOMING = 'incoming',
  IN_PROCESS = 'in_process',
  FINAL = 'final',
}

export enum InspectionResult {
  PASS = 'pass',
  FAIL = 'fail',
  CONDITIONAL = 'conditional',
}

/** relatedProductionOrderId/relatedEquipmentId are plain optional uuids
 * (validated against Production/Maintenance when present), not required —
 * an inspection can also stand alone (e.g. a supplier incoming-goods check
 * with no production order yet). */
@Entity('quality_inspections')
export class QualityInspection extends TenantScopedEntity {
  @Column({ type: 'enum', enum: InspectionType })
  type: InspectionType;

  @Column()
  subject: string;

  @Index()
  @Column({ name: 'related_production_order_id', type: 'uuid', nullable: true })
  relatedProductionOrderId: string | null;

  @Index()
  @Column({ name: 'related_equipment_id', type: 'uuid', nullable: true })
  relatedEquipmentId: string | null;

  @Column({ name: 'inspector_user_id', type: 'uuid', nullable: true })
  inspectorUserId: string | null;

  @Column({ name: 'inspection_date', type: 'date' })
  inspectionDate: string;

  @Column({ type: 'enum', enum: InspectionResult })
  result: InspectionResult;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
