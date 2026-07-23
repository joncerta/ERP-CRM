import { apiClient } from './client';
import type { Lead } from './types';
import type { Paginated, PageParams } from './pagination';
import type { AuditLog } from './audit-logs';

export async function listLeads(): Promise<Lead[]> {
  const { data } = await apiClient.get('/crm/leads');
  return data;
}

export async function listLeadsPaginated(
  params: PageParams & { status?: string; ownerUserId?: string },
): Promise<Paginated<Lead>> {
  const { data } = await apiClient.get('/crm/leads', { params });
  return data;
}

export async function createLead(payload: Partial<Lead>): Promise<Lead> {
  const { data } = await apiClient.post('/crm/leads', payload);
  return data;
}

export async function updateLead(id: string, payload: Partial<Lead>): Promise<Lead> {
  const { data } = await apiClient.patch(`/crm/leads/${id}`, payload);
  return data;
}

export async function deleteLead(id: string): Promise<void> {
  await apiClient.delete(`/crm/leads/${id}`);
}

export async function getLeadHistory(id: string): Promise<AuditLog[]> {
  const { data } = await apiClient.get(`/crm/leads/${id}/history`);
  return data;
}
