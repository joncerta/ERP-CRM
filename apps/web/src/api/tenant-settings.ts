import { apiClient } from './client';

export interface TenantSettings {
  sessionIdleTimeoutMinutes: number | null;
}

export async function getTenantSettings(): Promise<TenantSettings> {
  const { data } = await apiClient.get('/tenant-settings');
  return data;
}

export async function updateTenantSettings(sessionIdleTimeoutMinutes: number | null): Promise<TenantSettings> {
  const { data } = await apiClient.patch('/tenant-settings', { sessionIdleTimeoutMinutes });
  return data;
}
