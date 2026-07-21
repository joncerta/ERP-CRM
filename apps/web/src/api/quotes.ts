import { apiClient } from './client';
import type { Quote, QuoteFollowUp, PendingFollowUp } from './types';

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
  taxRate?: number;
  validUntil?: string;
  items: QuoteItemInput[];
}

export async function listQuotes(): Promise<Quote[]> {
  const { data } = await apiClient.get('/crm/quotes');
  return data;
}

export async function createQuote(payload: CreateQuotePayload): Promise<Quote> {
  const { data } = await apiClient.post('/crm/quotes', payload);
  return data;
}

export async function sendQuote(id: string): Promise<Quote> {
  const { data } = await apiClient.patch(`/crm/quotes/${id}/send`);
  return data;
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

export async function respondPublicQuote(token: string, accepted: boolean): Promise<Quote> {
  const { data } = await apiClient.post(`/public/quotes/${token}/respond`, { accepted });
  return data;
}
