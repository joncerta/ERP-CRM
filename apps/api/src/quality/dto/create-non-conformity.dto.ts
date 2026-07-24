import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';
import { Severity } from '../entities/non-conformity.entity';

export class CorrectiveActionDto {
  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  responsibleUserId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class CreateNonConformityDto {
  @IsString()
  @MinLength(1)
  description: string;

  @IsEnum(Severity)
  severity: Severity;

  @IsDateString()
  detectedDate: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  inspectionId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  auditId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => CorrectiveActionDto)
  actions?: CorrectiveActionDto[];
}
