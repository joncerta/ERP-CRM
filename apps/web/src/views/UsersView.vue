<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listUsers, createUser, setUserActive } from '@/api/users'
import { listRoles } from '@/api/roles'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/api/error'
import { compact } from '@/utils/compact'
import { useToastStore } from '@/stores/toast'
import type { TenantUser } from '@/api/users'
import type { Role } from '@/api/roles'

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()

const users = ref<TenantUser[]>([])
const roles = ref<Role[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const togglingId = ref<string | null>(null)

const form = ref({ email: '', password: '', fullName: '', roleId: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [usersData, rolesData] = await Promise.all([listUsers(), listRoles()])
    users.value = usersData
    roles.value = rolesData
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function openModal() {
  form.value = { email: '', password: '', fullName: '', roleId: roles.value[0]?.id ?? '' }
  formError.value = ''
  showModal.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    await createUser(compact(form.value) as typeof form.value)
    showModal.value = false
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function toggleActive(user: TenantUser) {
  togglingId.value = user.id
  try {
    await setUserActive(user.id, !user.isActive)
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    togglingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('users.title') }}</h1>
      <button class="btn" @click="openModal">+ {{ t('users.invite') }}</button>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('users.fullName') }}</th>
          <th>{{ t('common.email') }}</th>
          <th>{{ t('users.role') }}</th>
          <th>{{ t('users.status') }}</th>
          <th>{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.fullName }}</td>
          <td>{{ u.email }}</td>
          <td>{{ u.role?.name }}</td>
          <td><span class="badge" :class="u.isActive ? 'green' : 'red'">{{ u.isActive ? t('common.active') : t('common.inactive') }}</span></td>
          <td>
            <button
              v-if="u.id !== auth.user?.sub"
              class="btn secondary"
              :disabled="togglingId === u.id"
              @click="toggleActive(u)"
            >
              {{ u.isActive ? t('common.deactivate') : t('common.activate') }}
            </button>
          </td>
        </tr>
        <tr v-if="!users.length">
          <td colspan="5" class="muted">—</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ t('users.invite') }}</h2>
        <div class="field">
          <label>{{ t('users.fullName') }}</label>
          <input v-model="form.fullName" required />
        </div>
        <div class="field">
          <label>{{ t('common.email') }}</label>
          <input v-model="form.email" type="email" required />
        </div>
        <div class="field">
          <label>{{ t('users.password') }}</label>
          <input v-model="form.password" type="password" minlength="8" required />
        </div>
        <div class="field">
          <label>{{ t('users.role') }}</label>
          <select v-model="form.roleId" required>
            <option value="" disabled>—</option>
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
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
