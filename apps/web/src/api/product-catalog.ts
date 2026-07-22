import { apiClient } from './client'
import type { ProductCategory, ProductUnit } from './types'

export async function listCategories(): Promise<ProductCategory[]> {
  const { data } = await apiClient.get('/inventory/categories')
  return data
}

export async function createCategory(name: string): Promise<ProductCategory> {
  const { data } = await apiClient.post('/inventory/categories', { name })
  return data
}

export async function updateCategory(id: string, name: string): Promise<ProductCategory> {
  const { data } = await apiClient.patch(`/inventory/categories/${id}`, { name })
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/inventory/categories/${id}`)
}

export async function listUnits(): Promise<ProductUnit[]> {
  const { data } = await apiClient.get('/inventory/units')
  return data
}

export async function createUnit(name: string): Promise<ProductUnit> {
  const { data } = await apiClient.post('/inventory/units', { name })
  return data
}

export async function updateUnit(id: string, name: string): Promise<ProductUnit> {
  const { data } = await apiClient.patch(`/inventory/units/${id}`, { name })
  return data
}

export async function deleteUnit(id: string): Promise<void> {
  await apiClient.delete(`/inventory/units/${id}`)
}
