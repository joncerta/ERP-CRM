import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(1)
  category: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
