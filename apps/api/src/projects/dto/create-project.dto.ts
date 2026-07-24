import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  companyId?: string;

  @IsUUID()
  leaderUserId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;
}
