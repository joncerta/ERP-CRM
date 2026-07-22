<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listCompanies, createCompany, updateCompany, deleteCompany } from '@/api/companies'
import { getErrorMessage } from '@/api/error'
import { compact } from '@/utils/compact'
import type { Company } from '@/api/types'

const { t } = useI18n()
const companies = ref<Company[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const searchQuery = ref('')

const visibleCompanies = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return companies.value
  return companies.value.filter(
    (c) => c.name.toLowerCase().includes(query) || (c.email ?? '').toLowerCase().includes(query),
  )
})

const form = ref({ name: '', email: '', phone: '', city: '', country: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    companies.value = await listCompanies()
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingId.value = null
  form.value = { name: '', email: '', phone: '', city: '', country: '' }
  formError.value = ''
  showModal.value = true
}

function openEditModal(company: Company) {
  editingId.value = company.id
  form.value = {
    name: company.name,
    email: company.email ?? '',
    phone: company.phone ?? '',
    city: company.city ?? '',
    country: company.country ?? '',
  }
  formError.value = ''
  showModal.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await updateCompany(editingId.value, compact(form.value))
    } else {
      await createCompany(compact(form.value))
    }
    showModal.value = false
    await load()
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function remove(company: Company) {
  if (!confirm(t('common.confirmDelete'))) return
  deletingId.value = company.id
  try {
    await deleteCompany(company.id)
    await load()
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    deletingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('companies.title') }}</h1>
      <button class="btn" @click="openCreateModal">+ {{ t('companies.newCompany') }}</button>
    </div>

    <div class="list-filters">
      <input v-model="searchQuery" type="text" class="search-input" :placeholder="t('common.search')" />
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('common.name') }}</th>
          <th>{{ t('common.email') }}</th>
          <th>{{ t('common.phone') }}</th>
          <th>{{ t('companies.city') }}</th>
          <th>{{ t('companies.country') }}</th>
          <th>{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in visibleCompanies" :key="c.id">
          <td>{{ c.name }}</td>
          <td>{{ c.email || '—' }}</td>
          <td>{{ c.phone || '—' }}</td>
          <td>{{ c.city || '—' }}</td>
          <td>{{ c.country || '—' }}</td>
          <td class="actions-cell">
            <button class="btn secondary" @click="openEditModal(c)">{{ t('common.edit') }}</button>
            <button class="btn secondary" :disabled="deletingId === c.id" @click="remove(c)">
              {{ t('common.delete') }}
            </button>
          </td>
        </tr>
        <tr v-if="!visibleCompanies.length">
          <td colspan="6" class="muted">—</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ editingId ? t('common.edit') : t('companies.newCompany') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="form.name" required />
        </div>
        <div class="field">
          <label>{{ t('common.email') }}</label>
          <input v-model="form.email" type="email" />
        </div>
        <div class="field">
          <label>{{ t('common.phone') }}</label>
          <input v-model="form.phone" />
        </div>
        <div class="field">
          <label>{{ t('companies.city') }}</label>
          <input v-model="form.city" />
        </div>
        <div class="field">
          <label>{{ t('companies.country') }}</label>
          <input v-model="form.country" />
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
