import { Body, Controller, Get, Param, Post, StreamableFile } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotePdfService } from './quote-pdf.service';
import { Public } from '../../common/decorators/public.decorator';
import { RespondQuoteDto } from './dto/respond-quote.dto';

/**
 * No auth, no tenant/module guards — reachable only by knowing a quote's
 * random access token, which is how the customer views/accepts/rejects it
 * from the link we send them (no login required on their side).
 */
@Controller('public/quotes')
export class QuotesPublicController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly quotePdfService: QuotePdfService,
  ) {}

  @Public()
  @Get(':token')
  async view(@Param('token') token: string) {
    return this.quotesService.registerPublicView(token);
  }

  @Public()
  @Get(':token/pdf')
  async downloadPdf(@Param('token') token: string): Promise<StreamableFile> {
    const quote = await this.quotesService.findByAccessToken(token);
    const pdf = await this.quotePdfService.generate(quote);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${quote.quoteNumber}.pdf"`,
    });
  }

  @Public()
  @Post(':token/respond')
  respond(@Param('token') token: string, @Body() dto: RespondQuoteDto) {
    return this.quotesService.respond(token, dto.accepted);
  }
}
