import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Severity } from '../entities/non-conformity.entity';
import { CorrectiveActionDto } from './create-non-conformity.dto';

export class UpdateNonConformityDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => CorrectiveActionDto)
  actions?: CorrectiveActionDto[];
}
