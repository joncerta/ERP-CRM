import { Module } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { QuotesModule } from '../crm/quotes/quotes.module';
import { TicketsModule } from '../support/tickets/tickets.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CompaniesModule } from '../crm/companies/companies.module';
import { OpportunitiesModule } from '../crm/opportunities/opportunities.module';
import { PipelineStagesModule } from '../crm/pipeline-stages/pipeline-stages.module';
import { LeadsModule } from '../crm/leads/leads.module';
import { ActivitiesModule } from '../crm/activities/activities.module';

/** No entities of its own — every AI feature is a stateless request that
 * reads existing tenant data and calls the provider, nothing to persist
 * (see AiService's doc comments on why lead scores and assistant answers
 * aren't saved). */
@Module({
  imports: [
    QuotesModule,
    TicketsModule,
    InventoryModule,
    CompaniesModule,
    OpportunitiesModule,
    PipelineStagesModule,
    LeadsModule,
    ActivitiesModule,
  ],
  providers: [AiProviderService, AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
