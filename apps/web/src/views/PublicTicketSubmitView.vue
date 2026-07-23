<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { createPublicTicket } from '@/api/support'
import { getErrorMessage } from '@/api/error'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const tenantSlug = route.params.tenantSlug as string

const form = ref({ subject: '', description: '', reporterName: '', reporterEmail: '' })
const saving = ref(false)
const errorMsg = ref('')
const createdTicket = ref<{ ticketNumber: string; accessToken: string } | null>(null)

async function submit() {
  saving.value = true
  errorMsg.value = ''
  try {
    const ticket = await createPublicTicket(tenantSlug, form.value)
    createdTicket.value = { ticketNumber: ticket.ticketNumber, accessToken: ticket.accessToken }
  } catch (err) {
    errorMsg.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}

function goToTracking() {
  if (createdTicket.value) router.push(`/pqrs/ticket/${createdTicket.value.accessToken}`)
}
</script>

<template>
  <div class="public-page">
    <div class="card ticket-card">
      <h1>{{ t('publicTicket.submitTitle') }}</h1>

      <div v-if="createdTicket" class="response-msg success">
        <p>{{ t('publicTicket.createdOk', { number: createdTicket.ticketNumber }) }}</p>
        <button class="btn" style="margin-top: 0.75rem" @click="goToTracking">{{ t('publicTicket.trackIt') }}</button>
      </div>
      <form v-else @submit.prevent="submit">
        <div class="field">
          <label>{{ t('publicTicket.yourName') }}</label>
          <input v-model="form.reporterName" required />
        </div>
        <div class="field" style="margin-top: 0.75rem">
          <label>{{ t('publicTicket.yourEmail') }}</label>
          <input v-model="form.reporterEmail" type="email" required />
        </div>
        <div class="field" style="margin-top: 0.75rem">
          <label>{{ t('support.subject') }}</label>
          <input v-model="form.subject" required />
        </div>
        <div class="field" style="margin-top: 0.75rem">
          <label>{{ t('quotes.description') }}</label>
          <textarea v-model="form.description" rows="5" required></textarea>
        </div>
        <p v-if="errorMsg" class="error-text" style="margin-top: 0.75rem">{{ errorMsg }}</p>
        <button class="btn" style="margin-top: 1rem" :disabled="saving" type="submit">{{ t('publicTicket.submit') }}</button>
      </form>
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
  margin-bottom: 1.25rem;
}
textarea {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  width: 100%;
}
.response-msg {
  padding: 0.75rem;
  border-radius: var(--radius);
  background: oklch(0.93 0.06 145);
  color: oklch(0.42 0.1 150);
}
</style>
