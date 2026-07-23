import { IsDateString, IsOptional, IsString } from 'class-validator';

export class DisposeFixedAssetDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  note?: string;
}
