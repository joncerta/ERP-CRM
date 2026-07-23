<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getTenantSettings, updateTenantSettings, updateOrgSettings } from '@/api/tenant-settings'
import { changeOwnPassword } from '@/api/users'
import { listTaxes, createTax, updateTax } from '@/api/taxes'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { Tax } from '@/api/types'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const loading = ref(true)
const saving = ref(false)
const idleTimeoutEnabled = ref(false)
const idleTimeoutMinutes = ref(30)

const orgSaving = ref(false)
const timezone = ref('America/Bogota')

/** Pulled straight from the browser's IANA timezone database — no
 * hand-maintained list to fall out of date. Falls back to a short curated
 * list on the rare pre-2023 browser that lacks Intl.supportedValuesOf. */
const timezoneOptions = computed<string[]>(() => {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const zones = Intl.supportedValuesOf('timeZone')
      return zones.includes(timezone.value) ? zones : [timezone.value, ...zones]
    }
  } catch {
    // fall through to the static fallback below
  }
  const fallback = [
    'America/Bogota', 'America/Mexico_City', 'America/Lima', 'America/Santiago',
    'America/Buenos_Aires', 'America/Sao_Paulo', 'America/New_York', 'America/Chicago',
    'America/Los_Angeles', 'Europe/Madrid', 'Europe/London', 'UTC',
  ]
  return fallback.includes(timezone.value) ? fallback : [timezone.value, ...fallback]
})

const currentPassword = ref('')
const newPassword = ref('')
const passwordSaving = ref(false)
const passwordError = ref('')

async function submitPasswordChange() {
  passwordSaving.value = true
  passwordError.value = ''
  try {
    await changeOwnPassword(currentPassword.value, newPassword.value)
    toast.success(t('settings.passwordChangedOk'))
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
  try {
    const settings = await getTenantSettings()
    idleTimeoutEnabled.value = settings.sessionIdleTimeoutMinutes != null
    idleTimeoutMinutes.value = settings.sessionIdleTimeoutMinutes ?? 30
    timezone.value = settings.timezone
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await updateTenantSettings(idleTimeoutEnabled.value ? idleTimeoutMinutes.value : null)
    toast.success(t('settings.saved'))
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    saving.value = false
  }
}

async function saveOrgSettings() {
  orgSaving.value = true
  try {
    await updateOrgSettings({ timezone: timezone.value || undefined })
    toast.success(t('settings.saved'))
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    orgSaving.value = false
  }
}

// --- Taxes ---
const taxes = ref<Tax[]>([])
const taxesLoading = ref(true)
const showTaxModal = ref(false)
const taxSaving = ref(false)
const taxFormError = ref('')
const editingTaxId = ref<string | null>(null)
const taxForm = ref({ name: '', rate: 0, isDefault: false })

async function loadTaxes() {
  taxesLoading.value = true
  try {
    taxes.value = await listTaxes()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    taxesLoading.value = false
  }
}

function openCreateTax() {
  editingTaxId.value = null
  taxForm.value = { name: '', rate: 0, isDefault: taxes.value.length === 0 }
  taxFormError.value = ''
  showTaxModal.value = true
}
function openEditTax(tax: Tax) {
  editingTaxId.value = tax.id
  taxForm.value = { name: tax.name, rate: Number(tax.rate), isDefault: tax.isDefault }
  taxFormError.value = ''
  showTaxModal.value = true
}
async function submitTax() {
  taxSaving.value = true
  taxFormError.value = ''
  try {
    if (editingTaxId.value) {
      await updateTax(editingTaxId.value, taxForm.value)
    } else {
      await createTax(taxForm.value)
    }
    showTaxModal.value = false
    toast.success(t('common.savedOk'))
    await loadTaxes()
  } catch (err) {
    taxFormError.value = getErrorMessage(err)
  } finally {
    taxSaving.value = false
  }
}
async function toggleTaxActive(tax: Tax) {
  try {
    await updateTax(tax.id, { isActive: !tax.isActive })
    toast.success(t('common.savedOk'))
    await loadTaxes()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function setDefaultTax(tax: Tax) {
  try {
    await updateTax(tax.id, { isDefault: true })
    toast.success(t('common.savedOk'))
    await loadTaxes()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

onMounted(() => {
  load()
  loadTaxes()
})
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

      <button class="btn" style="margin-top: 1rem" :disabled="saving" @click="save">
        {{ t('common.save') }}
      </button>
    </div>

    <div v-if="!loading" class="card" style="max-width: 480px; margin-top: 1rem">
      <h2 style="font-size: 1rem; margin-bottom: 0.25rem">{{ t('settings.orgTitle') }}</h2>
      <p class="muted" style="margin-bottom: 1rem">{{ t('settings.orgSubtitle') }}</p>

      <div class="field">
        <label>{{ t('settings.timezone') }}</label>
        <select v-model="timezone">
          <option v-for="tz in timezoneOptions" :key="tz" :value="tz">{{ tz }}</option>
        </select>
      </div>

      <button class="btn" style="margin-top: 1rem" :disabled="orgSaving" @click="saveOrgSettings">
        {{ t('common.save') }}
      </button>
    </div>

    <div class="card" style="max-width: 480px; margin-top: 1rem">
      <div class="page-header" style="margin-bottom: 0.25rem">
        <h2 style="font-size: 1rem">{{ t('settings.taxesTitle') }}</h2>
        <button class="btn secondary" @click="openCreateTax">+ {{ t('settings.newTax') }}</button>
      </div>
      <p class="muted" style="margin-bottom: 1rem">{{ t('settings.taxesSubtitle') }}</p>

      <p v-if="taxesLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('settings.taxName') }}</th>
            <th>{{ t('settings.taxRate') }}</th>
            <th>{{ t('settings.taxDefault') }}</th>
            <th>{{ t('common.active') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in taxes" :key="tx.id">
            <td>{{ tx.name }}</td>
            <td>{{ Number(tx.rate) }}%</td>
            <td>
              <span v-if="tx.isDefault" class="badge green">{{ t('settings.taxDefault') }}</span>
              <button v-else type="button" class="btn secondary" @click="setDefaultTax(tx)">{{ t('settings.setAsDefault') }}</button>
            </td>
            <td>
              <span class="badge" :class="tx.isActive ? 'green' : 'red'">{{ tx.isActive ? t('common.active') : t('common.inactive') }}</span>
            </td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditTax(tx)">{{ t('common.edit') }}</button>
              <button class="btn secondary" @click="toggleTaxActive(tx)">{{ tx.isActive ? t('common.deactivate') : t('common.activate') }}</button>
            </td>
          </tr>
          <tr v-if="!taxes.length">
            <td colspan="5" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/edit tax modal -->
    <div v-if="showTaxModal" class="modal-backdrop" @click.self="showTaxModal = false">
      <form class="modal" @submit.prevent="submitTax">
        <h2>{{ editingTaxId ? t('common.edit') : t('settings.newTax') }}</h2>
        <div class="field">
          <label>{{ t('settings.taxName') }}</label>
          <input v-model="taxForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('settings.taxRate') }}</label>
          <input v-model.number="taxForm.rate" type="number" min="0" max="100" step="0.01" required />
        </div>
        <label class="checkbox-field" style="margin-top: 0.75rem">
          <input v-model="taxForm.isDefault" type="checkbox" />
          {{ t('settings.setAsDefault') }}
        </label>
        <p v-if="taxFormError" class="error-text">{{ taxFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showTaxModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="taxSaving">{{ t('common.save') }}</button>
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
  flex-wrap: wrap;
}
</style>
