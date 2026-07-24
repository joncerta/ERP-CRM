import { IsEnum, IsUUID, ValidateIf } from 'class-validator';

export enum SummaryType {
  COMPANY = 'company',
  PIPELINE = 'pipeline',
}

export class SummarizeDto {
  @IsEnum(SummaryType)
  type: SummaryType;

  /** Required when type === 'company'; ignored for 'pipeline', which
   * summarizes the whole tenant instead of one record. */
  @ValidateIf((dto) => dto.type === SummaryType.COMPANY)
  @IsUUID()
  contextId?: string;
}
