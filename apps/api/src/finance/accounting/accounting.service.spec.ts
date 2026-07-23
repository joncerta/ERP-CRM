import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AccountingService, WELL_KNOWN_ACCOUNTS } from './accounting.service';
import { Account, AccountType } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { CashAccount, CashAccountType } from './entities/cash-account.entity';
import { CashTransaction } from './entities/cash-transaction.entity';
import { DocumentSeriesService } from '../../core/org/document-series.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => (Array.isArray(data) ? data.map((d, i) => ({ id: `account-${i}`, ...d })) : { id: 'account-new', ...data })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Account>>;
  const journalEntriesRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'entry-1', ...data })),
  } as unknown as jest.Mocked<Repository<JournalEntry>>;
  const journalLinesRepo = {} as unknown as jest.Mocked<Repository<JournalEntryLine>>;
  const cashAccountsRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'cash-new', ...data })),
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<CashAccount>>;
  const cashTransactionsRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'tx-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<CashTransaction>>;
  const documentSeriesService = {
    consumeNext: jest.fn().mockResolvedValue('AST-000001'),
  } as unknown as jest.Mocked<DocumentSeriesService>;
  return { repo, journalEntriesRepo, journalLinesRepo, cashAccountsRepo, cashTransactionsRepo, documentSeriesService };
}

function buildService() {
  const deps = buildDeps();
  const service = new AccountingService(
    deps.repo,
    deps.journalEntriesRepo,
    deps.journalLinesRepo,
    deps.cashAccountsRepo,
    deps.cashTransactionsRepo,
    deps.documentSeriesService,
  );
  return { service, ...deps };
}

describe('AccountingService', () => {
  describe('createManualEntry', () => {
    it('refuses an entry where debits and credits do not match', async () => {
      const { service } = buildService();

      await expect(
        service.createManualEntry('tenant-a', 'user-1', {
          date: '2026-01-01',
          description: 'Ajuste',
          lines: [
            { accountId: 'acc-1', debit: 100, credit: 0 },
            { accountId: 'acc-2', debit: 0, credit: 50 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses a line with both debit and credit set', async () => {
      const { service } = buildService();

      await expect(
        service.createManualEntry('tenant-a', 'user-1', {
          date: '2026-01-01',
          description: 'Ajuste',
          lines: [
            { accountId: 'acc-1', debit: 100, credit: 100 },
            { accountId: 'acc-2', debit: 0, credit: 0 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('posts a balanced entry, claiming a number from the document series', async () => {
      const { service, documentSeriesService, journalEntriesRepo } = buildService();

      const entry = await service.createManualEntry('tenant-a', 'user-1', {
        date: '2026-01-01',
        description: 'Aporte de capital',
        lines: [
          { accountId: 'acc-cash', debit: 500, credit: 0 },
          { accountId: 'acc-equity', debit: 0, credit: 500 },
        ],
      });

      expect(documentSeriesService.consumeNext).toHaveBeenCalledWith('tenant-a', 'journal_entry');
      expect(journalEntriesRepo.save).toHaveBeenCalled();
      expect(entry).toMatchObject({ entryNumber: 'AST-000001', sourceType: 'manual' });
    });
  });

  describe('seedDefaultChartOfAccounts', () => {
    it('only creates accounts whose code is not already present', async () => {
      const { service, repo } = buildService();
      repo.find.mockResolvedValue([{ id: 'existing', tenantId: 'tenant-a', code: '1105', name: 'Caja', type: AccountType.ASSET } as Account]);

      await service.seedDefaultChartOfAccounts('tenant-a');

      const savedArg = (repo.save as jest.Mock).mock.calls[0][0];
      expect(savedArg.some((a: { code: string }) => a.code === '1105')).toBe(false);
      expect(savedArg.some((a: { code: string }) => a.code === '1305')).toBe(true);
    });
  });

  describe('postInvoiceIssued', () => {
    it('does not throw when the well-known accounts are missing — Sales must not break because Accounting is unset up', async () => {
      const { service, repo, journalEntriesRepo } = buildService();
      repo.findOne.mockResolvedValue(null);

      await service.postInvoiceIssued('tenant-a', 'user-1', {
        invoiceId: 'invoice-1',
        invoiceNumber: 'FAC-000001',
        date: '2026-01-01',
        subtotal: 100,
        tax: 19,
      });

      expect(journalEntriesRepo.save).not.toHaveBeenCalled();
    });

    it('posts AR/revenue/tax lines when the accounts exist', async () => {
      const { service, repo, journalEntriesRepo } = buildService();
      repo.findOne.mockImplementation(({ where }: any) => {
        if (where.code === WELL_KNOWN_ACCOUNTS.ACCOUNTS_RECEIVABLE) return Promise.resolve({ id: 'ar' });
        if (where.code === WELL_KNOWN_ACCOUNTS.SALES_REVENUE) return Promise.resolve({ id: 'revenue' });
        if (where.code === WELL_KNOWN_ACCOUNTS.TAX_PAYABLE) return Promise.resolve({ id: 'tax' });
        return Promise.resolve(null);
      });

      await service.postInvoiceIssued('tenant-a', 'user-1', {
        invoiceId: 'invoice-1',
        invoiceNumber: 'FAC-000001',
        date: '2026-01-01',
        subtotal: 100,
        tax: 19,
      });

      expect(journalEntriesRepo.save).toHaveBeenCalled();
      const savedEntry = (journalEntriesRepo.save as jest.Mock).mock.calls[0][0];
      const totalDebit = savedEntry.lines.reduce((s: number, l: any) => s + l.debit, 0);
      const totalCredit = savedEntry.lines.reduce((s: number, l: any) => s + l.credit, 0);
      expect(totalDebit).toBe(119);
      expect(totalCredit).toBe(119);
    });
  });

  describe('postDepreciationRun', () => {
    it('posts a single consolidated entry for the whole run', async () => {
      const { service, repo, journalEntriesRepo } = buildService();
      repo.findOne.mockImplementation(({ where }: any) => {
        if (where.code === WELL_KNOWN_ACCOUNTS.DEPRECIATION_EXPENSE) return Promise.resolve({ id: 'expense' });
        if (where.code === WELL_KNOWN_ACCOUNTS.ACCUMULATED_DEPRECIATION) return Promise.resolve({ id: 'accumulated' });
        return Promise.resolve(null);
      });

      await service.postDepreciationRun('tenant-a', 'user-1', { period: '2026-07-01', totalAmount: 300, assetCount: 3 });

      const savedEntry = (journalEntriesRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedEntry.lines).toEqual([
        expect.objectContaining({ accountId: 'expense', debit: 300, credit: 0 }),
        expect.objectContaining({ accountId: 'accumulated', debit: 0, credit: 300 }),
      ]);
    });
  });

  describe('postAssetDisposal', () => {
    it('books a loss for the remaining book value when the asset was not fully depreciated', async () => {
      const { service, repo, journalEntriesRepo } = buildService();
      repo.findOne.mockImplementation(({ where }: any) => {
        if (where.code === WELL_KNOWN_ACCOUNTS.FIXED_ASSETS) return Promise.resolve({ id: 'fixed-assets' });
        if (where.code === WELL_KNOWN_ACCOUNTS.ACCUMULATED_DEPRECIATION) return Promise.resolve({ id: 'accumulated' });
        if (where.code === WELL_KNOWN_ACCOUNTS.DISPOSAL_LOSS) return Promise.resolve({ id: 'loss' });
        return Promise.resolve(null);
      });

      await service.postAssetDisposal('tenant-a', 'user-1', {
        assetId: 'asset-1',
        assetNumber: 'AF-000001',
        date: '2026-07-01',
        cost: 1000,
        accumulatedDepreciation: 600,
        bookValue: 400,
      });

      const savedEntry = (journalEntriesRepo.save as jest.Mock).mock.calls[0][0];
      const totalDebit = savedEntry.lines.reduce((s: number, l: any) => s + l.debit, 0);
      const totalCredit = savedEntry.lines.reduce((s: number, l: any) => s + l.credit, 0);
      expect(totalDebit).toBe(1000);
      expect(totalCredit).toBe(1000);
      expect(savedEntry.lines.some((l: any) => l.accountId === 'loss' && l.debit === 400)).toBe(true);
    });
  });

  describe('cash accounts', () => {
    it('deposit increases the balance and posts a balanced journal entry', async () => {
      const { service, cashAccountsRepo, journalEntriesRepo } = buildService();
      cashAccountsRepo.findOne.mockResolvedValue({
        id: 'cash-1',
        tenantId: 'tenant-a',
        name: 'Caja principal',
        type: CashAccountType.CASH,
        accountId: 'acc-cash',
        balance: 100,
      } as CashAccount);

      await service.deposit('tenant-a', 'user-1', 'cash-1', { contraAccountId: 'acc-income', amount: 50 });

      expect(journalEntriesRepo.save).toHaveBeenCalled();
      expect(cashAccountsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ balance: 150 }));
    });

    it('withdraw refuses to overdraw the account', async () => {
      const { service, cashAccountsRepo } = buildService();
      cashAccountsRepo.findOne.mockResolvedValue({
        id: 'cash-1',
        tenantId: 'tenant-a',
        balance: 20,
      } as CashAccount);

      await expect(
        service.withdraw('tenant-a', 'user-1', 'cash-1', { contraAccountId: 'acc-expense', amount: 50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('transfer moves the balance from one account to the other', async () => {
      const { service, cashAccountsRepo } = buildService();
      cashAccountsRepo.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'cash-from') return Promise.resolve({ id: 'cash-from', tenantId: 'tenant-a', name: 'Caja', accountId: 'acc-cash', balance: 200 });
        if (where.id === 'cash-to') return Promise.resolve({ id: 'cash-to', tenantId: 'tenant-a', name: 'Banco', accountId: 'acc-bank', balance: 0 });
        return Promise.resolve(null);
      });

      await service.transfer('tenant-a', 'user-1', 'cash-from', { toCashAccountId: 'cash-to', amount: 80 });

      expect(cashAccountsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'cash-from', balance: 120 }));
      expect(cashAccountsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'cash-to', balance: 80 }));
    });

    it('refuses a transfer to the same account', async () => {
      const { service } = buildService();

      await expect(
        service.transfer('tenant-a', 'user-1', 'cash-1', { toCashAccountId: 'cash-1', amount: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
