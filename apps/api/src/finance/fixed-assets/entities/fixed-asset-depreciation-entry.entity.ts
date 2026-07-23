import { Column, Entity, Index } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

@Entity('fixed_asset_depreciation_entries')
export class FixedAssetDepreciationEntry extends TenantScopedEntity {
  @Index()
  @Column({ name: 'fixed_asset_id', type: 'uuid' })
  fixedAssetId: string;

  @Column({ type: 'date' })
  period: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'accumulated_after', type: 'numeric', precision: 14, scale: 2 })
  accumulatedAfter: number;
}
