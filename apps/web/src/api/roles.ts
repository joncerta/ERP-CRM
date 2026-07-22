import { apiClient } from './client'

export interface Role {
  id: string
  name: string
  isSystem: boolean
  permissions: string[]
}

export async function listRoles(): Promise<Role[]> {
  const { data } = await apiClient.get('/roles')
  return data
}

export async function createRole(name: string, permissions: string[]): Promise<Role> {
  const { data } = await apiClient.post('/roles', { name, permissions })
  return data
}

export async function updateRole(id: string, name: string, permissions: string[]): Promise<Role> {
  const { data } = await apiClient.patch(`/roles/${id}`, { name, permissions })
  return data
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/roles/${id}`)
}
