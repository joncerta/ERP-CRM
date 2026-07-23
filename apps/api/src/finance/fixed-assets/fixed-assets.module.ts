import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FixedAsset } from './entities/fixed-asset.entity';
import { FixedAssetMovement } from './entities/fixed-asset-movement.entity';
import { FixedAssetDepreciationEntry } from './entities/fixed-asset-depreciation-entry.entity';
import { FixedAssetsService } from './fixed-assets.service';
import { FixedAssetsController } from './fixed-assets.controller';
import { OrgModule } from '../../core/org/org.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FixedAsset, FixedAssetMovement, FixedAssetDepreciationEntry]),
    OrgModule,
    AccountingModule,
  ],
  providers: [FixedAssetsService],
  controllers: [FixedAssetsController],
  exports: [FixedAssetsService],
})
export class FixedAssetsModule {}
