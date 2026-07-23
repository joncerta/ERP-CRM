import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreatePublicTicketDto } from './dto/create-public-ticket.dto';
import { TenantsService } from '../../core/tenants/tenants.service';
import { Public } from '../../common/decorators/public.decorator';

/** The PQRS channel — no login, no module guard (a customer submitting a
 * complaint has no session to gate). Tenant is resolved from the slug in
 * the URL since there's no token yet at submission time; every read after
 * that goes through the ticket's own accessToken, same as public quotes. */
@Controller('public/support')
export class TicketsPublicController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Public()
  @Post(':tenantSlug/tickets')
  async create(@Param('tenantSlug') tenantSlug: string, @Body() dto: CreatePublicTicketDto) {
    const tenant = await this.tenantsService.findBySlug(tenantSlug);
    if (!tenant) throw new BadRequestException('Empresa no encontrada');
    return this.ticketsService.createPublic(tenant.id, dto);
  }

  @Public()
  @Get('tickets/:accessToken')
  async view(@Param('accessToken') accessToken: string) {
    const ticket = await this.ticketsService.findByAccessToken(accessToken);
    const comments = await this.ticketsService.findComments(ticket.tenantId, ticket.id, false);
    return { ticket, comments };
  }
}
