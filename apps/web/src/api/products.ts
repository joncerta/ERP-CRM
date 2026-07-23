import { apiClient } from './client';
import type { Product } from './types';
import type { Paginated, PageParams } from './pagination';

export async function listProducts(): Promise<Product[]> {
  const { data } = await apiClient.get('/inventory/products');
  return data;
}

export async function listProductsPaginated(
  params: PageParams & { categoryId?: string; warehouseId?: string },
): Promise<Paginated<Product>> {
  const { data } = await apiClient.get('/inventory/products', { params });
  return data;
}

export async function createProduct(payload: Partial<Product>): Promise<Product> {
  const { data } = await apiClient.post('/inventory/products', payload);
  return data;
}

export async function updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
  const { data } = await apiClient.patch(`/inventory/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/inventory/products/${id}`);
}
