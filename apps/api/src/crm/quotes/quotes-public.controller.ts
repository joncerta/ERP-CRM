import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { Public } from '../../common/decorators/public.decorator';
import { RespondQuoteDto } from './dto/respond-quote.dto';

/**
 * No auth, no tenant/module guards — reachable only by knowing a quote's
 * random access token, which is how the customer views/accepts/rejects it
 * from the link we send them (no login required on their side).
 */
@Controller('public/quotes')
export class QuotesPublicController {
  constructor(private readonly quotesService: QuotesService) {}

  @Public()
  @Get(':token')
  async view(@Param('token') token: string) {
    return this.quotesService.registerPublicView(token);
  }

  @Public()
  @Post(':token/respond')
  respond(@Param('token') token: string, @Body() dto: RespondQuoteDto) {
    return this.quotesService.respond(token, dto.accepted);
  }
}
