import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';
import { InspectionType, InspectionResult } from '../entities/quality-inspection.entity';

export class CreateInspectionDto {
  @IsEnum(InspectionType)
  type: InspectionType;

  @IsString()
  @MinLength(1)
  subject: string;

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

  @IsDateString()
  inspectionDate: string;

  @IsEnum(InspectionResult)
  result: InspectionResult;

  @IsOptional()
  @IsString()
  notes?: string;
}
