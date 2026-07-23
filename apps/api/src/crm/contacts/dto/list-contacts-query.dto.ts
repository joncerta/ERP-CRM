import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class ListContactsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
