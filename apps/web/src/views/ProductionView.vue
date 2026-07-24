<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listBoms,
  createBom,
  updateBom,
  listProductionOrders,
  createProductionOrder,
  startProductionOrder,
  completeProductionOrder,
  cancelProductionOrder,
  listOrderConsumptions,
  type CreateBomPayload,
  type CreateProductionOrderPayload,
} from '@/api/production'
import { listProducts } from '@/api/products'
import { listWarehouses } from '@/api/warehouses'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { BillOfMaterial, BomLine, Product, Warehouse, ProductionOrder, ProductionOrderConsumption } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const products = ref<Product[]>([])
const warehouses = ref<Warehouse[]>([])
async function loadPickers() {
  try {
    const [productList, warehouseList] = await Promise.all([listProducts(), listWarehouses()])
    products.value = productList
    warehouses.value = warehouseList
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
function productLabel(id: string): string {
  const p = products.value.find((p) => p.id === id)
  return p ? `${p.name} (${p.sku})` : '—'
}
function warehouseName(id: string): string {
  return warehouses.value.find((w) => w.id === id)?.name ?? '—'
}

type Tab = 'boms' | 'orders'
const activeTab = ref<Tab>('boms')

// --- BOM ---
const boms = ref<BillOfMaterial[]>([])
const bomsLoading = ref(true)
async function loadBoms() {
  bomsLoading.value = true
  try {
    boms.value = await listBoms()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    bomsLoading.value = false
  }
}

const showBomModal = ref(false)
const editingBom = ref<BillOfMaterial | null>(null)
const bomSaving = ref(false)
const bomFormError = ref('')
const bomForm = ref<{ productId: string; name: string; outputQuantity: number; notes: string; lines: BomLine[] }>({
  productId: '',
  name: '',
  outputQuantity: 1,
  notes: '',
  lines: [{ componentProductId: '', quantity: 1 }],
})

function openCreateBom() {
  editingBom.value = null
  bomForm.value = { productId: '', name: '', outputQuantity: 1, notes: '', lines: [{ componentProductId: '', quantity: 1 }] }
  bomFormError.value = ''
  showBomModal.value = true
}
function openEditBom(bom: BillOfMaterial) {
  editingBom.value = bom
  bomForm.value = {
    productId: bom.productId,
    name: bom.name,
    outputQuantity: bom.outputQuantity,
    notes: bom.notes ?? '',
    lines: bom.lines.map((l) => ({ componentProductId: l.componentProductId, quantity: l.quantity })),
  }
  bomFormError.value = ''
  showBomModal.value = true
}
function addBomLine() {
  bomForm.value.lines.push({ componentProductId: '', quantity: 1 })
}
function removeBomLine(index: number) {
  bomForm.value.lines.splice(index, 1)
}
async function submitBom() {
  bomSaving.value = true
  bomFormError.value = ''
  try {
    if (editingBom.value) {
      await updateBom(editingBom.value.id, {
        name: bomForm.value.name,
        notes: bomForm.value.notes,
        lines: bomForm.value.lines,
      })
    } else {
      const payload: CreateBomPayload = { ...bomForm.value }
      await createBom(payload)
    }
    showBomModal.value = false
    toast.success(t('common.savedOk'))
    await loadBoms()
  } catch (err) {
    bomFormError.value = getErrorMessage(err)
  } finally {
    bomSaving.value = false
  }
}

// --- Órdenes de producción ---
const orders = ref<ProductionOrder[]>([])
const ordersLoading = ref(true)
async function loadOrders() {
  ordersLoading.value = true
  try {
    orders.value = await listProductionOrders()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    ordersLoading.value = false
  }
}

const showOrderModal = ref(false)
const orderSaving = ref(false)
const orderFormError = ref('')
const orderForm = ref<CreateProductionOrderPayload>({ productId: '', bomId: '', warehouseId: '', quantityPlanned: 1 })
const bomsForSelectedProduct = computed(() => boms.value.filter((b) => b.productId === orderForm.value.productId && b.isActive))
watch(
  () => orderForm.value.productId,
  () => {
    orderForm.value.bomId = ''
  },
)

function openCreateOrder() {
  orderForm.value = { productId: '', bomId: '', warehouseId: '', quantityPlanned: 1 }
  orderFormError.value = ''
  showOrderModal.value = true
  if (!boms.value.length) loadBoms()
}
async function submitOrder() {
  orderSaving.value = true
  orderFormError.value = ''
  try {
    await createProductionOrder(orderForm.value)
    showOrderModal.value = false
    toast.success(t('common.savedOk'))
    await loadOrders()
  } catch (err) {
    orderFormError.value = getErrorMessage(err)
  } finally {
    orderSaving.value = false
  }
}

async function handleStart(order: ProductionOrder) {
  try {
    await startProductionOrder(order.id)
    toast.success(t('common.savedOk'))
    await loadOrders()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function handleCancel(order: ProductionOrder) {
  try {
    await cancelProductionOrder(order.id)
    toast.success(t('common.savedOk'))
    await loadOrders()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

const showCompleteModal = ref(false)
const completingOrder = ref<ProductionOrder | null>(null)
const completeSaving = ref(false)
const completeFormError = ref('')
const completeQuantity = ref(0)
function openCompleteModal(order: ProductionOrder) {
  completingOrder.value = order
  completeQuantity.value = Number(order.quantityPlanned)
  completeFormError.value = ''
  showCompleteModal.value = true
}
async function submitComplete() {
  if (!completingOrder.value) return
  completeSaving.value = true
  completeFormError.value = ''
  try {
    await completeProductionOrder(completingOrder.value.id, completeQuantity.value)
    showCompleteModal.value = false
    toast.success(t('common.savedOk'))
    await loadOrders()
  } catch (err) {
    completeFormError.value = getErrorMessage(err)
  } finally {
    completeSaving.value = false
  }
}

const viewingOrder = ref<ProductionOrder | null>(null)
const consumptions = ref<ProductionOrderConsumption[]>([])
async function viewConsumptions(order: ProductionOrder) {
  viewingOrder.value = order
  try {
    consumptions.value = await listOrderConsumptions(order.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'orders' && !orders.value.length) loadOrders()
}

onMounted(async () => {
  await loadPickers()
  await loadBoms()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('production.title') }}</h1>
      <button v-if="activeTab === 'boms'" class="btn" @click="openCreateBom">+ {{ t('production.newBom') }}</button>
      <button v-else class="btn" @click="openCreateOrder">+ {{ t('production.newOrder') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'boms' }" @click="switchTab('boms')">{{ t('production.tabBoms') }}</button>
      <button class="tab" :class="{ active: activeTab === 'orders' }" @click="switchTab('orders')">{{ t('production.tabOrders') }}</button>
    </div>

    <!-- BOM -->
    <template v-if="activeTab === 'boms'">
      <p v-if="bomsLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('production.bomName') }}</th>
            <th>{{ t('production.product') }}</th>
            <th>{{ t('production.outputQuantity') }}</th>
            <th>{{ t('production.lines') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in boms" :key="b.id">
            <td>{{ b.name }}</td>
            <td>{{ productLabel(b.productId) }}</td>
            <td>{{ b.outputQuantity }}</td>
            <td>{{ b.lines.length }}</td>
            <td><span class="badge" :class="b.isActive ? 'green' : ''">{{ b.isActive ? t('marketing.active') : t('marketing.inactive') }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditBom(b)">{{ t('common.edit') }}</button>
            </td>
          </tr>
          <tr v-if="!boms.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Órdenes de producción -->
    <template v-else>
      <p v-if="ordersLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('production.orderNumber') }}</th>
            <th>{{ t('production.product') }}</th>
            <th>{{ t('production.warehouse') }}</th>
            <th>{{ t('production.quantityPlanned') }}</th>
            <th>{{ t('production.quantityProduced') }}</th>
            <th>Estado</th>
            <th>{{ t('production.totalCost') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td>{{ o.orderNumber }}</td>
            <td>{{ productLabel(o.productId) }}</td>
            <td>{{ warehouseName(o.warehouseId) }}</td>
            <td>{{ o.quantityPlanned }}</td>
            <td>{{ o.quantityProduced }}</td>
            <td><span class="badge" :class="{ green: o.status === 'completed', red: o.status === 'cancelled' }">{{ t(`production.orderStatus_${o.status}`) }}</span></td>
            <td>{{ Number(o.totalCost).toLocaleString() }}</td>
            <td class="actions-cell">
              <button v-if="o.status === 'draft'" class="btn secondary" @click="handleStart(o)">{{ t('production.start') }}</button>
              <button v-if="o.status === 'draft'" class="btn secondary" @click="handleCancel(o)">{{ t('common.cancel') }}</button>
              <button v-if="o.status === 'in_progress'" class="btn secondary" @click="openCompleteModal(o)">{{ t('production.complete') }}</button>
              <button v-if="o.status !== 'draft'" class="btn secondary" @click="viewConsumptions(o)">{{ t('production.viewConsumptions') }}</button>
            </td>
          </tr>
          <tr v-if="!orders.length">
            <td colspan="8" class="muted">—</td>
          </tr>
        </tbody>
      </table>

      <div v-if="viewingOrder" style="margin-top: 1.5rem">
        <h3>{{ t('production.viewConsumptions') }} — {{ viewingOrder.orderNumber }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ t('production.component') }}</th>
              <th>{{ t('production.quantityConsumed') }}</th>
              <th>{{ t('production.unitCost') }}</th>
              <th>{{ t('production.totalCost') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in consumptions" :key="c.id">
              <td>{{ productLabel(c.componentProductId) }}</td>
              <td>{{ c.quantityConsumed }}</td>
              <td>{{ Number(c.unitCost).toLocaleString() }}</td>
              <td>{{ Number(c.totalCost).toLocaleString() }}</td>
            </tr>
            <tr v-if="!consumptions.length">
              <td colspan="4" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Crear/editar BOM -->
    <div v-if="showBomModal" class="modal-backdrop" @click.self="showBomModal = false">
      <form class="modal" @submit.prevent="submitBom">
        <h2>{{ editingBom ? t('common.edit') : t('production.newBom') }}</h2>
        <div v-if="!editingBom" class="field">
          <label>{{ t('production.product') }}</label>
          <select v-model="bomForm.productId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('production.bomName') }}</label>
          <input v-model="bomForm.name" required />
        </div>
        <div v-if="!editingBom" class="field">
          <label>{{ t('production.outputQuantity') }}</label>
          <input v-model.number="bomForm.outputQuantity" type="number" min="0.01" step="0.01" required />
        </div>
        <div class="field">
          <label>{{ t('projects.description') }}</label>
          <textarea v-model="bomForm.notes" rows="2"></textarea>
        </div>

        <label class="section-label">{{ t('production.lines') }}</label>
        <div v-for="(line, i) in bomForm.lines" :key="i" class="scored-row">
          <select v-model="line.componentProductId" required>
            <option value="" disabled>{{ t('production.component') }}</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
          </select>
          <input v-model.number="line.quantity" type="number" min="0.0001" step="0.0001" required />
          <button type="button" class="btn secondary" @click="removeBomLine(i)">✕</button>
        </div>
        <button type="button" class="btn secondary" @click="addBomLine">+ {{ t('hr.addItem') }}</button>

        <p v-if="bomFormError" class="error-text">{{ bomFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showBomModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="bomSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Nueva orden de producción -->
    <div v-if="showOrderModal" class="modal-backdrop" @click.self="showOrderModal = false">
      <form class="modal" @submit.prevent="submitOrder">
        <h2>{{ t('production.newOrder') }}</h2>
        <div class="field">
          <label>{{ t('production.product') }}</label>
          <select v-model="orderForm.productId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('production.bom') }}</label>
          <select v-model="orderForm.bomId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="b in bomsForSelectedProduct" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('production.warehouse') }}</label>
          <select v-model="orderForm.warehouseId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('production.quantityPlanned') }}</label>
          <input v-model.number="orderForm.quantityPlanned" type="number" min="0.01" step="0.01" required />
        </div>
        <div class="field">
          <label>{{ t('hr.hireDate') }} ({{ t('projects.plannedEndDate') }})</label>
          <input v-model="orderForm.plannedStartDate" type="date" />
          <input v-model="orderForm.plannedEndDate" type="date" style="margin-top: 0.4rem" />
        </div>
        <p v-if="orderFormError" class="error-text">{{ orderFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showOrderModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="orderSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Completar orden -->
    <div v-if="showCompleteModal" class="modal-backdrop" @click.self="showCompleteModal = false">
      <form class="modal" @submit.prevent="submitComplete">
        <h2>{{ t('production.complete') }}</h2>
        <p class="muted">{{ completingOrder?.orderNumber }}</p>
        <div class="field">
          <label>{{ t('production.quantityProduced') }}</label>
          <input v-model.number="completeQuantity" type="number" min="0.01" step="0.01" required />
        </div>
        <p v-if="completeFormError" class="error-text">{{ completeFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showCompleteModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="completeSaving">{{ t('common.save') }}</button>
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
.tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}
.tab {
  background: none;
  border: none;
  padding: 0.4rem 0.7rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
}
.tab:hover {
  background: var(--color-bg-subtle);
}
.tab.active {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
  font-weight: 600;
}
.section-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0.75rem 0 0.4rem;
}
.scored-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}
.scored-row select {
  flex: 1;
}
.scored-row input {
  width: 6rem;
}
</style>
