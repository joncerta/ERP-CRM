import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { QuotesService } from './quotes.service';
import { Quote, QuoteStatus } from './entities/quote.entity';
import { NotificationEscalationService } from '../../core/users/notification-escalation.service';
import { ContactsService } from '../contacts/contacts.service';
import { EmailService } from '../../common/email/email.service';
import { ConfigService } from '@nestjs/config';
import { DocumentSeriesService } from '../../core/org/document-series.service';

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
  return { repo, notificationEscalationService, contactsService, emailService, config, documentSeriesService };
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
  );
  return { service, ...deps };
}

describe('QuotesService', () => {
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
