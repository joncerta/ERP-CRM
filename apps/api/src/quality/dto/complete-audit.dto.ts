import { IsString, MinLength } from 'class-validator';

export class CompleteAuditDto {
  @IsString()
  @MinLength(1)
  findings: string;
}
