<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listRolesPaginated, createRole, updateRole, deleteRole } from '@/api/roles'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { Role } from '@/api/roles'

const { t } = useI18n()
const toast = useToastStore()

// Every permission a tenant's own role editor is allowed to grant.
// platform.tenants.manage is deliberately excluded — the backend rejects
// it too, this is just so it never even shows up as an option.
const PERMISSION_GROUPS: Array<{ labelKey: string; codes: string[] }> = [
  {
    labelKey: 'roles.groupCrm',
    codes: [
      'crm.contacts.read',
      'crm.contacts.write',
      'crm.leads.read',
      'crm.leads.write',
      'crm.opportunities.read',
      'crm.opportunities.write',
      'crm.quotes.read',
      'crm.quotes.write',
      'crm.activities.read',
      'crm.activities.write',
    ],
  },
  {
    labelKey: 'roles.groupInventory',
    codes: [
      'inventory.products.read',
      'inventory.products.write',
      'inventory.warehouses.read',
      'inventory.warehouses.write',
      'inventory.stock.read',
      'inventory.stock.write',
    ],
  },
  {
    labelKey: 'roles.groupFinance',
    codes: [
      'finance.invoices.read',
      'finance.invoices.write',
      'finance.purchases.read',
      'finance.purchases.write',
      'accounting.entries.read',
      'accounting.entries.write',
      'fixed_assets.read',
      'fixed_assets.write',
    ],
  },
  {
    labelKey: 'roles.groupCore',
    codes: [
      'core.users.read',
      'core.users.write',
      'core.roles.read',
      'core.roles.write',
      'core.modules.write',
      'core.tenant.settings.write',
      'core.audit.read',
      'core.org.read',
      'core.org.write',
      'core.taxes.read',
      'core.taxes.write',
    ],
  },
]

// vue-i18n treats "." as a key-path separator, so a permission code like
// "crm.contacts.read" can't be used as a translation key directly —
// swap dots for underscores to look it up as a flat leaf key instead.
function permissionDescriptionKey(code: string): string {
  return `roles.permDesc.${code.replace(/\./g, '_')}`
}

const { items: roles, total, page, totalPages, loading, error, search, load, applyAndReload, goToPage } =
  usePaginatedList(listRolesPaginated, { defaultSortBy: 'name' })

let searchDebounce: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(applyAndReload, 300)
}

const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

const form = ref({ name: '', permissions: [] as string[] })

function openCreateModal() {
  editingId.value = null
  form.value = { name: '', permissions: [] }
  formError.value = ''
  showModal.value = true
}

function openEditModal(role: Role) {
  editingId.value = role.id
  form.value = { name: role.name, permissions: [...role.permissions] }
  formError.value = ''
  showModal.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await updateRole(editingId.value, form.value.name, form.value.permissions)
    } else {
      await createRole(form.value.name, form.value.permissions)
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

async function remove(role: Role) {
  if (!confirm(t('common.confirmDelete'))) return
  deletingId.value = role.id
  try {
    await deleteRole(role.id)
    toast.success(t('common.deletedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    deletingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('roles.title') }}</h1>
      <button class="btn" @click="openCreateModal">+ {{ t('roles.newRole') }}</button>
    </div>
    <p class="muted" style="margin-bottom: 1rem">{{ t('roles.subtitle') }}</p>

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
            <th>{{ t('roles.permissionCount') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="role in roles" :key="role.id">
            <td>
              {{ role.name }}
              <span v-if="role.isSystem" class="badge blue" style="margin-left: 0.5rem">{{ t('roles.system') }}</span>
            </td>
            <td>{{ role.permissions.includes('*') ? t('roles.allPermissions') : role.permissions.length }}</td>
            <td class="actions-cell">
              <template v-if="!role.isSystem">
                <button class="btn secondary" @click="openEditModal(role)">{{ t('common.edit') }}</button>
                <button class="btn secondary" :disabled="deletingId === role.id" @click="remove(role)">
                  {{ t('common.delete') }}
                </button>
              </template>
            </td>
          </tr>
          <tr v-if="!roles.length">
            <td colspan="3" class="muted">—</td>
          </tr>
        </tbody>
      </table>
      <Pagination :page="page" :total-pages="totalPages" :total="total" @go="goToPage" />
    </template>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ editingId ? t('common.edit') : t('roles.newRole') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="form.name" required />
        </div>
        <div class="field">
          <label>{{ t('roles.permissions') }}</label>
          <div v-for="group in PERMISSION_GROUPS" :key="group.labelKey" class="permission-group">
            <div class="permission-group-label">{{ t(group.labelKey) }}</div>
            <label v-for="code in group.codes" :key="code" class="checkbox-field permission-item">
              <input v-model="form.permissions" type="checkbox" :value="code" />
              <span>
                {{ t(permissionDescriptionKey(code)) }}
                <code class="permission-code">{{ code }}</code>
              </span>
            </label>
          </div>
        </div>
        <p v-if="formError" class="error-text">{{ formError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showModal = false">{{ t('common.cancel') }}</button>
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
.permission-group {
  margin-bottom: 0.75rem;
}
.permission-group-label {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted);
  margin-bottom: 0.35rem;
}
.permission-item {
  padding: 0.25rem 0;
  align-items: flex-start;
}
.permission-item span {
  font-size: 0.85rem;
  line-height: 1.4;
}
.permission-code {
  display: block;
  font-size: 0.72rem;
  color: var(--color-text-muted);
}
</style>
