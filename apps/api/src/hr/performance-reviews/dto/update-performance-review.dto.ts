import { ArrayMinSize, IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScoredItemDto } from './create-performance-review.dto';

export class UpdatePerformanceReviewDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  periodLabel?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoredItemDto)
  objectives?: ScoredItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoredItemDto)
  competencies?: ScoredItemDto[];

  @IsOptional()
  @IsString()
  comments?: string;
}
