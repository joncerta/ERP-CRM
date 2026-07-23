import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../common/entities/tenant-scoped.entity';

export enum AutomationRuleType {
  LEAD_STALE_REMINDER = 'lead_stale_reminder',
  AUTO_ASSIGN_LEAD = 'auto_assign_lead',
}

export interface LeadStaleReminderConfig {
  staleDays: number;
}

/** On/off rules over what already exists — no generic condition/action
 * builder, just a fixed catalog of rule types this project actually
 * implements. AUTO_ASSIGN_LEAD is event-driven (checked synchronously by
 * LeadsService.create); LEAD_STALE_REMINDER is time-based and only
 * evaluated when POST /automations/process runs, since there's no
 * scheduler here (same limitation as depreciation/recurring invoices). */
@Entity('automation_rules')
export class AutomationRule extends TenantScopedEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: AutomationRuleType })
  type: AutomationRuleType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;
}
