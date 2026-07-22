<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toastItem in toastStore.toasts"
        :key="toastItem.id"
        class="toast"
        :class="toastItem.type"
        @click="toastStore.remove(toastItem.id)"
      >
        {{ toastItem.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 340px;
}
.toast {
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  font-size: 0.87rem;
  font-weight: 500;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  color: white;
}
.toast.success {
  background: var(--color-success);
}
.toast.error {
  background: var(--color-danger);
}
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
