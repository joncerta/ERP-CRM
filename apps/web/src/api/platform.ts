import { apiClient } from './client';

export interface PlatformTenant {
  id: string;
  slug: string;
  name: string;
  defaultLocale: string;
  defaultCurrencyCode: string;
  isActive: boolean;
  createdAt: string;
  brandingPrimaryColor: string | null;
  brandingSecondaryColor: string | null;
  brandingLogoData: string | null;
}

export interface TenantModuleStatus {
  code: string;
  name: string;
  description: string | null;
  isCore: boolean;
  isEnabled: boolean;
}

export async function listTenants(): Promise<PlatformTenant[]> {
  const { data } = await apiClient.get('/platform/tenants');
  return data;
}

export async function getTenantModules(tenantId: string): Promise<TenantModuleStatus[]> {
  const { data } = await apiClient.get(`/platform/tenants/${tenantId}/modules`);
  return data;
}

export async function setTenantModule(tenantId: string, code: string, isEnabled: boolean): Promise<TenantModuleStatus> {
  const { data } = await apiClient.patch(`/platform/tenants/${tenantId}/modules/${code}`, { isEnabled });
  return data;
}

export async function updateTenantBranding(
  tenantId: string,
  primaryColor: string | null,
  secondaryColor: string | null,
  logoData?: string | null,
): Promise<PlatformTenant> {
  const { data } = await apiClient.patch(`/platform/tenants/${tenantId}/branding`, {
    primaryColor,
    secondaryColor,
    logoData,
  });
  return data;
}
