import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { FixedAssetStatus } from '../entities/fixed-asset.entity';

export class ListFixedAssetsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(FixedAssetStatus)
  status?: FixedAssetStatus;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @IsOptional()
  @IsUUID()
  locationBranchId?: string;
}
