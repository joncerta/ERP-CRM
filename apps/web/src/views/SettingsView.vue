<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getTenantSettings, updateTenantSettings } from '@/api/tenant-settings'
import { getErrorMessage } from '@/api/error'

const { t } = useI18n()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const successMessage = ref('')
const idleTimeoutEnabled = ref(false)
const idleTimeoutMinutes = ref(30)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const settings = await getTenantSettings()
    idleTimeoutEnabled.value = settings.sessionIdleTimeoutMinutes != null
    idleTimeoutMinutes.value = settings.sessionIdleTimeoutMinutes ?? 30
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  error.value = ''
  successMessage.value = ''
  try {
    await updateTenantSettings(idleTimeoutEnabled.value ? idleTimeoutMinutes.value : null)
    successMessage.value = t('settings.saved')
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('settings.title') }}</h1>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <div v-else class="card" style="max-width: 480px">
      <h2 style="font-size: 1rem; margin-bottom: 0.25rem">{{ t('settings.sessionTitle') }}</h2>
      <p class="muted" style="margin-bottom: 1rem">{{ t('settings.sessionSubtitle') }}</p>

      <label class="checkbox-field">
        <input v-model="idleTimeoutEnabled" type="checkbox" />
        {{ t('settings.enableIdleTimeout') }}
      </label>

      <div v-if="idleTimeoutEnabled" class="field" style="margin-top: 0.75rem">
        <label>{{ t('settings.idleTimeoutMinutes') }}</label>
        <input v-model.number="idleTimeoutMinutes" type="number" min="5" max="10080" />
      </div>

      <p v-if="error" class="error-text" style="margin-top: 0.75rem">{{ error }}</p>
      <p v-if="successMessage" class="muted" style="margin-top: 0.75rem; color: var(--color-success)">
        {{ successMessage }}
      </p>

      <button class="btn" style="margin-top: 1rem" :disabled="saving" @click="save">
        {{ t('common.save') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}
</style>
