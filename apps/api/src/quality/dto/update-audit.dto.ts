import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AuditType } from '../entities/audit.entity';

export class UpdateAuditDto {
  @IsOptional()
  @IsEnum(AuditType)
  type?: AuditType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  scope?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  auditor?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}
