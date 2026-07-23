import { IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreateFixedAssetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  purchaseDate: string;

  @IsNumber()
  @Min(0.01)
  purchaseCost: number;

  @IsInt()
  @Min(1)
  usefulLifeMonths: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  locationBranchId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  responsibleUserId?: string;
}
