import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { InvoiceItemDto } from './invoice-item.dto';
import { RecurrenceFrequency } from '../entities/recurring-invoice-template.entity';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreateRecurringTemplateDto {
  @IsString()
  name: string;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
