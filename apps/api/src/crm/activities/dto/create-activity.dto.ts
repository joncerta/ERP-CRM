import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ActivityType } from '../entities/activity.entity';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreateActivityDto {
  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  opportunityId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  nextAction?: string;
}
