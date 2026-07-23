<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listSuppliersPaginated,
  createSupplier,
  updateSupplier,
  listPurchaseOrdersPaginated,
  getPurchaseOrder,
  createPurchaseOrder,
  sendPurchaseOrder,
  cancelPurchaseOrder,
  receivePurchaseOrder,
  listSupplierInvoicesPaginated,
  getSupplierInvoice,
  createSupplierInvoice,
  cancelSupplierInvoice,
  addSupplierPayment,
  listSupplierPayments,
  type PurchaseOrderItemInput,
} from '@/api/purchases'
import { listWarehouses } from '@/api/warehouses'
import { listProducts } from '@/api/products'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { Supplier, PurchaseOrder, SupplierInvoice, SupplierPayment, Warehouse, Product } from '@/api/types'

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()

type Tab = 'suppliers' | 'orders' | 'supplierInvoices'
const activeTab = ref<Tab>('orders')

const warehouses = ref<Warehouse[]>([])
const products = ref<Product[]>([])
const suppliersAll = ref<Supplier[]>([])

async function loadPickers() {
  try {
    const [warehousesData, productsData, suppliersData] = await Promise.all([
      listWarehouses(),
      listProducts(),
      listSuppliersPaginated({ page: 1, pageSize: 200 }),
    ])
    warehouses.value = warehousesData
    products.value = productsData
    suppliersAll.value = suppliersData.items
  } catch {
    // Pickers are a convenience for the create forms — a failure here
    // shouldn't block the lists themselves.
  }
}

function supplierName(id: string) {
  return suppliersAll.value.find((s) => s.id === id)?.name ?? '—'
}
function productName(id: string | null) {
  if (!id) return '—'
  return products.value.find((p) => p.id === id)?.name ?? '—'
}

// --- Suppliers tab ---
const {
  items: suppliers,
  total: suppliersTotal,
  page: suppliersPage,
  totalPages: suppliersTotalPages,
  loading: suppliersLoading,
  error: suppliersError,
  search: suppliersSearch,
  load: loadSuppliers,
  applyAndReload: applyAndReloadSuppliers,
  goToPage: goToSuppliersPage,
} = usePaginatedList<Supplier>(listSuppliersPaginated, { defaultSortBy: 'name' })

let supplierSearchDebounce: ReturnType<typeof setTimeout> | undefined
function onSupplierSearchInput() {
  clearTimeout(supplierSearchDebounce)
  supplierSearchDebounce = setTimeout(applyAndReloadSuppliers, 300)
}

const showSupplierModal = ref(false)
const supplierSaving = ref(false)
const supplierFormError = ref('')
const editingSupplierId = ref<string | null>(null)
const supplierForm = ref({ name: '', taxId: '', email: '', phone: '', address: '' })

function openCreateSupplier() {
  editingSupplierId.value = null
  supplierForm.value = { name: '', taxId: '', email: '', phone: '', address: '' }
  supplierFormError.value = ''
  showSupplierModal.value = true
}
function openEditSupplier(supplier: Supplier) {
  editingSupplierId.value = supplier.id
  supplierForm.value = {
    name: supplier.name,
    taxId: supplier.taxId ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    address: supplier.address ?? '',
  }
  supplierFormError.value = ''
  showSupplierModal.value = true
}

async function submitSupplier() {
  supplierSaving.value = true
  supplierFormError.value = ''
  try {
    const payload = {
      name: supplierForm.value.name,
      taxId: supplierForm.value.taxId || undefined,
      email: supplierForm.value.email || undefined,
      phone: supplierForm.value.phone || undefined,
      address: supplierForm.value.address || undefined,
    }
    if (editingSupplierId.value) {
      await updateSupplier(editingSupplierId.value, payload)
    } else {
      await createSupplier(payload)
    }
    showSupplierModal.value = false
    toast.success(t('common.savedOk'))
    await loadSuppliers()
    await loadPickers()
  } catch (err) {
    supplierFormError.value = getErrorMessage(err)
  } finally {
    supplierSaving.value = false
  }
}

async function toggleSupplierActive(supplier: Supplier) {
  try {
    await updateSupplier(supplier.id, { isActive: !supplier.isActive })
    toast.success(t('common.savedOk'))
    await loadSuppliers()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Purchase orders tab ---
const {
  items: orders,
  total: ordersTotal,
  page: ordersPage,
  totalPages: ordersTotalPages,
  loading: ordersLoading,
  error: ordersError,
  search: ordersSearch,
  filters: ordersFilters,
  load: loadOrders,
  applyAndReload: applyAndReloadOrders,
  goToPage: goToOrdersPage,
} = usePaginatedList<PurchaseOrder, { ownerUserId?: string }>(listPurchaseOrdersPaginated, { defaultSortBy: 'createdAt' })

let orderSearchDebounce: ReturnType<typeof setTimeout> | undefined
function onOrderSearchInput() {
  clearTimeout(orderSearchDebounce)
  orderSearchDebounce = setTimeout(applyAndReloadOrders, 300)
}

const onlyMineOrders = ref(false)
watch(onlyMineOrders, (value) => {
  ordersFilters.ownerUserId = value ? auth.user?.sub : undefined
  applyAndReloadOrders()
})

const orderStatusBadge: Record<string, string> = {
  draft: '',
  sent: 'blue',
  partially_received: 'amber',
  received: 'green',
  cancelled: 'red',
}

const showOrderModal = ref(false)
const orderSaving = ref(false)
const orderFormError = ref('')
const orderForm = ref({
  supplierId: '',
  currencyCode: 'USD',
  expectedDate: '',
  items: [{ productId: '', description: '', quantity: 1, unitCost: 0 }] as (PurchaseOrderItemInput & { productId: string })[],
})

function openCreateOrder() {
  orderForm.value = {
    supplierId: '',
    currencyCode: 'USD',
    expectedDate: '',
    items: [{ productId: '', description: '', quantity: 1, unitCost: 0 }],
  }
  orderFormError.value = ''
  showOrderModal.value = true
}
function addOrderItem() {
  orderForm.value.items.push({ productId: '', description: '', quantity: 1, unitCost: 0 })
}
function removeOrderItem(index: number) {
  orderForm.value.items.splice(index, 1)
}
const orderFormTotal = computed(() => orderForm.value.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0))

async function submitOrder() {
  orderSaving.value = true
  orderFormError.value = ''
  try {
    await createPurchaseOrder({
      supplierId: orderForm.value.supplierId,
      currencyCode: orderForm.value.currencyCode,
      expectedDate: orderForm.value.expectedDate || undefined,
      items: orderForm.value.items.map((i) => ({
        productId: i.productId || undefined,
        description: i.description,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })),
    })
    showOrderModal.value = false
    toast.success(t('common.savedOk'))
    await loadOrders()
  } catch (err) {
    orderFormError.value = getErrorMessage(err)
  } finally {
    orderSaving.value = false
  }
}

const detailOrder = ref<PurchaseOrder | null>(null)
const detailOrderLoadingId = ref<string | null>(null)
const orderActionSaving = ref(false)
const receiveForm = ref<Record<string, { quantity: number; warehouseId: string }>>({})

function buildReceiveForm(order: PurchaseOrder) {
  const form: Record<string, { quantity: number; warehouseId: string }> = {}
  for (const item of order.items) {
    const remaining = Number(item.quantity) - Number(item.quantityReceived)
    form[item.id] = { quantity: remaining > 0 ? remaining : 0, warehouseId: warehouses.value[0]?.id ?? '' }
  }
  receiveForm.value = form
}

async function openOrderDetail(order: PurchaseOrder) {
  detailOrderLoadingId.value = order.id
  try {
    const full = await getPurchaseOrder(order.id)
    detailOrder.value = full
    buildReceiveForm(full)
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    detailOrderLoadingId.value = null
  }
}

async function refreshOrderDetail() {
  if (!detailOrder.value) return
  try {
    const full = await getPurchaseOrder(detailOrder.value.id)
    detailOrder.value = full
    buildReceiveForm(full)
    await loadOrders()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

async function handleSendOrder() {
  if (!detailOrder.value) return
  orderActionSaving.value = true
  try {
    await sendPurchaseOrder(detailOrder.value.id)
    toast.success(t('common.savedOk'))
    await refreshOrderDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    orderActionSaving.value = false
  }
}

async function handleCancelOrder() {
  if (!detailOrder.value) return
  if (!confirm(t('purchases.confirmCancelOrder'))) return
  orderActionSaving.value = true
  try {
    await cancelPurchaseOrder(detailOrder.value.id)
    toast.success(t('common.savedOk'))
    await refreshOrderDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    orderActionSaving.value = false
  }
}

async function submitReceive() {
  if (!detailOrder.value) return
  const lines = Object.entries(receiveForm.value)
    .filter(([, line]) => line.quantity > 0)
    .map(([itemId, line]) => ({ itemId, quantity: line.quantity, warehouseId: line.warehouseId }))
  if (!lines.length) return
  orderActionSaving.value = true
  try {
    await receivePurchaseOrder(detailOrder.value.id, lines)
    toast.success(t('purchases.receivedOk'))
    await refreshOrderDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    orderActionSaving.value = false
  }
}

// --- Supplier invoices tab ---
const {
  items: supplierInvoices,
  total: supplierInvoicesTotal,
  page: supplierInvoicesPage,
  totalPages: supplierInvoicesTotalPages,
  loading: supplierInvoicesLoading,
  error: supplierInvoicesError,
  search: supplierInvoicesSearch,
  load: loadSupplierInvoices,
  applyAndReload: applyAndReloadSupplierInvoices,
  goToPage: goToSupplierInvoicesPage,
} = usePaginatedList<SupplierInvoice>(listSupplierInvoicesPaginated, { defaultSortBy: 'createdAt' })

let supplierInvoiceSearchDebounce: ReturnType<typeof setTimeout> | undefined
function onSupplierInvoiceSearchInput() {
  clearTimeout(supplierInvoiceSearchDebounce)
  supplierInvoiceSearchDebounce = setTimeout(applyAndReloadSupplierInvoices, 300)
}

const supplierInvoiceStatusBadge: Record<string, string> = {
  pending: '',
  partially_paid: 'amber',
  paid: 'green',
  cancelled: 'red',
}
function supplierInvoiceBalance(invoice: SupplierInvoice): number {
  return Number(invoice.amount) - Number(invoice.amountPaid)
}

const showSupplierInvoiceModal = ref(false)
const supplierInvoiceSaving = ref(false)
const supplierInvoiceFormError = ref('')
const supplierInvoiceForm = ref({
  supplierId: '',
  supplierInvoiceNumber: '',
  currencyCode: 'USD',
  amount: 0,
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
})

function openCreateSupplierInvoice() {
  supplierInvoiceForm.value = {
    supplierId: '',
    supplierInvoiceNumber: '',
    currencyCode: 'USD',
    amount: 0,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
  }
  supplierInvoiceFormError.value = ''
  showSupplierInvoiceModal.value = true
}

async function submitSupplierInvoice() {
  supplierInvoiceSaving.value = true
  supplierInvoiceFormError.value = ''
  try {
    await createSupplierInvoice({
      supplierId: supplierInvoiceForm.value.supplierId,
      supplierInvoiceNumber: supplierInvoiceForm.value.supplierInvoiceNumber,
      currencyCode: supplierInvoiceForm.value.currencyCode,
      amount: supplierInvoiceForm.value.amount,
      issueDate: supplierInvoiceForm.value.issueDate,
      dueDate: supplierInvoiceForm.value.dueDate || undefined,
    })
    showSupplierInvoiceModal.value = false
    toast.success(t('common.savedOk'))
    await loadSupplierInvoices()
  } catch (err) {
    supplierInvoiceFormError.value = getErrorMessage(err)
  } finally {
    supplierInvoiceSaving.value = false
  }
}

const detailSupplierInvoice = ref<SupplierInvoice | null>(null)
const detailSupplierInvoiceLoadingId = ref<string | null>(null)
const supplierInvoiceActionSaving = ref(false)
const supplierPayments = ref<SupplierPayment[]>([])
const supplierPaymentForm = ref({ amount: 0, method: '', note: '' })

async function openSupplierInvoiceDetail(invoice: SupplierInvoice) {
  detailSupplierInvoiceLoadingId.value = invoice.id
  try {
    const [full, paymentsData] = await Promise.all([getSupplierInvoice(invoice.id), listSupplierPayments(invoice.id)])
    detailSupplierInvoice.value = full
    supplierPayments.value = paymentsData
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    detailSupplierInvoiceLoadingId.value = null
  }
}

async function refreshSupplierInvoiceDetail() {
  if (!detailSupplierInvoice.value) return
  try {
    const [full, paymentsData] = await Promise.all([
      getSupplierInvoice(detailSupplierInvoice.value.id),
      listSupplierPayments(detailSupplierInvoice.value.id),
    ])
    detailSupplierInvoice.value = full
    supplierPayments.value = paymentsData
    await loadSupplierInvoices()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

async function handleCancelSupplierInvoice() {
  if (!detailSupplierInvoice.value) return
  if (!confirm(t('purchases.confirmCancelInvoice'))) return
  supplierInvoiceActionSaving.value = true
  try {
    await cancelSupplierInvoice(detailSupplierInvoice.value.id)
    toast.success(t('common.savedOk'))
    await refreshSupplierInvoiceDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    supplierInvoiceActionSaving.value = false
  }
}

async function submitSupplierPayment() {
  if (!detailSupplierInvoice.value) return
  supplierInvoiceActionSaving.value = true
  try {
    await addSupplierPayment(detailSupplierInvoice.value.id, {
      amount: supplierPaymentForm.value.amount,
      method: supplierPaymentForm.value.method || undefined,
      note: supplierPaymentForm.value.note || undefined,
    })
    supplierPaymentForm.value = { amount: 0, method: '', note: '' }
    toast.success(t('common.savedOk'))
    await refreshSupplierInvoiceDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    supplierInvoiceActionSaving.value = false
  }
}

onMounted(() => {
  loadPickers()
  loadSuppliers()
  loadOrders()
  loadSupplierInvoices()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('purchases.title') }}</h1>
      <button v-if="activeTab === 'suppliers'" class="btn" @click="openCreateSupplier">+ {{ t('purchases.newSupplier') }}</button>
      <button v-else-if="activeTab === 'orders'" class="btn" @click="openCreateOrder">+ {{ t('purchases.newOrder') }}</button>
      <button v-else class="btn" @click="openCreateSupplierInvoice">+ {{ t('purchases.newSupplierInvoice') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'orders' }" @click="activeTab = 'orders'">
        {{ t('purchases.orders') }}
      </button>
      <button class="tab" :class="{ active: activeTab === 'suppliers' }" @click="activeTab = 'suppliers'">
        {{ t('purchases.suppliers') }}
      </button>
      <button class="tab" :class="{ active: activeTab === 'supplierInvoices' }" @click="activeTab = 'supplierInvoices'">
        {{ t('purchases.supplierInvoices') }}
      </button>
    </div>

    <!-- Orders tab -->
    <template v-if="activeTab === 'orders'">
      <div class="list-filters">
        <input v-model="ordersSearch" type="text" class="search-input" :placeholder="t('common.search')" @input="onOrderSearchInput" />
        <label class="checkbox-field">
          <input v-model="onlyMineOrders" type="checkbox" />
          {{ t('common.onlyMine') }}
        </label>
      </div>
      <p v-if="ordersLoading" class="muted">{{ t('common.loading') }}</p>
      <p v-else-if="ordersError" class="error-text">{{ ordersError }}</p>
      <template v-else>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('purchases.supplier') }}</th>
              <th>{{ t('quotes.total') }}</th>
              <th>{{ t('purchases.expectedDate') }}</th>
              <th>Estado</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id">
              <td>{{ o.orderNumber }}</td>
              <td>{{ supplierName(o.supplierId) }}</td>
              <td>{{ o.currencyCode }} {{ Number(o.total).toLocaleString() }}</td>
              <td>{{ o.expectedDate || '—' }}</td>
              <td><span class="badge" :class="orderStatusBadge[o.status]">{{ t(`purchases.orderStatus.${o.status}`) }}</span></td>
              <td class="actions-cell">
                <button class="btn secondary" :disabled="detailOrderLoadingId === o.id" @click="openOrderDetail(o)">
                  {{ t('invoices.viewDetail') }}
                </button>
              </td>
            </tr>
            <tr v-if="!orders.length">
              <td colspan="6" class="muted">—</td>
            </tr>
          </tbody>
        </table>
        <Pagination :page="ordersPage" :total-pages="ordersTotalPages" :total="ordersTotal" @go="goToOrdersPage" />
      </template>
    </template>

    <!-- Suppliers tab -->
    <template v-else-if="activeTab === 'suppliers'">
      <div class="list-filters">
        <input v-model="suppliersSearch" type="text" class="search-input" :placeholder="t('common.search')" @input="onSupplierSearchInput" />
      </div>
      <p v-if="suppliersLoading" class="muted">{{ t('common.loading') }}</p>
      <p v-else-if="suppliersError" class="error-text">{{ suppliersError }}</p>
      <template v-else>
        <table>
          <thead>
            <tr>
              <th>{{ t('common.name') }}</th>
              <th>{{ t('purchases.taxId') }}</th>
              <th>{{ t('common.email') }}</th>
              <th>{{ t('common.phone') }}</th>
              <th>{{ t('common.active') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in suppliers" :key="s.id">
              <td>{{ s.name }}</td>
              <td>{{ s.taxId || '—' }}</td>
              <td>{{ s.email || '—' }}</td>
              <td>{{ s.phone || '—' }}</td>
              <td>
                <span class="badge" :class="s.isActive ? 'green' : 'red'">
                  {{ s.isActive ? t('common.active') : t('common.inactive') }}
                </span>
              </td>
              <td class="actions-cell">
                <button class="btn secondary" @click="openEditSupplier(s)">{{ t('common.edit') }}</button>
                <button class="btn secondary" @click="toggleSupplierActive(s)">
                  {{ s.isActive ? t('common.deactivate') : t('common.activate') }}
                </button>
              </td>
            </tr>
            <tr v-if="!suppliers.length">
              <td colspan="6" class="muted">—</td>
            </tr>
          </tbody>
        </table>
        <Pagination :page="suppliersPage" :total-pages="suppliersTotalPages" :total="suppliersTotal" @go="goToSuppliersPage" />
      </template>
    </template>

    <!-- Supplier invoices tab -->
    <template v-else>
      <div class="list-filters">
        <input
          v-model="supplierInvoicesSearch"
          type="text"
          class="search-input"
          :placeholder="t('common.search')"
          @input="onSupplierInvoiceSearchInput"
        />
      </div>
      <p v-if="supplierInvoicesLoading" class="muted">{{ t('common.loading') }}</p>
      <p v-else-if="supplierInvoicesError" class="error-text">{{ supplierInvoicesError }}</p>
      <template v-else>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('purchases.supplier') }}</th>
              <th>{{ t('invoices.total') }}</th>
              <th>{{ t('invoices.balanceDue') }}</th>
              <th>{{ t('invoices.dueDate') }}</th>
              <th>Estado</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="si in supplierInvoices" :key="si.id">
              <td>{{ si.supplierInvoiceNumber }}</td>
              <td>{{ supplierName(si.supplierId) }}</td>
              <td>{{ si.currencyCode }} {{ Number(si.amount).toLocaleString() }}</td>
              <td>{{ si.currencyCode }} {{ supplierInvoiceBalance(si).toLocaleString() }}</td>
              <td>{{ si.dueDate || '—' }}</td>
              <td>
                <span class="badge" :class="supplierInvoiceStatusBadge[si.status]">
                  {{ t(`purchases.supplierInvoiceStatus.${si.status}`) }}
                </span>
              </td>
              <td class="actions-cell">
                <button class="btn secondary" :disabled="detailSupplierInvoiceLoadingId === si.id" @click="openSupplierInvoiceDetail(si)">
                  {{ t('invoices.viewDetail') }}
                </button>
              </td>
            </tr>
            <tr v-if="!supplierInvoices.length">
              <td colspan="7" class="muted">—</td>
            </tr>
          </tbody>
        </table>
        <Pagination
          :page="supplierInvoicesPage"
          :total-pages="supplierInvoicesTotalPages"
          :total="supplierInvoicesTotal"
          @go="goToSupplierInvoicesPage"
        />
      </template>
    </template>

    <!-- Create/edit supplier modal -->
    <div v-if="showSupplierModal" class="modal-backdrop" @click.self="showSupplierModal = false">
      <form class="modal" @submit.prevent="submitSupplier">
        <h2>{{ editingSupplierId ? t('common.edit') : t('purchases.newSupplier') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="supplierForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('purchases.taxId') }}</label>
          <input v-model="supplierForm.taxId" />
        </div>
        <div class="field">
          <label>{{ t('common.email') }}</label>
          <input v-model="supplierForm.email" type="email" />
        </div>
        <div class="field">
          <label>{{ t('common.phone') }}</label>
          <input v-model="supplierForm.phone" />
        </div>
        <div class="field">
          <label>{{ t('warehouses.address') }}</label>
          <input v-model="supplierForm.address" />
        </div>
        <p v-if="supplierFormError" class="error-text">{{ supplierFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showSupplierModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="supplierSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Create purchase order modal -->
    <div v-if="showOrderModal" class="modal-backdrop" @click.self="showOrderModal = false">
      <form class="modal wide" @submit.prevent="submitOrder">
        <h2>{{ t('purchases.newOrder') }}</h2>
        <div class="field">
          <label>{{ t('purchases.supplier') }}</label>
          <select v-model="orderForm.supplierId" required>
            <option value="" disabled>—</option>
            <option v-for="s in suppliersAll" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('purchases.expectedDate') }}</label>
          <input v-model="orderForm.expectedDate" type="date" />
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>{{ t('purchases.product') }}</th>
              <th>{{ t('quotes.description') }}</th>
              <th>{{ t('quotes.quantity') }}</th>
              <th>{{ t('purchases.unitCost') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in orderForm.items" :key="index">
              <td>
                <select v-model="item.productId">
                  <option value="">—</option>
                  <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </td>
              <td><input v-model="item.description" required /></td>
              <td><input v-model.number="item.quantity" type="number" min="0.01" step="0.01" required /></td>
              <td><input v-model.number="item.unitCost" type="number" min="0" step="0.01" required /></td>
              <td>
                <button type="button" class="btn secondary" :disabled="orderForm.items.length === 1" @click="removeOrderItem(index)">
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <button type="button" class="btn secondary" style="margin-top: 0.5rem" @click="addOrderItem">
          + {{ t('quotes.addItem') }}
        </button>

        <p class="total-line">{{ t('quotes.total') }}: {{ orderForm.currencyCode }} {{ orderFormTotal.toLocaleString() }}</p>

        <p v-if="orderFormError" class="error-text">{{ orderFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showOrderModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="orderSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Create supplier invoice modal -->
    <div v-if="showSupplierInvoiceModal" class="modal-backdrop" @click.self="showSupplierInvoiceModal = false">
      <form class="modal" @submit.prevent="submitSupplierInvoice">
        <h2>{{ t('purchases.newSupplierInvoice') }}</h2>
        <div class="field">
          <label>{{ t('purchases.supplier') }}</label>
          <select v-model="supplierInvoiceForm.supplierId" required>
            <option value="" disabled>—</option>
            <option v-for="s in suppliersAll" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('purchases.supplierInvoiceNumber') }}</label>
          <input v-model="supplierInvoiceForm.supplierInvoiceNumber" required />
        </div>
        <div class="field">
          <label>{{ t('invoices.amount') }}</label>
          <input v-model.number="supplierInvoiceForm.amount" type="number" min="0.01" step="0.01" required />
        </div>
        <div class="field">
          <label>{{ t('invoices.issueDate') }}</label>
          <input v-model="supplierInvoiceForm.issueDate" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('invoices.dueDate') }}</label>
          <input v-model="supplierInvoiceForm.dueDate" type="date" />
        </div>
        <p v-if="supplierInvoiceFormError" class="error-text">{{ supplierInvoiceFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showSupplierInvoiceModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="supplierInvoiceSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Purchase order detail modal -->
    <div v-if="detailOrder" class="modal-backdrop" @click.self="detailOrder = null">
      <div class="modal wide">
        <h2>{{ detailOrder.orderNumber }} — {{ supplierName(detailOrder.supplierId) }}</h2>
        <p><span class="badge" :class="orderStatusBadge[detailOrder.status]">{{ t(`purchases.orderStatus.${detailOrder.status}`) }}</span></p>

        <table class="items-table">
          <thead>
            <tr>
              <th>{{ t('quotes.description') }}</th>
              <th>{{ t('quotes.quantity') }}</th>
              <th>{{ t('purchases.received') }}</th>
              <th>{{ t('purchases.unitCost') }}</th>
              <th>{{ t('quotes.total') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in detailOrder.items" :key="item.id">
              <td>{{ item.description }} <span v-if="item.productId" class="muted">({{ productName(item.productId) }})</span></td>
              <td>{{ item.quantity }}</td>
              <td>{{ item.quantityReceived }}</td>
              <td>{{ Number(item.unitCost).toLocaleString() }}</td>
              <td>{{ Number(item.total).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>

        <p class="total-line">{{ t('quotes.total') }}: {{ detailOrder.currencyCode }} {{ Number(detailOrder.total).toLocaleString() }}</p>

        <div class="modal-actions" style="justify-content: flex-start; flex-wrap: wrap; gap: 0.5rem">
          <button v-if="detailOrder.status === 'draft'" class="btn secondary" :disabled="orderActionSaving" @click="handleSendOrder">
            {{ t('purchases.send') }}
          </button>
          <button
            v-if="!['received', 'cancelled'].includes(detailOrder.status)"
            class="btn secondary"
            :disabled="orderActionSaving"
            @click="handleCancelOrder"
          >
            {{ t('common.cancel') }}
          </button>
        </div>

        <template v-if="['sent', 'partially_received'].includes(detailOrder.status)">
          <h3 class="section-title">{{ t('purchases.receiveGoods') }}</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>{{ t('quotes.description') }}</th>
                <th>{{ t('purchases.pendingQty') }}</th>
                <th>{{ t('purchases.receiveQty') }}</th>
                <th>{{ t('purchases.warehouse') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in detailOrder.items" :key="item.id">
                <td>{{ item.description }}</td>
                <td>{{ Number(item.quantity) - Number(item.quantityReceived) }}</td>
                <td>
                  <input
                    v-if="receiveForm[item.id]"
                    v-model.number="receiveForm[item.id]!.quantity"
                    type="number"
                    min="0"
                    :max="Number(item.quantity) - Number(item.quantityReceived)"
                    step="0.01"
                  />
                </td>
                <td>
                  <select v-if="receiveForm[item.id]" v-model="receiveForm[item.id]!.warehouseId">
                    <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
          <button type="button" class="btn secondary" style="margin-top: 0.5rem" :disabled="orderActionSaving" @click="submitReceive">
            {{ t('purchases.registerReceipt') }}
          </button>
        </template>

        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="detailOrder = null">{{ t('common.cancel') }}</button>
        </div>
      </div>
    </div>

    <!-- Supplier invoice detail modal -->
    <div v-if="detailSupplierInvoice" class="modal-backdrop" @click.self="detailSupplierInvoice = null">
      <div class="modal wide">
        <h2>{{ detailSupplierInvoice.supplierInvoiceNumber }} — {{ supplierName(detailSupplierInvoice.supplierId) }}</h2>
        <p>
          <span class="badge" :class="supplierInvoiceStatusBadge[detailSupplierInvoice.status]">
            {{ t(`purchases.supplierInvoiceStatus.${detailSupplierInvoice.status}`) }}
          </span>
        </p>
        <p class="total-line">
          {{ t('invoices.total') }}: {{ detailSupplierInvoice.currencyCode }} {{ Number(detailSupplierInvoice.amount).toLocaleString() }}
        </p>
        <p class="total-line">
          {{ t('invoices.balanceDue') }}: {{ detailSupplierInvoice.currencyCode }}
          {{ supplierInvoiceBalance(detailSupplierInvoice).toLocaleString() }}
        </p>

        <div class="modal-actions" style="justify-content: flex-start; flex-wrap: wrap; gap: 0.5rem">
          <button
            v-if="!['paid', 'cancelled'].includes(detailSupplierInvoice.status)"
            class="btn secondary"
            :disabled="supplierInvoiceActionSaving"
            @click="handleCancelSupplierInvoice"
          >
            {{ t('common.cancel') }}
          </button>
        </div>

        <template v-if="!['cancelled'].includes(detailSupplierInvoice.status)">
          <h3 class="section-title">{{ t('invoices.payments') }}</h3>
          <ul class="detail-list">
            <li v-for="p in supplierPayments" :key="p.id">
              {{ new Date(p.paidAt).toLocaleDateString() }} — {{ detailSupplierInvoice.currencyCode }} {{ Number(p.amount).toLocaleString() }}
              <span v-if="p.method" class="muted">({{ p.method }})</span>
            </li>
            <li v-if="!supplierPayments.length" class="muted">—</li>
          </ul>
          <form v-if="supplierInvoiceBalance(detailSupplierInvoice) > 0" class="inline-form" @submit.prevent="submitSupplierPayment">
            <input v-model.number="supplierPaymentForm.amount" type="number" min="0.01" step="0.01" :placeholder="t('invoices.amount')" required />
            <input v-model="supplierPaymentForm.method" :placeholder="t('invoices.method')" />
            <button type="submit" class="btn secondary" :disabled="supplierInvoiceActionSaving">{{ t('invoices.registerPayment') }}</button>
          </form>
        </template>

        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="detailSupplierInvoice = null">{{ t('common.cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.actions-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.items-table {
  margin-top: 0.5rem;
}
.items-table input,
.items-table select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.35rem 0.5rem;
  width: 100%;
}
.total-line {
  font-weight: 600;
  margin-top: 0.5rem;
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
.section-title {
  font-size: 0.95rem;
  margin: 1rem 0 0.5rem;
}
.detail-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  margin-bottom: 0.6rem;
}
.inline-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.inline-form input,
.inline-form select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}
</style>
