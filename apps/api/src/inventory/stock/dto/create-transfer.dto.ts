import { IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  fromWarehouseId: string;

  @IsUUID()
  toWarehouseId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}
