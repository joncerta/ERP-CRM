import { apiClient } from './client';
import type { Warehouse } from './types';

export async function listWarehouses(): Promise<Warehouse[]> {
  const { data } = await apiClient.get('/inventory/warehouses');
  return data;
}

export async function createWarehouse(payload: Partial<Warehouse>): Promise<Warehouse> {
  const { data } = await apiClient.post('/inventory/warehouses', payload);
  return data;
}

export async function updateWarehouse(id: string, payload: Partial<Warehouse>): Promise<Warehouse> {
  const { data } = await apiClient.patch(`/inventory/warehouses/${id}`, payload);
  return data;
}

export async function deleteWarehouse(id: string): Promise<void> {
  await apiClient.delete(`/inventory/warehouses/${id}`);
}
