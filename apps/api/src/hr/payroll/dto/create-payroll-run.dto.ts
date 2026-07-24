import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreatePayrollRunDto {
  @IsString()
  @MinLength(1)
  periodLabel: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}
