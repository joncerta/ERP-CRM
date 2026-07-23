import { apiClient } from './client';
import type { FixedAsset, FixedAssetMovement, FixedAssetDepreciationEntry } from './types';
import type { Paginated, PageParams } from './pagination';

export interface CreateFixedAssetPayload {
  name: string;
  description?: string;
  purchaseDate: string;
  purchaseCost: number;
  usefulLifeMonths: number;
  salvageValue?: number;
  locationBranchId?: string;
  responsibleUserId?: string;
}

export interface UpdateFixedAssetPayload {
  name?: string;
  description?: string;
  locationBranchId?: string;
  responsibleUserId?: string;
}

export async function listFixedAssets(): Promise<FixedAsset[]> {
  const { data } = await apiClient.get('/finance/fixed-assets');
  return data;
}

export async function listFixedAssetsPaginated(
  params: PageParams & { status?: string; responsibleUserId?: string; locationBranchId?: string },
): Promise<Paginated<FixedAsset>> {
  const { data } = await apiClient.get('/finance/fixed-assets', { params });
  return data;
}

export async function getFixedAsset(id: string): Promise<FixedAsset> {
  const { data } = await apiClient.get(`/finance/fixed-assets/${id}`);
  return data;
}

export async function createFixedAsset(payload: CreateFixedAssetPayload): Promise<FixedAsset> {
  const { data } = await apiClient.post('/finance/fixed-assets', payload);
  return data;
}

export async function updateFixedAsset(id: string, payload: UpdateFixedAssetPayload): Promise<FixedAsset> {
  const { data } = await apiClient.patch(`/finance/fixed-assets/${id}`, payload);
  return data;
}

export async function transferFixedAsset(id: string, payload: { toBranchId: string; note?: string }): Promise<FixedAsset> {
  const { data } = await apiClient.post(`/finance/fixed-assets/${id}/transfer`, payload);
  return data;
}

export async function recordFixedAssetMaintenance(
  id: string,
  payload: { date: string; note?: string; cost?: number },
): Promise<FixedAssetMovement> {
  const { data } = await apiClient.post(`/finance/fixed-assets/${id}/maintenance`, payload);
  return data;
}

export async function disposeFixedAsset(id: string, payload: { date: string; note?: string }): Promise<FixedAsset> {
  const { data } = await apiClient.post(`/finance/fixed-assets/${id}/dispose`, payload);
  return data;
}

export async function runDepreciation(period: string): Promise<{ assetsDepreciated: number; totalAmount: number }> {
  const { data } = await apiClient.post('/finance/fixed-assets/run-depreciation', { period });
  return data;
}

export async function listFixedAssetMovements(id: string): Promise<FixedAssetMovement[]> {
  const { data } = await apiClient.get(`/finance/fixed-assets/${id}/movements`);
  return data;
}

export async function listFixedAssetDepreciationEntries(id: string): Promise<FixedAssetDepreciationEntry[]> {
  const { data } = await apiClient.get(`/finance/fixed-assets/${id}/depreciation-entries`);
  return data;
}
