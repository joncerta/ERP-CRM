import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum FixedAssetMovementType {
  MAINTENANCE = 'maintenance',
  TRANSFER = 'transfer',
  DISPOSAL = 'disposal',
}

@Entity('fixed_asset_movements')
export class FixedAssetMovement extends TenantScopedEntity {
  @Index()
  @Column({ name: 'fixed_asset_id', type: 'uuid' })
  fixedAssetId: string;

  @Column({ type: 'enum', enum: FixedAssetMovementType })
  type: FixedAssetMovementType;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  /** Maintenance cost — informational only, doesn't post to Accounting
   * (see README: we don't know whether it was paid from cash or is now a
   * payable, so we don't guess). */
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  cost: number | null;

  @Column({ name: 'from_branch_id', type: 'uuid', nullable: true })
  fromBranchId: string | null;

  @Column({ name: 'to_branch_id', type: 'uuid', nullable: true })
  toBranchId: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string;
}
