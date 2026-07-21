<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listTenants, getTenantModules, setTenantModule } from '@/api/platform'
import { getErrorMessage } from '@/api/error'
import type { PlatformTenant, TenantModuleStatus } from '@/api/platform'

const { t } = useI18n()

const tenants = ref<PlatformTenant[]>([])
const loading = ref(true)
const error = ref('')
const expandedId = ref<string | null>(null)
const modulesByTenant = ref<Record<string, TenantModuleStatus[]>>({})
const togglingCode = ref<string | null>(null)

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
</style>
