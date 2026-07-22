<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getTenantSettings, updateTenantSettings } from '@/api/tenant-settings'
import { changeOwnPassword } from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/api/error'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const successMessage = ref('')
const idleTimeoutEnabled = ref(false)
const idleTimeoutMinutes = ref(30)

const currentPassword = ref('')
const newPassword = ref('')
const passwordSaving = ref(false)
const passwordError = ref('')

async function submitPasswordChange() {
  passwordSaving.value = true
  passwordError.value = ''
  try {
    await changeOwnPassword(currentPassword.value, newPassword.value)
    // The server already revoked every session (including this one) —
    // clear local state and send the user back to log in.
    auth.logout()
    router.push({ name: 'login' })
  } catch (err) {
    passwordError.value = getErrorMessage(err)
  } finally {
    passwordSaving.value = false
  }
}

function setLocale(value: string) {
  locale.value = value
  localStorage.setItem('erp_crm_locale', value)
}

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
    <div v-else class="card" style="max-width: 480px; margin-bottom: 1rem">
      <h2 style="font-size: 1rem; margin-bottom: 0.25rem">{{ t('settings.languageTitle') }}</h2>
      <p class="muted" style="margin-bottom: 1rem">{{ t('settings.languageSubtitle') }}</p>
      <div class="field">
        <select :value="locale" @change="setLocale(($event.target as HTMLSelectElement).value)">
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>

    <div v-if="!loading" class="card" style="max-width: 480px; margin-bottom: 1rem">
      <h2 style="font-size: 1rem; margin-bottom: 0.25rem">{{ t('settings.passwordTitle') }}</h2>
      <p class="muted" style="margin-bottom: 1rem">{{ t('settings.passwordSubtitle') }}</p>
      <form @submit.prevent="submitPasswordChange">
        <div class="field">
          <label>{{ t('settings.currentPassword') }}</label>
          <input v-model="currentPassword" type="password" required />
        </div>
        <div class="field" style="margin-top: 0.75rem">
          <label>{{ t('resetPassword.newPassword') }}</label>
          <input v-model="newPassword" type="password" minlength="8" required />
        </div>
        <p v-if="passwordError" class="error-text" style="margin-top: 0.75rem">{{ passwordError }}</p>
        <button class="btn" style="margin-top: 1rem" :disabled="passwordSaving" type="submit">
          {{ t('settings.changePassword') }}
        </button>
      </form>
    </div>

    <div v-if="!loading" class="card" style="max-width: 480px">
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

