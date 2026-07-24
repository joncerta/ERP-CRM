import { IsDateString, IsEnum, IsString, MinLength } from 'class-validator';
import { AuditType } from '../entities/audit.entity';

export class CreateAuditDto {
  @IsEnum(AuditType)
  type: AuditType;

  @IsString()
  @MinLength(1)
  scope: string;

  @IsString()
  @MinLength(1)
  auditor: string;

  @IsDateString()
  scheduledDate: string;
}
