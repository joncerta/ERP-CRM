import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export enum FixedAssetStatus {
  ACTIVE = 'active',
  UNDER_MAINTENANCE = 'under_maintenance',
  DISPOSED = 'disposed',
}

/** Straight-line depreciation only — the same "manageable scope" call
 * already made for Facturación (not electronic) and Contabilidad (flat
 * chart of accounts). monthlyDepreciation = (purchaseCost - salvageValue)
 * / usefulLifeMonths, run manually per period since there's no scheduler. */
@Entity('fixed_assets')
export class FixedAsset extends TenantScopedEntity {
  @Column({ name: 'asset_number' })
  assetNumber: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: string;

  @Column({ name: 'purchase_cost', type: 'numeric', precision: 14, scale: 2 })
  purchaseCost: number;

  @Column({ name: 'useful_life_months', type: 'int' })
  usefulLifeMonths: number;

  @Column({ name: 'salvage_value', type: 'numeric', precision: 14, scale: 2, default: 0 })
  salvageValue: number;

  @Column({ name: 'accumulated_depreciation', type: 'numeric', precision: 14, scale: 2, default: 0 })
  accumulatedDepreciation: number;

  @Column({ type: 'enum', enum: FixedAssetStatus, default: FixedAssetStatus.ACTIVE })
  status: FixedAssetStatus;

  @Index()
  @Column({ name: 'location_branch_id', type: 'uuid', nullable: true })
  locationBranchId: string | null;

  @Index()
  @Column({ name: 'responsible_user_id', type: 'uuid', nullable: true })
  responsibleUserId: string | null;

  /** First-of-month of the last period this asset was depreciated for —
   * lets runDepreciation() be called repeatedly for the same period
   * without double-counting. */
  @Column({ name: 'last_depreciated_period', type: 'date', nullable: true })
  lastDepreciatedPeriod: string | null;
}
