import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreateSupplierInvoiceDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  purchaseOrderId?: string;

  @IsString()
  supplierInvoiceNumber: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  issueDate: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsDateString()
  dueDate?: string;
}
