import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateResourceDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(1)
  roleLabel: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;
}
