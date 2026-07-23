import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationRule } from './entities/automation-rule.entity';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { AutomationRulesService } from './automation-rules.service';
import { WebhooksService } from './webhooks.service';
import { AutomationsService } from './automations.service';
import { ReportsService } from './reports.service';
import { AutomationsController } from './automations.controller';
import { User } from '../core/users/entities/user.entity';
import { Lead } from '../crm/leads/entities/lead.entity';
import { Opportunity } from '../crm/opportunities/entities/opportunity.entity';
import { Invoice } from '../finance/invoices/entities/invoice.entity';
import { Company } from '../crm/companies/entities/company.entity';
import { UsersModule } from '../core/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationRule, WebhookSubscription, User, Lead, Opportunity, Invoice, Company]),
    UsersModule,
  ],
  providers: [AutomationRulesService, WebhooksService, AutomationsService, ReportsService],
  controllers: [AutomationsController],
  exports: [AutomationRulesService, WebhooksService],
})
export class AutomationsModule {}
