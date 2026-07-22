import { apiClient } from './client';
import type { Company } from './types';

export async function listCompanies(): Promise<Company[]> {
  const { data } = await apiClient.get('/crm/companies');
  return data;
}

export async function createCompany(payload: Partial<Company>): Promise<Company> {
  const { data } = await apiClient.post('/crm/companies', payload);
  return data;
}

export async function updateCompany(id: string, payload: Partial<Company>): Promise<Company> {
  const { data } = await apiClient.patch(`/crm/companies/${id}`, payload);
  return data;
}

export async function deleteCompany(id: string): Promise<void> {
  await apiClient.delete(`/crm/companies/${id}`);
}
