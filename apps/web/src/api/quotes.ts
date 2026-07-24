import { apiClient } from './client';
import type { Quote, QuoteFollowUp, PendingFollowUp } from './types';
import type { Paginated, PageParams } from './pagination';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export interface QuoteItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateQuotePayload {
  companyId: string;
  opportunityId?: string;
  contactId?: string;
  currencyCode?: string;
  taxId?: string;
  taxRate?: number;
  validUntil?: string;
  items: QuoteItemInput[];
}

export async function listQuotes(): Promise<Quote[]> {
  const { data } = await apiClient.get('/crm/quotes');
  return data;
}

export async function getQuote(id: string): Promise<Quote> {
  const { data } = await apiClient.get(`/crm/quotes/${id}`);
  return data;
}

export async function listQuotesPaginated(
  params: PageParams & { status?: string; ownerUserId?: string; companyId?: string },
): Promise<Paginated<Quote>> {
  const { data } = await apiClient.get('/crm/quotes', { params });
  return data;
}

export async function createQuoteRevision(id: string): Promise<Quote> {
  const { data } = await apiClient.post(`/crm/quotes/${id}/revise`);
  return data;
}

export async function getQuoteVersions(id: string): Promise<Quote[]> {
  const { data } = await apiClient.get(`/crm/quotes/${id}/versions`);
  return data;
}

export async function createQuote(payload: CreateQuotePayload): Promise<Quote> {
  const { data } = await apiClient.post('/crm/quotes', payload);
  return data;
}

export async function updateQuote(id: string, payload: Partial<CreateQuotePayload>): Promise<Quote> {
  const { data } = await apiClient.patch(`/crm/quotes/${id}`, payload);
  return data;
}

export async function sendQuote(id: string): Promise<Quote> {
  const { data } = await apiClient.patch(`/crm/quotes/${id}/send`);
  return data;
}

export async function downloadQuotePdf(id: string, quoteNumber: string): Promise<void> {
  const { data } = await apiClient.get(`/crm/quotes/${id}/pdf`, { responseType: 'blob' });
  triggerDownload(data, `${quoteNumber}.pdf`);
}

export async function listPendingFollowUps(): Promise<PendingFollowUp[]> {
  const { data } = await apiClient.get('/crm/quotes/follow-ups/pending');
  return data;
}

export async function createFollowUp(
  quoteId: string,
  payload: { dueAt: string; note?: string },
): Promise<QuoteFollowUp> {
  const { data } = await apiClient.post(`/crm/quotes/${quoteId}/follow-ups`, payload);
  return data;
}

export async function markFollowUpDone(followUpId: string): Promise<QuoteFollowUp> {
  const { data } = await apiClient.patch(`/crm/quotes/follow-ups/${followUpId}/done`);
  return data;
}

// Public (no auth) — the "view as customer" link.
export async function getPublicQuote(token: string): Promise<Quote> {
  const { data } = await apiClient.get(`/public/quotes/${token}`);
  return data;
}

export async function respondPublicQuote(token: string, accepted: boolean, signedByName?: string): Promise<Quote> {
  const { data } = await apiClient.post(`/public/quotes/${token}/respond`, { accepted, signedByName });
  return data;
}

export async function downloadPublicQuotePdf(token: string, quoteNumber: string): Promise<void> {
  const { data } = await apiClient.get(`/public/quotes/${token}/pdf`, { responseType: 'blob' });
  triggerDownload(data, `${quoteNumber}.pdf`);
}
