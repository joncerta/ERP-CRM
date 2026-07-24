import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';

export class CreateDriverDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  userId?: string;
}
