import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountType } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { CashAccount } from './entities/cash-account.entity';
import { CashTransaction, CashTransactionType } from './entities/cash-transaction.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { ListJournalEntriesQueryDto } from './dto/list-journal-entries-query.dto';
import { CreateCashAccountDto } from './dto/create-cash-account.dto';
import { UpdateCashAccountDto } from './dto/update-cash-account.dto';
import { DepositDto, WithdrawDto, TransferDto } from './dto/cash-movement.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Paginated } from '../../common/pagination/pagination.types';
import { DocumentSeriesService } from '../../core/org/document-series.service';
import { randomUUID } from 'crypto';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Well-known account codes the automatic postings from Facturación and
 * Compras rely on. If a tenant hasn't seeded (or has renamed/deleted) one
 * of these, the corresponding auto-posting is skipped with a warning
 * rather than blocking the sale/purchase — Accounting is optional, Sales
 * isn't. */
export const WELL_KNOWN_ACCOUNTS = {
  CASH: '1105',
  ACCOUNTS_RECEIVABLE: '1305',
  ACCOUNTS_PAYABLE: '2205',
  TAX_PAYABLE: '2408',
  SALES_REVENUE: '4135',
  PURCHASES_EXPENSE: '6135',
  FIXED_ASSETS: '1520',
  ACCUMULATED_DEPRECIATION: '1592',
  DEPRECIATION_EXPENSE: '5140',
  DISPOSAL_LOSS: '5145',
};

export const DEFAULT_CHART_OF_ACCOUNTS: Array<{ code: string; name: string; type: AccountType }> = [
  { code: '1105', name: 'Caja', type: AccountType.ASSET },
  { code: '1110', name: 'Bancos', type: AccountType.ASSET },
  { code: '1305', name: 'Clientes', type: AccountType.ASSET },
  { code: '1435', name: 'Inventarios', type: AccountType.ASSET },
  { code: '1520', name: 'Activos fijos', type: AccountType.ASSET },
  { code: '1592', name: 'Depreciación acumulada', type: AccountType.ASSET },
  { code: '2205', name: 'Proveedores', type: AccountType.LIABILITY },
  { code: '2408', name: 'Impuestos por pagar', type: AccountType.LIABILITY },
  { code: '3105', name: 'Capital social', type: AccountType.EQUITY },
  { code: '4135', name: 'Ingresos por ventas', type: AccountType.INCOME },
  { code: '4210', name: 'Ingresos no operacionales', type: AccountType.INCOME },
  { code: '5135', name: 'Gastos de administración', type: AccountType.EXPENSE },
  { code: '5140', name: 'Gasto por depreciación', type: AccountType.EXPENSE },
  { code: '5145', name: 'Pérdida en baja de activos', type: AccountType.EXPENSE },
  { code: '6135', name: 'Costo de ventas y compras', type: AccountType.EXPENSE },
];

@Injectable()
export class AccountingService extends TenantScopedService<Account> {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    @InjectRepository(Account) repo: Repository<Account>,
    @InjectRepository(JournalEntry) private readonly journalEntriesRepo: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine) private readonly journalLinesRepo: Repository<JournalEntryLine>,
    @InjectRepository(CashAccount) private readonly cashAccountsRepo: Repository<CashAccount>,
    @InjectRepository(CashTransaction) private readonly cashTransactionsRepo: Repository<CashTransaction>,
    private readonly documentSeriesService: DocumentSeriesService,
  ) {
    super(repo);
  }

  // --- Chart of accounts ---

  findPaginated(tenantId: string, query: { page?: number; pageSize?: number; search?: string; sortBy?: string; sortDir?: 'ASC' | 'DESC' }): Promise<Paginated<Account>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'account',
      searchColumns: ['code', 'name'],
      sortableColumns: ['code', 'name', 'type'],
      defaultSortBy: 'code',
    });
  }

  create(tenantId: string, dto: CreateAccountDto): Promise<Account> {
    const account = this.repository.create({ tenantId, code: dto.code, name: dto.name, type: dto.type });
    return this.repository.save(account);
  }

  async update(tenantId: string, id: string, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.findOneForTenant(tenantId, id);
    if (dto.code !== undefined) account.code = dto.code;
    if (dto.name !== undefined) account.name = dto.name;
    if (dto.type !== undefined) account.type = dto.type;
    if (dto.isActive !== undefined) account.isActive = dto.isActive;
    return this.repository.save(account);
  }

  /** Idempotent — only inserts accounts whose code doesn't already exist
   * for this tenant, so it's safe to call again after the tenant has
   * already customized their chart. */
  async seedDefaultChartOfAccounts(tenantId: string): Promise<Account[]> {
    const existing = await this.repository.find({ where: { tenantId } });
    const existingCodes = new Set(existing.map((a) => a.code));
    const toCreate = DEFAULT_CHART_OF_ACCOUNTS.filter((a) => !existingCodes.has(a.code));
    if (!toCreate.length) return existing;
    const created = await this.repository.save(toCreate.map((a) => this.repository.create({ tenantId, ...a })));
    return [...existing, ...created];
  }

  private nextEntryNumber(tenantId: string): Promise<string> {
    return this.documentSeriesService.consumeNext(tenantId, 'journal_entry');
  }

  // --- Journal entries ---

  findEntriesPaginated(tenantId: string, query: ListJournalEntriesQueryDto): Promise<Paginated<JournalEntry>> {
    return this.journalEntriesPaginatedHelper(tenantId, query);
  }

  private journalEntriesPaginatedHelper(tenantId: string, query: ListJournalEntriesQueryDto): Promise<Paginated<JournalEntry>> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 200);
    const qb = this.journalEntriesRepo.createQueryBuilder('entry').where('entry.tenantId = :tenantId', { tenantId });
    if (query.sourceType) qb.andWhere('entry.sourceType = :sourceType', { sourceType: query.sourceType });
    if (query.search) qb.andWhere('(entry.entryNumber ILIKE :s OR entry.description ILIKE :s)', { s: `%${query.search}%` });
    qb.orderBy('entry.date', 'DESC').addOrderBy('entry.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    return qb.getManyAndCount().then(([items, total]) => ({ items, total, page, pageSize }));
  }

  findEntry(tenantId: string, id: string): Promise<JournalEntry> {
    return this.journalEntriesRepo.findOneOrFail({ where: { tenantId, id } }).catch(() => {
      throw new BadRequestException('Asiento no encontrado');
    });
  }

  private assertBalanced(lines: { debit: number; credit: number }[]): void {
    const totalDebit = round2(lines.reduce((sum, l) => sum + Number(l.debit), 0));
    const totalCredit = round2(lines.reduce((sum, l) => sum + Number(l.credit), 0));
    if (totalDebit !== totalCredit) {
      throw new BadRequestException(`El asiento no cuadra: débitos ${totalDebit} vs créditos ${totalCredit}`);
    }
    if (totalDebit === 0) {
      throw new BadRequestException('El asiento no puede estar vacío');
    }
    for (const line of lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new BadRequestException('Cada línea debe tener débito o crédito, no ambos');
      }
      if (line.debit === 0 && line.credit === 0) {
        throw new BadRequestException('Cada línea debe tener un monto en débito o crédito');
      }
    }
  }

  async createManualEntry(tenantId: string, userId: string, dto: CreateJournalEntryDto): Promise<JournalEntry> {
    this.assertBalanced(dto.lines);
    return this.postEntry(tenantId, userId, {
      date: dto.date,
      description: dto.description,
      sourceType: 'manual',
      sourceId: null,
      lines: dto.lines,
    });
  }

  /** The shared low-level primitive every posting path (manual entry,
   * automatic postings from Facturación/Compras, cash transactions) goes
   * through — always balanced, always numbered via DocumentSeriesService. */
  private async postEntry(
    tenantId: string,
    userId: string,
    opts: {
      date: string;
      description: string;
      sourceType: string;
      sourceId: string | null;
      lines: { accountId: string; debit: number; credit: number; description?: string }[];
    },
  ): Promise<JournalEntry> {
    this.assertBalanced(opts.lines);
    const entry = this.journalEntriesRepo.create({
      tenantId,
      entryNumber: await this.nextEntryNumber(tenantId),
      date: opts.date,
      description: opts.description,
      sourceType: opts.sourceType,
      sourceId: opts.sourceId,
      createdByUserId: userId,
      lines: opts.lines.map((l) =>
        Object.assign(new JournalEntryLine(), {
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description ?? null,
        }),
      ),
    });
    return this.journalEntriesRepo.save(entry);
  }

  /** Looks up a well-known account by code for this tenant, returning null
   * (not throwing) so callers can soft-fail auto-posting. */
  private async findWellKnownAccount(tenantId: string, code: string): Promise<Account | null> {
    return this.repository.findOne({ where: { tenantId, code, isActive: true } });
  }

  // --- Automatic postings from Facturación / Compras (best-effort: a
  // tenant without Accounting set up shouldn't have Sales/Purchases break) ---

  async postInvoiceIssued(
    tenantId: string,
    userId: string,
    opts: { invoiceId: string; invoiceNumber: string; date: string; subtotal: number; tax: number },
  ): Promise<void> {
    const [ar, revenue, taxPayable] = await Promise.all([
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.ACCOUNTS_RECEIVABLE),
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.SALES_REVENUE),
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.TAX_PAYABLE),
    ]);
    if (!ar || !revenue || (opts.tax > 0 && !taxPayable)) {
      this.logger.warn(`No se pudo contabilizar la factura ${opts.invoiceNumber}: falta el plan de cuentas básico`);
      return;
    }
    const total = round2(opts.subtotal + opts.tax);
    const lines = [{ accountId: ar.id, debit: total, credit: 0, description: `Factura ${opts.invoiceNumber}` }];
    if (opts.subtotal > 0) lines.push({ accountId: revenue.id, debit: 0, credit: opts.subtotal, description: `Factura ${opts.invoiceNumber}` });
    if (opts.tax > 0 && taxPayable) lines.push({ accountId: taxPayable.id, debit: 0, credit: opts.tax, description: `Factura ${opts.invoiceNumber}` });

    await this.postEntry(tenantId, userId, {
      date: opts.date,
      description: `Emisión factura ${opts.invoiceNumber}`,
      sourceType: 'invoice',
      sourceId: opts.invoiceId,
      lines,
    }).catch((err) => this.logger.warn(`No se pudo contabilizar la factura ${opts.invoiceNumber}: ${(err as Error).message}`));
  }

  async postInvoicePayment(
    tenantId: string,
    userId: string,
    opts: { invoiceId: string; invoiceNumber: string; date: string; amount: number },
  ): Promise<void> {
    const [cash, ar] = await Promise.all([
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.CASH),
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.ACCOUNTS_RECEIVABLE),
    ]);
    if (!cash || !ar) {
      this.logger.warn(`No se pudo contabilizar el pago de la factura ${opts.invoiceNumber}: falta el plan de cuentas básico`);
      return;
    }
    await this.postEntry(tenantId, userId, {
      date: opts.date,
      description: `Pago factura ${opts.invoiceNumber}`,
      sourceType: 'invoice_payment',
      sourceId: opts.invoiceId,
      lines: [
        { accountId: cash.id, debit: opts.amount, credit: 0, description: `Pago factura ${opts.invoiceNumber}` },
        { accountId: ar.id, debit: 0, credit: opts.amount, description: `Pago factura ${opts.invoiceNumber}` },
      ],
    }).catch((err) => this.logger.warn(`No se pudo contabilizar el pago de la factura ${opts.invoiceNumber}: ${(err as Error).message}`));
  }

  async postSupplierInvoice(
    tenantId: string,
    userId: string,
    opts: { supplierInvoiceId: string; supplierInvoiceNumber: string; date: string; amount: number },
  ): Promise<void> {
    const [expense, ap] = await Promise.all([
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.PURCHASES_EXPENSE),
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.ACCOUNTS_PAYABLE),
    ]);
    if (!expense || !ap) {
      this.logger.warn(`No se pudo contabilizar la factura de proveedor ${opts.supplierInvoiceNumber}: falta el plan de cuentas básico`);
      return;
    }
    await this.postEntry(tenantId, userId, {
      date: opts.date,
      description: `Factura de proveedor ${opts.supplierInvoiceNumber}`,
      sourceType: 'supplier_invoice',
      sourceId: opts.supplierInvoiceId,
      lines: [
        { accountId: expense.id, debit: opts.amount, credit: 0, description: `Factura de proveedor ${opts.supplierInvoiceNumber}` },
        { accountId: ap.id, debit: 0, credit: opts.amount, description: `Factura de proveedor ${opts.supplierInvoiceNumber}` },
      ],
    }).catch((err) => this.logger.warn(`No se pudo contabilizar la factura de proveedor ${opts.supplierInvoiceNumber}: ${(err as Error).message}`));
  }

  async postSupplierPayment(
    tenantId: string,
    userId: string,
    opts: { supplierInvoiceId: string; supplierInvoiceNumber: string; date: string; amount: number },
  ): Promise<void> {
    const [ap, cash] = await Promise.all([
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.ACCOUNTS_PAYABLE),
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.CASH),
    ]);
    if (!ap || !cash) {
      this.logger.warn(`No se pudo contabilizar el pago a proveedor ${opts.supplierInvoiceNumber}: falta el plan de cuentas básico`);
      return;
    }
    await this.postEntry(tenantId, userId, {
      date: opts.date,
      description: `Pago a proveedor ${opts.supplierInvoiceNumber}`,
      sourceType: 'supplier_payment',
      sourceId: opts.supplierInvoiceId,
      lines: [
        { accountId: ap.id, debit: opts.amount, credit: 0, description: `Pago a proveedor ${opts.supplierInvoiceNumber}` },
        { accountId: cash.id, debit: 0, credit: opts.amount, description: `Pago a proveedor ${opts.supplierInvoiceNumber}` },
      ],
    }).catch((err) => this.logger.warn(`No se pudo contabilizar el pago a proveedor ${opts.supplierInvoiceNumber}: ${(err as Error).message}`));
  }

  /** One consolidated entry per depreciation run (not one per asset) —
   * same total debited to the expense account and credited to accumulated
   * depreciation, so the journal doesn't get flooded with a line per asset
   * every period. */
  async postDepreciationRun(
    tenantId: string,
    userId: string,
    opts: { period: string; totalAmount: number; assetCount: number },
  ): Promise<void> {
    const [expense, accumulated] = await Promise.all([
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.DEPRECIATION_EXPENSE),
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.ACCUMULATED_DEPRECIATION),
    ]);
    if (!expense || !accumulated) {
      this.logger.warn(`No se pudo contabilizar la depreciación del período ${opts.period}: falta el plan de cuentas básico`);
      return;
    }
    await this.postEntry(tenantId, userId, {
      date: opts.period,
      description: `Depreciación de ${opts.assetCount} activo(s) — período ${opts.period}`,
      sourceType: 'depreciation',
      sourceId: null,
      lines: [
        { accountId: expense.id, debit: opts.totalAmount, credit: 0 },
        { accountId: accumulated.id, debit: 0, credit: opts.totalAmount },
      ],
    }).catch((err) => this.logger.warn(`No se pudo contabilizar la depreciación del período ${opts.period}: ${(err as Error).message}`));
  }

  /** Write-off entry on disposal: clears the asset's accumulated
   * depreciation and its cost, booking whatever book value remains as a
   * loss (0 if the asset was already fully depreciated). */
  async postAssetDisposal(
    tenantId: string,
    userId: string,
    opts: { assetId: string; assetNumber: string; date: string; cost: number; accumulatedDepreciation: number; bookValue: number },
  ): Promise<void> {
    const [fixedAssets, accumulated, loss] = await Promise.all([
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.FIXED_ASSETS),
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.ACCUMULATED_DEPRECIATION),
      this.findWellKnownAccount(tenantId, WELL_KNOWN_ACCOUNTS.DISPOSAL_LOSS),
    ]);
    if (!fixedAssets || !accumulated || (opts.bookValue > 0 && !loss)) {
      this.logger.warn(`No se pudo contabilizar la baja del activo ${opts.assetNumber}: falta el plan de cuentas básico`);
      return;
    }
    const lines = [{ accountId: accumulated.id, debit: opts.accumulatedDepreciation, credit: 0, description: `Baja de ${opts.assetNumber}` }];
    if (opts.bookValue > 0 && loss) {
      lines.push({ accountId: loss.id, debit: opts.bookValue, credit: 0, description: `Baja de ${opts.assetNumber}` });
    }
    lines.push({ accountId: fixedAssets.id, debit: 0, credit: opts.cost, description: `Baja de ${opts.assetNumber}` });

    await this.postEntry(tenantId, userId, {
      date: opts.date,
      description: `Baja de activo fijo ${opts.assetNumber}`,
      sourceType: 'fixed_asset_disposal',
      sourceId: opts.assetId,
      lines,
    }).catch((err) => this.logger.warn(`No se pudo contabilizar la baja del activo ${opts.assetNumber}: ${(err as Error).message}`));
  }

  // --- Cash accounts (caja y bancos) ---

  findCashAccounts(tenantId: string): Promise<CashAccount[]> {
    return this.cashAccountsRepo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  createCashAccount(tenantId: string, dto: CreateCashAccountDto): Promise<CashAccount> {
    const cashAccount = this.cashAccountsRepo.create({
      tenantId,
      name: dto.name,
      type: dto.type,
      accountId: dto.accountId,
      currencyCode: dto.currencyCode ?? 'USD',
      balance: 0,
    });
    return this.cashAccountsRepo.save(cashAccount);
  }

  async updateCashAccount(tenantId: string, id: string, dto: UpdateCashAccountDto): Promise<CashAccount> {
    const cashAccount = await this.cashAccountsRepo.findOne({ where: { tenantId, id } });
    if (!cashAccount) throw new BadRequestException('Cuenta de caja/banco no encontrada');
    if (dto.name !== undefined) cashAccount.name = dto.name;
    if (dto.type !== undefined) cashAccount.type = dto.type;
    if (dto.accountId !== undefined) cashAccount.accountId = dto.accountId;
    if (dto.currencyCode !== undefined) cashAccount.currencyCode = dto.currencyCode;
    if (dto.isActive !== undefined) cashAccount.isActive = dto.isActive;
    return this.cashAccountsRepo.save(cashAccount);
  }

  private async applyCashDelta(tenantId: string, cashAccountId: string, delta: number): Promise<CashAccount> {
    const cashAccount = await this.cashAccountsRepo.findOne({ where: { tenantId, id: cashAccountId } });
    if (!cashAccount) throw new BadRequestException('Cuenta de caja/banco no encontrada');
    const newBalance = round2(Number(cashAccount.balance) + delta);
    if (newBalance < 0) {
      throw new BadRequestException('Saldo insuficiente en la cuenta de caja/banco');
    }
    cashAccount.balance = newBalance;
    return this.cashAccountsRepo.save(cashAccount);
  }

  async deposit(tenantId: string, userId: string, cashAccountId: string, dto: DepositDto): Promise<CashTransaction> {
    const cashAccount = await this.cashAccountsRepo.findOne({ where: { tenantId, id: cashAccountId } });
    if (!cashAccount) throw new BadRequestException('Cuenta de caja/banco no encontrada');

    const entry = await this.postEntry(tenantId, userId, {
      date: new Date().toISOString().slice(0, 10),
      description: `Ingreso a ${cashAccount.name}`,
      sourceType: 'cash_transaction',
      sourceId: null,
      lines: [
        { accountId: cashAccount.accountId, debit: dto.amount, credit: 0 },
        { accountId: dto.contraAccountId, debit: 0, credit: dto.amount },
      ],
    });
    await this.applyCashDelta(tenantId, cashAccountId, dto.amount);
    return this.cashTransactionsRepo.save(
      this.cashTransactionsRepo.create({
        tenantId,
        cashAccountId,
        type: CashTransactionType.DEPOSIT,
        amount: dto.amount,
        note: dto.note ?? null,
        transferGroupId: null,
        journalEntryId: entry.id,
        createdByUserId: userId,
        occurredAt: new Date(),
      }),
    );
  }

  async withdraw(tenantId: string, userId: string, cashAccountId: string, dto: WithdrawDto): Promise<CashTransaction> {
    const cashAccount = await this.cashAccountsRepo.findOne({ where: { tenantId, id: cashAccountId } });
    if (!cashAccount) throw new BadRequestException('Cuenta de caja/banco no encontrada');
    if (Number(cashAccount.balance) < dto.amount) {
      throw new BadRequestException('Saldo insuficiente en la cuenta de caja/banco');
    }

    const entry = await this.postEntry(tenantId, userId, {
      date: new Date().toISOString().slice(0, 10),
      description: `Egreso de ${cashAccount.name}`,
      sourceType: 'cash_transaction',
      sourceId: null,
      lines: [
        { accountId: dto.contraAccountId, debit: dto.amount, credit: 0 },
        { accountId: cashAccount.accountId, debit: 0, credit: dto.amount },
      ],
    });
    await this.applyCashDelta(tenantId, cashAccountId, -dto.amount);
    return this.cashTransactionsRepo.save(
      this.cashTransactionsRepo.create({
        tenantId,
        cashAccountId,
        type: CashTransactionType.WITHDRAWAL,
        amount: dto.amount,
        note: dto.note ?? null,
        transferGroupId: null,
        journalEntryId: entry.id,
        createdByUserId: userId,
        occurredAt: new Date(),
      }),
    );
  }

  async transfer(tenantId: string, userId: string, fromCashAccountId: string, dto: TransferDto): Promise<{ out: CashTransaction; in: CashTransaction }> {
    if (fromCashAccountId === dto.toCashAccountId) {
      throw new BadRequestException('La cuenta de origen y destino no pueden ser la misma');
    }
    const [from, to] = await Promise.all([
      this.cashAccountsRepo.findOne({ where: { tenantId, id: fromCashAccountId } }),
      this.cashAccountsRepo.findOne({ where: { tenantId, id: dto.toCashAccountId } }),
    ]);
    if (!from || !to) throw new BadRequestException('Cuenta de caja/banco no encontrada');
    if (Number(from.balance) < dto.amount) {
      throw new BadRequestException('Saldo insuficiente en la cuenta de origen');
    }

    const entry = await this.postEntry(tenantId, userId, {
      date: new Date().toISOString().slice(0, 10),
      description: `Transferencia de ${from.name} a ${to.name}`,
      sourceType: 'cash_transaction',
      sourceId: null,
      lines: [
        { accountId: to.accountId, debit: dto.amount, credit: 0 },
        { accountId: from.accountId, debit: 0, credit: dto.amount },
      ],
    });

    await this.applyCashDelta(tenantId, fromCashAccountId, -dto.amount);
    await this.applyCashDelta(tenantId, dto.toCashAccountId, dto.amount);

    const transferGroupId = randomUUID();
    const out = await this.cashTransactionsRepo.save(
      this.cashTransactionsRepo.create({
        tenantId,
        cashAccountId: fromCashAccountId,
        type: CashTransactionType.TRANSFER,
        amount: dto.amount,
        note: dto.note ?? null,
        transferGroupId,
        journalEntryId: entry.id,
        createdByUserId: userId,
        occurredAt: new Date(),
      }),
    );
    const inTx = await this.cashTransactionsRepo.save(
      this.cashTransactionsRepo.create({
        tenantId,
        cashAccountId: dto.toCashAccountId,
        type: CashTransactionType.TRANSFER,
        amount: dto.amount,
        note: dto.note ?? null,
        transferGroupId,
        journalEntryId: entry.id,
        createdByUserId: userId,
        occurredAt: new Date(),
      }),
    );
    return { out, in: inTx };
  }

  findCashTransactions(tenantId: string, cashAccountId?: string): Promise<CashTransaction[]> {
    return this.cashTransactionsRepo.find({
      where: cashAccountId ? { tenantId, cashAccountId } : { tenantId },
      order: { occurredAt: 'DESC' },
    });
  }

  // --- Reports ---

  /** Sum of debits/credits per account across every posted line — the
   * classic "does it all still balance" sanity check. */
  async trialBalance(tenantId: string): Promise<Array<{ accountId: string; code: string; name: string; type: AccountType; debit: number; credit: number }>> {
    const rows = await this.journalLinesRepo
      .createQueryBuilder('line')
      .innerJoin(Account, 'account', 'account.id = line.accountId')
      .select('account.id', 'accountId')
      .addSelect('account.code', 'code')
      .addSelect('account.name', 'name')
      .addSelect('account.type', 'type')
      .addSelect('COALESCE(SUM(line.debit), 0)', 'debit')
      .addSelect('COALESCE(SUM(line.credit), 0)', 'credit')
      .where('account.tenantId = :tenantId', { tenantId })
      .groupBy('account.id')
      .addGroupBy('account.code')
      .addGroupBy('account.name')
      .addGroupBy('account.type')
      .orderBy('account.code', 'ASC')
      .getRawMany();

    return rows.map((r) => ({ ...r, debit: round2(Number(r.debit)), credit: round2(Number(r.credit)) }));
  }

  /** Balance general: assets vs. liabilities + equity, net balance per
   * account computed the natural way for its type (debit-credit for
   * asset/expense, credit-debit for liability/equity/income). */
  async balanceSheet(tenantId: string): Promise<{ assets: Array<{ code: string; name: string; balance: number }>; liabilities: Array<{ code: string; name: string; balance: number }>; equity: Array<{ code: string; name: string; balance: number }>; totalAssets: number; totalLiabilities: number; totalEquity: number }> {
    const rows = await this.trialBalance(tenantId);
    const toBalance = (r: (typeof rows)[number]) =>
      [AccountType.ASSET, AccountType.EXPENSE].includes(r.type) ? round2(r.debit - r.credit) : round2(r.credit - r.debit);

    const assets = rows.filter((r) => r.type === AccountType.ASSET).map((r) => ({ code: r.code, name: r.name, balance: toBalance(r) }));
    const liabilities = rows.filter((r) => r.type === AccountType.LIABILITY).map((r) => ({ code: r.code, name: r.name, balance: toBalance(r) }));
    const equity = rows.filter((r) => r.type === AccountType.EQUITY).map((r) => ({ code: r.code, name: r.name, balance: toBalance(r) }));

    return {
      assets,
      liabilities,
      equity,
      totalAssets: round2(assets.reduce((s, a) => s + a.balance, 0)),
      totalLiabilities: round2(liabilities.reduce((s, a) => s + a.balance, 0)),
      totalEquity: round2(equity.reduce((s, a) => s + a.balance, 0)),
    };
  }

  /** Estado de resultados for a date range: income accounts minus expense
   * accounts, using only journal lines dated within [from, to]. */
  async incomeStatement(tenantId: string, from: string, to: string): Promise<{ income: Array<{ code: string; name: string; amount: number }>; expenses: Array<{ code: string; name: string; amount: number }>; totalIncome: number; totalExpenses: number; netResult: number }> {
    const rows = await this.journalLinesRepo
      .createQueryBuilder('line')
      .innerJoin(Account, 'account', 'account.id = line.accountId')
      .innerJoin(JournalEntry, 'entry', 'entry.id = line.journalEntryId')
      .select('account.code', 'code')
      .addSelect('account.name', 'name')
      .addSelect('account.type', 'type')
      .addSelect('COALESCE(SUM(line.debit), 0)', 'debit')
      .addSelect('COALESCE(SUM(line.credit), 0)', 'credit')
      .where('account.tenantId = :tenantId', { tenantId })
      .andWhere('account.type IN (:...types)', { types: [AccountType.INCOME, AccountType.EXPENSE] })
      .andWhere('entry.date BETWEEN :from AND :to', { from, to })
      .groupBy('account.code')
      .addGroupBy('account.name')
      .addGroupBy('account.type')
      .orderBy('account.code', 'ASC')
      .getRawMany();

    const income = rows
      .filter((r) => r.type === AccountType.INCOME)
      .map((r) => ({ code: r.code, name: r.name, amount: round2(Number(r.credit) - Number(r.debit)) }));
    const expenses = rows
      .filter((r) => r.type === AccountType.EXPENSE)
      .map((r) => ({ code: r.code, name: r.name, amount: round2(Number(r.debit) - Number(r.credit)) }));

    const totalIncome = round2(income.reduce((s, a) => s + a.amount, 0));
    const totalExpenses = round2(expenses.reduce((s, a) => s + a.amount, 0));
    return { income, expenses, totalIncome, totalExpenses, netResult: round2(totalIncome - totalExpenses) };
  }
}
