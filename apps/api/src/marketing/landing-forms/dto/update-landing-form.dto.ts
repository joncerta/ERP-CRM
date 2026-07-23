import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLandingFormDto } from './create-landing-form.dto';

export class UpdateLandingFormDto extends PartialType(CreateLandingFormDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
