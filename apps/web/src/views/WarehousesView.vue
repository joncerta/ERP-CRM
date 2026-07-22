<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '@/api/warehouses'
import { getErrorMessage } from '@/api/error'
import { compact } from '@/utils/compact'
import { useToastStore } from '@/stores/toast'
import type { Warehouse } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const warehouses = ref<Warehouse[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

const form = ref({ name: '', address: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    warehouses.value = await listWarehouses()
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingId.value = null
  form.value = { name: '', address: '' }
  formError.value = ''
  showModal.value = true
}

function openEditModal(warehouse: Warehouse) {
  editingId.value = warehouse.id
  form.value = { name: warehouse.name, address: warehouse.address ?? '' }
  formError.value = ''
  showModal.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await updateWarehouse(editingId.value, compact(form.value))
    } else {
      await createWarehouse(compact(form.value))
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

async function remove(warehouse: Warehouse) {
  if (!confirm(t('common.confirmDelete'))) return
  deletingId.value = warehouse.id
  try {
    await deleteWarehouse(warehouse.id)
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
      <h1>{{ t('warehouses.title') }}</h1>
      <button class="btn" @click="openCreateModal">+ {{ t('warehouses.newWarehouse') }}</button>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('common.name') }}</th>
          <th>{{ t('warehouses.address') }}</th>
          <th>{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="w in warehouses" :key="w.id">
          <td>{{ w.name }}</td>
          <td>{{ w.address || '—' }}</td>
          <td class="actions-cell">
            <button class="btn secondary" @click="openEditModal(w)">{{ t('common.edit') }}</button>
            <button class="btn secondary" :disabled="deletingId === w.id" @click="remove(w)">
              {{ t('common.delete') }}
            </button>
          </td>
        </tr>
        <tr v-if="!warehouses.length">
          <td colspan="3" class="muted">—</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ editingId ? t('common.edit') : t('warehouses.newWarehouse') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="form.name" required />
        </div>
        <div class="field">
          <label>{{ t('warehouses.address') }}</label>
          <input v-model="form.address" />
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
</style>
