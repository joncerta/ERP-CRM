<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listActivitiesPaginated,
  getAgenda,
  createActivity,
  updateActivity,
  deleteActivity,
} from '@/api/activities'
import { listContacts } from '@/api/contacts'
import { listLeads } from '@/api/leads'
import { listOpportunities } from '@/api/opportunities'
import { listUsers } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { Activity, Contact, Lead, Opportunity } from '@/api/types'
import type { TenantUser } from '@/api/users'

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()

const agenda = ref<Activity[]>([])
const agendaLoading = ref(true)
const agendaOnlyMine = ref(true)

const {
  items: activities,
  total,
  page,
  totalPages,
  loading,
  error,
  load,
  goToPage,
} = usePaginatedList<Activity>(listActivitiesPaginated, { defaultSortBy: 'createdAt' })

const contacts = ref<Contact[]>([])
const leads = ref<Lead[]>([])
const opportunities = ref<Opportunity[]>([])
const users = ref<TenantUser[]>([])

async function loadAgenda() {
  agendaLoading.value = true
  try {
    agenda.value = await getAgenda(agendaOnlyMine.value)
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    agendaLoading.value = false
  }
}

async function loadPickers() {
  try {
    const [contactsData, leadsData, opportunitiesData] = await Promise.all([
      listContacts(),
      listLeads(),
      listOpportunities(),
    ])
    contacts.value = contactsData
    leads.value = leadsData
    opportunities.value = opportunitiesData
    users.value = await listUsers().catch(() => [])
  } catch {
    // Pickers are a convenience for the create form — a failure here
    // shouldn't block the activity list itself.
  }
}

function contactName(id: string | null) {
  return contacts.value.find((c) => c.id === id)?.firstName ?? '—'
}
function leadName(id: string | null) {
  return leads.value.find((l) => l.id === id)?.name ?? '—'
}
function opportunityName(id: string | null) {
  return opportunities.value.find((o) => o.id === id)?.name ?? '—'
}
function ownerName(id: string) {
  return users.value.find((u) => u.id === id)?.fullName ?? '—'
}
function relatedLabel(activity: Activity): string {
  if (activity.leadId) return `${t('leads.title')}: ${leadName(activity.leadId)}`
  if (activity.opportunityId) return `${t('pipeline.title')}: ${opportunityName(activity.opportunityId)}`
  if (activity.contactId) return `${t('contacts.title')}: ${contactName(activity.contactId)}`
  return '—'
}

const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({
  type: 'call' as Activity['type'],
  subject: '',
  notes: '',
  contactId: '',
  leadId: '',
  opportunityId: '',
  scheduledAt: '',
})

function openCreateModal() {
  form.value = { type: 'call', subject: '', notes: '', contactId: '', leadId: '', opportunityId: '', scheduledAt: '' }
  formError.value = ''
  showModal.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    await createActivity({
      type: form.value.type,
      subject: form.value.subject,
      notes: form.value.notes || undefined,
      contactId: form.value.contactId || undefined,
      leadId: form.value.leadId || undefined,
      opportunityId: form.value.opportunityId || undefined,
      scheduledAt: form.value.scheduledAt ? new Date(form.value.scheduledAt).toISOString() : undefined,
    } as Partial<Activity>)
    showModal.value = false
    toast.success(t('common.savedOk'))
    await Promise.all([load(), loadAgenda()])
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}

const completingId = ref<string | null>(null)
async function markComplete(activity: Activity) {
  const outcome = window.prompt(t('activities.outcomePrompt')) ?? undefined
  completingId.value = activity.id
  try {
    await updateActivity(activity.id, { completed: true, outcome: outcome || undefined })
    toast.success(t('common.savedOk'))
    await Promise.all([load(), loadAgenda()])
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    completingId.value = null
  }
}

const deletingId = ref<string | null>(null)
async function remove(activity: Activity) {
  if (!confirm(t('common.confirmDelete'))) return
  deletingId.value = activity.id
  try {
    await deleteActivity(activity.id)
    toast.success(t('common.deletedOk'))
    await Promise.all([load(), loadAgenda()])
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    deletingId.value = null
  }
}

const typeBadge: Record<string, string> = {
  call: 'blue',
  meeting: 'blue',
  email: '',
  note: '',
  visit: 'amber',
  task: 'green',
}

onMounted(() => {
  load()
  loadAgenda()
  loadPickers()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('activities.title') }}</h1>
      <button class="btn" @click="openCreateModal">+ {{ t('activities.newActivity') }}</button>
    </div>

    <h2 class="section-title">{{ t('activities.agenda') }}</h2>
    <div class="list-filters">
      <label class="checkbox-field">
        <input v-model="agendaOnlyMine" type="checkbox" @change="loadAgenda" />
        {{ t('common.onlyMine') }}
      </label>
    </div>
    <p v-if="agendaLoading" class="muted">{{ t('common.loading') }}</p>
    <template v-else>
      <table>
        <thead>
          <tr>
            <th>{{ t('activities.scheduledAt') }}</th>
            <th>{{ t('activities.type') }}</th>
            <th>{{ t('activities.subject') }}</th>
            <th>{{ t('activities.related') }}</th>
            <th>{{ t('common.owner') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in agenda" :key="a.id">
            <td>{{ new Date(a.scheduledAt!).toLocaleString() }}</td>
            <td><span class="badge" :class="typeBadge[a.type]">{{ t(`activities.types.${a.type}`) }}</span></td>
            <td>{{ a.subject }}</td>
            <td>{{ relatedLabel(a) }}</td>
            <td>{{ ownerName(a.ownerUserId) }}</td>
            <td class="actions-cell">
              <button class="btn secondary" :disabled="completingId === a.id" @click="markComplete(a)">
                {{ t('activities.markComplete') }}
              </button>
            </td>
          </tr>
          <tr v-if="!agenda.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <h2 class="section-title">{{ t('activities.history') }}</h2>
    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <template v-else>
      <table>
        <thead>
          <tr>
            <th>{{ t('common.date') }}</th>
            <th>{{ t('activities.type') }}</th>
            <th>{{ t('activities.subject') }}</th>
            <th>{{ t('activities.related') }}</th>
            <th>{{ t('common.owner') }}</th>
            <th>{{ t('activities.outcome') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in activities" :key="a.id">
            <td>{{ new Date(a.createdAt).toLocaleDateString() }}</td>
            <td><span class="badge" :class="typeBadge[a.type]">{{ t(`activities.types.${a.type}`) }}</span></td>
            <td>{{ a.subject }}</td>
            <td>{{ relatedLabel(a) }}</td>
            <td>{{ ownerName(a.ownerUserId) }}</td>
            <td>{{ a.completedAt ? (a.outcome || t('activities.completedNoOutcome')) : '—' }}</td>
            <td class="actions-cell">
              <button
                v-if="!a.completedAt"
                class="btn secondary"
                :disabled="completingId === a.id"
                @click="markComplete(a)"
              >
                {{ t('activities.markComplete') }}
              </button>
              <button class="btn secondary" :disabled="deletingId === a.id" @click="remove(a)">
                {{ t('common.delete') }}
              </button>
            </td>
          </tr>
          <tr v-if="!activities.length">
            <td colspan="7" class="muted">—</td>
          </tr>
        </tbody>
      </table>
      <Pagination :page="page" :total-pages="totalPages" :total="total" @go="goToPage" />
    </template>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ t('activities.newActivity') }}</h2>
        <div class="field">
          <label>{{ t('activities.type') }}</label>
          <select v-model="form.type">
            <option value="call">{{ t('activities.types.call') }}</option>
            <option value="meeting">{{ t('activities.types.meeting') }}</option>
            <option value="email">{{ t('activities.types.email') }}</option>
            <option value="note">{{ t('activities.types.note') }}</option>
            <option value="visit">{{ t('activities.types.visit') }}</option>
            <option value="task">{{ t('activities.types.task') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('activities.subject') }}</label>
          <input v-model="form.subject" required />
        </div>
        <div class="field">
          <label>{{ t('leads.title') }}</label>
          <select v-model="form.leadId">
            <option value="">—</option>
            <option v-for="l in leads" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('contacts.title') }}</label>
          <select v-model="form.contactId">
            <option value="">—</option>
            <option v-for="c in contacts" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName || '' }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('pipeline.title') }}</label>
          <select v-model="form.opportunityId">
            <option value="">—</option>
            <option v-for="o in opportunities" :key="o.id" :value="o.id">{{ o.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('activities.scheduledAt') }}</label>
          <input v-model="form.scheduledAt" type="datetime-local" />
        </div>
        <div class="field">
          <label>{{ t('activities.notes') }}</label>
          <textarea v-model="form.notes" rows="2"></textarea>
        </div>
        <p v-if="formError" class="error-text">{{ formError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showModal = false">{{ t('common.cancel') }}</button>
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
.section-title {
  font-size: 1rem;
  margin: 1.25rem 0 0.6rem;
}
.section-title:first-of-type {
  margin-top: 0;
}
</style>
