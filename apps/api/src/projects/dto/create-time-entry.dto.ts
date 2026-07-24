import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateTimeEntryDto {
  @IsUUID()
  resourceId: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @IsPositive()
  hours: number;

  @IsOptional()
  @IsString()
  description?: string;
}
