import { apiClient } from './client';
import type { Ticket, TicketComment, TicketPriority, TicketStatus, KnowledgeArticle } from './types';
import type { Paginated, PageParams } from './pagination';

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority?: TicketPriority;
  contactId?: string;
  companyId?: string;
}

export async function listTickets(): Promise<Ticket[]> {
  const { data } = await apiClient.get('/support/tickets');
  return data;
}

export async function listTicketsPaginated(
  params: PageParams & { status?: string; priority?: string; assignedToUserId?: string },
): Promise<Paginated<Ticket>> {
  const { data } = await apiClient.get('/support/tickets', { params });
  return data;
}

export async function getTicket(id: string): Promise<Ticket> {
  const { data } = await apiClient.get(`/support/tickets/${id}`);
  return data;
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const { data } = await apiClient.post('/support/tickets', payload);
  return data;
}

export async function updateTicket(id: string, payload: { subject?: string; description?: string }): Promise<Ticket> {
  const { data } = await apiClient.patch(`/support/tickets/${id}`, payload);
  return data;
}

export async function assignTicket(id: string, assigneeUserId: string): Promise<Ticket> {
  const { data } = await apiClient.patch(`/support/tickets/${id}/assign`, { assigneeUserId });
  return data;
}

export async function escalateTicket(id: string): Promise<Ticket> {
  const { data } = await apiClient.patch(`/support/tickets/${id}/escalate`);
  return data;
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
  const { data } = await apiClient.patch(`/support/tickets/${id}/status`, { status });
  return data;
}

export async function addTicketComment(id: string, body: string, isInternal?: boolean): Promise<TicketComment> {
  const { data } = await apiClient.post(`/support/tickets/${id}/comments`, { body, isInternal });
  return data;
}

export async function listTicketComments(id: string): Promise<TicketComment[]> {
  const { data } = await apiClient.get(`/support/tickets/${id}/comments`);
  return data;
}

export interface CreateArticlePayload {
  title: string;
  content: string;
  category?: string;
  isPublished?: boolean;
}

export async function listArticles(): Promise<KnowledgeArticle[]> {
  const { data } = await apiClient.get('/support/knowledge-articles');
  return data;
}

export async function listArticlesPaginated(params: PageParams): Promise<Paginated<KnowledgeArticle>> {
  const { data } = await apiClient.get('/support/knowledge-articles', { params });
  return data;
}

export async function createArticle(payload: CreateArticlePayload): Promise<KnowledgeArticle> {
  const { data } = await apiClient.post('/support/knowledge-articles', payload);
  return data;
}

export async function updateArticle(id: string, payload: Partial<CreateArticlePayload>): Promise<KnowledgeArticle> {
  const { data } = await apiClient.patch(`/support/knowledge-articles/${id}`, payload);
  return data;
}

export async function suggestArticles(q: string): Promise<KnowledgeArticle[]> {
  const { data } = await apiClient.get('/support/knowledge-articles/suggest', { params: { q } });
  return data;
}

// --- Public PQRS ---

export async function createPublicTicket(
  tenantSlug: string,
  payload: { subject: string; description: string; reporterName: string; reporterEmail: string },
): Promise<Ticket> {
  const { data } = await apiClient.post(`/public/support/${tenantSlug}/tickets`, payload);
  return data;
}

export async function getPublicTicket(accessToken: string): Promise<{ ticket: Ticket; comments: TicketComment[] }> {
  const { data } = await apiClient.get(`/public/support/tickets/${accessToken}`);
  return data;
}
