<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { listLeadsPaginated, createLead, updateLead, deleteLead, getLeadHistory } from '@/api/leads'
import { createOpportunityFromLead } from '@/api/opportunities'
import { listCompanies } from '@/api/companies'
import { listContacts } from '@/api/contacts'
import { listUsers } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { Lead, Company, Contact } from '@/api/types'
import type { TenantUser } from '@/api/users'
import type { AuditLog } from '@/api/audit-logs'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const { items: leads, total, page, totalPages, loading, error, search, filters, load, applyAndReload, goToPage } =
  usePaginatedList<Lead, { ownerUserId?: string }>(listLeadsPaginated, { defaultSortBy: 'createdAt' })

let searchDebounce: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(applyAndReload, 300)
}

const companies = ref<Company[]>([])
const contacts = ref<Contact[]>([])
const users = ref<TenantUser[]>([])
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const convertingId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const onlyMine = ref(false)

watch(onlyMine, (value) => {
  filters.ownerUserId = value ? auth.user?.sub : undefined
  applyAndReload()
})

const form = ref({
  name: '',
  companyId: '',
  contactId: '',
  source: '',
  campaign: '',
  estimatedBudget: undefined as number | undefined,
  priority: 'medium' as 'low' | 'medium' | 'high',
  ownerUserId: '',
})

const INACTIVITY_DAYS = 5
const OPEN_STATUSES = new Set(['new', 'contacted', 'qualified'])
function isStale(lead: Lead): boolean {
  if (!OPEN_STATUSES.has(lead.status)) return false
  const daysSinceUpdate = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysSinceUpdate >= INACTIVITY_DAYS
}

const historyLead = ref<Lead | null>(null)
const history = ref<AuditLog[]>([])
const historyLoading = ref(false)

async function openHistory(lead: Lead) {
  historyLead.value = lead
  history.value = []
  historyLoading.value = true
  try {
    history.value = await getLeadHistory(lead.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    historyLoading.value = false
  }
}

function formatHistoryEntry(entry: AuditLog): string {
  if (!entry.changes || typeof entry.changes !== 'object') return t(`audit.actions.${entry.action}`)
  const parts = Object.entries(entry.changes as Record<string, { before: unknown; after: unknown }>)
    .filter(([, change]) => change && typeof change === 'object' && 'after' in change)
    .map(([field, change]) => `${field}: ${change.before ?? '—'} → ${change.after ?? '—'}`)
  return parts.length ? parts.join(', ') : t(`audit.actions.${entry.action}`)
}

const contactsForSelectedCompany = computed(() =>
  form.value.companyId ? contacts.value.filter((c) => c.companyId === form.value.companyId) : contacts.value,
)

async function loadPickers() {
  try {
    const [companiesData, contactsData] = await Promise.all([listCompanies(), listContacts()])
    companies.value = companiesData
    contacts.value = contactsData
    // Only Administrador-type roles can list the team — sales reps get a
    // 403 here, which just means the owner picker stays limited to "—".
    users.value = await listUsers().catch(() => [])
  } catch {
    // Pickers are a convenience for the create/edit form — a failure here
    // shouldn't block the leads list itself.
  }
}

function companyName(id: string | null) {
  return companies.value.find((c) => c.id === id)?.name ?? '—'
}

function ownerName(id: string | null) {
  return users.value.find((u) => u.id === id)?.fullName ?? '—'
}

function openCreateModal() {
  editingId.value = null
  form.value = {
    name: '',
    companyId: '',
    contactId: '',
    source: '',
    campaign: '',
    estimatedBudget: undefined,
    priority: 'medium',
    ownerUserId: '',
  }
  formError.value = ''
  showModal.value = true
}

function openEditModal(lead: Lead) {
  editingId.value = lead.id
  form.value = {
    name: lead.name,
    companyId: lead.companyId ?? '',
    contactId: lead.contactId ?? '',
    source: lead.source ?? '',
    campaign: lead.campaign ?? '',
    estimatedBudget: lead.estimatedBudget != null ? Number(lead.estimatedBudget) : undefined,
    priority: lead.priority ?? 'medium',
    ownerUserId: lead.ownerUserId ?? '',
  }
  formError.value = ''
  showModal.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  const payload = {
    name: form.value.name,
    companyId: form.value.companyId || undefined,
    contactId: form.value.contactId || undefined,
    source: form.value.source || undefined,
    campaign: form.value.campaign || undefined,
    estimatedBudget: form.value.estimatedBudget,
    priority: form.value.priority,
    ownerUserId: form.value.ownerUserId || undefined,
  }
  try {
    if (editingId.value) {
      await updateLead(editingId.value, payload)
    } else {
      await createLead(payload)
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

async function remove(lead: Lead) {
  if (!confirm(t('common.confirmDelete'))) return
  deletingId.value = lead.id
  try {
    await deleteLead(lead.id)
    toast.success(t('common.deletedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    deletingId.value = null
  }
}

async function convert(lead: Lead) {
  convertingId.value = lead.id
  try {
    await createOpportunityFromLead(lead.id)
    await load()
    router.push({ name: 'pipeline' })
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    convertingId.value = null
  }
}

const statusBadge: Record<string, string> = {
  new: 'blue',
  contacted: 'amber',
  qualified: 'green',
  disqualified: 'red',
  converted: 'green',
}

const priorityBadge: Record<string, string> = {
  low: '',
  medium: 'amber',
  high: 'red',
}

onMounted(() => {
  load()
  loadPickers()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('leads.title') }}</h1>
      <button class="btn" @click="openCreateModal">+ {{ t('leads.newLead') }}</button>
    </div>

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
            <th>{{ t('common.name') }}</th>
            <th>{{ t('companies.title') }}</th>
            <th>{{ t('leads.source') }}</th>
            <th>{{ t('leads.budget') }}</th>
            <th>{{ t('leads.priority') }}</th>
            <th>{{ t('common.owner') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lead in leads" :key="lead.id">
            <td>{{ lead.name }}</td>
            <td>{{ companyName(lead.companyId) }}</td>
            <td>{{ lead.source || '—' }}</td>
            <td>{{ lead.estimatedBudget ?? '—' }}</td>
            <td><span class="badge" :class="priorityBadge[lead.priority]">{{ t(`leads.priorityLevel.${lead.priority}`) }}</span></td>
            <td>{{ ownerName(lead.ownerUserId) }}</td>
            <td>
              <span class="badge" :class="statusBadge[lead.status]">{{ t(`leads.status.${lead.status}`) }}</span>
              <span v-if="isStale(lead)" class="badge red" :title="t('leads.staleHint', { days: INACTIVITY_DAYS })" style="margin-left: 0.35rem">
                {{ t('leads.stale') }}
              </span>
            </td>
            <td class="actions-cell">
              <button
                v-if="lead.status !== 'converted'"
                class="btn secondary"
                :disabled="convertingId === lead.id"
                @click="convert(lead)"
              >
                {{ t('leads.convert') }}
              </button>
              <button class="btn secondary" @click="openHistory(lead)">{{ t('leads.history') }}</button>
              <button class="btn secondary" @click="openEditModal(lead)">{{ t('common.edit') }}</button>
              <button class="btn secondary" :disabled="deletingId === lead.id" @click="remove(lead)">
                {{ t('common.delete') }}
              </button>
            </td>
          </tr>
          <tr v-if="!leads.length">
            <td colspan="8" class="muted">—</td>
          </tr>
        </tbody>
      </table>
      <Pagination :page="page" :total-pages="totalPages" :total="total" @go="goToPage" />
    </template>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ editingId ? t('common.edit') : t('leads.newLead') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="form.name" required />
        </div>
        <div class="field">
          <label>{{ t('companies.title') }}</label>
          <select v-model="form.companyId">
            <option value="">—</option>
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
          <label>{{ t('leads.source') }}</label>
          <input v-model="form.source" placeholder="referido, web, feria..." />
        </div>
        <div class="field">
          <label>{{ t('leads.campaign') }}</label>
          <input v-model="form.campaign" />
        </div>
        <div class="field">
          <label>{{ t('leads.budget') }}</label>
          <input v-model.number="form.estimatedBudget" type="number" min="0" />
        </div>
        <div class="field">
          <label>{{ t('leads.priority') }}</label>
          <select v-model="form.priority">
            <option value="low">{{ t('leads.priorityLevel.low') }}</option>
            <option value="medium">{{ t('leads.priorityLevel.medium') }}</option>
            <option value="high">{{ t('leads.priorityLevel.high') }}</option>
          </select>
        </div>
        <div v-if="users.length" class="field">
          <label>{{ t('common.owner') }}</label>
          <select v-model="form.ownerUserId">
            <option value="">—</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
          </select>
        </div>
        <p v-if="formError" class="error-text">{{ formError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showModal = false">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn" :disabled="saving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <div v-if="historyLead" class="modal-backdrop" @click.self="historyLead = null">
      <div class="modal">
        <h2>{{ t('leads.history') }} — {{ historyLead.name }}</h2>
        <p v-if="historyLoading" class="muted">{{ t('common.loading') }}</p>
        <ul v-else class="history-list">
          <li v-for="entry in history" :key="entry.id" class="history-item">
            <div class="muted" style="font-size: 0.78rem">{{ new Date(entry.createdAt).toLocaleString() }}</div>
            <div>{{ formatHistoryEntry(entry) }}</div>
          </li>
          <li v-if="!history.length" class="muted">—</li>
        </ul>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="historyLead = null">{{ t('common.cancel') }}</button>
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
.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 320px;
  overflow-y: auto;
}
.history-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border-subtle);
  font-size: 0.85rem;
}
.history-item:last-child {
  border-bottom: none;
}
</style>
