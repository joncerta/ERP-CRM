import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeadPriority, LeadStatus } from '../entities/lead.entity';

export class CreateLeadDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsString()
  source?: string;

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
  @IsUUID()
  ownerUserId?: string;
}
