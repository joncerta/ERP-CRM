import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreateOpportunityDto {
  @IsString()
  name: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  contactId?: string;

  @IsUUID()
  stageId: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  ownerUserId?: string;
}
