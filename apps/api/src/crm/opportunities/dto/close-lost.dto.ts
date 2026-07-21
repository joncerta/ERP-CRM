import { IsOptional, IsString } from 'class-validator';

export class CloseLostDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
