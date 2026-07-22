import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { QuoteItem } from './entities/quote-item.entity';
import { QuoteFollowUp } from './entities/quote-follow-up.entity';
import { Company } from '../companies/entities/company.entity';
import { QuotesService } from './quotes.service';
import { QuoteFollowUpsService } from './quote-follow-ups.service';
import { QuotesController } from './quotes.controller';
import { QuotesPublicController } from './quotes-public.controller';
import { NotificationsModule } from '../../notifications/notifications.module';
import { ContactsModule } from '../contacts/contacts.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, QuoteItem, QuoteFollowUp, Company]),
    NotificationsModule,
    ContactsModule,
    EmailModule,
  ],
  providers: [QuotesService, QuoteFollowUpsService],
  controllers: [QuotesController, QuotesPublicController],
  exports: [QuotesService, QuoteFollowUpsService],
})
export class QuotesModule {}
