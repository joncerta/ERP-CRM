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
