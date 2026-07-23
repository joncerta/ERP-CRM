import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Only the mutable fields — documentType/branchId identify the series and
 * aren't editable after creation (create a new series instead). */
export class UpdateDocumentSeriesDto {
  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nextNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  padding?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
