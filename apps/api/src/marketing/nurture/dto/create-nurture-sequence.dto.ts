import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsString, MinLength, ValidateNested } from 'class-validator';
import { NurtureStepDto } from './nurture-step.dto';

export class CreateNurtureSequenceDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NurtureStepDto)
  steps: NurtureStepDto[];
}
