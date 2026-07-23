import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { PipelineStagesModule } from './pipeline-stages/pipeline-stages.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { QuotesModule } from './quotes/quotes.module';
import { ActivitiesModule } from './activities/activities.module';

@Module({
  imports: [
    CompaniesModule,
    ContactsModule,
    LeadsModule,
    PipelineStagesModule,
    OpportunitiesModule,
    QuotesModule,
    ActivitiesModule,
  ],
})
export class CrmModule {}
