import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class ListJournalEntriesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  sourceType?: string;
}
