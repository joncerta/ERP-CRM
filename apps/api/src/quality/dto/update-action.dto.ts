import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ActionStatus } from '../entities/corrective-action.entity';

export class UpdateActionDto {
  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @IsOptional()
  @IsString()
  completionNotes?: string;
}
