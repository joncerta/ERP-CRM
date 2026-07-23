import { IsBoolean, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
