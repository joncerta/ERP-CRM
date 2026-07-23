import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { ActivityType } from '../entities/activity.entity';

export class ListActivitiesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;
}
