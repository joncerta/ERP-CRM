import { apiClient } from './client'

export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditLogChange {
  before: unknown
  after: unknown
}

export interface AuditLog {
  id: string
  entityType: string
  entityId: string | null
  action: AuditAction
  actorUserId: string | null
  changes: Record<string, AuditLogChange> | Record<string, unknown> | null
  createdAt: string
}

export interface AuditLogFilters {
  actorUserId?: string
  entityType?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<Paginated<AuditLog>> {
  const { data } = await apiClient.get('/audit-logs', { params: filters })
  return data
}

export async function listAuditEntityTypes(): Promise<string[]> {
  const { data } = await apiClient.get('/audit-logs/entity-types')
  return data
}
