import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFollowUpDto {
  @IsDateString()
  dueAt: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}
