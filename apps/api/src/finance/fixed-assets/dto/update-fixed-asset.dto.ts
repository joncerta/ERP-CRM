import { IsOptional, IsString, IsUUID } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

/** Deliberately excludes purchaseCost/usefulLifeMonths/salvageValue —
 * those drive depreciation math already posted to Accounting, so they're
 * immutable after creation, same as an Invoice's items once issued. */
export class UpdateFixedAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  locationBranchId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  responsibleUserId?: string;
}
