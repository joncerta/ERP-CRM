import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class NurtureStepDto {
  @IsInt()
  @Min(0)
  delayDays: number;

  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  content: string;
}
