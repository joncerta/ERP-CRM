<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { listQuotes, createQuote, updateQuote, sendQuote, createFollowUp, downloadQuotePdf } from '@/api/quotes'
import { listCompanies } from '@/api/companies'
import { listContacts } from '@/api/contacts'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/api/error'
import { compact } from '@/utils/compact'
import { useToastStore } from '@/stores/toast'
import type { Quote, Company, Contact } from '@/api/types'
import type { QuoteItemInput } from '@/api/quotes'

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()

const quotes = ref<Quote[]>([])
const companies = ref<Company[]>([])
const contacts = ref<Contact[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const sendingId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const followUpQuote = ref<Quote | null>(null)
const followUpDate = ref('')
const followUpNote = ref('')
const followUpError = ref('')
const onlyMine = ref(false)
const searchQuery = ref('')

const form = ref({
  companyId: '',
  contactId: '',
  currencyCode: 'USD',
  taxRate: 0,
  items: [{ description: '', quantity: 1, unitPrice: 0 }] as QuoteItemInput[],
})

const contactsForSelectedCompany = computed(() =>
  form.value.companyId ? contacts.value.filter((c) => c.companyId === form.value.companyId) : contacts.value,
)

const visibleQuotes = computed(() => {
  let result = quotes.value
  if (onlyMine.value) result = result.filter((q) => q.ownerUserId === auth.user?.sub)
  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    result = result.filter(
      (q) => q.quoteNumber.toLowerCase().includes(query) || companyName(q.companyId).toLowerCase().includes(query),
    )
  }
  return result
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [quotesData, companiesData, contactsData] = await Promise.all([listQuotes(), listCompanies(), listContacts()])
    quotes.value = quotesData
    companies.value = companiesData
    contacts.value = contactsData
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function companyName(id: string) {
  return companies.value.find((c) => c.id === id)?.name ?? '—'
}

function openModal() {
  editingId.value = null
  form.value = {
    companyId: '',
    contactId: '',
    currencyCode: 'USD',
    taxRate: 0,
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
  }
  formError.value = ''
  showModal.value = true
}

function openEditModal(quote: Quote) {
  editingId.value = quote.id
  form.value = {
    companyId: quote.companyId,
    contactId: quote.contactId ?? '',
    currencyCode: quote.currencyCode,
    taxRate: quote.subtotal ? Math.round((Number(quote.tax) / Number(quote.subtotal)) * 1000) / 10 : 0,
    items: quote.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  }
  formError.value = ''
  showModal.value = true
}

function addItem() {
  form.value.items.push({ description: '', quantity: 1, unitPrice: 0 })
}

function removeItem(index: number) {
  form.value.items.splice(index, 1)
}

const formTotal = computed(() => {
  const subtotal = form.value.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const tax = subtotal * ((form.value.taxRate || 0) / 100)
  return subtotal + tax
})

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await updateQuote(editingId.value, compact(form.value) as typeof form.value)
    } else {
      await createQuote(compact(form.value) as typeof form.value)
    }
    showModal.value = false
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function handleSend(quote: Quote) {
  sendingId.value = quote.id
  try {
    await sendQuote(quote.id)
    toast.success(t('quotes.sentOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    sendingId.value = null
  }
}

function openFollowUp(quote: Quote) {
  followUpQuote.value = quote
  followUpDate.value = ''
  followUpNote.value = ''
  followUpError.value = ''
}

async function submitFollowUp() {
  if (!followUpQuote.value || !followUpDate.value) return
  followUpError.value = ''
  try {
    await createFollowUp(followUpQuote.value.id, {
      dueAt: new Date(followUpDate.value).toISOString(),
      note: followUpNote.value || undefined,
    })
    followUpQuote.value = null
    toast.success(t('common.savedOk'))
  } catch (err) {
    followUpError.value = getErrorMessage(err)
  }
}

function publicUrl(quote: Quote) {
  return `${window.location.origin}/q/${quote.accessToken}`
}

async function handleDownloadPdf(quote: Quote) {
  try {
    await downloadQuotePdf(quote.id, quote.quoteNumber)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

const statusBadge: Record<string, string> = {
  draft: '',
  sent: 'blue',
  viewed: 'amber',
  accepted: 'green',
  rejected: 'red',
  expired: 'red',
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('quotes.title') }}</h1>
      <button class="btn" @click="openModal">+ {{ t('quotes.newQuote') }}</button>
    </div>

    <div class="list-filters">
      <input v-model="searchQuery" type="text" class="search-input" :placeholder="t('common.search')" />
      <label class="checkbox-field">
        <input v-model="onlyMine" type="checkbox" />
        {{ t('common.onlyMine') }}
      </label>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>#</th>
          <th>{{ t('companies.title') }}</th>
          <th>{{ t('quotes.total') }}</th>
          <th>Estado</th>
          <th>{{ t('quotes.views') }}</th>
          <th>{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="q in visibleQuotes" :key="q.id">
          <td>{{ q.quoteNumber }}</td>
          <td>{{ companyName(q.companyId) }}</td>
          <td>{{ q.currencyCode }} {{ Number(q.total).toLocaleString() }}</td>
          <td><span class="badge" :class="statusBadge[q.status]">{{ t(`quotes.status.${q.status}`) }}</span></td>
          <td>{{ q.viewCount }}</td>
          <td class="actions-cell">
            <button v-if="q.status === 'draft'" class="btn secondary" @click="openEditModal(q)">
              {{ t('common.edit') }}
            </button>
            <button v-if="q.status === 'draft'" class="btn secondary" :disabled="sendingId === q.id" @click="handleSend(q)">
              {{ t('quotes.send') }}
            </button>
            <a v-if="q.status !== 'draft'" :href="publicUrl(q)" target="_blank" class="muted">{{ t('publicQuote.title') }} ↗</a>
            <button class="btn secondary" @click="handleDownloadPdf(q)">{{ t('quotes.downloadPdf') }}</button>
            <button class="btn secondary" @click="openFollowUp(q)">{{ t('quotes.scheduleFollowUp') }}</button>
          </td>
        </tr>
        <tr v-if="!visibleQuotes.length">
          <td colspan="6" class="muted">—</td>
        </tr>
      </tbody>
    </table>

    <!-- Create quote modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal wide" @submit.prevent="submit">
        <h2>{{ editingId ? t('common.edit') : t('quotes.newQuote') }}</h2>
        <div class="field">
          <label>{{ t('companies.title') }}</label>
          <select v-model="form.companyId" required>
            <option value="" disabled>—</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('contacts.title') }}</label>
          <select v-model="form.contactId">
            <option value="">—</option>
            <option v-for="c in contactsForSelectedCompany" :key="c.id" :value="c.id">
              {{ c.firstName }} {{ c.lastName || '' }}
            </option>
          </select>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>{{ t('quotes.description') }}</th>
              <th>{{ t('quotes.quantity') }}</th>
              <th>{{ t('quotes.unitPrice') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in form.items" :key="index">
              <td><input v-model="item.description" required /></td>
              <td><input v-model.number="item.quantity" type="number" min="0.01" step="0.01" required /></td>
              <td><input v-model.number="item.unitPrice" type="number" min="0" step="0.01" required /></td>
              <td>
                <button type="button" class="btn secondary" :disabled="form.items.length === 1" @click="removeItem(index)">
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <button type="button" class="btn secondary" style="margin-top: 0.5rem" @click="addItem">
          + {{ t('quotes.addItem') }}
        </button>

        <div class="field" style="margin-top: 1rem">
          <label>{{ t('quotes.tax') }} (%)</label>
          <input v-model.number="form.taxRate" type="number" min="0" step="0.1" />
        </div>

        <p class="total-line">{{ t('quotes.total') }}: {{ form.currencyCode }} {{ formTotal.toLocaleString() }}</p>

        <p v-if="formError" class="error-text">{{ formError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="saving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Follow-up modal -->
    <div v-if="followUpQuote" class="modal-backdrop" @click.self="followUpQuote = null">
      <form class="modal" @submit.prevent="submitFollowUp">
        <h2>{{ t('quotes.scheduleFollowUp') }} — {{ followUpQuote.quoteNumber }}</h2>
        <div class="field">
          <label>Fecha</label>
          <input v-model="followUpDate" type="datetime-local" required />
        </div>
        <div class="field">
          <label>Nota</label>
          <textarea v-model="followUpNote" rows="2"></textarea>
        </div>
        <p v-if="followUpError" class="error-text">{{ followUpError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="followUpQuote = null">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.actions-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.items-table {
  margin-top: 0.5rem;
}
.items-table input {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.35rem 0.5rem;
  width: 100%;
}
.total-line {
  font-weight: 600;
  margin-top: 0.75rem;
  text-align: right;
}
</style>
