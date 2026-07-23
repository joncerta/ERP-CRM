import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';

export class SubmitLandingFormDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @EmptyToUndefined()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
