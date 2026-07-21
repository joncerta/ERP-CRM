import { apiClient } from './client';
import type { Contact } from './types';

export async function listContacts(companyId?: string): Promise<Contact[]> {
  const { data } = await apiClient.get('/crm/contacts', { params: companyId ? { companyId } : {} });
  return data;
}

export async function createContact(payload: Partial<Contact>): Promise<Contact> {
  const { data } = await apiClient.post('/crm/contacts', payload);
  return data;
}
