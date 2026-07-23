import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { QuoteStatus } from '../entities/quote.entity';

export class ListQuotesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;
}
