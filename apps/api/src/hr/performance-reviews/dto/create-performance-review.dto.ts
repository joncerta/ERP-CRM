import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ScoredItemDto {
  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;
}

export class CreatePerformanceReviewDto {
  @IsUUID()
  employeeId: string;

  @IsString()
  @MinLength(1)
  periodLabel: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoredItemDto)
  objectives: ScoredItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoredItemDto)
  competencies: ScoredItemDto[];

  @IsOptional()
  @IsString()
  comments?: string;
}
