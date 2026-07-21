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
