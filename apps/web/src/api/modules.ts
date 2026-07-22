import { apiClient } from './client'

export interface EnabledModule {
  moduleCode: string
  isEnabled: boolean
}

export async function listEnabledModules(): Promise<EnabledModule[]> {
  const { data } = await apiClient.get('/modules/enabled')
  return data
}
