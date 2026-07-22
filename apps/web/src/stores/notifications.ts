import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, type Socket } from 'socket.io-client'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '@/api/notifications'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

function socketBaseUrl(): string {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'
  return new URL(apiUrl).origin
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<AppNotification[]>([])
  const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length)
  let socket: Socket | null = null

  async function load() {
    notifications.value = await listNotifications()
  }

  async function markRead(id: string) {
    const notification = notifications.value.find((n) => n.id === id)
    if (notification) notification.isRead = true
    await markNotificationRead(id)
  }

  async function markAllRead() {
    notifications.value.forEach((n) => (n.isRead = true))
    await markAllNotificationsRead()
  }

  function connect() {
    if (socket) return
    const auth = useAuthStore()
    if (!auth.token) return

    socket = io(socketBaseUrl(), { auth: { token: auth.token } })
    socket.on('notification:new', (notification: AppNotification) => {
      notifications.value.unshift(notification)
    })
    socket.on('session:revoked', () => {
      auth.logout()
      router.push({ name: 'login' })
    })
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
    notifications.value = []
  }

  return { notifications, unreadCount, load, markRead, markAllRead, connect, disconnect }
})
