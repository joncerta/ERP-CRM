<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listCompanies, createCompany } from '@/api/companies'
import type { Company } from '@/api/types'

const { t } = useI18n()
const companies = ref<Company[]>([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)

const form = ref({ name: '', email: '', phone: '', city: '', country: '' })

async function load() {
  loading.value = true
  companies.value = await listCompanies()
  loading.value = false
}

function openModal() {
  form.value = { name: '', email: '', phone: '', city: '', country: '' }
  showModal.value = true
}

async function submit() {
  saving.value = true
  try {
    await createCompany(form.value)
    showModal.value = false
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('companies.title') }}</h1>
      <button class="btn" @click="openModal">+ {{ t('companies.newCompany') }}</button>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('common.name') }}</th>
          <th>{{ t('common.email') }}</th>
          <th>{{ t('common.phone') }}</th>
          <th>{{ t('companies.city') }}</th>
          <th>{{ t('companies.country') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in companies" :key="c.id">
          <td>{{ c.name }}</td>
          <td>{{ c.email || '—' }}</td>
          <td>{{ c.phone || '—' }}</td>
          <td>{{ c.city || '—' }}</td>
          <td>{{ c.country || '—' }}</td>
        </tr>
        <tr v-if="!companies.length">
          <td colspan="5" class="muted">—</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ t('companies.newCompany') }}</h2>
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
