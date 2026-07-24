import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';
import { WorkOrderPartDto } from './create-work-order.dto';

export class UpdateWorkOrderDto {
  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  technicianId?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderPartDto)
  parts?: WorkOrderPartDto[];
}
