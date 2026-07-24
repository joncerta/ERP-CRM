import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';
import { InspectionType, InspectionResult } from '../entities/quality-inspection.entity';

export class UpdateInspectionDto {
  @IsOptional()
  @IsEnum(InspectionType)
  type?: InspectionType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  subject?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  relatedProductionOrderId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  relatedEquipmentId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  inspectorUserId?: string;

  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @IsOptional()
  @IsEnum(InspectionResult)
  result?: InspectionResult;

  @IsOptional()
  @IsString()
  notes?: string;
}
