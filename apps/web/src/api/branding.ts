import { apiClient } from './client'

export interface TenantBranding {
  primaryColor: string | null
  secondaryColor: string | null
  logoData?: string | null
}

export async function getPublicBrandingBySlug(slug: string): Promise<TenantBranding> {
  const { data } = await apiClient.get(`/platform/tenants/by-slug/${encodeURIComponent(slug)}/branding`)
  return data
}
