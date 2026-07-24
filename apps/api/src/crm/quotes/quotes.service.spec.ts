import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { QuotesService } from './quotes.service';
import { Quote, QuoteStatus } from './entities/quote.entity';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';
import { ContactsService } from '../contacts/contacts.service';
import { EmailService } from '../../common/email/email.service';
import { ConfigService } from '@nestjs/config';
import { DocumentSeriesService } from '../../core/org/document-series.service';
import { TaxesService } from '../../core/taxes/taxes.service';
import { WebhooksService } from '../../automations/webhooks.service';
import { CommunicationsService } from '../../documents/communications.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'quote-new', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Quote>>;
  const notificationEscalationService = {
    notifyWithEscalation: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationEscalationService>;
  const contactsService = {} as unknown as jest.Mocked<ContactsService>;
  const emailService = { send: jest.fn() } as unknown as jest.Mocked<EmailService>;
  const config = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;
  const documentSeriesService = {
    consumeNext: jest.fn().mockResolvedValue('COT-000002'),
  } as unknown as jest.Mocked<DocumentSeriesService>;
  const taxesService = {
    findOneForTenant: jest.fn().mockRejectedValue(new Error('not found')),
  } as unknown as jest.Mocked<TaxesService>;
  const webhooksService = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WebhooksService>;
  const communicationsService = {
    logAutomatic: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CommunicationsService>;
  return { repo, notificationEscalationService, contactsService, emailService, config, documentSeriesService, taxesService, webhooksService, communicationsService };
}

function buildService() {
  const deps = buildDeps();
  const service = new QuotesService(
    deps.repo,
    deps.notificationEscalationService,
    deps.contactsService,
    deps.emailService,
    deps.config,
    deps.documentSeriesService,
    deps.taxesService,
    deps.webhooksService,
    deps.communicationsService,
  );
  return { service, ...deps };
}

describe('QuotesService', () => {
  describe('create', () => {
    it('uses the selected catalog tax rate over a hand-typed one', async () => {
      const { service, taxesService } = buildService();
      taxesService.findOneForTenant.mockResolvedValue({ id: 'tax-1', rate: 19 } as never);

      const quote = await service.create('tenant-a', 'user-1', {
        companyId: 'company-1',
        taxId: 'tax-1',
        taxRate: 5, // should be ignored — taxId wins
        items: [{ description: 'Item A', quantity: 1, unitPrice: 100 }],
      } as never);

      expect(quote).toMatchObject({ taxId: 'tax-1', subtotal: 100, tax: 19, total: 119 });
    });

    it('falls back to the manual rate when no tax is selected', async () => {
      const { service } = buildService();

      const quote = await service.create('tenant-a', 'user-1', {
        companyId: 'company-1',
        taxRate: 10,
        items: [{ description: 'Item A', quantity: 1, unitPrice: 100 }],
      } as never);

      expect(quote).toMatchObject({ taxId: null, subtotal: 100, tax: 10, total: 110 });
    });
  });

  describe('createRevision', () => {
    it('refuses to revise a quote that is still a draft', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'quote-1',
        tenantId: 'tenant-a',
        status: QuoteStatus.DRAFT,
        items: [],
      } as unknown as Quote);

      await expect(service.createRevision('tenant-a', 'quote-1')).rejects.toThrow(BadRequestException);
    });

    it('clones a sent quote into a new draft, incrementing the version and linking back', async () => {
      const { service, repo, documentSeriesService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'quote-1',
        tenantId: 'tenant-a',
        ownerUserId: 'user-1',
        opportunityId: 'opp-1',
        companyId: 'company-1',
        contactId: 'contact-1',
        currencyCode: 'USD',
        status: QuoteStatus.SENT,
        subtotal: 100,
        tax: 19,
        total: 119,
        version: 1,
        items: [{ description: 'Item A', quantity: 2, unitPrice: 50, total: 100 }],
      } as unknown as Quote);

      const revision = await service.createRevision('tenant-a', 'quote-1');

      expect(documentSeriesService.consumeNext).toHaveBeenCalledWith('tenant-a', 'quote');
      expect(revision).toMatchObject({
        status: QuoteStatus.DRAFT,
        version: 2,
        previousVersionId: 'quote-1',
        quoteNumber: 'COT-000002',
        companyId: 'company-1',
      });
    });
  });

  describe('respond', () => {
    it('refuses to accept a quote past its validUntil date, even if still "sent"', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'quote-1',
        tenantId: 'tenant-a',
        accessToken: 'token-1',
        status: QuoteStatus.SENT,
        validUntil: '2020-01-01',
      } as unknown as Quote);

      await expect(service.respond('token-1', true)).rejects.toThrow(BadRequestException);
    });

    it('refuses to accept without a typed signature name', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'quote-1',
        tenantId: 'tenant-a',
        accessToken: 'token-1',
        status: QuoteStatus.SENT,
        validUntil: '2099-01-01',
      } as unknown as Quote);

      await expect(service.respond('token-1', true)).rejects.toThrow(BadRequestException);
    });

    it('accepts a response while still within validUntil, storing the typed signature', async () => {
      const { service, repo, notificationEscalationService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'quote-1',
        tenantId: 'tenant-a',
        accessToken: 'token-1',
        status: QuoteStatus.SENT,
        ownerUserId: 'user-1',
        quoteNumber: 'COT-000001',
        validUntil: '2099-01-01',
      } as unknown as Quote);

      const updated = await service.respond('token-1', true, 'María Restrepo');

      expect(updated).toMatchObject({ signedByName: 'María Restrepo' });

      expect(updated).toMatchObject({ status: QuoteStatus.ACCEPTED });
      expect(notificationEscalationService.notifyWithEscalation).toHaveBeenCalled();
    });
  });

  describe('findVersions', () => {
    it('returns just the quote itself when it has no prior or later versions', async () => {
      const { service, repo } = buildService();
      const quote = { id: 'quote-1', tenantId: 'tenant-a', previousVersionId: null } as Quote;
      repo.findOne
        .mockResolvedValueOnce(quote) // findOneForTenant
        .mockResolvedValueOnce(null); // "any later version?" lookup

      const versions = await service.findVersions('tenant-a', 'quote-1');
      expect(versions).toEqual([quote]);
    });

    it('walks both backward and forward to return the full lineage, oldest first', async () => {
      const { service, repo } = buildService();
      const v1 = { id: 'quote-1', tenantId: 'tenant-a', previousVersionId: null } as Quote;
      const v2 = { id: 'quote-2', tenantId: 'tenant-a', previousVersionId: 'quote-1' } as Quote;
      const v3 = { id: 'quote-3', tenantId: 'tenant-a', previousVersionId: 'quote-2' } as Quote;

      repo.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'quote-1') return Promise.resolve(v1);
        if (where.id === 'quote-2') return Promise.resolve(v2);
        if (where.previousVersionId === 'quote-2') return Promise.resolve(v3);
        if (where.previousVersionId === 'quote-3') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const versions = await service.findVersions('tenant-a', 'quote-2');
      expect(versions.map((v) => v.id)).toEqual(['quote-1', 'quote-2', 'quote-3']);
    });
  });
});
