import { IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  taxLabel?: string;

  /** Send null to clear the default tax rate. */
  @IsOptional()
  @ValidateIf((o) => o.taxRatePercent !== null)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRatePercent?: number | null;
}
