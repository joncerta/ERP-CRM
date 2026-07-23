import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateActivityDto } from './create-activity.dto';

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  /** Convenience flag: true marks it done now, false clears completedAt. */
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
