import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Query params shared by every paginated list endpoint. Subclass to add
 * entity-specific filters (status, category, ownerUserId...). */
export class ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortDir?: 'ASC' | 'DESC';

  @IsOptional()
  @IsString()
  search?: string;
}
