import { IsOptional, IsString } from 'class-validator';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsString()
  timezone?: string;
}
