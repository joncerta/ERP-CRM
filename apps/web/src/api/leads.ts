import { apiClient } from './client';
import type { Lead } from './types';

export async function listLeads(): Promise<Lead[]> {
  const { data } = await apiClient.get('/crm/leads');
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
