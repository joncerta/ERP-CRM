import { IsOptional, IsString } from 'class-validator';

export class CreateCostCenterDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;
}
