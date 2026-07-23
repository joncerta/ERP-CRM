import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { QuoteItem } from './entities/quote-item.entity';
import { QuoteFollowUp } from './entities/quote-follow-up.entity';
import { Company } from '../companies/entities/company.entity';
import { QuotesService } from './quotes.service';
import { QuoteFollowUpsService } from './quote-follow-ups.service';
import { QuotePdfService } from './quote-pdf.service';
import { QuotesController } from './quotes.controller';
import { QuotesPublicController } from './quotes-public.controller';
import { UsersModule } from '../../core/users/users.module';
import { ContactsModule } from '../contacts/contacts.module';
import { EmailModule } from '../../common/email/email.module';
import { OrgModule } from '../../core/org/org.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, QuoteItem, QuoteFollowUp, Company]),
    UsersModule,
    ContactsModule,
    EmailModule,
    OrgModule,
  ],
  providers: [QuotesService, QuoteFollowUpsService, QuotePdfService],
  controllers: [QuotesController, QuotesPublicController],
  exports: [QuotesService, QuoteFollowUpsService],
})
export class QuotesModule {}
