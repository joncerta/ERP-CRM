import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { LeadStatus } from '../entities/lead.entity';

export class ListLeadsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;
}
