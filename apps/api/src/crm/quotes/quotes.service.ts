import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Quote, QuoteStatus } from './entities/quote.entity';
import { QuoteItem } from './entities/quote-item.entity';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { NotificationsService } from '../../notifications/notifications.service';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class QuotesService extends TenantScopedService<Quote> {
  constructor(
    @InjectRepository(Quote) repo: Repository<Quote>,
    private readonly notificationsService: NotificationsService,
  ) {
    super(repo);
  }

  private buildItemsAndTotals(items: CreateQuoteDto['items'], taxRate = 0) {
    const quoteItems = items.map((item) =>
      Object.assign(new QuoteItem(), {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: round2(item.quantity * item.unitPrice),
      }),
    );
    const subtotal = round2(quoteItems.reduce((sum, item) => sum + Number(item.total), 0));
    const tax = round2(subtotal * (taxRate / 100));
    const total = round2(subtotal + tax);
    return { quoteItems, subtotal, tax, total };
  }

  private async nextQuoteNumber(tenantId: string): Promise<string> {
    const count = await this.repository.count({ where: { tenantId } });
    return `COT-${String(count + 1).padStart(6, '0')}`;
  }

  async create(tenantId: string, ownerUserId: string, dto: CreateQuoteDto): Promise<Quote> {
    const { quoteItems, subtotal, tax, total } = this.buildItemsAndTotals(dto.items, dto.taxRate);
    const quote = this.repository.create({
      tenantId,
      ownerUserId,
      opportunityId: dto.opportunityId,
      companyId: dto.companyId,
      contactId: dto.contactId,
      currencyCode: dto.currencyCode ?? 'USD',
      validUntil: dto.validUntil,
      status: QuoteStatus.DRAFT,
      quoteNumber: await this.nextQuoteNumber(tenantId),
      accessToken: randomBytes(24).toString('hex'),
      items: quoteItems,
      subtotal,
      tax,
      total,
    });
    return this.repository.save(quote);
  }

  async update(tenantId: string, id: string, dto: UpdateQuoteDto): Promise<Quote> {
    const quote = await this.findOneForTenant(tenantId, id);
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden editar cotizaciones en borrador');
    }

    if (dto.items) {
      const { quoteItems, subtotal, tax, total } = this.buildItemsAndTotals(dto.items, dto.taxRate);
      quote.items = quoteItems;
      quote.subtotal = subtotal;
      quote.tax = tax;
      quote.total = total;
    }
    if (dto.companyId) quote.companyId = dto.companyId;
    if (dto.contactId) quote.contactId = dto.contactId;
    if (dto.opportunityId) quote.opportunityId = dto.opportunityId;
    if (dto.currencyCode) quote.currencyCode = dto.currencyCode;
    if (dto.validUntil) quote.validUntil = dto.validUntil;

    return this.repository.save(quote);
  }

  async send(tenantId: string, id: string): Promise<Quote> {
    const quote = await this.findOneForTenant(tenantId, id);
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('La cotización ya fue enviada');
    }
    quote.status = QuoteStatus.SENT;
    quote.sentAt = new Date();
    return this.repository.save(quote);
  }

  async findByAccessToken(accessToken: string): Promise<Quote> {
    const quote = await this.repository.findOne({ where: { accessToken } });
    if (!quote) throw new BadRequestException('Cotización no encontrada');
    return quote;
  }

  async registerPublicView(accessToken: string): Promise<Quote> {
    const quote = await this.findByAccessToken(accessToken);
    quote.viewCount += 1;
    if (!quote.viewedAt) quote.viewedAt = new Date();
    if (quote.status === QuoteStatus.SENT) quote.status = QuoteStatus.VIEWED;
    return this.repository.save(quote);
  }

  async respond(accessToken: string, accepted: boolean): Promise<Quote> {
    const quote = await this.findByAccessToken(accessToken);
    if (![QuoteStatus.SENT, QuoteStatus.VIEWED].includes(quote.status)) {
      throw new BadRequestException('Esta cotización ya no admite respuesta');
    }
    quote.status = accepted ? QuoteStatus.ACCEPTED : QuoteStatus.REJECTED;
    quote.respondedAt = new Date();
    const saved = await this.repository.save(quote);

    await this.notificationsService.notify(
      saved.tenantId,
      saved.ownerUserId,
      accepted ? 'quote.accepted' : 'quote.rejected',
      accepted ? 'Cotización aceptada' : 'Cotización rechazada',
      accepted
        ? `El cliente aceptó la cotización ${saved.quoteNumber}.`
        : `El cliente rechazó la cotización ${saved.quoteNumber}.`,
      `/quotes`,
    );

    return saved;
  }

  findByOpportunity(tenantId: string, opportunityId: string): Promise<Quote[]> {
    return this.repository.find({ where: { tenantId, opportunityId } });
  }
}
