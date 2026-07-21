import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { QuoteItemDto } from './quote-item.dto';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreateQuoteDto {
  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  opportunityId?: string;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number; // percentage, e.g. 19 for 19%

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  validUntil?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
}
