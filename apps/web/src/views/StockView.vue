<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listStockBalancesPaginated, listStockMovementsPaginated, recordMovement, transferStock } from '@/api/stock'
import { listProducts } from '@/api/products'
import { listWarehouses } from '@/api/warehouses'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { Product, Warehouse } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const {
  items: balances,
  total: balancesTotal,
  page: balancesPage,
  totalPages: balancesTotalPages,
  loading: balancesLoading,
  error: balancesError,
  load: loadBalances,
  goToPage: goToBalancesPage,
} = usePaginatedList(listStockBalancesPaginated, { defaultSortBy: 'quantity' })

const {
  items: movements,
  total: movementsTotal,
  page: movementsPage,
  totalPages: movementsTotalPages,
  loading: movementsLoading,
  error: movementsError,
  load: loadMovements,
  goToPage: goToMovementsPage,
} = usePaginatedList(listStockMovementsPaginated, { defaultSortBy: 'createdAt' })

const products = ref<Product[]>([])
const warehouses = ref<Warehouse[]>([])

const showMovementModal = ref(false)
const movementForm = ref({
  productId: '',
  warehouseId: '',
  type: 'purchase' as 'purchase' | 'sale' | 'adjustment',
  direction: 'in' as 'in' | 'out',
  quantity: 1,
  note: '',
})
const movementSaving = ref(false)
const movementError = ref('')

const showTransferModal = ref(false)
const transferForm = ref({ productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: 1, note: '' })
const transferSaving = ref(false)
const transferError = ref('')

async function loadAll() {
  await Promise.all([loadBalances(), loadMovements()])
}

async function loadPickers() {
  try {
    const [productsData, warehousesData] = await Promise.all([listProducts(), listWarehouses()])
    products.value = productsData
    warehouses.value = warehousesData
  } catch {
    // Pickers are a convenience for the movement/transfer forms — a
    // failure here shouldn't block the stock lists themselves.
  }
}

function productName(id: string) {
  return products.value.find((p) => p.id === id)?.name ?? '—'
}
function warehouseName(id: string) {
  return warehouses.value.find((w) => w.id === id)?.name ?? '—'
}

function openMovementModal() {
  movementForm.value = { productId: '', warehouseId: '', type: 'purchase', direction: 'in', quantity: 1, note: '' }
  movementError.value = ''
  showMovementModal.value = true
}

async function submitMovement() {
  movementSaving.value = true
  movementError.value = ''
  try {
    await recordMovement({
      productId: movementForm.value.productId,
      warehouseId: movementForm.value.warehouseId,
      type: movementForm.value.type,
      quantity: movementForm.value.quantity,
      direction: movementForm.value.direction,
      note: movementForm.value.note || undefined,
    })
    showMovementModal.value = false
    toast.success(t('common.savedOk'))
    await loadAll()
  } catch (err) {
    movementError.value = getErrorMessage(err)
  } finally {
    movementSaving.value = false
  }
}

function openTransferModal() {
  transferForm.value = { productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: 1, note: '' }
  transferError.value = ''
  showTransferModal.value = true
}

async function submitTransfer() {
  transferSaving.value = true
  transferError.value = ''
  try {
    await transferStock({
      productId: transferForm.value.productId,
      fromWarehouseId: transferForm.value.fromWarehouseId,
      toWarehouseId: transferForm.value.toWarehouseId,
      quantity: transferForm.value.quantity,
      note: transferForm.value.note || undefined,
    })
    showTransferModal.value = false
    toast.success(t('common.savedOk'))
    await loadAll()
  } catch (err) {
    transferError.value = getErrorMessage(err)
  } finally {
    transferSaving.value = false
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

onMounted(() => {
  loadAll()
  loadPickers()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('stock.title') }}</h1>
      <div class="actions-cell">
        <button class="btn secondary" @click="openTransferModal">{{ t('stock.transfer') }}</button>
        <button class="btn" @click="openMovementModal">+ {{ t('stock.recordMovement') }}</button>
      </div>
    </div>

    <h2 class="section-title">{{ t('stock.balances') }}</h2>
    <p v-if="balancesLoading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="balancesError" class="error-text">{{ balancesError }}</p>
    <template v-else>
      <table>
        <thead>
          <tr>
            <th>{{ t('products.title') }}</th>
            <th>{{ t('warehouses.title') }}</th>
            <th>{{ t('stock.quantity') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in balances" :key="b.id">
            <td>{{ productName(b.productId) }}</td>
            <td>{{ warehouseName(b.warehouseId) }}</td>
            <td>{{ Number(b.quantity).toLocaleString() }}</td>
          </tr>
          <tr v-if="!balances.length">
            <td colspan="3" class="muted">—</td>
          </tr>
        </tbody>
      </table>
      <Pagination :page="balancesPage" :total-pages="balancesTotalPages" :total="balancesTotal" @go="goToBalancesPage" />
    </template>

    <h2 class="section-title">{{ t('stock.history') }}</h2>
    <p v-if="movementsLoading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="movementsError" class="error-text">{{ movementsError }}</p>
    <template v-else>
      <table>
        <thead>
          <tr>
            <th>{{ t('stock.date') }}</th>
            <th>{{ t('products.title') }}</th>
            <th>{{ t('warehouses.title') }}</th>
            <th>{{ t('stock.type') }}</th>
            <th>{{ t('stock.quantity') }}</th>
            <th>{{ t('stock.note') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in movements" :key="m.id">
            <td>{{ formatDate(m.createdAt) }}</td>
            <td>{{ productName(m.productId) }}</td>
            <td>{{ warehouseName(m.warehouseId) }}</td>
            <td>{{ t(`stock.types.${m.type}`) }}</td>
            <td :class="{ 'positive-delta': Number(m.quantityDelta) > 0, 'negative-delta': Number(m.quantityDelta) < 0 }">
              {{ Number(m.quantityDelta) > 0 ? '+' : '' }}{{ Number(m.quantityDelta).toLocaleString() }}
            </td>
            <td>{{ m.note || '—' }}</td>
          </tr>
          <tr v-if="!movements.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>
      <Pagination :page="movementsPage" :total-pages="movementsTotalPages" :total="movementsTotal" @go="goToMovementsPage" />
    </template>

    <!-- Record movement modal -->
    <div v-if="showMovementModal" class="modal-backdrop" @click.self="showMovementModal = false">
      <form class="modal" @submit.prevent="submitMovement">
        <h2>{{ t('stock.recordMovement') }}</h2>
        <div class="field">
          <label>{{ t('products.title') }}</label>
          <select v-model="movementForm.productId" required>
            <option value="" disabled>—</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.sku }} — {{ p.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('warehouses.title') }}</label>
          <select v-model="movementForm.warehouseId" required>
            <option value="" disabled>—</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('stock.type') }}</label>
          <select v-model="movementForm.type">
            <option value="purchase">{{ t('stock.types.purchase') }}</option>
            <option value="sale">{{ t('stock.types.sale') }}</option>
            <option value="adjustment">{{ t('stock.types.adjustment') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('stock.direction') }}</label>
          <select v-model="movementForm.direction">
            <option value="in">{{ t('stock.directionIn') }}</option>
            <option value="out">{{ t('stock.directionOut') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('stock.quantity') }}</label>
          <input v-model.number="movementForm.quantity" type="number" min="0.01" step="0.01" required />
        </div>
        <div class="field">
          <label>{{ t('stock.note') }}</label>
          <input v-model="movementForm.note" />
        </div>
        <p v-if="movementError" class="error-text">{{ movementError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showMovementModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="movementSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Transfer modal -->
    <div v-if="showTransferModal" class="modal-backdrop" @click.self="showTransferModal = false">
      <form class="modal" @submit.prevent="submitTransfer">
        <h2>{{ t('stock.transfer') }}</h2>
        <div class="field">
          <label>{{ t('products.title') }}</label>
          <select v-model="transferForm.productId" required>
            <option value="" disabled>—</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.sku }} — {{ p.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('stock.fromWarehouse') }}</label>
          <select v-model="transferForm.fromWarehouseId" required>
            <option value="" disabled>—</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('stock.toWarehouse') }}</label>
          <select v-model="transferForm.toWarehouseId" required>
            <option value="" disabled>—</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('stock.quantity') }}</label>
          <input v-model.number="transferForm.quantity" type="number" min="0.01" step="0.01" required />
        </div>
        <div class="field">
          <label>{{ t('stock.note') }}</label>
          <input v-model="transferForm.note" />
        </div>
        <p v-if="transferError" class="error-text">{{ transferError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showTransferModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="transferSaving">{{ t('common.save') }}</button>
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
.section-title {
  font-size: 1rem;
  margin: 1.25rem 0 0.6rem;
}
.section-title:first-of-type {
  margin-top: 0;
}
.positive-delta {
  color: var(--color-success);
  font-weight: 600;
}
.negative-delta {
  color: var(--color-danger);
  font-weight: 600;
}
</style>
