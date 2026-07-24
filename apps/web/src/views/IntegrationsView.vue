<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { listApiKeys, createApiKey, revokeApiKey, type CreateApiKeyPayload } from '@/api/integrations'
import { apiClient } from '@/api/client'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { ApiKey, PublicApiScope } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const baseUrl = `${apiClient.defaults.baseURL}/public-api/v1`

const ALL_SCOPES: PublicApiScope[] = ['leads:read', 'leads:write', 'contacts:read', 'contacts:write', 'invoices:read']

const apiKeys = ref<ApiKey[]>([])
const loading = ref(true)
async function loadApiKeys() {
  loading.value = true
  try {
    apiKeys.value = await listApiKeys()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    loading.value = false
  }
}

const showCreateModal = ref(false)
const createSaving = ref(false)
const createError = ref('')
const createForm = ref<{ name: string; scopes: PublicApiScope[] }>({ name: '', scopes: [] })
function openCreateModal() {
  createForm.value = { name: '', scopes: [] }
  createError.value = ''
  showCreateModal.value = true
}
function toggleScope(scope: PublicApiScope) {
  const i = createForm.value.scopes.indexOf(scope)
  if (i === -1) createForm.value.scopes.push(scope)
  else createForm.value.scopes.splice(i, 1)
}
async function submitCreate() {
  if (!createForm.value.scopes.length) {
    createError.value = t('integrations.scopes')
    return
  }
  createSaving.value = true
  createError.value = ''
  try {
    const payload: CreateApiKeyPayload = { name: createForm.value.name, scopes: createForm.value.scopes }
    const { plainKey } = await createApiKey(payload)
    showCreateModal.value = false
    createdKey.value = plainKey
    copied.value = false
    await loadApiKeys()
  } catch (err) {
    createError.value = getErrorMessage(err)
  } finally {
    createSaving.value = false
  }
}

const createdKey = ref('')
const copied = ref(false)
async function copyKey() {
  try {
    await navigator.clipboard.writeText(createdKey.value)
    copied.value = true
  } catch {
    // clipboard API unavailable — the key is still selectable/visible in the box
  }
}

async function handleRevoke(key: ApiKey) {
  if (!confirm(t('integrations.revokeConfirm'))) return
  try {
    await revokeApiKey(key.id)
    toast.success(t('common.savedOk'))
    await loadApiKeys()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

onMounted(loadApiKeys)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('integrations.title') }}</h1>
      <button class="btn" @click="openCreateModal">+ {{ t('integrations.newApiKey') }}</button>
    </div>
    <p class="muted">{{ t('integrations.subtitle') }}</p>

    <div class="info-box">
      <strong>{{ t('integrations.baseUrl') }}:</strong> <code>{{ baseUrl }}</code>
    </div>
    <div class="info-box">
      {{ t('integrations.webhooksNote') }}
      <RouterLink to="/automations">{{ t('integrations.goToAutomations') }}</RouterLink>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('integrations.name') }}</th>
          <th>{{ t('integrations.keyPrefix') }}</th>
          <th>{{ t('integrations.scopes') }}</th>
          <th>{{ t('integrations.lastUsed') }}</th>
          <th>Estado</th>
          <th>{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="key in apiKeys" :key="key.id">
          <td>{{ key.name }}</td>
          <td><code>{{ key.keyPrefix }}…</code></td>
          <td>
            <span v-for="s in key.scopes" :key="s" class="badge scope-badge">{{ t(`integrations.scope_${s.replace(':', '_')}`) }}</span>
          </td>
          <td>{{ key.lastUsedAt ?? t('integrations.never') }}</td>
          <td><span class="badge" :class="key.isActive ? 'green' : ''">{{ key.isActive ? t('common.active') : t('common.inactive') }}</span></td>
          <td class="actions-cell">
            <button v-if="key.isActive" class="btn secondary" @click="handleRevoke(key)">{{ t('integrations.revoke') }}</button>
          </td>
        </tr>
        <tr v-if="!apiKeys.length">
          <td colspan="6" class="muted">—</td>
        </tr>
      </tbody>
    </table>

    <!-- Nueva clave -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <form class="modal" @submit.prevent="submitCreate">
        <h2>{{ t('integrations.newApiKey') }}</h2>
        <div class="field">
          <label>{{ t('integrations.name') }}</label>
          <input v-model="createForm.name" required />
        </div>
        <label class="section-label">{{ t('integrations.scopes') }}</label>
        <div class="scope-list">
          <label v-for="scope in ALL_SCOPES" :key="scope" class="scope-item">
            <input type="checkbox" :checked="createForm.scopes.includes(scope)" @change="toggleScope(scope)" />
            {{ t(`integrations.scope_${scope.replace(':', '_')}`) }}
          </label>
        </div>
        <p v-if="createError" class="error-text">{{ createError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showCreateModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="createSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Clave creada (una sola vez) -->
    <div v-if="createdKey" class="modal-backdrop" @click.self="createdKey = ''">
      <div class="modal">
        <h2>{{ t('integrations.keyCreatedTitle') }}</h2>
        <p class="error-text">{{ t('integrations.keyCreatedWarning') }}</p>
        <div class="key-box">
          <code>{{ createdKey }}</code>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="copyKey">{{ copied ? t('integrations.copied') : t('integrations.copy') }}</button>
          <button type="button" class="btn" @click="createdKey = ''">{{ t('integrations.close') }}</button>
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
  flex-wrap: wrap;
}
.info-box {
  background: var(--color-bg-subtle);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}
.section-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0.75rem 0 0.4rem;
}
.scope-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.scope-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 400;
}
.scope-badge {
  margin-right: 0.3rem;
  margin-bottom: 0.2rem;
  display: inline-block;
}
.key-box {
  background: var(--color-bg-subtle);
  border-radius: var(--radius);
  padding: 0.9rem 1rem;
  margin: 0.75rem 0;
  word-break: break-all;
  font-size: 0.9rem;
}
</style>
