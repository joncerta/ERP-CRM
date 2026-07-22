import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @EmptyToUndefined()
  @IsNumber()
  @Min(0)
  minStock?: number;
}
