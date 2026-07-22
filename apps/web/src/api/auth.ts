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

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function forgotPassword(tenantSlug: string, email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { tenantSlug, email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, newPassword });
}
