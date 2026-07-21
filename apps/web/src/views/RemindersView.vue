<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listPendingFollowUps, markFollowUpDone } from '@/api/quotes'
import { getErrorMessage } from '@/api/error'
import type { PendingFollowUp } from '@/api/types'

const { t } = useI18n()

const followUps = ref<PendingFollowUp[]>([])
const loading = ref(true)
const error = ref('')
const completingId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    followUps.value = await listPendingFollowUps()
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function complete(followUp: PendingFollowUp) {
  completingId.value = followUp.id
  try {
    await markFollowUpDone(followUp.id)
    followUps.value = followUps.value.filter((f) => f.id !== followUp.id)
  } finally {
    completingId.value = null
  }
}

function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now()
}

function formatDate(dueAt: string) {
  return new Date(dueAt).toLocaleString()
}

const sorted = computed(() => [...followUps.value].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()))

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('reminders.title') }}</h1>
    </div>
    <p class="muted" style="margin-bottom: 1rem">{{ t('reminders.subtitle') }}</p>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <p v-else-if="!sorted.length" class="muted">{{ t('reminders.empty') }}</p>
    <div v-else class="reminder-list">
      <div v-for="f in sorted" :key="f.id" class="card reminder-row" :class="{ overdue: isOverdue(f.dueAt) }">
        <div>
          <div class="reminder-header">
            <strong>{{ f.companyName }}</strong>
            <span class="muted">— {{ f.quoteNumber }}</span>
            <span class="badge" :class="{ red: isOverdue(f.dueAt) }">{{ formatDate(f.dueAt) }}</span>
          </div>
          <p v-if="f.note" class="muted reminder-note">{{ f.note }}</p>
        </div>
        <button class="btn secondary" :disabled="completingId === f.id" @click="complete(f)">
          {{ t('reminders.markDone') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.reminder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.reminder-row.overdue {
  border-color: var(--color-danger);
}
.reminder-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.reminder-note {
  margin-top: 0.3rem;
}
</style>
