import { IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MinLength(1)
  plate: string;

  @IsString()
  @MinLength(1)
  brand: string;

  @IsString()
  @MinLength(1)
  model: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacityKg?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
