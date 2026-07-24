import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';

export class DeliveryNoteItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreateDeliveryNoteDto {
  @IsUUID()
  vehicleId: string;

  @IsUUID()
  driverId: string;

  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  relatedInvoiceId?: string;

  @IsString()
  @MinLength(1)
  destinationAddress: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryNoteItemDto)
  items: DeliveryNoteItemDto[];
}
