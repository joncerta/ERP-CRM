import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsDateString()
  dueDate: string;
}
