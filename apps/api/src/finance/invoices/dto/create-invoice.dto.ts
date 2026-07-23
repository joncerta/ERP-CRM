import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { InvoiceItemDto } from './invoice-item.dto';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreateInvoiceDto {
  @IsUUID()
  companyId: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  quoteId?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number; // percentage, e.g. 19 for 19% — ignored when taxId is set

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  taxId?: string;

  @IsDateString()
  issueDate: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  dueDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
