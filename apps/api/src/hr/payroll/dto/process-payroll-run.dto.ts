import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class OvertimeEntryDto {
  @IsUUID()
  employeeId: string;

  @IsNumber()
  @Min(0)
  hours: number;
}

export class ProcessPayrollRunDto {
  @IsOptional()
  overtimeByEmployee?: OvertimeEntryDto[];
}
