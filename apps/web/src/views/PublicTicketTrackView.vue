<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getPublicTicket } from '@/api/support'
import type { Ticket, TicketComment } from '@/api/types'

const route = useRoute()
const { t } = useI18n()

const token = route.params.token as string
const ticket = ref<Ticket | null>(null)
const comments = ref<TicketComment[]>([])
const loading = ref(true)
const errorMsg = ref('')

const statusBadge: Record<string, string> = {
  open: 'blue',
  in_progress: 'amber',
  waiting_customer: 'amber',
  resolved: 'green',
  closed: '',
}

onMounted(async () => {
  try {
    const result = await getPublicTicket(token)
    ticket.value = result.ticket
    comments.value = result.comments
  } catch {
    errorMsg.value = t('publicTicket.notFound')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="public-page">
    <div class="card ticket-card">
      <div v-if="loading" class="muted">{{ t('common.loading') }}</div>
      <p v-else-if="errorMsg" class="error-text">{{ errorMsg }}</p>
      <template v-else-if="ticket">
        <h1>{{ ticket.ticketNumber }} — {{ ticket.subject }}</h1>
        <p><span class="badge" :class="statusBadge[ticket.status]">{{ t(`support.status.${ticket.status}`) }}</span></p>
        <p class="muted" style="margin: 0.75rem 0">{{ ticket.description }}</p>

        <h3 class="section-title">{{ t('support.comments') }}</h3>
        <ul class="detail-list">
          <li v-for="c in comments" :key="c.id">{{ new Date(c.createdAt).toLocaleString() }} — {{ c.body }}</li>
          <li v-if="!comments.length" class="muted">—</li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.public-page {
  min-height: 100vh;
  background: var(--color-bg);
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}
.ticket-card {
  width: 100%;
  max-width: 560px;
  height: fit-content;
}
.ticket-card h1 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}
.section-title {
  font-size: 0.95rem;
  margin: 1rem 0 0.5rem;
}
.detail-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
}
</style>
