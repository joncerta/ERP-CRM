<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listProducts, createProduct, updateProduct, deleteProduct } from '@/api/products'
import { getErrorMessage } from '@/api/error'
import { compact } from '@/utils/compact'
import { useToastStore } from '@/stores/toast'
import type { Product } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const products = ref<Product[]>([])
const loading = ref(true)
const error = ref('')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const searchQuery = ref('')

const form = ref({
  sku: '',
  name: '',
  unit: 'unidad',
  category: '',
  costPrice: 0,
  salePrice: 0,
  minStock: undefined as number | undefined,
})

const visibleProducts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return products.value
  return products.value.filter((p) => `${p.sku} ${p.name}`.toLowerCase().includes(query))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    products.value = await listProducts()
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingId.value = null
  form.value = { sku: '', name: '', unit: 'unidad', category: '', costPrice: 0, salePrice: 0, minStock: undefined }
  formError.value = ''
  showModal.value = true
}

function openEditModal(product: Product) {
  editingId.value = product.id
  form.value = {
    sku: product.sku,
    name: product.name,
    unit: product.unit,
    category: product.category ?? '',
    costPrice: Number(product.costPrice),
    salePrice: Number(product.salePrice),
    minStock: product.minStock != null ? Number(product.minStock) : undefined,
  }
  formError.value = ''
  showModal.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await updateProduct(editingId.value, compact(form.value))
    } else {
      await createProduct(compact(form.value))
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

async function remove(product: Product) {
  if (!confirm(t('common.confirmDelete'))) return
  deletingId.value = product.id
  try {
    await deleteProduct(product.id)
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
      <h1>{{ t('products.title') }}</h1>
      <button class="btn" @click="openCreateModal">+ {{ t('products.newProduct') }}</button>
    </div>

    <div class="list-filters">
      <input v-model="searchQuery" type="text" class="search-input" :placeholder="t('common.search')" />
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>SKU</th>
          <th>{{ t('common.name') }}</th>
          <th>{{ t('products.unit') }}</th>
          <th>{{ t('products.costPrice') }}</th>
          <th>{{ t('products.salePrice') }}</th>
          <th>{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in visibleProducts" :key="p.id">
          <td><code>{{ p.sku }}</code></td>
          <td>{{ p.name }}</td>
          <td>{{ p.unit }}</td>
          <td>{{ Number(p.costPrice).toLocaleString() }}</td>
          <td>{{ Number(p.salePrice).toLocaleString() }}</td>
          <td class="actions-cell">
            <button class="btn secondary" @click="openEditModal(p)">{{ t('common.edit') }}</button>
            <button class="btn secondary" :disabled="deletingId === p.id" @click="remove(p)">
              {{ t('common.delete') }}
            </button>
          </td>
        </tr>
        <tr v-if="!visibleProducts.length">
          <td colspan="6" class="muted">—</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ editingId ? t('common.edit') : t('products.newProduct') }}</h2>
        <div class="field">
          <label>SKU</label>
          <input v-model="form.sku" required />
        </div>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="form.name" required />
        </div>
        <div class="field">
          <label>{{ t('products.unit') }}</label>
          <input v-model="form.unit" placeholder="unidad, kg, litro..." />
        </div>
        <div class="field">
          <label>{{ t('products.category') }}</label>
          <input v-model="form.category" />
        </div>
        <div class="field">
          <label>{{ t('products.costPrice') }}</label>
          <input v-model.number="form.costPrice" type="number" min="0" step="0.01" />
        </div>
        <div class="field">
          <label>{{ t('products.salePrice') }}</label>
          <input v-model.number="form.salePrice" type="number" min="0" step="0.01" />
        </div>
        <div class="field">
          <label>{{ t('products.minStock') }}</label>
          <input v-model.number="form.minStock" type="number" min="0" step="0.01" />
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
