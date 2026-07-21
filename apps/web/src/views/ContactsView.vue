<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listContacts, createContact } from '@/api/contacts'
import { listCompanies } from '@/api/companies'
import { getErrorMessage } from '@/api/error'
import { compact } from '@/utils/compact'
import type { Contact, Company } from '@/api/types'

const { t } = useI18n()

const contacts = ref<Contact[]>([])
const companies = ref<Company[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')

const form = ref({ firstName: '', lastName: '', companyId: '', email: '', phone: '', whatsapp: '', position: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [contactsData, companiesData] = await Promise.all([listContacts(), listCompanies()])
    contacts.value = contactsData
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
  form.value = { firstName: '', lastName: '', companyId: '', email: '', phone: '', whatsapp: '', position: '' }
  formError.value = ''
  showModal.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    await createContact(compact(form.value))
    showModal.value = false
    await load()
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('contacts.title') }}</h1>
      <button class="btn" @click="openModal">+ {{ t('contacts.newContact') }}</button>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('common.name') }}</th>
          <th>{{ t('companies.title') }}</th>
          <th>{{ t('contacts.position') }}</th>
          <th>{{ t('common.email') }}</th>
          <th>{{ t('common.phone') }}</th>
          <th>WhatsApp</th>
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
        </tr>
        <tr v-if="!contacts.length">
          <td colspan="6" class="muted">—</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ t('contacts.newContact') }}</h2>
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
