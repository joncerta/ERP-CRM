import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  type: 'success' | 'error'
  message: string
}

const TOAST_TTL_MS = 5000

let nextId = 1

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function remove(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(type: Toast['type'], message: string) {
    const id = nextId++
    toasts.value.push({ id, type, message })
    setTimeout(() => remove(id), TOAST_TTL_MS)
  }

  return {
    toasts,
    remove,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
  }
})
