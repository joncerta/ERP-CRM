import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;
}
