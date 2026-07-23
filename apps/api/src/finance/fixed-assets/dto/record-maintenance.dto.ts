import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordMaintenanceDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}
