import { apiClient } from './client';

export interface LoginPayload {
  tenantSlug: string;
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<{ accessToken: string }> {
  const { data } = await apiClient.post('/auth/login', payload);
  return data;
}
