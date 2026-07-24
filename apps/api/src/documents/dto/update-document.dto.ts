import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { DocumentCategory } from '../entities/document.entity';

// Renaming/recategorizing only — replacing the file bytes means deleting and
// re-uploading, there's no "replace content" flow.
export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;
}
