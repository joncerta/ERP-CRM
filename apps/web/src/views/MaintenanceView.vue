<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listEquipment,
  createEquipment,
  updateEquipment,
  getEquipmentHistory,
  listTechnicians,
  createTechnician,
  updateTechnician,
  listWorkOrders,
  createWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  cancelWorkOrder,
  type CreateEquipmentPayload,
  type CreateTechnicianPayload,
  type CreateWorkOrderPayload,
} from '@/api/maintenance'
import { listProducts } from '@/api/products'
import { listWarehouses } from '@/api/warehouses'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { Equipment, Technician, MaintenanceWorkOrder, WorkOrderPart, Product, Warehouse } from '@/api/types'

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
function equipmentLabel(id: string): string {
  const e = equipment.value.find((e) => e.id === id)
  return e ? `${e.name} (${e.code})` : '—'
}
function technicianName(id: string | null): string {
  if (!id) return '—'
  return technicians.value.find((t) => t.id === id)?.name ?? '—'
}

type Tab = 'equipment' | 'technicians' | 'orders'
const activeTab = ref<Tab>('equipment')

// --- Equipos ---
const equipment = ref<Equipment[]>([])
const equipmentLoading = ref(true)
async function loadEquipment() {
  equipmentLoading.value = true
  try {
    equipment.value = await listEquipment()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    equipmentLoading.value = false
  }
}

const showEquipmentModal = ref(false)
const editingEquipment = ref<Equipment | null>(null)
const equipmentSaving = ref(false)
const equipmentFormError = ref('')
const equipmentForm = ref<CreateEquipmentPayload & { status?: Equipment['status'] }>({ name: '', code: '', category: '' })
function openCreateEquipment() {
  editingEquipment.value = null
  equipmentForm.value = { name: '', code: '', category: '' }
  equipmentFormError.value = ''
  showEquipmentModal.value = true
}
function openEditEquipment(e: Equipment) {
  editingEquipment.value = e
  equipmentForm.value = { name: e.name, code: e.code, category: e.category, location: e.location ?? undefined, notes: e.notes ?? undefined, status: e.status }
  equipmentFormError.value = ''
  showEquipmentModal.value = true
}
async function submitEquipment() {
  equipmentSaving.value = true
  equipmentFormError.value = ''
  try {
    if (editingEquipment.value) {
      const { code: _code, ...payload } = equipmentForm.value
      await updateEquipment(editingEquipment.value.id, payload)
    } else {
      await createEquipment(equipmentForm.value)
    }
    showEquipmentModal.value = false
    toast.success(t('common.savedOk'))
    await loadEquipment()
  } catch (err) {
    equipmentFormError.value = getErrorMessage(err)
  } finally {
    equipmentSaving.value = false
  }
}

const viewingEquipment = ref<Equipment | null>(null)
const equipmentHistory = ref<MaintenanceWorkOrder[]>([])
async function viewHistory(e: Equipment) {
  viewingEquipment.value = e
  try {
    equipmentHistory.value = await getEquipmentHistory(e.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Técnicos ---
const technicians = ref<Technician[]>([])
const techniciansLoading = ref(true)
async function loadTechnicians() {
  techniciansLoading.value = true
  try {
    technicians.value = await listTechnicians()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    techniciansLoading.value = false
  }
}

const showTechnicianModal = ref(false)
const editingTechnician = ref<Technician | null>(null)
const technicianSaving = ref(false)
const technicianFormError = ref('')
const technicianForm = ref<CreateTechnicianPayload & { isActive?: boolean }>({ name: '' })
function openCreateTechnician() {
  editingTechnician.value = null
  technicianForm.value = { name: '' }
  technicianFormError.value = ''
  showTechnicianModal.value = true
}
function openEditTechnician(tech: Technician) {
  editingTechnician.value = tech
  technicianForm.value = { name: tech.name, phone: tech.phone ?? undefined, email: tech.email ?? undefined, specialty: tech.specialty ?? undefined, isActive: tech.isActive }
  technicianFormError.value = ''
  showTechnicianModal.value = true
}
async function submitTechnician() {
  technicianSaving.value = true
  technicianFormError.value = ''
  try {
    if (editingTechnician.value) {
      await updateTechnician(editingTechnician.value.id, technicianForm.value)
    } else {
      await createTechnician(technicianForm.value)
    }
    showTechnicianModal.value = false
    toast.success(t('common.savedOk'))
    await loadTechnicians()
  } catch (err) {
    technicianFormError.value = getErrorMessage(err)
  } finally {
    technicianSaving.value = false
  }
}

// --- Órdenes de trabajo ---
const orders = ref<MaintenanceWorkOrder[]>([])
const ordersLoading = ref(true)
async function loadOrders() {
  ordersLoading.value = true
  try {
    orders.value = await listWorkOrders()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    ordersLoading.value = false
  }
}

const showOrderModal = ref(false)
const orderSaving = ref(false)
const orderFormError = ref('')
const orderForm = ref<{
  equipmentId: string
  technicianId: string
  warehouseId: string
  type: CreateWorkOrderPayload['type']
  priority: NonNullable<CreateWorkOrderPayload['priority']>
  scheduledDate: string
  description: string
  parts: WorkOrderPart[]
}>({ equipmentId: '', technicianId: '', warehouseId: '', type: 'corrective', priority: 'medium', scheduledDate: '', description: '', parts: [] })

function openCreateOrder() {
  orderForm.value = { equipmentId: '', technicianId: '', warehouseId: '', type: 'corrective', priority: 'medium', scheduledDate: '', description: '', parts: [] }
  orderFormError.value = ''
  showOrderModal.value = true
}
function addPart() {
  orderForm.value.parts.push({ productId: '', quantity: 1 })
}
function removePart(index: number) {
  orderForm.value.parts.splice(index, 1)
}
async function submitOrder() {
  orderSaving.value = true
  orderFormError.value = ''
  try {
    const payload: CreateWorkOrderPayload = {
      ...orderForm.value,
      technicianId: orderForm.value.technicianId || undefined,
    }
    await createWorkOrder(payload)
    showOrderModal.value = false
    toast.success(t('common.savedOk'))
    await loadOrders()
  } catch (err) {
    orderFormError.value = getErrorMessage(err)
  } finally {
    orderSaving.value = false
  }
}

async function handleStart(order: MaintenanceWorkOrder) {
  try {
    await startWorkOrder(order.id)
    toast.success(t('common.savedOk'))
    await loadOrders()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function handleCancel(order: MaintenanceWorkOrder) {
  try {
    await cancelWorkOrder(order.id)
    toast.success(t('common.savedOk'))
    await loadOrders()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

const showCompleteModal = ref(false)
const completingOrder = ref<MaintenanceWorkOrder | null>(null)
const completeSaving = ref(false)
const completeNotes = ref('')
function openCompleteModal(order: MaintenanceWorkOrder) {
  completingOrder.value = order
  completeNotes.value = ''
  showCompleteModal.value = true
}
async function submitComplete() {
  if (!completingOrder.value) return
  completeSaving.value = true
  try {
    await completeWorkOrder(completingOrder.value.id, completeNotes.value)
    showCompleteModal.value = false
    toast.success(t('common.savedOk'))
    await loadOrders()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    completeSaving.value = false
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'technicians' && !technicians.value.length) loadTechnicians()
  if (tab === 'orders' && !orders.value.length) loadOrders()
}

onMounted(async () => {
  await loadPickers()
  await loadEquipment()
  await loadTechnicians()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('maintenance.title') }}</h1>
      <button v-if="activeTab === 'equipment'" class="btn" @click="openCreateEquipment">+ {{ t('maintenance.newEquipment') }}</button>
      <button v-else-if="activeTab === 'technicians'" class="btn" @click="openCreateTechnician">+ {{ t('maintenance.newTechnician') }}</button>
      <button v-else class="btn" @click="openCreateOrder">+ {{ t('maintenance.newOrder') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'equipment' }" @click="switchTab('equipment')">{{ t('maintenance.tabEquipment') }}</button>
      <button class="tab" :class="{ active: activeTab === 'technicians' }" @click="switchTab('technicians')">{{ t('maintenance.tabTechnicians') }}</button>
      <button class="tab" :class="{ active: activeTab === 'orders' }" @click="switchTab('orders')">{{ t('maintenance.tabOrders') }}</button>
    </div>

    <!-- Equipos -->
    <template v-if="activeTab === 'equipment'">
      <p v-if="equipmentLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('maintenance.code') }}</th>
            <th>{{ t('projects.name') }}</th>
            <th>{{ t('maintenance.category') }}</th>
            <th>{{ t('maintenance.location') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in equipment" :key="e.id">
            <td>{{ e.code }}</td>
            <td>{{ e.name }}</td>
            <td>{{ e.category }}</td>
            <td>{{ e.location ?? '—' }}</td>
            <td><span class="badge" :class="{ green: e.status === 'operational', red: e.status === 'out_of_service' }">{{ t(`maintenance.equipmentStatus_${e.status}`) }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditEquipment(e)">{{ t('common.edit') }}</button>
              <button class="btn secondary" @click="viewHistory(e)">{{ t('maintenance.viewHistory') }}</button>
            </td>
          </tr>
          <tr v-if="!equipment.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>

      <div v-if="viewingEquipment" style="margin-top: 1.5rem">
        <h3>{{ t('maintenance.viewHistory') }} — {{ viewingEquipment.name }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ t('production.orderNumber') }}</th>
              <th>{{ t('maintenance.type') }}</th>
              <th>Estado</th>
              <th>{{ t('maintenance.partsCost') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in equipmentHistory" :key="o.id">
              <td>{{ o.orderNumber }}</td>
              <td>{{ t(`maintenance.type_${o.type}`) }}</td>
              <td><span class="badge" :class="{ green: o.status === 'completed', red: o.status === 'cancelled' }">{{ t(`maintenance.orderStatus_${o.status}`) }}</span></td>
              <td>{{ Number(o.totalPartsCost).toLocaleString() }}</td>
            </tr>
            <tr v-if="!equipmentHistory.length">
              <td colspan="4" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Técnicos -->
    <template v-else-if="activeTab === 'technicians'">
      <p v-if="techniciansLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('projects.name') }}</th>
            <th>{{ t('maintenance.specialty') }}</th>
            <th>{{ t('common.phone') }}</th>
            <th>{{ t('common.email') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tech in technicians" :key="tech.id">
            <td>{{ tech.name }}</td>
            <td>{{ tech.specialty ?? '—' }}</td>
            <td>{{ tech.phone ?? '—' }}</td>
            <td>{{ tech.email ?? '—' }}</td>
            <td><span class="badge" :class="tech.isActive ? 'green' : ''">{{ tech.isActive ? t('common.active') : t('common.inactive') }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditTechnician(tech)">{{ t('common.edit') }}</button>
            </td>
          </tr>
          <tr v-if="!technicians.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Órdenes de trabajo -->
    <template v-else>
      <p v-if="ordersLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('production.orderNumber') }}</th>
            <th>{{ t('maintenance.equipment') }}</th>
            <th>{{ t('maintenance.technician') }}</th>
            <th>{{ t('maintenance.type') }}</th>
            <th>{{ t('maintenance.priority') }}</th>
            <th>Estado</th>
            <th>{{ t('maintenance.partsCost') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td>{{ o.orderNumber }}</td>
            <td>{{ equipmentLabel(o.equipmentId) }}</td>
            <td>{{ technicianName(o.technicianId) }}</td>
            <td>{{ t(`maintenance.type_${o.type}`) }}</td>
            <td>{{ t(`maintenance.priority_${o.priority}`) }}</td>
            <td><span class="badge" :class="{ green: o.status === 'completed', red: o.status === 'cancelled' }">{{ t(`maintenance.orderStatus_${o.status}`) }}</span></td>
            <td>{{ Number(o.totalPartsCost).toLocaleString() }}</td>
            <td class="actions-cell">
              <button v-if="o.status === 'open'" class="btn secondary" @click="handleStart(o)">{{ t('production.start') }}</button>
              <button v-if="o.status === 'open' || o.status === 'in_progress'" class="btn secondary" @click="handleCancel(o)">{{ t('common.cancel') }}</button>
              <button v-if="o.status === 'in_progress'" class="btn secondary" @click="openCompleteModal(o)">{{ t('production.complete') }}</button>
            </td>
          </tr>
          <tr v-if="!orders.length">
            <td colspan="8" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Crear/editar equipo -->
    <div v-if="showEquipmentModal" class="modal-backdrop" @click.self="showEquipmentModal = false">
      <form class="modal" @submit.prevent="submitEquipment">
        <h2>{{ editingEquipment ? t('common.edit') : t('maintenance.newEquipment') }}</h2>
        <div class="field">
          <label>{{ t('projects.name') }}</label>
          <input v-model="equipmentForm.name" required />
        </div>
        <div v-if="!editingEquipment" class="field">
          <label>{{ t('maintenance.code') }}</label>
          <input v-model="equipmentForm.code" required />
        </div>
        <div class="field">
          <label>{{ t('maintenance.category') }}</label>
          <input v-model="equipmentForm.category" required />
        </div>
        <div class="field">
          <label>{{ t('maintenance.location') }}</label>
          <input v-model="equipmentForm.location" />
        </div>
        <div v-if="editingEquipment" class="field">
          <label>Estado</label>
          <select v-model="equipmentForm.status">
            <option value="operational">{{ t('maintenance.equipmentStatus_operational') }}</option>
            <option value="under_maintenance">{{ t('maintenance.equipmentStatus_under_maintenance') }}</option>
            <option value="out_of_service">{{ t('maintenance.equipmentStatus_out_of_service') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('projects.description') }}</label>
          <textarea v-model="equipmentForm.notes" rows="2"></textarea>
        </div>
        <p v-if="equipmentFormError" class="error-text">{{ equipmentFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showEquipmentModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="equipmentSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Crear/editar técnico -->
    <div v-if="showTechnicianModal" class="modal-backdrop" @click.self="showTechnicianModal = false">
      <form class="modal" @submit.prevent="submitTechnician">
        <h2>{{ editingTechnician ? t('common.edit') : t('maintenance.newTechnician') }}</h2>
        <div class="field">
          <label>{{ t('projects.name') }}</label>
          <input v-model="technicianForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('maintenance.specialty') }}</label>
          <input v-model="technicianForm.specialty" />
        </div>
        <div class="field">
          <label>{{ t('common.phone') }}</label>
          <input v-model="technicianForm.phone" />
        </div>
        <div class="field">
          <label>{{ t('common.email') }}</label>
          <input v-model="technicianForm.email" type="email" />
        </div>
        <div v-if="editingTechnician" class="field">
          <label>Estado</label>
          <select v-model="technicianForm.isActive">
            <option :value="true">{{ t('common.active') }}</option>
            <option :value="false">{{ t('common.inactive') }}</option>
          </select>
        </div>
        <p v-if="technicianFormError" class="error-text">{{ technicianFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showTechnicianModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="technicianSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Nueva orden de trabajo -->
    <div v-if="showOrderModal" class="modal-backdrop" @click.self="showOrderModal = false">
      <form class="modal" @submit.prevent="submitOrder">
        <h2>{{ t('maintenance.newOrder') }}</h2>
        <div class="field">
          <label>{{ t('maintenance.equipment') }}</label>
          <select v-model="orderForm.equipmentId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="e in equipment" :key="e.id" :value="e.id">{{ e.name }} ({{ e.code }})</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('maintenance.technician') }}</label>
          <select v-model="orderForm.technicianId">
            <option value="">{{ t('documents.noneOption') }}</option>
            <option v-for="tech in technicians" :key="tech.id" :value="tech.id">{{ tech.name }}</option>
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
          <label>{{ t('maintenance.type') }}</label>
          <select v-model="orderForm.type">
            <option value="corrective">{{ t('maintenance.type_corrective') }}</option>
            <option value="preventive">{{ t('maintenance.type_preventive') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('maintenance.priority') }}</label>
          <select v-model="orderForm.priority">
            <option value="low">{{ t('maintenance.priority_low') }}</option>
            <option value="medium">{{ t('maintenance.priority_medium') }}</option>
            <option value="high">{{ t('maintenance.priority_high') }}</option>
            <option value="urgent">{{ t('maintenance.priority_urgent') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('hr.hireDate') }}</label>
          <input v-model="orderForm.scheduledDate" type="date" />
        </div>
        <div class="field">
          <label>{{ t('projects.description') }}</label>
          <textarea v-model="orderForm.description" rows="2" required></textarea>
        </div>

        <label class="section-label">{{ t('maintenance.parts') }}</label>
        <div v-for="(part, i) in orderForm.parts" :key="i" class="scored-row">
          <select v-model="part.productId" required>
            <option value="" disabled>{{ t('production.component') }}</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
          </select>
          <input v-model.number="part.quantity" type="number" min="0.0001" step="0.0001" required />
          <button type="button" class="btn secondary" @click="removePart(i)">✕</button>
        </div>
        <button type="button" class="btn secondary" @click="addPart">+ {{ t('hr.addItem') }}</button>

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
          <label>{{ t('maintenance.resolutionNotes') }}</label>
          <textarea v-model="completeNotes" rows="3"></textarea>
        </div>
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
