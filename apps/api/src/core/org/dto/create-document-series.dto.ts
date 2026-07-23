import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

/** Extend this list as new numbered document types are introduced. */
export const DOCUMENT_TYPES = ['quote', 'invoice'] as const;

export class CreateDocumentSeriesDto {
  @IsIn(DOCUMENT_TYPES)
  documentType: (typeof DOCUMENT_TYPES)[number];

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  branchId?: string;

  @IsString()
  prefix: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nextNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  padding?: number;
}
