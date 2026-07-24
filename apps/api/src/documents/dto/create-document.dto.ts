import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';
import { DocumentCategory } from '../entities/document.entity';

// ~7.5MB of raw file data once base64-decoded — enough for real contracts/
// presentations/photos without letting someone stuff an oversized file
// into the row (same idea as the tenant logo's cap, just larger since
// documents are naturally bigger than a logo).
export const MAX_FILE_DATA_URI_LENGTH = 10_000_000;

export class CreateDocumentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsString()
  mimeType: string;

  @IsString()
  @MaxLength(MAX_FILE_DATA_URI_LENGTH, { message: 'El archivo es demasiado grande (máximo ~7.5MB)' })
  fileData: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  opportunityId?: string;
}
