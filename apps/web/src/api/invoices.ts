import { apiClient } from './client';
import type { Invoice, InvoiceAdjustment, InvoicePayment, RecurringInvoiceTemplate, InvoiceItem } from './types';
import type { Paginated, PageParams } from './pagination';

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoicePayload {
  companyId: string;
  contactId?: string;
  quoteId?: string;
  currencyCode?: string;
  taxId?: string;
  taxRate?: number;
  issueDate: string;
  dueDate?: string;
  items: InvoiceItemInput[];
}

export async function listInvoices(): Promise<Invoice[]> {
  const { data } = await apiClient.get('/finance/invoices');
  return data;
}

export async function listInvoicesPaginated(
  params: PageParams & { status?: string; ownerUserId?: string; companyId?: string },
): Promise<Paginated<Invoice>> {
  const { data } = await apiClient.get('/finance/invoices', { params });
  return data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.get(`/finance/invoices/${id}`);
  return data;
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const { data } = await apiClient.post('/finance/invoices', payload);
  return data;
}

export async function createInvoiceFromQuote(quoteId: string, issueDate: string): Promise<Invoice> {
  const { data } = await apiClient.post(`/finance/invoices/from-quote/${quoteId}`, { issueDate });
  return data;
}

export async function updateInvoice(id: string, payload: Partial<CreateInvoicePayload>): Promise<Invoice> {
  const { data } = await apiClient.patch(`/finance/invoices/${id}`, payload);
  return data;
}

export async function issueInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.patch(`/finance/invoices/${id}/issue`);
  return data;
}

export async function cancelInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.patch(`/finance/invoices/${id}/cancel`);
  return data;
}

export async function addInvoiceAdjustment(
  id: string,
  payload: { type: 'credit' | 'debit'; amount: number; reason?: string },
): Promise<InvoiceAdjustment> {
  const { data } = await apiClient.post(`/finance/invoices/${id}/adjustments`, payload);
  return data;
}

export async function listInvoiceAdjustments(id: string): Promise<InvoiceAdjustment[]> {
  const { data } = await apiClient.get(`/finance/invoices/${id}/adjustments`);
  return data;
}

export async function addInvoicePayment(
  id: string,
  payload: { amount: number; method?: string; paidAt?: string; note?: string },
): Promise<InvoicePayment> {
  const { data } = await apiClient.post(`/finance/invoices/${id}/payments`, payload);
  return data;
}

export async function listInvoicePayments(id: string): Promise<InvoicePayment[]> {
  const { data } = await apiClient.get(`/finance/invoices/${id}/payments`);
  return data;
}

export async function sendInvoiceReminder(id: string): Promise<Invoice> {
  const { data } = await apiClient.post(`/finance/invoices/${id}/send-reminder`);
  return data;
}

export async function listRecurringTemplates(): Promise<RecurringInvoiceTemplate[]> {
  const { data } = await apiClient.get('/finance/invoices/recurring-templates');
  return data;
}

export interface CreateRecurringTemplatePayload {
  name: string;
  companyId: string;
  contactId?: string;
  currencyCode?: string;
  frequency: RecurringInvoiceTemplate['frequency'];
  taxRate?: number;
  items: InvoiceItemInput[];
}

export async function createRecurringTemplate(payload: CreateRecurringTemplatePayload): Promise<RecurringInvoiceTemplate> {
  const { data } = await apiClient.post('/finance/invoices/recurring-templates', payload);
  return data;
}

export async function setRecurringTemplateActive(id: string, isActive: boolean): Promise<RecurringInvoiceTemplate> {
  const { data } = await apiClient.patch(`/finance/invoices/recurring-templates/${id}/active`, { isActive });
  return data;
}

export async function generateInvoiceFromTemplate(id: string, issueDate: string): Promise<Invoice> {
  const { data } = await apiClient.post(`/finance/invoices/recurring-templates/${id}/generate`, { issueDate });
  return data;
}

export type { InvoiceItem };
