import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BomLineDto {
  @IsUUID()
  componentProductId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreateBomDto {
  @IsUUID()
  productId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  outputQuantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomLineDto)
  lines: BomLineDto[];
}
