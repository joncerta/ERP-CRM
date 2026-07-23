import { apiClient } from './client';
import type { Tax } from './types';

export async function listTaxes(): Promise<Tax[]> {
  const { data } = await apiClient.get('/taxes');
  return data;
}

export interface CreateTaxPayload {
  name: string;
  rate: number;
  isDefault?: boolean;
}

export async function createTax(payload: CreateTaxPayload): Promise<Tax> {
  const { data } = await apiClient.post('/taxes', payload);
  return data;
}

export async function updateTax(
  id: string,
  payload: Partial<CreateTaxPayload> & { isActive?: boolean },
): Promise<Tax> {
  const { data } = await apiClient.patch(`/taxes/${id}`, payload);
  return data;
}
