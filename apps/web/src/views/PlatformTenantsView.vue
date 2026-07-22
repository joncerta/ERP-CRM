<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listTenants, getTenantModules, setTenantModule, updateTenantBranding } from '@/api/platform'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { PlatformTenant, TenantModuleStatus } from '@/api/platform'

const { t } = useI18n()
const toast = useToastStore()

const DEFAULT_PRIMARY = '#c1673f'
const DEFAULT_SECONDARY = '#4a2f22'
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
// Raw file size cap — base64 inflates by ~33%, so this stays comfortably
// under the backend's ~500,000-char data URI limit.
const MAX_LOGO_FILE_BYTES = 350 * 1024

const tenants = ref<PlatformTenant[]>([])
const loading = ref(true)
const error = ref('')
const expandedId = ref<string | null>(null)
const modulesByTenant = ref<Record<string, TenantModuleStatus[]>>({})
const togglingCode = ref<string | null>(null)
const savingBranding = ref<string | null>(null)

interface BrandingDraft {
  useCustom: boolean
  primaryColor: string
  secondaryColor: string
  logoData: string | null
}

const brandingDrafts = reactive<Record<string, BrandingDraft>>({})

function draftFor(tenant: PlatformTenant): BrandingDraft {
  let draft = brandingDrafts[tenant.id]
  if (!draft) {
    draft = {
      useCustom: !!tenant.brandingPrimaryColor,
      primaryColor: tenant.brandingPrimaryColor ?? DEFAULT_PRIMARY,
      secondaryColor: tenant.brandingSecondaryColor ?? DEFAULT_SECONDARY,
      logoData: tenant.brandingLogoData ?? null,
    }
    brandingDrafts[tenant.id] = draft
  }
  return draft
}

function handleLogoUpload(tenant: PlatformTenant, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    toast.error(t('platform.logoInvalidType'))
    return
  }
  if (file.size > MAX_LOGO_FILE_BYTES) {
    toast.error(t('platform.logoTooLarge'))
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    draftFor(tenant).logoData = reader.result as string
  }
  reader.onerror = () => toast.error(t('platform.logoInvalidType'))
  reader.readAsDataURL(file)
}

function clearLogo(tenant: PlatformTenant) {
  draftFor(tenant).logoData = null
}

async function saveBranding(tenant: PlatformTenant) {
  const draft = draftFor(tenant)
  savingBranding.value = tenant.id
  try {
    const updated = await updateTenantBranding(
      tenant.id,
      draft.useCustom ? draft.primaryColor : null,
      draft.useCustom ? draft.secondaryColor : null,
      draft.logoData,
    )
    const index = tenants.value.findIndex((t2) => t2.id === tenant.id)
    if (index !== -1) tenants.value[index] = updated
    draft.useCustom = !!updated.brandingPrimaryColor
    draft.logoData = updated.brandingLogoData ?? null
    toast.success(t('common.savedOk'))
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    savingBranding.value = null
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    tenants.value = await listTenants()
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function toggleExpand(tenant: PlatformTenant) {
  if (expandedId.value === tenant.id) {
    expandedId.value = null
    return
  }
  expandedId.value = tenant.id
  draftFor(tenant)
  if (!modulesByTenant.value[tenant.id]) {
    modulesByTenant.value[tenant.id] = await getTenantModules(tenant.id)
  }
}

async function toggleModule(tenant: PlatformTenant, mod: TenantModuleStatus) {
  if (mod.isCore) return
  togglingCode.value = mod.code
  try {
    await setTenantModule(tenant.id, mod.code, !mod.isEnabled)
    modulesByTenant.value[tenant.id] = await getTenantModules(tenant.id)
    toast.success(t('common.savedOk'))
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    togglingCode.value = null
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('platform.title') }}</h1>
    </div>
    <p class="muted" style="margin-bottom: 1rem">{{ t('platform.subtitle') }}</p>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('common.name') }}</th>
          <th>Slug</th>
          <th>{{ t('platform.currency') }}</th>
          <th>{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="tenant in tenants" :key="tenant.id">
          <tr>
            <td>{{ tenant.name }}</td>
            <td><code>{{ tenant.slug }}</code></td>
            <td>{{ tenant.defaultCurrencyCode }}</td>
            <td>
              <button class="btn secondary" @click="toggleExpand(tenant)">
                {{ expandedId === tenant.id ? t('platform.hideModules') : t('platform.manageModules') }}
              </button>
            </td>
          </tr>
          <tr v-if="expandedId === tenant.id">
            <td colspan="4">
              <div v-if="!modulesByTenant[tenant.id]" class="muted">{{ t('common.loading') }}</div>
              <div v-else class="modules-list">
                <div v-for="mod in modulesByTenant[tenant.id]" :key="mod.code" class="module-row">
                  <div>
                    <strong>{{ mod.name }}</strong>
                    <span v-if="mod.isCore" class="badge blue" style="margin-left: 0.5rem">{{ t('platform.core') }}</span>
                    <div class="muted">{{ mod.description }}</div>
                  </div>
                  <button
                    class="btn"
                    :class="{ secondary: mod.isEnabled }"
                    :disabled="mod.isCore || togglingCode === mod.code"
                    @click="toggleModule(tenant, mod)"
                  >
                    {{ mod.isEnabled ? t('platform.disable') : t('platform.enable') }}
                  </button>
                </div>
              </div>

              <div class="branding-section">
                <h3 class="branding-title">{{ t('platform.branding') }}</h3>
                <label class="checkbox-field">
                  <input v-model="draftFor(tenant).useCustom" type="checkbox" />
                  {{ t('platform.brandingUseCustom') }}
                </label>
                <div v-if="draftFor(tenant).useCustom" class="branding-colors">
                  <label class="color-field">
                    {{ t('platform.brandingPrimary') }}
                    <input v-model="draftFor(tenant).primaryColor" type="color" />
                  </label>
                  <label class="color-field">
                    {{ t('platform.brandingSecondary') }}
                    <input v-model="draftFor(tenant).secondaryColor" type="color" />
                  </label>
                </div>

                <div class="logo-field">
                  <span class="logo-label">{{ t('platform.logo') }}</span>
                  <div class="logo-row">
                    <img v-if="draftFor(tenant).logoData" :src="draftFor(tenant).logoData!" alt="" class="logo-preview" />
                    <div v-else class="logo-preview logo-preview-empty">{{ t('platform.logoNone') }}</div>
                    <div class="logo-actions">
                      <label class="btn secondary logo-upload-btn">
                        {{ t('platform.logoUpload') }}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          class="logo-file-input"
                          @change="handleLogoUpload(tenant, $event)"
                        />
                      </label>
                      <button
                        v-if="draftFor(tenant).logoData"
                        type="button"
                        class="btn secondary"
                        @click="clearLogo(tenant)"
                      >
                        {{ t('platform.logoRemove') }}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  class="btn"
                  style="margin-top: 0.6rem"
                  :disabled="savingBranding === tenant.id"
                  @click="saveBranding(tenant)"
                >
                  {{ t('common.save') }}
                </button>
              </div>
            </td>
          </tr>
        </template>
        <tr v-if="!tenants.length">
          <td colspan="4" class="muted">—</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.modules-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 0.25rem;
}
.module-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.branding-section {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--color-border-subtle);
}
.branding-title {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}
.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}
.branding-colors {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.6rem;
}
.color-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}
.color-field input[type='color'] {
  width: 40px;
  height: 30px;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
}
.logo-field {
  margin-top: 0.75rem;
}
.logo-label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
}
.logo-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.logo-preview {
  width: 64px;
  height: 64px;
  object-fit: contain;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  padding: 4px;
}
.logo-preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 4px;
}
.logo-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.logo-upload-btn {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  text-align: center;
}
.logo-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
}
</style>
