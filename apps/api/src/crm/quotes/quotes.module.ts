import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { QuoteItem } from './entities/quote-item.entity';
import { QuoteFollowUp } from './entities/quote-follow-up.entity';
import { QuotesService } from './quotes.service';
import { QuoteFollowUpsService } from './quote-follow-ups.service';
import { QuotesController } from './quotes.controller';
import { QuotesPublicController } from './quotes-public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, QuoteItem, QuoteFollowUp])],
  providers: [QuotesService, QuoteFollowUpsService],
  controllers: [QuotesController, QuotesPublicController],
  exports: [QuotesService, QuoteFollowUpsService],
})
export class QuotesModule {}
