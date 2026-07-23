import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeadPriority, LeadStatus } from '../entities/lead.entity';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreateLeadDto {
  @IsString()
  name: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  interest?: string;

  @IsOptional()
  @IsNumber()
  estimatedBudget?: number;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  ownerUserId?: string;
}
