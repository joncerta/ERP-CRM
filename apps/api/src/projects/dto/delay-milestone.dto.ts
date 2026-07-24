import { IsOptional, IsString } from 'class-validator';

export class DelayMilestoneDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
