import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { EmptyToUndefined } from '../../common/decorators/empty-to-undefined.decorator';

export class UpdateTechnicianDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

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
  @IsBoolean()
  isActive?: boolean;
}
