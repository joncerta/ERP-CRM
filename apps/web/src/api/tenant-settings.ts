import { apiClient } from './client';

export interface TenantSettings {
  sessionIdleTimeoutMinutes: number | null;
  brandingPrimaryColor: string | null;
  brandingSecondaryColor: string | null;
  brandingLogoData: string | null;
  timezone: string;
}

export async function getTenantSettings(): Promise<TenantSettings> {
  const { data } = await apiClient.get('/tenant-settings');
  return data;
}

export async function updateTenantSettings(sessionIdleTimeoutMinutes: number | null): Promise<TenantSettings> {
  const { data } = await apiClient.patch('/tenant-settings', { sessionIdleTimeoutMinutes });
  return data;
}

export interface UpdateOrgSettingsPayload {
  timezone?: string;
}

export async function updateOrgSettings(payload: UpdateOrgSettingsPayload): Promise<TenantSettings> {
  const { data } = await apiClient.patch('/tenant-settings/org', payload);
  return data;
}
