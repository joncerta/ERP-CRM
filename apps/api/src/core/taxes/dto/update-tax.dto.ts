import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTaxDto } from './create-tax.dto';

export class UpdateTaxDto extends PartialType(CreateTaxDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
