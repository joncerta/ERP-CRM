<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listProductsPaginated, createProduct, updateProduct, deleteProduct } from '@/api/products'
import { listCategories, listUnits } from '@/api/product-catalog'
import { listWarehouses } from '@/api/warehouses'
import { getErrorMessage } from '@/api/error'
import { compact } from '@/utils/compact'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { Product, ProductCategory, ProductUnit, Warehouse } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const { items: products, total, page, totalPages, loading, error, search, load, applyAndReload, goToPage } =
  usePaginatedList(listProductsPaginated, { defaultSortBy: 'name' })

let searchDebounce: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(applyAndReload, 300)
}

const categories = ref<ProductCategory[]>([])
const units = ref<ProductUnit[]>([])
const warehouses = ref<Warehouse[]>([])
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

const form = ref({
  sku: '',
  name: '',
  unitId: '',
  categoryId: '',
  warehouseId: '',
  costPrice: 0,
  salePrice: 0,
  minStock: undefined as number | undefined,
})

function unitName(id: string) {
  return units.value.find((u) => u.id === id)?.name ?? '—'
}

function warehouseName(id: string) {
  return warehouses.value.find((w) => w.id === id)?.name ?? '—'
}

async function loadPickers() {
  try {
    const [categoriesData, unitsData, warehousesData] = await Promise.all([listCategories(), listUnits(), listWarehouses()])
    categories.value = categoriesData
    units.value = unitsData
    warehouses.value = warehousesData
  } catch {
    // Pickers are a convenience for the create/edit form — a failure here
    // shouldn't block the products list itself.
  }
}

function openCreateModal() {
  editingId.value = null
  form.value = {
    sku: '',
    name: '',
    unitId: units.value[0]?.id ?? '',
    categoryId: '',
    warehouseId: warehouses.value[0]?.id ?? '',
    costPrice: 0,
    salePrice: 0,
    minStock: undefined,
  }
  formError.value = ''
  showModal.value = true
}

function openEditModal(product: Product) {
  editingId.value = product.id
  form.value = {
    sku: product.sku,
    name: product.name,
    unitId: product.unitId,
    categoryId: product.categoryId ?? '',
    warehouseId: product.warehouseId,
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

onMounted(() => {
  load()
  loadPickers()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('products.title') }}</h1>
      <button class="btn" @click="openCreateModal">+ {{ t('products.newProduct') }}</button>
    </div>

    <div class="list-filters">
      <input v-model="search" type="text" class="search-input" :placeholder="t('common.search')" @input="onSearchInput" />
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <template v-else>
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>{{ t('common.name') }}</th>
            <th>{{ t('products.unit') }}</th>
            <th>{{ t('warehouses.title') }}</th>
            <th>{{ t('products.costPrice') }}</th>
            <th>{{ t('products.salePrice') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td><code>{{ p.sku }}</code></td>
            <td>{{ p.name }}</td>
            <td>{{ unitName(p.unitId) }}</td>
            <td>{{ warehouseName(p.warehouseId) }}</td>
            <td>{{ Number(p.costPrice).toLocaleString() }}</td>
            <td>{{ Number(p.salePrice).toLocaleString() }}</td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditModal(p)">{{ t('common.edit') }}</button>
              <button class="btn secondary" :disabled="deletingId === p.id" @click="remove(p)">
                {{ t('common.delete') }}
              </button>
            </td>
          </tr>
          <tr v-if="!products.length">
            <td colspan="7" class="muted">—</td>
          </tr>
        </tbody>
      </table>
      <Pagination :page="page" :total-pages="totalPages" :total="total" @go="goToPage" />
    </template>

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
          <select v-model="form.unitId" required>
            <option value="" disabled>—</option>
            <option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('products.category') }}</label>
          <select v-model="form.categoryId">
            <option value="">—</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('warehouses.title') }}</label>
          <select v-model="form.warehouseId" required>
            <option value="" disabled>—</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
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
