import { apiClient } from './client'

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data } = await apiClient.get('/notifications')
  return data
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all')
}
