<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { listLeads, createLead } from '@/api/leads'
import { createOpportunityFromLead } from '@/api/opportunities'
import { listCompanies } from '@/api/companies'
import { getErrorMessage } from '@/api/error'
import type { Lead, Company } from '@/api/types'

const { t } = useI18n()
const router = useRouter()

const leads = ref<Lead[]>([])
const companies = ref<Company[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const saving = ref(false)
const convertingId = ref<string | null>(null)

const form = ref({ name: '', companyId: '', source: '', estimatedBudget: undefined as number | undefined })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [leadsData, companiesData] = await Promise.all([listLeads(), listCompanies()])
    leads.value = leadsData
    companies.value = companiesData
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function companyName(id: string | null) {
  return companies.value.find((c) => c.id === id)?.name ?? '—'
}

function openModal() {
  form.value = { name: '', companyId: '', source: '', estimatedBudget: undefined }
  showModal.value = true
}

async function submit() {
  saving.value = true
  try {
    await createLead({
      name: form.value.name,
      companyId: form.value.companyId || undefined,
      source: form.value.source || undefined,
      estimatedBudget: form.value.estimatedBudget,
    })
    showModal.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function convert(lead: Lead) {
  convertingId.value = lead.id
  try {
    await createOpportunityFromLead(lead.id)
    await load()
    router.push({ name: 'pipeline' })
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
      <button class="btn" @click="openModal">+ {{ t('leads.newLead') }}</button>
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
          <td><span class="badge" :class="statusBadge[lead.status]">{{ t(`leads.status.${lead.status}`) }}</span></td>
          <td>
            <button
              v-if="lead.status !== 'converted'"
              class="btn secondary"
              :disabled="convertingId === lead.id"
              @click="convert(lead)"
            >
              {{ t('leads.convert') }}
            </button>
          </td>
        </tr>
        <tr v-if="!leads.length">
          <td colspan="6" class="muted">—</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ t('leads.newLead') }}</h2>
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
          <label>{{ t('leads.source') }}</label>
          <input v-model="form.source" placeholder="referido, web, feria..." />
        </div>
        <div class="field">
          <label>{{ t('leads.budget') }}</label>
          <input v-model.number="form.estimatedBudget" type="number" min="0" />
        </div>
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
