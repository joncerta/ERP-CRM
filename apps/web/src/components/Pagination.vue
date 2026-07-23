<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  page: number
  totalPages: number
  total: number
}>()

const emit = defineEmits<{ (e: 'go', page: number): void }>()
</script>

<template>
  <div v-if="totalPages > 1" class="pagination">
    <button class="btn secondary" :disabled="page === 1" @click="emit('go', page - 1)">‹</button>
    <span class="muted">{{ t('common.pageOf', { page, totalPages }) }} · {{ total }}</span>
    <button class="btn secondary" :disabled="page === totalPages" @click="emit('go', page + 1)">›</button>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}
</style>
