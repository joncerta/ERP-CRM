import { IsOptional, IsString } from 'class-validator';

export class CompleteWorkOrderDto {
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
