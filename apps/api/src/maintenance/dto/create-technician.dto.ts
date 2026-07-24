import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';

export class CreateTechnicianDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsUUID()
  userId?: string;
}
