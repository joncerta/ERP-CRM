<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { listLeads, createLead, updateLead, deleteLead } from '@/api/leads'
import { createOpportunityFromLead } from '@/api/opportunities'
import { listCompanies } from '@/api/companies'
import { listContacts } from '@/api/contacts'
import { listUsers } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { Lead, Company, Contact } from '@/api/types'
import type { TenantUser } from '@/api/users'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const leads = ref<Lead[]>([])
const companies = ref<Company[]>([])
const contacts = ref<Contact[]>([])
const users = ref<TenantUser[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const convertingId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const onlyMine = ref(false)
const searchQuery = ref('')

const form = ref({
  name: '',
  companyId: '',
  contactId: '',
  source: '',
  estimatedBudget: undefined as number | undefined,
  ownerUserId: '',
})

const contactsForSelectedCompany = computed(() =>
  form.value.companyId ? contacts.value.filter((c) => c.companyId === form.value.companyId) : contacts.value,
)

const visibleLeads = computed(() => {
  let result = leads.value
  if (onlyMine.value) result = result.filter((l) => l.ownerUserId === auth.user?.sub)
  const query = searchQuery.value.trim().toLowerCase()
  if (query) result = result.filter((l) => l.name.toLowerCase().includes(query))
  return result
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [leadsData, companiesData, contactsData] = await Promise.all([listLeads(), listCompanies(), listContacts()])
    leads.value = leadsData
    companies.value = companiesData
    contacts.value = contactsData
    // Only Administrador-type roles can list the team — sales reps get a
    // 403 here, which just means the owner picker stays limited to "—".
    users.value = await listUsers().catch(() => [])
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
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
  form.value = { name: '', companyId: '', contactId: '', source: '', estimatedBudget: undefined, ownerUserId: '' }
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
    estimatedBudget: lead.estimatedBudget != null ? Number(lead.estimatedBudget) : undefined,
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
    estimatedBudget: form.value.estimatedBudget,
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

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('leads.title') }}</h1>
      <button class="btn" @click="openCreateModal">+ {{ t('leads.newLead') }}</button>
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
          <th>{{ t('common.name') }}</th>
          <th>{{ t('companies.title') }}</th>
          <th>{{ t('leads.source') }}</th>
          <th>{{ t('leads.budget') }}</th>
          <th>{{ t('common.owner') }}</th>
          <th>Estado</th>
          <th>{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="lead in visibleLeads" :key="lead.id">
          <td>{{ lead.name }}</td>
          <td>{{ companyName(lead.companyId) }}</td>
          <td>{{ lead.source || '—' }}</td>
          <td>{{ lead.estimatedBudget ?? '—' }}</td>
          <td>{{ ownerName(lead.ownerUserId) }}</td>
          <td><span class="badge" :class="statusBadge[lead.status]">{{ t(`leads.status.${lead.status}`) }}</span></td>
          <td class="actions-cell">
            <button
              v-if="lead.status !== 'converted'"
              class="btn secondary"
              :disabled="convertingId === lead.id"
              @click="convert(lead)"
            >
              {{ t('leads.convert') }}
            </button>
            <button class="btn secondary" @click="openEditModal(lead)">{{ t('common.edit') }}</button>
            <button class="btn secondary" :disabled="deletingId === lead.id" @click="remove(lead)">
              {{ t('common.delete') }}
            </button>
          </td>
        </tr>
        <tr v-if="!visibleLeads.length">
          <td colspan="7" class="muted">—</td>
        </tr>
      </tbody>
    </table>

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
          <label>{{ t('leads.budget') }}</label>
          <input v-model.number="form.estimatedBudget" type="number" min="0" />
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
  </div>
</template>

<style scoped>
.actions-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
</style>
