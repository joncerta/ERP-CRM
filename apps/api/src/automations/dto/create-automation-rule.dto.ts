import { IsEnum, IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { AutomationRuleType } from '../entities/automation-rule.entity';

export class CreateAutomationRuleDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(AutomationRuleType)
  type: AutomationRuleType;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class LeadStaleReminderConfigDto {
  @IsInt()
  @Min(1)
  staleDays: number;
}
