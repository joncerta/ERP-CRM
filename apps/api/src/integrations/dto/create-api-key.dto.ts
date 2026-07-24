import { ArrayMinSize, IsArray, IsIn, IsString, MinLength } from 'class-validator';
import { PUBLIC_API_SCOPES, PublicApiScope } from '../entities/api-key.entity';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(PUBLIC_API_SCOPES, { each: true })
  scopes: PublicApiScope[];
}
