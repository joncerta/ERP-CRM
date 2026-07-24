<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  getVehicleDeliveries,
  listDrivers,
  createDriver,
  updateDriver,
  listDeliveryNotes,
  createDeliveryNote,
  dispatchDeliveryNote,
  deliverDeliveryNote,
  cancelDeliveryNote,
  type CreateVehiclePayload,
  type CreateDriverPayload,
  type CreateDeliveryNotePayload,
} from '@/api/logistics'
import { listProducts } from '@/api/products'
import { listWarehouses } from '@/api/warehouses'
import { listInvoices } from '@/api/invoices'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { Vehicle, Driver, DeliveryNote, DeliveryNoteItem, Product, Warehouse, Invoice } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const products = ref<Product[]>([])
const warehouses = ref<Warehouse[]>([])
const invoices = ref<Invoice[]>([])
async function loadPickers() {
  try {
    const [productList, warehouseList] = await Promise.all([listProducts(), listWarehouses()])
    products.value = productList
    warehouses.value = warehouseList
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
  try {
    invoices.value = await listInvoices()
  } catch {
    invoices.value = []
  }
}
function productLabel(id: string): string {
  const p = products.value.find((p) => p.id === id)
  return p ? `${p.name} (${p.sku})` : '—'
}
function vehicleLabel(id: string): string {
  const v = vehicles.value.find((v) => v.id === id)
  return v ? `${v.plate} (${v.brand} ${v.model})` : '—'
}
function driverName(id: string): string {
  return drivers.value.find((d) => d.id === id)?.name ?? '—'
}

type Tab = 'vehicles' | 'drivers' | 'notes'
const activeTab = ref<Tab>('vehicles')

// --- Vehículos ---
const vehicles = ref<Vehicle[]>([])
const vehiclesLoading = ref(true)
async function loadVehicles() {
  vehiclesLoading.value = true
  try {
    vehicles.value = await listVehicles()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    vehiclesLoading.value = false
  }
}

const showVehicleModal = ref(false)
const editingVehicle = ref<Vehicle | null>(null)
const vehicleSaving = ref(false)
const vehicleFormError = ref('')
const vehicleForm = ref<CreateVehiclePayload & { status?: Vehicle['status'] }>({ plate: '', brand: '', model: '' })
function openCreateVehicle() {
  editingVehicle.value = null
  vehicleForm.value = { plate: '', brand: '', model: '' }
  vehicleFormError.value = ''
  showVehicleModal.value = true
}
function openEditVehicle(v: Vehicle) {
  editingVehicle.value = v
  vehicleForm.value = { plate: v.plate, brand: v.brand, model: v.model, capacityKg: v.capacityKg ?? undefined, notes: v.notes ?? undefined, status: v.status }
  vehicleFormError.value = ''
  showVehicleModal.value = true
}
async function submitVehicle() {
  vehicleSaving.value = true
  vehicleFormError.value = ''
  try {
    if (editingVehicle.value) {
      const { plate: _plate, ...payload } = vehicleForm.value
      await updateVehicle(editingVehicle.value.id, payload)
    } else {
      await createVehicle(vehicleForm.value)
    }
    showVehicleModal.value = false
    toast.success(t('common.savedOk'))
    await loadVehicles()
  } catch (err) {
    vehicleFormError.value = getErrorMessage(err)
  } finally {
    vehicleSaving.value = false
  }
}

const viewingVehicle = ref<Vehicle | null>(null)
const vehicleDeliveries = ref<DeliveryNote[]>([])
async function viewDeliveries(v: Vehicle) {
  viewingVehicle.value = v
  try {
    vehicleDeliveries.value = await getVehicleDeliveries(v.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Conductores ---
const drivers = ref<Driver[]>([])
const driversLoading = ref(true)
async function loadDrivers() {
  driversLoading.value = true
  try {
    drivers.value = await listDrivers()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    driversLoading.value = false
  }
}

const showDriverModal = ref(false)
const editingDriver = ref<Driver | null>(null)
const driverSaving = ref(false)
const driverFormError = ref('')
const driverForm = ref<CreateDriverPayload & { isActive?: boolean }>({ name: '' })
function openCreateDriver() {
  editingDriver.value = null
  driverForm.value = { name: '' }
  driverFormError.value = ''
  showDriverModal.value = true
}
function openEditDriver(d: Driver) {
  editingDriver.value = d
  driverForm.value = { name: d.name, licenseNumber: d.licenseNumber ?? undefined, phone: d.phone ?? undefined, isActive: d.isActive }
  driverFormError.value = ''
  showDriverModal.value = true
}
async function submitDriver() {
  driverSaving.value = true
  driverFormError.value = ''
  try {
    if (editingDriver.value) {
      await updateDriver(editingDriver.value.id, driverForm.value)
    } else {
      await createDriver(driverForm.value)
    }
    showDriverModal.value = false
    toast.success(t('common.savedOk'))
    await loadDrivers()
  } catch (err) {
    driverFormError.value = getErrorMessage(err)
  } finally {
    driverSaving.value = false
  }
}

// --- Guías de entrega ---
const notes = ref<DeliveryNote[]>([])
const notesLoading = ref(true)
async function loadNotes() {
  notesLoading.value = true
  try {
    notes.value = await listDeliveryNotes()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    notesLoading.value = false
  }
}

const showNoteModal = ref(false)
const noteSaving = ref(false)
const noteFormError = ref('')
const noteForm = ref<{
  vehicleId: string
  driverId: string
  warehouseId: string
  relatedInvoiceId: string
  destinationAddress: string
  notes: string
  items: DeliveryNoteItem[]
}>({ vehicleId: '', driverId: '', warehouseId: '', relatedInvoiceId: '', destinationAddress: '', notes: '', items: [] })

function openCreateNote() {
  noteForm.value = { vehicleId: '', driverId: '', warehouseId: '', relatedInvoiceId: '', destinationAddress: '', notes: '', items: [] }
  noteFormError.value = ''
  showNoteModal.value = true
}
function addNoteItem() {
  noteForm.value.items.push({ productId: '', quantity: 1 })
}
function removeNoteItem(index: number) {
  noteForm.value.items.splice(index, 1)
}
async function submitNote() {
  noteSaving.value = true
  noteFormError.value = ''
  try {
    const payload: CreateDeliveryNotePayload = {
      ...noteForm.value,
      relatedInvoiceId: noteForm.value.relatedInvoiceId || undefined,
    }
    await createDeliveryNote(payload)
    showNoteModal.value = false
    toast.success(t('common.savedOk'))
    await loadNotes()
  } catch (err) {
    noteFormError.value = getErrorMessage(err)
  } finally {
    noteSaving.value = false
  }
}

async function handleDispatch(note: DeliveryNote) {
  try {
    await dispatchDeliveryNote(note.id)
    toast.success(t('common.savedOk'))
    await loadNotes()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function handleCancel(note: DeliveryNote) {
  try {
    await cancelDeliveryNote(note.id)
    toast.success(t('common.savedOk'))
    await loadNotes()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

const showDeliverModal = ref(false)
const deliveringNote = ref<DeliveryNote | null>(null)
const deliverSaving = ref(false)
const recipientName = ref('')
function openDeliverModal(note: DeliveryNote) {
  deliveringNote.value = note
  recipientName.value = ''
  showDeliverModal.value = true
}
async function submitDeliver() {
  if (!deliveringNote.value) return
  deliverSaving.value = true
  try {
    await deliverDeliveryNote(deliveringNote.value.id, recipientName.value)
    showDeliverModal.value = false
    toast.success(t('common.savedOk'))
    await loadNotes()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    deliverSaving.value = false
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'drivers' && !drivers.value.length) loadDrivers()
  if (tab === 'notes' && !notes.value.length) loadNotes()
}

onMounted(async () => {
  await loadPickers()
  await loadVehicles()
  await loadDrivers()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('logistics.title') }}</h1>
      <button v-if="activeTab === 'vehicles'" class="btn" @click="openCreateVehicle">+ {{ t('logistics.newVehicle') }}</button>
      <button v-else-if="activeTab === 'drivers'" class="btn" @click="openCreateDriver">+ {{ t('logistics.newDriver') }}</button>
      <button v-else class="btn" @click="openCreateNote">+ {{ t('logistics.newDeliveryNote') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'vehicles' }" @click="switchTab('vehicles')">{{ t('logistics.tabVehicles') }}</button>
      <button class="tab" :class="{ active: activeTab === 'drivers' }" @click="switchTab('drivers')">{{ t('logistics.tabDrivers') }}</button>
      <button class="tab" :class="{ active: activeTab === 'notes' }" @click="switchTab('notes')">{{ t('logistics.tabDeliveryNotes') }}</button>
    </div>

    <!-- Vehículos -->
    <template v-if="activeTab === 'vehicles'">
      <p v-if="vehiclesLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('logistics.plate') }}</th>
            <th>{{ t('logistics.brand') }}</th>
            <th>{{ t('logistics.model') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in vehicles" :key="v.id">
            <td>{{ v.plate }}</td>
            <td>{{ v.brand }}</td>
            <td>{{ v.model }}</td>
            <td><span class="badge" :class="{ green: v.status === 'available', red: v.status === 'out_of_service' }">{{ t(`logistics.vehicleStatus_${v.status}`) }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditVehicle(v)">{{ t('common.edit') }}</button>
              <button class="btn secondary" @click="viewDeliveries(v)">{{ t('logistics.viewDeliveries') }}</button>
            </td>
          </tr>
          <tr v-if="!vehicles.length">
            <td colspan="5" class="muted">—</td>
          </tr>
        </tbody>
      </table>

      <div v-if="viewingVehicle" style="margin-top: 1.5rem">
        <h3>{{ t('logistics.viewDeliveries') }} — {{ viewingVehicle.plate }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ t('logistics.noteNumber') }}</th>
              <th>{{ t('logistics.destinationAddress') }}</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in vehicleDeliveries" :key="n.id">
              <td>{{ n.noteNumber }}</td>
              <td>{{ n.destinationAddress }}</td>
              <td><span class="badge" :class="{ green: n.status === 'delivered', red: n.status === 'cancelled' }">{{ t(`logistics.noteStatus_${n.status}`) }}</span></td>
            </tr>
            <tr v-if="!vehicleDeliveries.length">
              <td colspan="3" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Conductores -->
    <template v-else-if="activeTab === 'drivers'">
      <p v-if="driversLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('projects.name') }}</th>
            <th>{{ t('logistics.licenseNumber') }}</th>
            <th>{{ t('common.phone') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in drivers" :key="d.id">
            <td>{{ d.name }}</td>
            <td>{{ d.licenseNumber ?? '—' }}</td>
            <td>{{ d.phone ?? '—' }}</td>
            <td><span class="badge" :class="d.isActive ? 'green' : ''">{{ d.isActive ? t('common.active') : t('common.inactive') }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditDriver(d)">{{ t('common.edit') }}</button>
            </td>
          </tr>
          <tr v-if="!drivers.length">
            <td colspan="5" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Guías de entrega -->
    <template v-else>
      <p v-if="notesLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('logistics.noteNumber') }}</th>
            <th>{{ t('logistics.vehicle') }}</th>
            <th>{{ t('logistics.driver') }}</th>
            <th>{{ t('logistics.destinationAddress') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in notes" :key="n.id">
            <td>{{ n.noteNumber }}</td>
            <td>{{ vehicleLabel(n.vehicleId) }}</td>
            <td>{{ driverName(n.driverId) }}</td>
            <td>{{ n.destinationAddress }}</td>
            <td><span class="badge" :class="{ green: n.status === 'delivered', red: n.status === 'cancelled' }">{{ t(`logistics.noteStatus_${n.status}`) }}</span></td>
            <td class="actions-cell">
              <button v-if="n.status === 'planned'" class="btn secondary" @click="handleDispatch(n)">{{ t('logistics.dispatch') }}</button>
              <button v-if="n.status === 'planned'" class="btn secondary" @click="handleCancel(n)">{{ t('common.cancel') }}</button>
              <button v-if="n.status === 'in_transit'" class="btn secondary" @click="openDeliverModal(n)">{{ t('logistics.deliver') }}</button>
            </td>
          </tr>
          <tr v-if="!notes.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Crear/editar vehículo -->
    <div v-if="showVehicleModal" class="modal-backdrop" @click.self="showVehicleModal = false">
      <form class="modal" @submit.prevent="submitVehicle">
        <h2>{{ editingVehicle ? t('common.edit') : t('logistics.newVehicle') }}</h2>
        <div v-if="!editingVehicle" class="field">
          <label>{{ t('logistics.plate') }}</label>
          <input v-model="vehicleForm.plate" required />
        </div>
        <div class="field">
          <label>{{ t('logistics.brand') }}</label>
          <input v-model="vehicleForm.brand" required />
        </div>
        <div class="field">
          <label>{{ t('logistics.model') }}</label>
          <input v-model="vehicleForm.model" required />
        </div>
        <div class="field">
          <label>{{ t('logistics.capacity') }}</label>
          <input v-model.number="vehicleForm.capacityKg" type="number" min="0" step="0.01" />
        </div>
        <div v-if="editingVehicle" class="field">
          <label>Estado</label>
          <select v-model="vehicleForm.status">
            <option value="available">{{ t('logistics.vehicleStatus_available') }}</option>
            <option value="in_route">{{ t('logistics.vehicleStatus_in_route') }}</option>
            <option value="maintenance">{{ t('logistics.vehicleStatus_maintenance') }}</option>
            <option value="out_of_service">{{ t('logistics.vehicleStatus_out_of_service') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('projects.description') }}</label>
          <textarea v-model="vehicleForm.notes" rows="2"></textarea>
        </div>
        <p v-if="vehicleFormError" class="error-text">{{ vehicleFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showVehicleModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="vehicleSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Crear/editar conductor -->
    <div v-if="showDriverModal" class="modal-backdrop" @click.self="showDriverModal = false">
      <form class="modal" @submit.prevent="submitDriver">
        <h2>{{ editingDriver ? t('common.edit') : t('logistics.newDriver') }}</h2>
        <div class="field">
          <label>{{ t('projects.name') }}</label>
          <input v-model="driverForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('logistics.licenseNumber') }}</label>
          <input v-model="driverForm.licenseNumber" />
        </div>
        <div class="field">
          <label>{{ t('common.phone') }}</label>
          <input v-model="driverForm.phone" />
        </div>
        <div v-if="editingDriver" class="field">
          <label>Estado</label>
          <select v-model="driverForm.isActive">
            <option :value="true">{{ t('common.active') }}</option>
            <option :value="false">{{ t('common.inactive') }}</option>
          </select>
        </div>
        <p v-if="driverFormError" class="error-text">{{ driverFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showDriverModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="driverSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Nueva guía de entrega -->
    <div v-if="showNoteModal" class="modal-backdrop" @click.self="showNoteModal = false">
      <form class="modal" @submit.prevent="submitNote">
        <h2>{{ t('logistics.newDeliveryNote') }}</h2>
        <div class="field">
          <label>{{ t('logistics.vehicle') }}</label>
          <select v-model="noteForm.vehicleId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.plate }} ({{ v.brand }} {{ v.model }})</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('logistics.driver') }}</label>
          <select v-model="noteForm.driverId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('production.warehouse') }}</label>
          <select v-model="noteForm.warehouseId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('logistics.relatedInvoice') }}</label>
          <select v-model="noteForm.relatedInvoiceId">
            <option value="">{{ t('documents.noneOption') }}</option>
            <option v-for="inv in invoices" :key="inv.id" :value="inv.id">{{ inv.invoiceNumber }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('logistics.destinationAddress') }}</label>
          <textarea v-model="noteForm.destinationAddress" rows="2" required></textarea>
        </div>
        <div class="field">
          <label>{{ t('projects.description') }}</label>
          <textarea v-model="noteForm.notes" rows="2"></textarea>
        </div>

        <label class="section-label">{{ t('logistics.items') }}</label>
        <div v-for="(item, i) in noteForm.items" :key="i" class="scored-row">
          <select v-model="item.productId" required>
            <option value="" disabled>{{ t('production.component') }}</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
          </select>
          <input v-model.number="item.quantity" type="number" min="0.0001" step="0.0001" required />
          <button type="button" class="btn secondary" @click="removeNoteItem(i)">✕</button>
        </div>
        <button type="button" class="btn secondary" @click="addNoteItem">{{ t('logistics.addItem') }}</button>

        <p v-if="noteFormError" class="error-text">{{ noteFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showNoteModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="noteSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Entregar guía -->
    <div v-if="showDeliverModal" class="modal-backdrop" @click.self="showDeliverModal = false">
      <form class="modal" @submit.prevent="submitDeliver">
        <h2>{{ t('logistics.deliver') }}</h2>
        <p class="muted">{{ deliveringNote?.noteNumber }}</p>
        <div class="field">
          <label>{{ t('logistics.recipientName') }}</label>
          <input v-model="recipientName" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showDeliverModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="deliverSaving">{{ t('common.save') }}</button>
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
