import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class PurchaseOrderItemDto {
  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  productId?: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;
}
