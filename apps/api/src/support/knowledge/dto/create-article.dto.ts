import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
