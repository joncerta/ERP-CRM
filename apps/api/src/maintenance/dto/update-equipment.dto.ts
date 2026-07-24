import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { EquipmentStatus } from '../entities/equipment.entity';

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  category?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
