import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateNurtureSequenceDto } from './create-nurture-sequence.dto';

export class UpdateNurtureSequenceDto extends PartialType(CreateNurtureSequenceDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
