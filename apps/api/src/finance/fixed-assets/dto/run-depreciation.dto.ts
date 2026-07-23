import { IsDateString } from 'class-validator';

export class RunDepreciationDto {
  @IsDateString()
  period: string;
}
