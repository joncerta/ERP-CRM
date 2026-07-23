import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { SupplierInvoiceStatus } from '../entities/supplier-invoice.entity';

export class ListSupplierInvoicesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(SupplierInvoiceStatus)
  status?: SupplierInvoiceStatus;

  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;
}
