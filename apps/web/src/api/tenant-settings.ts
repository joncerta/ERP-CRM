import { apiClient } from './client';

export interface TenantSettings {
  sessionIdleTimeoutMinutes: number | null;
  brandingPrimaryColor: string | null;
  brandingSecondaryColor: string | null;
}

export async function getTenantSettings(): Promise<TenantSettings> {
  const { data } = await apiClient.get('/tenant-settings');
  return data;
}

export async function updateTenantSettings(sessionIdleTimeoutMinutes: number | null): Promise<TenantSettings> {
  const { data } = await apiClient.patch('/tenant-settings', { sessionIdleTimeoutMinutes });
  return data;
}
