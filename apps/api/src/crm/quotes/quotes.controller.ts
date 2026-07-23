import { Body, Controller, Get, Param, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuoteFollowUpsService } from './quote-follow-ups.service';
import { QuotePdfService } from './quote-pdf.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { ListQuotesQueryDto } from './dto/list-quotes-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('crm/quotes')
@RequireModule('crm')
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly followUpsService: QuoteFollowUpsService,
    private readonly quotePdfService: QuotePdfService,
  ) {}

  @Post()
  @RequirePermissions('crm.quotes.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateQuoteDto) {
    return this.quotesService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @RequirePermissions('crm.quotes.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQuotesQueryDto) {
    if (query.page) return this.quotesService.findPaginated(user.tenantId, query);
    if (query.opportunityId) return this.quotesService.findByOpportunity(user.tenantId, query.opportunityId);
    return this.quotesService.findAllForTenant(user.tenantId);
  }

  @Get('follow-ups/pending')
  @RequirePermissions('crm.quotes.read')
  findPendingFollowUps(@CurrentUser() user: AuthenticatedUser) {
    return this.followUpsService.findPendingForTenant(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('crm.quotes.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.quotesService.findOneForTenant(user.tenantId, id);
  }

  @Get(':id/pdf')
  @RequirePermissions('crm.quotes.read')
  async downloadPdf(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<StreamableFile> {
    const quote = await this.quotesService.findOneForTenant(user.tenantId, id);
    const pdf = await this.quotePdfService.generate(quote);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${quote.quoteNumber}.pdf"`,
    });
  }

  @Patch(':id')
  @RequirePermissions('crm.quotes.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotesService.update(user.tenantId, id, dto);
  }

  @Patch(':id/send')
  @RequirePermissions('crm.quotes.write')
  send(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.quotesService.send(user.tenantId, id);
  }

  @Post(':id/revise')
  @RequirePermissions('crm.quotes.write')
  createRevision(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.quotesService.createRevision(user.tenantId, id);
  }

  @Get(':id/versions')
  @RequirePermissions('crm.quotes.read')
  findVersions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.quotesService.findVersions(user.tenantId, id);
  }

  @Post(':id/follow-ups')
  @RequirePermissions('crm.quotes.write')
  createFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateFollowUpDto,
  ) {
    return this.followUpsService.create(user.tenantId, id, user.userId, dto);
  }

  @Get(':id/follow-ups')
  @RequirePermissions('crm.quotes.read')
  findFollowUps(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.followUpsService.findByQuote(user.tenantId, id);
  }

  @Patch('follow-ups/:followUpId/done')
  @RequirePermissions('crm.quotes.write')
  markFollowUpDone(@CurrentUser() user: AuthenticatedUser, @Param('followUpId') followUpId: string) {
    return this.followUpsService.markDone(user.tenantId, followUpId);
  }
}
