import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLandingFormDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  campaignName?: string;
}
