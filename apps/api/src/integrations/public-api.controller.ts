import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import type { PublicApiPrincipal } from './api-key.guard';
import { CurrentApiKey } from './current-api-key.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PublicApiScope } from './entities/api-key.entity';
import { LeadsService } from '../crm/leads/leads.service';
import { CreateLeadDto } from '../crm/leads/dto/create-lead.dto';
import { ContactsService } from '../crm/contacts/contacts.service';
import { CreateContactDto } from '../crm/contacts/dto/create-contact.dto';
import { InvoicesService } from '../finance/invoices/invoices.service';

function requireScope(apiKey: PublicApiPrincipal, scope: PublicApiScope): void {
  if (!apiKey.scopes.includes(scope)) {
    throw new ForbiddenException(`Esta clave de API no tiene el alcance "${scope}"`);
  }
}

/** The actual "public API" — a small, deliberately curated surface for
 * external integrations (a website form, a script, a partner system),
 * not a mirror of the internal app. No pagination/filtering here, unlike
 * the internal list endpoints — an integration pulling all leads/invoices
 * is expected to page through results client-side at most every few
 * minutes, not the interactive scale the internal UI is built for. */
@Controller('public-api/v1')
@Public()
@UseGuards(ApiKeyGuard)
export class PublicApiController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly contactsService: ContactsService,
    private readonly invoicesService: InvoicesService,
  ) {}

  @Post('leads')
  createLead(@CurrentApiKey() apiKey: PublicApiPrincipal, @Body() dto: CreateLeadDto) {
    requireScope(apiKey, 'leads:write');
    return this.leadsService.create(apiKey.tenantId, dto);
  }

  @Get('leads')
  listLeads(@CurrentApiKey() apiKey: PublicApiPrincipal) {
    requireScope(apiKey, 'leads:read');
    return this.leadsService.findAllForTenant(apiKey.tenantId);
  }

  @Post('contacts')
  createContact(@CurrentApiKey() apiKey: PublicApiPrincipal, @Body() dto: CreateContactDto) {
    requireScope(apiKey, 'contacts:write');
    return this.contactsService.create(apiKey.tenantId, dto);
  }

  @Get('contacts')
  listContacts(@CurrentApiKey() apiKey: PublicApiPrincipal) {
    requireScope(apiKey, 'contacts:read');
    return this.contactsService.findAllForTenant(apiKey.tenantId);
  }

  @Get('invoices')
  listInvoices(@CurrentApiKey() apiKey: PublicApiPrincipal) {
    requireScope(apiKey, 'invoices:read');
    return this.invoicesService.findAllForTenant(apiKey.tenantId);
  }

  @Get('invoices/:id')
  getInvoice(@CurrentApiKey() apiKey: PublicApiPrincipal, @Param('id') id: string) {
    requireScope(apiKey, 'invoices:read');
    return this.invoicesService.findOneForTenant(apiKey.tenantId, id);
  }
}
