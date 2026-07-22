import { apiClient } from './client'

export interface TenantUser {
  id: string
  email: string
  fullName: string
  roleId: string
  role: { id: string; name: string }
  isActive: boolean
  preferredLocale: string
}

export interface CreateUserPayload {
  email: string
  password: string
  fullName: string
  roleId: string
}

export async function listUsers(): Promise<TenantUser[]> {
  const { data } = await apiClient.get('/users')
  return data
}

export async function createUser(payload: CreateUserPayload): Promise<TenantUser> {
  const { data } = await apiClient.post('/users', payload)
  return data
}

export async function setUserActive(id: string, isActive: boolean): Promise<TenantUser> {
  const { data } = await apiClient.patch(`/users/${id}/active`, { isActive })
  return data
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.patch('/users/me/password', { currentPassword, newPassword })
}
