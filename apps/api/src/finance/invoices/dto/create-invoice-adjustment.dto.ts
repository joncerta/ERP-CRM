import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InvoiceAdjustmentType } from '../entities/invoice-adjustment.entity';

export class CreateInvoiceAdjustmentDto {
  @IsEnum(InvoiceAdjustmentType)
  type: InvoiceAdjustmentType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
