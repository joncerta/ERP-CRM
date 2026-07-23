<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getPublicQuote, respondPublicQuote, downloadPublicQuotePdf } from '@/api/quotes'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { Quote } from '@/api/types'

const route = useRoute()
const { t } = useI18n()
const toast = useToastStore()

const quote = ref<Quote | null>(null)
const loading = ref(true)
const responding = ref(false)
const errorMsg = ref('')

const token = route.params.token as string

async function load() {
  loading.value = true
  try {
    quote.value = await getPublicQuote(token)
  } catch {
    errorMsg.value = 'Cotización no encontrada'
  } finally {
    loading.value = false
  }
}

async function downloadPdf() {
  if (!quote.value) return
  try {
    await downloadPublicQuotePdf(token, quote.value.quoteNumber)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

/** Same on-the-fly rule as QuotesView.effectiveStatus — the backend never
 * persists 'expired', it only refuses to accept/reject past validUntil. */
const isExpired = computed(() => {
  if (!quote.value) return false
  if (!['sent', 'viewed'].includes(quote.value.status)) return false
  return !!quote.value.validUntil && new Date(quote.value.validUntil).getTime() < Date.now()
})

async function respond(accepted: boolean) {
  responding.value = true
  try {
    quote.value = await respondPublicQuote(token, accepted)
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    responding.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="public-page">
    <div v-if="loading" class="muted">{{ t('common.loading') }}</div>
    <p v-else-if="errorMsg" class="error-text">{{ errorMsg }}</p>
    <div v-else-if="quote" class="card quote-card">
      <div class="quote-header">
        <h1>{{ t('publicQuote.title') }} {{ quote.quoteNumber }}</h1>
        <span class="badge" :class="{ green: quote.status === 'accepted', red: quote.status === 'rejected' || isExpired }">
          {{ t(`quotes.status.${isExpired ? 'expired' : quote.status}`) }}
        </span>
      </div>

      <button class="btn secondary" style="margin-bottom: 1rem" @click="downloadPdf">
        {{ t('quotes.downloadPdf') }}
      </button>

      <table>
        <thead>
          <tr>
            <th>{{ t('quotes.description') }}</th>
            <th>{{ t('quotes.quantity') }}</th>
            <th>{{ t('quotes.unitPrice') }}</th>
            <th>{{ t('quotes.total') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in quote.items" :key="item.id">
            <td>{{ item.description }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ quote.currencyCode }} {{ Number(item.unitPrice).toLocaleString() }}</td>
            <td>{{ quote.currencyCode }} {{ Number(item.total).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div><span>{{ t('quotes.subtotal') }}</span><span>{{ quote.currencyCode }} {{ Number(quote.subtotal).toLocaleString() }}</span></div>
        <div><span>{{ t('quotes.tax') }}</span><span>{{ quote.currencyCode }} {{ Number(quote.tax).toLocaleString() }}</span></div>
        <div class="grand-total"><span>{{ t('quotes.total') }}</span><span>{{ quote.currencyCode }} {{ Number(quote.total).toLocaleString() }}</span></div>
      </div>

      <div v-if="quote.status === 'accepted'" class="response-msg success">
        {{ t('publicQuote.thanksAccepted') }}
      </div>
      <div v-else-if="quote.status === 'rejected'" class="response-msg">
        {{ t('publicQuote.thanksRejected') }}
      </div>
      <div v-else-if="isExpired" class="response-msg">
        {{ t('publicQuote.expiredMsg') }}
      </div>
      <div v-else class="modal-actions" style="justify-content: flex-start; margin-top: 1.5rem">
        <button class="btn" :disabled="responding" @click="respond(true)">{{ t('publicQuote.accept') }}</button>
        <button class="btn secondary" :disabled="responding" @click="respond(false)">{{ t('publicQuote.reject') }}</button>
      </div>
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
.quote-card {
  width: 100%;
  max-width: 640px;
  height: fit-content;
}
.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}
.quote-header h1 {
  font-size: 1.2rem;
}
.totals {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: flex-end;
}
.totals div {
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
}
.grand-total {
  font-weight: 700;
  font-size: 1.05rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.4rem;
  margin-top: 0.2rem;
}
.response-msg {
  margin-top: 1.5rem;
  padding: 0.75rem;
  border-radius: var(--radius);
  background: oklch(0.93 0.04 25);
  color: oklch(0.45 0.14 25);
  font-weight: 600;
}
.response-msg.success {
  background: oklch(0.93 0.06 145);
  color: oklch(0.42 0.1 150);
}
</style>
