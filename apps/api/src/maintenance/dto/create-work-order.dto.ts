import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';
import { WorkOrderType, WorkOrderPriority } from '../entities/maintenance-work-order.entity';

export class WorkOrderPartDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreateWorkOrderDto {
  @IsUUID()
  equipmentId: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  technicianId?: string;

  @IsUUID()
  warehouseId: string;

  @IsEnum(WorkOrderType)
  type: WorkOrderType;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderPartDto)
  parts?: WorkOrderPartDto[];
}
