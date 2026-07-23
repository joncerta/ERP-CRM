import { apiClient } from './client';
import type {
  Account,
  AccountType,
  JournalEntry,
  CashAccount,
  CashAccountType,
  CashTransaction,
  TrialBalanceRow,
  BalanceSheetReport,
  IncomeStatementReport,
} from './types';
import type { Paginated, PageParams } from './pagination';

export async function listAccounts(): Promise<Account[]> {
  const { data } = await apiClient.get('/accounting/accounts');
  return data;
}

export async function listAccountsPaginated(params: PageParams): Promise<Paginated<Account>> {
  const { data } = await apiClient.get('/accounting/accounts', { params });
  return data;
}

export async function createAccount(payload: { code: string; name: string; type: AccountType }): Promise<Account> {
  const { data } = await apiClient.post('/accounting/accounts', payload);
  return data;
}

export async function updateAccount(id: string, payload: Partial<{ code: string; name: string; type: AccountType; isActive: boolean }>): Promise<Account> {
  const { data } = await apiClient.patch(`/accounting/accounts/${id}`, payload);
  return data;
}

export async function seedDefaultAccounts(): Promise<Account[]> {
  const { data } = await apiClient.post('/accounting/accounts/seed-defaults');
  return data;
}

export interface JournalEntryLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export async function listJournalEntries(params: PageParams & { sourceType?: string }): Promise<Paginated<JournalEntry>> {
  const { data } = await apiClient.get('/accounting/journal-entries', { params });
  return data;
}

export async function createJournalEntry(payload: { date: string; description: string; lines: JournalEntryLineInput[] }): Promise<JournalEntry> {
  const { data } = await apiClient.post('/accounting/journal-entries', payload);
  return data;
}

export async function getJournalEntry(id: string): Promise<JournalEntry> {
  const { data } = await apiClient.get(`/accounting/journal-entries/${id}`);
  return data;
}

export async function listCashAccounts(): Promise<CashAccount[]> {
  const { data } = await apiClient.get('/accounting/cash-accounts');
  return data;
}

export async function createCashAccount(payload: { name: string; type: CashAccountType; accountId: string; currencyCode?: string }): Promise<CashAccount> {
  const { data } = await apiClient.post('/accounting/cash-accounts', payload);
  return data;
}

export async function updateCashAccount(id: string, payload: Partial<{ name: string; type: CashAccountType; accountId: string; currencyCode: string; isActive: boolean }>): Promise<CashAccount> {
  const { data } = await apiClient.patch(`/accounting/cash-accounts/${id}`, payload);
  return data;
}

export async function depositToCashAccount(id: string, payload: { contraAccountId: string; amount: number; note?: string }): Promise<CashTransaction> {
  const { data } = await apiClient.post(`/accounting/cash-accounts/${id}/deposit`, payload);
  return data;
}

export async function withdrawFromCashAccount(id: string, payload: { contraAccountId: string; amount: number; note?: string }): Promise<CashTransaction> {
  const { data } = await apiClient.post(`/accounting/cash-accounts/${id}/withdraw`, payload);
  return data;
}

export async function transferCashAccount(id: string, payload: { toCashAccountId: string; amount: number; note?: string }): Promise<{ out: CashTransaction; in: CashTransaction }> {
  const { data } = await apiClient.post(`/accounting/cash-accounts/${id}/transfer`, payload);
  return data;
}

export async function listCashTransactions(cashAccountId: string): Promise<CashTransaction[]> {
  const { data } = await apiClient.get(`/accounting/cash-accounts/${cashAccountId}/transactions`);
  return data;
}

export async function getTrialBalance(): Promise<TrialBalanceRow[]> {
  const { data } = await apiClient.get('/accounting/reports/trial-balance');
  return data;
}

export async function getBalanceSheet(): Promise<BalanceSheetReport> {
  const { data } = await apiClient.get('/accounting/reports/balance-sheet');
  return data;
}

export async function getIncomeStatement(from: string, to: string): Promise<IncomeStatementReport> {
  const { data } = await apiClient.get('/accounting/reports/income-statement', { params: { from, to } });
  return data;
}
