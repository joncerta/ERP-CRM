import { apiClient } from './client';
import type { ApiKey, PublicApiScope } from './types';

export interface CreateApiKeyPayload {
  name: string;
  scopes: PublicApiScope[];
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const { data } = await apiClient.get('/integrations/api-keys');
  return data;
}

export async function createApiKey(payload: CreateApiKeyPayload): Promise<{ apiKey: ApiKey; plainKey: string }> {
  const { data } = await apiClient.post('/integrations/api-keys', payload);
  return data;
}

export async function revokeApiKey(id: string): Promise<ApiKey> {
  const { data } = await apiClient.patch(`/integrations/api-keys/${id}/revoke`, {});
  return data;
}
