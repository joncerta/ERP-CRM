<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listContactsPaginated, createContact, updateContact, deleteContact } from '@/api/contacts'
import { listCompanies } from '@/api/companies'
import { getErrorMessage } from '@/api/error'
import { compact } from '@/utils/compact'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { Contact, Company } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const { items: contacts, total, page, totalPages, loading, error, search, load, applyAndReload, goToPage } =
  usePaginatedList(listContactsPaginated, { defaultSortBy: 'firstName' })

let searchDebounce: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(applyAndReload, 300)
}

const companies = ref<Company[]>([])
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

const form = ref({ firstName: '', lastName: '', companyId: '', email: '', phone: '', whatsapp: '', position: '' })

async function loadCompanies() {
  try {
    companies.value = await listCompanies()
  } catch {
    // The company picker is a convenience — a failure here shouldn't block the contacts list itself.
  }
}

function companyName(id: string | null) {
  return companies.value.find((c) => c.id === id)?.name ?? '—'
}

function openCreateModal() {
  editingId.value = null
  form.value = { firstName: '', lastName: '', companyId: '', email: '', phone: '', whatsapp: '', position: '' }
  formError.value = ''
  showModal.value = true
}

function openEditModal(contact: Contact) {
  editingId.value = contact.id
  form.value = {
    firstName: contact.firstName,
    lastName: contact.lastName ?? '',
    companyId: contact.companyId ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    whatsapp: contact.whatsapp ?? '',
    position: contact.position ?? '',
  }
  formError.value = ''
  showModal.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await updateContact(editingId.value, compact(form.value))
    } else {
      await createContact(compact(form.value))
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

async function remove(contact: Contact) {
  if (!confirm(t('common.confirmDelete'))) return
  deletingId.value = contact.id
  try {
    await deleteContact(contact.id)
    toast.success(t('common.deletedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  load()
  loadCompanies()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('contacts.title') }}</h1>
      <button class="btn" @click="openCreateModal">+ {{ t('contacts.newContact') }}</button>
    </div>

    <div class="list-filters">
      <input v-model="search" type="text" class="search-input" :placeholder="t('common.search')" @input="onSearchInput" />
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <template v-else>
      <table>
        <thead>
          <tr>
            <th>{{ t('common.name') }}</th>
            <th>{{ t('companies.title') }}</th>
            <th>{{ t('contacts.position') }}</th>
            <th>{{ t('common.email') }}</th>
            <th>{{ t('common.phone') }}</th>
            <th>WhatsApp</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="contact in contacts" :key="contact.id">
            <td>{{ contact.firstName }} {{ contact.lastName || '' }}</td>
            <td>{{ companyName(contact.companyId) }}</td>
            <td>{{ contact.position || '—' }}</td>
            <td>{{ contact.email || '—' }}</td>
            <td>{{ contact.phone || '—' }}</td>
            <td>{{ contact.whatsapp || '—' }}</td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditModal(contact)">{{ t('common.edit') }}</button>
              <button class="btn secondary" :disabled="deletingId === contact.id" @click="remove(contact)">
                {{ t('common.delete') }}
              </button>
            </td>
          </tr>
          <tr v-if="!contacts.length">
            <td colspan="7" class="muted">—</td>
          </tr>
        </tbody>
      </table>
      <Pagination :page="page" :total-pages="totalPages" :total="total" @go="goToPage" />
    </template>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ editingId ? t('common.edit') : t('contacts.newContact') }}</h2>
        <div class="field">
          <label>{{ t('contacts.firstName') }}</label>
          <input v-model="form.firstName" required />
        </div>
        <div class="field">
          <label>{{ t('contacts.lastName') }}</label>
          <input v-model="form.lastName" />
        </div>
        <div class="field">
          <label>{{ t('companies.title') }}</label>
          <select v-model="form.companyId">
            <option value="">—</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('contacts.position') }}</label>
          <input v-model="form.position" />
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
          <label>WhatsApp</label>
          <input v-model="form.whatsapp" placeholder="+57 300 000 0000" />
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
