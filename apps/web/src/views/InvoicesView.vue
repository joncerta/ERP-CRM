<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listInvoicesPaginated,
  getInvoice,
  createInvoice,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  addInvoiceAdjustment,
  listInvoiceAdjustments,
  addInvoicePayment,
  listInvoicePayments,
  sendInvoiceReminder,
  listRecurringTemplates,
  createRecurringTemplate,
  setRecurringTemplateActive,
  generateInvoiceFromTemplate,
  type InvoiceItemInput,
} from '@/api/invoices'
import { listCompanies } from '@/api/companies'
import { listContacts } from '@/api/contacts'
import { listCurrencies } from '@/api/currencies'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { Invoice, InvoiceAdjustment, InvoicePayment, Company, Contact, RecurringInvoiceTemplate } from '@/api/types'
import type { Currency } from '@/api/currencies'

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()

type Tab = 'invoices' | 'recurring'
const activeTab = ref<Tab>('invoices')

const { items: invoices, total, page, totalPages, loading, error, search, filters, load, applyAndReload, goToPage } =
  usePaginatedList<Invoice, { ownerUserId?: string }>(listInvoicesPaginated, { defaultSortBy: 'createdAt' })

let searchDebounce: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(applyAndReload, 300)
}

const onlyMine = ref(false)
watch(onlyMine, (value) => {
  filters.ownerUserId = value ? auth.user?.sub : undefined
  applyAndReload()
})

const companies = ref<Company[]>([])
const contacts = ref<Contact[]>([])
const currencies = ref<Currency[]>([])

async function loadPickers() {
  try {
    const [companiesData, contactsData, currenciesData] = await Promise.all([
      listCompanies(),
      listContacts(),
      listCurrencies(),
    ])
    companies.value = companiesData
    contacts.value = contactsData
    currencies.value = currenciesData
  } catch {
    // Pickers are a convenience for the create form — a failure here
    // shouldn't block the invoice list itself.
  }
}

function companyName(id: string) {
  return companies.value.find((c) => c.id === id)?.name ?? '—'
}

const statusBadge: Record<string, string> = {
  draft: '',
  issued: 'blue',
  partially_paid: 'amber',
  paid: 'green',
  overdue: 'red',
  cancelled: 'red',
}

function isOverdue(invoice: Invoice): boolean {
  if (!invoice.dueDate) return false
  if (!['issued', 'partially_paid'].includes(invoice.status)) return false
  return new Date(invoice.dueDate).getTime() < Date.now()
}

function balanceDue(invoice: Invoice): number {
  return Number(invoice.total) + Number(invoice.adjustmentsTotal) - Number(invoice.amountPaid)
}

// --- Create modal ---
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({
  companyId: '',
  contactId: '',
  currencyCode: 'USD',
  taxRate: 0,
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  items: [{ description: '', quantity: 1, unitPrice: 0 }] as InvoiceItemInput[],
})

const contactsForSelectedCompany = computed(() =>
  form.value.companyId ? contacts.value.filter((c) => c.companyId === form.value.companyId) : contacts.value,
)

function openCreateModal() {
  form.value = {
    companyId: '',
    contactId: '',
    currencyCode: currencies.value[0]?.code ?? 'USD',
    taxRate: 0,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
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
    await createInvoice({
      companyId: form.value.companyId,
      contactId: form.value.contactId || undefined,
      currencyCode: form.value.currencyCode,
      taxRate: form.value.taxRate,
      issueDate: form.value.issueDate,
      dueDate: form.value.dueDate || undefined,
      items: form.value.items,
    })
    showModal.value = false
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}

// --- Detail modal ---
const detailInvoice = ref<Invoice | null>(null)
const detailLoading = ref(false)
const detailLoadingId = ref<string | null>(null)
const adjustments = ref<InvoiceAdjustment[]>([])
const payments = ref<InvoicePayment[]>([])
const actionSaving = ref(false)

async function openDetail(invoice: Invoice) {
  detailLoadingId.value = invoice.id
  try {
    const [full, adjustmentsData, paymentsData] = await Promise.all([
      getInvoice(invoice.id),
      listInvoiceAdjustments(invoice.id),
      listInvoicePayments(invoice.id),
    ])
    detailInvoice.value = full
    adjustments.value = adjustmentsData
    payments.value = paymentsData
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    detailLoadingId.value = null
  }
}

async function refreshDetail() {
  if (!detailInvoice.value) return
  detailLoading.value = true
  try {
    const [full, adjustmentsData, paymentsData] = await Promise.all([
      getInvoice(detailInvoice.value.id),
      listInvoiceAdjustments(detailInvoice.value.id),
      listInvoicePayments(detailInvoice.value.id),
    ])
    detailInvoice.value = full
    adjustments.value = adjustmentsData
    payments.value = paymentsData
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    detailLoading.value = false
  }
}

async function handleIssue() {
  if (!detailInvoice.value) return
  actionSaving.value = true
  try {
    await issueInvoice(detailInvoice.value.id)
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}

async function handleCancel() {
  if (!detailInvoice.value) return
  if (!confirm(t('invoices.confirmCancel'))) return
  actionSaving.value = true
  try {
    await cancelInvoice(detailInvoice.value.id)
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}

async function handleReminder() {
  if (!detailInvoice.value) return
  actionSaving.value = true
  try {
    await sendInvoiceReminder(detailInvoice.value.id)
    toast.success(t('invoices.reminderSentOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}

const paymentForm = ref({ amount: 0, method: '', note: '' })
async function submitPayment() {
  if (!detailInvoice.value) return
  actionSaving.value = true
  try {
    await addInvoicePayment(detailInvoice.value.id, {
      amount: paymentForm.value.amount,
      method: paymentForm.value.method || undefined,
      note: paymentForm.value.note || undefined,
    })
    paymentForm.value = { amount: 0, method: '', note: '' }
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}

const adjustmentForm = ref({ type: 'credit' as 'credit' | 'debit', amount: 0, reason: '' })
async function submitAdjustment() {
  if (!detailInvoice.value) return
  actionSaving.value = true
  try {
    await addInvoiceAdjustment(detailInvoice.value.id, {
      type: adjustmentForm.value.type,
      amount: adjustmentForm.value.amount,
      reason: adjustmentForm.value.reason || undefined,
    })
    adjustmentForm.value = { type: 'credit', amount: 0, reason: '' }
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}

// --- Recurring templates ---
const templates = ref<RecurringInvoiceTemplate[]>([])
const templatesLoading = ref(true)
const showTemplateModal = ref(false)
const templateSaving = ref(false)
const templateError = ref('')
const templateForm = ref({
  name: '',
  companyId: '',
  contactId: '',
  currencyCode: 'USD',
  frequency: 'monthly' as RecurringInvoiceTemplate['frequency'],
  taxRate: 0,
  items: [{ description: '', quantity: 1, unitPrice: 0 }] as InvoiceItemInput[],
})
const generatingId = ref<string | null>(null)

async function loadTemplates() {
  templatesLoading.value = true
  try {
    templates.value = await listRecurringTemplates()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    templatesLoading.value = false
  }
}

function openCreateTemplate() {
  templateForm.value = {
    name: '',
    companyId: '',
    contactId: '',
    currencyCode: currencies.value[0]?.code ?? 'USD',
    frequency: 'monthly',
    taxRate: 0,
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
  }
  templateError.value = ''
  showTemplateModal.value = true
}

async function submitTemplate() {
  templateSaving.value = true
  templateError.value = ''
  try {
    await createRecurringTemplate({
      name: templateForm.value.name,
      companyId: templateForm.value.companyId,
      contactId: templateForm.value.contactId || undefined,
      currencyCode: templateForm.value.currencyCode,
      frequency: templateForm.value.frequency,
      taxRate: templateForm.value.taxRate,
      items: templateForm.value.items,
    })
    showTemplateModal.value = false
    toast.success(t('common.savedOk'))
    await loadTemplates()
  } catch (err) {
    templateError.value = getErrorMessage(err)
  } finally {
    templateSaving.value = false
  }
}

async function toggleTemplateActive(template: RecurringInvoiceTemplate) {
  try {
    await setRecurringTemplateActive(template.id, !template.isActive)
    toast.success(t('common.savedOk'))
    await loadTemplates()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

async function handleGenerate(template: RecurringInvoiceTemplate) {
  generatingId.value = template.id
  try {
    const invoice = await generateInvoiceFromTemplate(template.id, new Date().toISOString().slice(0, 10))
    toast.success(t('invoices.generatedOk', { number: invoice.invoiceNumber }))
    await loadTemplates()
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    generatingId.value = null
  }
}

onMounted(() => {
  load()
  loadPickers()
  loadTemplates()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('invoices.title') }}</h1>
      <button v-if="activeTab === 'invoices'" class="btn" @click="openCreateModal">+ {{ t('invoices.newInvoice') }}</button>
      <button v-else class="btn" @click="openCreateTemplate">+ {{ t('invoices.newTemplate') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'invoices' }" @click="activeTab = 'invoices'">
        {{ t('invoices.title') }}
      </button>
      <button class="tab" :class="{ active: activeTab === 'recurring' }" @click="activeTab = 'recurring'">
        {{ t('invoices.recurring') }}
      </button>
    </div>

    <template v-if="activeTab === 'invoices'">
      <div class="list-filters">
        <input v-model="search" type="text" class="search-input" :placeholder="t('common.search')" @input="onSearchInput" />
        <label class="checkbox-field">
          <input v-model="onlyMine" type="checkbox" />
          {{ t('common.onlyMine') }}
        </label>
      </div>

      <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
      <p v-else-if="error" class="error-text">{{ error }}</p>
      <template v-else>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('companies.title') }}</th>
              <th>{{ t('invoices.total') }}</th>
              <th>{{ t('invoices.balanceDue') }}</th>
              <th>{{ t('invoices.dueDate') }}</th>
              <th>Estado</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in invoices" :key="inv.id">
              <td>{{ inv.invoiceNumber }}</td>
              <td>{{ companyName(inv.companyId) }}</td>
              <td>{{ inv.currencyCode }} {{ Number(inv.total).toLocaleString() }}</td>
              <td>{{ inv.currencyCode }} {{ balanceDue(inv).toLocaleString() }}</td>
              <td>{{ inv.dueDate || '—' }}</td>
              <td>
                <span class="badge" :class="statusBadge[inv.status]">{{ t(`invoices.status.${inv.status}`) }}</span>
                <span v-if="isOverdue(inv)" class="badge red" style="margin-left: 0.35rem">{{ t('invoices.overdue') }}</span>
              </td>
              <td class="actions-cell">
                <button class="btn secondary" :disabled="detailLoadingId === inv.id" @click="openDetail(inv)">
                  {{ t('invoices.viewDetail') }}
                </button>
              </td>
            </tr>
            <tr v-if="!invoices.length">
              <td colspan="7" class="muted">—</td>
            </tr>
          </tbody>
        </table>
        <Pagination :page="page" :total-pages="totalPages" :total="total" @go="goToPage" />
      </template>
    </template>

    <template v-else>
      <p v-if="templatesLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('common.name') }}</th>
            <th>{{ t('companies.title') }}</th>
            <th>{{ t('invoices.frequencyLabel') }}</th>
            <th>{{ t('invoices.lastGenerated') }}</th>
            <th>{{ t('common.active') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tpl in templates" :key="tpl.id">
            <td>{{ tpl.name }}</td>
            <td>{{ companyName(tpl.companyId) }}</td>
            <td>{{ t(`invoices.frequency.${tpl.frequency}`) }}</td>
            <td>{{ tpl.lastGeneratedAt ? new Date(tpl.lastGeneratedAt).toLocaleDateString() : '—' }}</td>
            <td>
              <span class="badge" :class="tpl.isActive ? 'green' : 'red'">
                {{ tpl.isActive ? t('common.active') : t('common.inactive') }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn secondary" :disabled="generatingId === tpl.id" @click="handleGenerate(tpl)">
                {{ t('invoices.generateNow') }}
              </button>
              <button class="btn secondary" @click="toggleTemplateActive(tpl)">
                {{ tpl.isActive ? t('common.deactivate') : t('common.activate') }}
              </button>
            </td>
          </tr>
          <tr v-if="!templates.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Create invoice modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal wide" @submit.prevent="submit">
        <h2>{{ t('invoices.newInvoice') }}</h2>
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
        <div class="field">
          <label>{{ t('quotes.currency') }}</label>
          <select v-model="form.currencyCode" required>
            <option v-for="c in currencies" :key="c.code" :value="c.code">{{ c.code }} — {{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('invoices.issueDate') }}</label>
          <input v-model="form.issueDate" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('invoices.dueDate') }}</label>
          <input v-model="form.dueDate" type="date" />
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

    <!-- Recurring template modal -->
    <div v-if="showTemplateModal" class="modal-backdrop" @click.self="showTemplateModal = false">
      <form class="modal wide" @submit.prevent="submitTemplate">
        <h2>{{ t('invoices.newTemplate') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="templateForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('companies.title') }}</label>
          <select v-model="templateForm.companyId" required>
            <option value="" disabled>—</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('invoices.frequencyLabel') }}</label>
          <select v-model="templateForm.frequency">
            <option value="weekly">{{ t('invoices.frequency.weekly') }}</option>
            <option value="monthly">{{ t('invoices.frequency.monthly') }}</option>
            <option value="quarterly">{{ t('invoices.frequency.quarterly') }}</option>
            <option value="yearly">{{ t('invoices.frequency.yearly') }}</option>
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
            <tr v-for="(item, index) in templateForm.items" :key="index">
              <td><input v-model="item.description" required /></td>
              <td><input v-model.number="item.quantity" type="number" min="0.01" step="0.01" required /></td>
              <td><input v-model.number="item.unitPrice" type="number" min="0" step="0.01" required /></td>
              <td>
                <button
                  type="button"
                  class="btn secondary"
                  :disabled="templateForm.items.length === 1"
                  @click="templateForm.items.splice(index, 1)"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <button type="button" class="btn secondary" style="margin-top: 0.5rem" @click="templateForm.items.push({ description: '', quantity: 1, unitPrice: 0 })">
          + {{ t('quotes.addItem') }}
        </button>
        <div class="field" style="margin-top: 1rem">
          <label>{{ t('quotes.tax') }} (%)</label>
          <input v-model.number="templateForm.taxRate" type="number" min="0" step="0.1" />
        </div>
        <p v-if="templateError" class="error-text">{{ templateError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showTemplateModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="templateSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Invoice detail modal -->
    <div v-if="detailInvoice" class="modal-backdrop" @click.self="detailInvoice = null">
      <div class="modal wide">
        <h2>{{ detailInvoice.invoiceNumber }} — {{ companyName(detailInvoice.companyId) }}</h2>
        <p>
          <span class="badge" :class="statusBadge[detailInvoice.status]">{{ t(`invoices.status.${detailInvoice.status}`) }}</span>
          <span v-if="isOverdue(detailInvoice)" class="badge red" style="margin-left: 0.35rem">{{ t('invoices.overdue') }}</span>
        </p>

        <table class="items-table">
          <thead>
            <tr>
              <th>{{ t('quotes.description') }}</th>
              <th>{{ t('quotes.quantity') }}</th>
              <th>{{ t('quotes.unitPrice') }}</th>
              <th>{{ t('quotes.total') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in detailInvoice.items" :key="item.id">
              <td>{{ item.description }}</td>
              <td>{{ item.quantity }}</td>
              <td>{{ Number(item.unitPrice).toLocaleString() }}</td>
              <td>{{ Number(item.total).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>

        <p class="total-line">{{ t('quotes.total') }}: {{ detailInvoice.currencyCode }} {{ Number(detailInvoice.total).toLocaleString() }}</p>
        <p class="total-line">{{ t('invoices.balanceDue') }}: {{ detailInvoice.currencyCode }} {{ balanceDue(detailInvoice).toLocaleString() }}</p>

        <div class="modal-actions" style="justify-content: flex-start; flex-wrap: wrap; gap: 0.5rem">
          <button v-if="detailInvoice.status === 'draft'" class="btn secondary" :disabled="actionSaving" @click="handleIssue">
            {{ t('invoices.issue') }}
          </button>
          <button v-if="detailInvoice.status !== 'paid' && detailInvoice.status !== 'cancelled'" class="btn secondary" :disabled="actionSaving" @click="handleCancel">
            {{ t('common.cancel') }}
          </button>
          <button v-if="balanceDue(detailInvoice) > 0 && detailInvoice.status !== 'draft'" class="btn secondary" :disabled="actionSaving" @click="handleReminder">
            {{ t('invoices.sendReminder') }} ({{ detailInvoice.reminderCount }})
          </button>
        </div>

        <template v-if="detailInvoice.status !== 'draft' && detailInvoice.status !== 'cancelled'">
          <h3 class="section-title">{{ t('invoices.payments') }}</h3>
          <ul class="detail-list">
            <li v-for="p in payments" :key="p.id">
              {{ new Date(p.paidAt).toLocaleDateString() }} — {{ detailInvoice.currencyCode }} {{ Number(p.amount).toLocaleString() }}
              <span v-if="p.method" class="muted">({{ p.method }})</span>
            </li>
            <li v-if="!payments.length" class="muted">—</li>
          </ul>
          <form v-if="balanceDue(detailInvoice) > 0" class="inline-form" @submit.prevent="submitPayment">
            <input v-model.number="paymentForm.amount" type="number" min="0.01" step="0.01" :placeholder="t('invoices.amount')" required />
            <input v-model="paymentForm.method" :placeholder="t('invoices.method')" />
            <button type="submit" class="btn secondary" :disabled="actionSaving">{{ t('invoices.registerPayment') }}</button>
          </form>

          <h3 class="section-title">{{ t('invoices.adjustments') }}</h3>
          <ul class="detail-list">
            <li v-for="a in adjustments" :key="a.id">
              {{ t(`invoices.adjustmentType.${a.type}`) }} — {{ detailInvoice.currencyCode }} {{ Number(a.amount).toLocaleString() }}
              <span v-if="a.reason" class="muted">({{ a.reason }})</span>
            </li>
            <li v-if="!adjustments.length" class="muted">—</li>
          </ul>
          <form class="inline-form" @submit.prevent="submitAdjustment">
            <select v-model="adjustmentForm.type">
              <option value="credit">{{ t('invoices.adjustmentType.credit') }}</option>
              <option value="debit">{{ t('invoices.adjustmentType.debit') }}</option>
            </select>
            <input v-model.number="adjustmentForm.amount" type="number" min="0.01" step="0.01" :placeholder="t('invoices.amount')" required />
            <input v-model="adjustmentForm.reason" :placeholder="t('invoices.reason')" />
            <button type="submit" class="btn secondary" :disabled="actionSaving">{{ t('common.save') }}</button>
          </form>
        </template>

        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="detailInvoice = null">{{ t('common.cancel') }}</button>
        </div>
      </div>
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
  margin-top: 0.5rem;
}
.tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}
.tab {
  background: none;
  border: none;
  padding: 0.4rem 0.7rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
}
.tab:hover {
  background: var(--color-bg-subtle);
}
.tab.active {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
  font-weight: 600;
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
  margin-bottom: 0.6rem;
}
.inline-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.inline-form input,
.inline-form select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}
</style>
