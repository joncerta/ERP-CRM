import { Repository } from 'typeorm';
import { QuoteFollowUpsService } from './quote-follow-ups.service';
import { QuoteFollowUp, QuoteFollowUpStatus } from './entities/quote-follow-up.entity';
import { Quote, QuoteStatus } from './entities/quote.entity';
import { Company } from '../companies/entities/company.entity';

function buildRepos() {
  const followUpRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'follow-up-1', ...data })),
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<QuoteFollowUp>>;
  const quotesRepo = { find: jest.fn() } as unknown as jest.Mocked<Repository<Quote>>;
  const companiesRepo = { find: jest.fn() } as unknown as jest.Mocked<Repository<Company>>;
  return { followUpRepo, quotesRepo, companiesRepo };
}

describe('QuoteFollowUpsService', () => {
  let followUpRepo: ReturnType<typeof buildRepos>['followUpRepo'];
  let quotesRepo: ReturnType<typeof buildRepos>['quotesRepo'];
  let companiesRepo: ReturnType<typeof buildRepos>['companiesRepo'];
  let service: QuoteFollowUpsService;

  beforeEach(() => {
    ({ followUpRepo, quotesRepo, companiesRepo } = buildRepos());
    service = new QuoteFollowUpsService(followUpRepo, quotesRepo, companiesRepo);
  });

  it('defaults assignedToUserId to whoever created the reminder', async () => {
    await service.create('tenant-a', 'quote-1', 'user-1', { dueAt: '2026-01-01T00:00:00Z' });
    expect(followUpRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a', quoteId: 'quote-1', assignedToUserId: 'user-1' }),
    );
  });

  it('honors an explicit assignedToUserId over the requester', async () => {
    await service.create('tenant-a', 'quote-1', 'user-1', {
      dueAt: '2026-01-01T00:00:00Z',
      assignedToUserId: 'user-2',
    });
    expect(followUpRepo.create).toHaveBeenCalledWith(expect.objectContaining({ assignedToUserId: 'user-2' }));
  });

  it('marking done sets status and completedAt', async () => {
    const pending = {
      id: 'f1',
      tenantId: 'tenant-a',
      status: QuoteFollowUpStatus.PENDING,
      completedAt: null,
    } as QuoteFollowUp;
    followUpRepo.findOne.mockResolvedValue(pending);
    const result = await service.markDone('tenant-a', 'f1');
    expect(result.status).toBe(QuoteFollowUpStatus.DONE);
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it('findPendingForTenant enriches each reminder with its quote number and company name', async () => {
    followUpRepo.find.mockResolvedValue([
      { id: 'f1', quoteId: 'q1', dueAt: new Date(), note: null, status: QuoteFollowUpStatus.PENDING, assignedToUserId: 'u1' } as QuoteFollowUp,
    ]);
    quotesRepo.find.mockResolvedValue([
      { id: 'q1', quoteNumber: 'COT-000001', status: QuoteStatus.SENT, companyId: 'c1' } as Quote,
    ]);
    companiesRepo.find.mockResolvedValue([{ id: 'c1', name: 'Acme SAS' } as Company]);

    const result = await service.findPendingForTenant('tenant-a');

    expect(result).toEqual([
      expect.objectContaining({ id: 'f1', quoteNumber: 'COT-000001', companyId: 'c1', companyName: 'Acme SAS' }),
    ]);
  });

  it('findPendingForTenant falls back gracefully when the quote is missing', async () => {
    followUpRepo.find.mockResolvedValue([
      { id: 'f1', quoteId: 'missing-quote', dueAt: new Date(), note: null, status: QuoteFollowUpStatus.PENDING, assignedToUserId: 'u1' } as QuoteFollowUp,
    ]);
    quotesRepo.find.mockResolvedValue([]);
    companiesRepo.find.mockResolvedValue([]);

    const result = await service.findPendingForTenant('tenant-a');

    expect(result[0]).toMatchObject({ quoteNumber: '—', companyName: '—' });
  });

  it('findPendingForTenant returns early without querying quotes/companies when there are no reminders', async () => {
    followUpRepo.find.mockResolvedValue([]);
    const result = await service.findPendingForTenant('tenant-a');
    expect(result).toEqual([]);
    expect(quotesRepo.find).not.toHaveBeenCalled();
  });
});
