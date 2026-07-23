<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listFixedAssetsPaginated,
  getFixedAsset,
  createFixedAsset,
  updateFixedAsset,
  transferFixedAsset,
  recordFixedAssetMaintenance,
  disposeFixedAsset,
  runDepreciation,
  listFixedAssetMovements,
  listFixedAssetDepreciationEntries,
} from '@/api/fixed-assets'
import { branchesApi, type Branch } from '@/api/org'
import { listUsers, type TenantUser } from '@/api/users'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { FixedAsset, FixedAssetMovement, FixedAssetDepreciationEntry } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const { items: assets, total, page, totalPages, loading, error, search, filters, load, applyAndReload, goToPage } =
  usePaginatedList<FixedAsset, { status?: string }>(listFixedAssetsPaginated, { defaultSortBy: 'assetNumber' })

let searchDebounce: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(applyAndReload, 300)
}

function onStatusFilterChange() {
  applyAndReload()
}

const branches = ref<Branch[]>([])
const users = ref<TenantUser[]>([])
async function loadPickers() {
  try {
    const [branchesData, usersData] = await Promise.all([branchesApi.list(), listUsers()])
    branches.value = branchesData
    users.value = usersData
  } catch {
    // Pickers are a convenience for the forms — a failure here shouldn't
    // block the asset list itself.
  }
}
function branchName(id: string | null) {
  if (!id) return '—'
  return branches.value.find((b) => b.id === id)?.name ?? '—'
}
function userName(id: string | null) {
  if (!id) return '—'
  return users.value.find((u) => u.id === id)?.fullName ?? '—'
}

const statusBadge: Record<string, string> = {
  active: 'green',
  under_maintenance: 'amber',
  disposed: 'red',
}

function bookValue(asset: FixedAsset): number {
  return Number(asset.purchaseCost) - Number(asset.accumulatedDepreciation)
}

// --- Create modal ---
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({
  name: '',
  description: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchaseCost: 0,
  usefulLifeMonths: 36,
  salvageValue: 0,
  locationBranchId: '',
  responsibleUserId: '',
})

function openCreateModal() {
  form.value = {
    name: '',
    description: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseCost: 0,
    usefulLifeMonths: 36,
    salvageValue: 0,
    locationBranchId: '',
    responsibleUserId: '',
  }
  formError.value = ''
  showModal.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    await createFixedAsset({
      name: form.value.name,
      description: form.value.description || undefined,
      purchaseDate: form.value.purchaseDate,
      purchaseCost: form.value.purchaseCost,
      usefulLifeMonths: form.value.usefulLifeMonths,
      salvageValue: form.value.salvageValue,
      locationBranchId: form.value.locationBranchId || undefined,
      responsibleUserId: form.value.responsibleUserId || undefined,
    })
    showModal.value = false
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}

// --- Run depreciation ---
const showDepreciationModal = ref(false)
const depreciationPeriod = ref(new Date().toISOString().slice(0, 10))
const depreciationSaving = ref(false)
async function submitRunDepreciation() {
  depreciationSaving.value = true
  try {
    const result = await runDepreciation(depreciationPeriod.value)
    toast.success(t('fixedAssets.depreciationRunOk', { count: result.assetsDepreciated, amount: result.totalAmount.toLocaleString() }))
    showDepreciationModal.value = false
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    depreciationSaving.value = false
  }
}

// --- Detail modal ---
const detailAsset = ref<FixedAsset | null>(null)
const detailLoadingId = ref<string | null>(null)
const movements = ref<FixedAssetMovement[]>([])
const depreciationEntries = ref<FixedAssetDepreciationEntry[]>([])
const actionSaving = ref(false)
const editingId = ref<string | null>(null)
const editForm = ref({ name: '', description: '', locationBranchId: '', responsibleUserId: '' })

async function openDetail(asset: FixedAsset) {
  detailLoadingId.value = asset.id
  try {
    const [full, movementsData, depreciationData] = await Promise.all([
      getFixedAsset(asset.id),
      listFixedAssetMovements(asset.id),
      listFixedAssetDepreciationEntries(asset.id),
    ])
    detailAsset.value = full
    movements.value = movementsData
    depreciationEntries.value = depreciationData
    editingId.value = null
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    detailLoadingId.value = null
  }
}

async function refreshDetail() {
  if (!detailAsset.value) return
  try {
    const [full, movementsData, depreciationData] = await Promise.all([
      getFixedAsset(detailAsset.value.id),
      listFixedAssetMovements(detailAsset.value.id),
      listFixedAssetDepreciationEntries(detailAsset.value.id),
    ])
    detailAsset.value = full
    movements.value = movementsData
    depreciationEntries.value = depreciationData
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

function startEdit() {
  if (!detailAsset.value) return
  editingId.value = detailAsset.value.id
  editForm.value = {
    name: detailAsset.value.name,
    description: detailAsset.value.description ?? '',
    locationBranchId: detailAsset.value.locationBranchId ?? '',
    responsibleUserId: detailAsset.value.responsibleUserId ?? '',
  }
}
async function submitEdit() {
  if (!editingId.value) return
  actionSaving.value = true
  try {
    await updateFixedAsset(editingId.value, {
      name: editForm.value.name,
      description: editForm.value.description || undefined,
      locationBranchId: editForm.value.locationBranchId || undefined,
      responsibleUserId: editForm.value.responsibleUserId || undefined,
    })
    editingId.value = null
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}

const transferForm = ref({ toBranchId: '', note: '' })
async function submitTransfer() {
  if (!detailAsset.value) return
  actionSaving.value = true
  try {
    await transferFixedAsset(detailAsset.value.id, transferForm.value)
    transferForm.value = { toBranchId: '', note: '' }
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}

const maintenanceForm = ref({ date: new Date().toISOString().slice(0, 10), note: '', cost: 0 })
async function submitMaintenance() {
  if (!detailAsset.value) return
  actionSaving.value = true
  try {
    await recordFixedAssetMaintenance(detailAsset.value.id, {
      date: maintenanceForm.value.date,
      note: maintenanceForm.value.note || undefined,
      cost: maintenanceForm.value.cost || undefined,
    })
    maintenanceForm.value = { date: new Date().toISOString().slice(0, 10), note: '', cost: 0 }
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}

async function handleDispose() {
  if (!detailAsset.value) return
  if (!confirm(t('fixedAssets.confirmDispose'))) return
  actionSaving.value = true
  try {
    await disposeFixedAsset(detailAsset.value.id, { date: new Date().toISOString().slice(0, 10) })
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
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
      <h1>{{ t('fixedAssets.title') }}</h1>
      <div style="display: flex; gap: 0.5rem">
        <button class="btn secondary" @click="showDepreciationModal = true">{{ t('fixedAssets.runDepreciation') }}</button>
        <button class="btn" @click="openCreateModal">+ {{ t('fixedAssets.newAsset') }}</button>
      </div>
    </div>

    <div class="list-filters">
      <input v-model="search" type="text" class="search-input" :placeholder="t('common.search')" @input="onSearchInput" />
      <select v-model="filters.status" @change="onStatusFilterChange">
        <option :value="undefined">{{ t('common.active') }}/{{ t('common.inactive') }} —</option>
        <option value="active">{{ t('fixedAssets.status.active') }}</option>
        <option value="under_maintenance">{{ t('fixedAssets.status.under_maintenance') }}</option>
        <option value="disposed">{{ t('fixedAssets.status.disposed') }}</option>
      </select>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <template v-else>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t('common.name') }}</th>
            <th>{{ t('fixedAssets.cost') }}</th>
            <th>{{ t('fixedAssets.bookValue') }}</th>
            <th>{{ t('fixedAssets.location') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in assets" :key="a.id">
            <td>{{ a.assetNumber }}</td>
            <td>{{ a.name }}</td>
            <td>{{ Number(a.purchaseCost).toLocaleString() }}</td>
            <td>{{ bookValue(a).toLocaleString() }}</td>
            <td>{{ branchName(a.locationBranchId) }}</td>
            <td><span class="badge" :class="statusBadge[a.status]">{{ t(`fixedAssets.status.${a.status}`) }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" :disabled="detailLoadingId === a.id" @click="openDetail(a)">
                {{ t('invoices.viewDetail') }}
              </button>
            </td>
          </tr>
          <tr v-if="!assets.length">
            <td colspan="7" class="muted">—</td>
          </tr>
        </tbody>
      </table>
      <Pagination :page="page" :total-pages="totalPages" :total="total" @go="goToPage" />
    </template>

    <!-- Create asset modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ t('fixedAssets.newAsset') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="form.name" required />
        </div>
        <div class="field">
          <label>{{ t('quotes.description') }}</label>
          <input v-model="form.description" />
        </div>
        <div class="field">
          <label>{{ t('fixedAssets.purchaseDate') }}</label>
          <input v-model="form.purchaseDate" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('fixedAssets.cost') }}</label>
          <input v-model.number="form.purchaseCost" type="number" min="0.01" step="0.01" required />
        </div>
        <div class="field">
          <label>{{ t('fixedAssets.usefulLifeMonths') }}</label>
          <input v-model.number="form.usefulLifeMonths" type="number" min="1" step="1" required />
        </div>
        <div class="field">
          <label>{{ t('fixedAssets.salvageValue') }}</label>
          <input v-model.number="form.salvageValue" type="number" min="0" step="0.01" />
        </div>
        <div class="field">
          <label>{{ t('fixedAssets.location') }}</label>
          <select v-model="form.locationBranchId">
            <option value="">—</option>
            <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('fixedAssets.responsible') }}</label>
          <select v-model="form.responsibleUserId">
            <option value="">—</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
          </select>
        </div>
        <p v-if="formError" class="error-text">{{ formError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="saving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Run depreciation modal -->
    <div v-if="showDepreciationModal" class="modal-backdrop" @click.self="showDepreciationModal = false">
      <form class="modal" @submit.prevent="submitRunDepreciation">
        <h2>{{ t('fixedAssets.runDepreciation') }}</h2>
        <p class="muted">{{ t('fixedAssets.runDepreciationHint') }}</p>
        <div class="field">
          <label>{{ t('fixedAssets.period') }}</label>
          <input v-model="depreciationPeriod" type="date" required />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showDepreciationModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="depreciationSaving">{{ t('fixedAssets.runDepreciation') }}</button>
        </div>
      </form>
    </div>

    <!-- Asset detail modal -->
    <div v-if="detailAsset" class="modal-backdrop" @click.self="detailAsset = null">
      <div class="modal wide">
        <h2>{{ detailAsset.assetNumber }} — {{ detailAsset.name }}</h2>
        <p><span class="badge" :class="statusBadge[detailAsset.status]">{{ t(`fixedAssets.status.${detailAsset.status}`) }}</span></p>

        <template v-if="editingId === detailAsset.id">
          <form @submit.prevent="submitEdit">
            <div class="field">
              <label>{{ t('common.name') }}</label>
              <input v-model="editForm.name" required />
            </div>
            <div class="field">
              <label>{{ t('quotes.description') }}</label>
              <input v-model="editForm.description" />
            </div>
            <div class="field">
              <label>{{ t('fixedAssets.location') }}</label>
              <select v-model="editForm.locationBranchId">
                <option value="">—</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('fixedAssets.responsible') }}</label>
              <select v-model="editForm.responsibleUserId">
                <option value="">—</option>
                <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
              </select>
            </div>
            <div class="modal-actions" style="justify-content: flex-start">
              <button type="button" class="btn secondary" @click="editingId = null">{{ t('common.cancel') }}</button>
              <button type="submit" class="btn" :disabled="actionSaving">{{ t('common.save') }}</button>
            </div>
          </form>
        </template>
        <template v-else>
          <p class="total-line">{{ t('fixedAssets.cost') }}: {{ Number(detailAsset.purchaseCost).toLocaleString() }}</p>
          <p class="total-line">{{ t('fixedAssets.accumulatedDepreciation') }}: {{ Number(detailAsset.accumulatedDepreciation).toLocaleString() }}</p>
          <p class="total-line">{{ t('fixedAssets.bookValue') }}: {{ bookValue(detailAsset).toLocaleString() }}</p>
          <p class="total-line">{{ t('fixedAssets.location') }}: {{ branchName(detailAsset.locationBranchId) }}</p>
          <p class="total-line">{{ t('fixedAssets.responsible') }}: {{ userName(detailAsset.responsibleUserId) }}</p>

          <div class="modal-actions" style="justify-content: flex-start; flex-wrap: wrap; gap: 0.5rem">
            <button v-if="detailAsset.status !== 'disposed'" class="btn secondary" @click="startEdit">{{ t('common.edit') }}</button>
            <button v-if="detailAsset.status !== 'disposed'" class="btn secondary" :disabled="actionSaving" @click="handleDispose">
              {{ t('fixedAssets.dispose') }}
            </button>
          </div>
        </template>

        <template v-if="detailAsset.status !== 'disposed'">
          <h3 class="section-title">{{ t('fixedAssets.transfer') }}</h3>
          <form class="inline-form" @submit.prevent="submitTransfer">
            <select v-model="transferForm.toBranchId" required>
              <option value="" disabled>{{ t('fixedAssets.destinationBranch') }}</option>
              <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <input v-model="transferForm.note" :placeholder="t('quotes.description')" />
            <button type="submit" class="btn secondary" :disabled="actionSaving">{{ t('fixedAssets.transfer') }}</button>
          </form>

          <h3 class="section-title">{{ t('fixedAssets.recordMaintenance') }}</h3>
          <form class="inline-form" @submit.prevent="submitMaintenance">
            <input v-model="maintenanceForm.date" type="date" required />
            <input v-model.number="maintenanceForm.cost" type="number" min="0" step="0.01" :placeholder="t('invoices.amount')" />
            <input v-model="maintenanceForm.note" :placeholder="t('quotes.description')" />
            <button type="submit" class="btn secondary" :disabled="actionSaving">{{ t('fixedAssets.recordMaintenance') }}</button>
          </form>
        </template>

        <h3 class="section-title">{{ t('fixedAssets.movements') }}</h3>
        <ul class="detail-list">
          <li v-for="m in movements" :key="m.id">
            {{ m.date }} — {{ t(`fixedAssets.movementType.${m.type}`) }}
            <span v-if="m.cost" class="muted">({{ Number(m.cost).toLocaleString() }})</span>
            <span v-if="m.note" class="muted">— {{ m.note }}</span>
          </li>
          <li v-if="!movements.length" class="muted">—</li>
        </ul>

        <h3 class="section-title">{{ t('fixedAssets.depreciationHistory') }}</h3>
        <ul class="detail-list">
          <li v-for="d in depreciationEntries" :key="d.id">
            {{ d.period }} — {{ Number(d.amount).toLocaleString() }} ({{ t('fixedAssets.accumulatedDepreciation') }}: {{ Number(d.accumulatedAfter).toLocaleString() }})
          </li>
          <li v-if="!depreciationEntries.length" class="muted">—</li>
        </ul>

        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="detailAsset = null">{{ t('common.cancel') }}</button>
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
.total-line {
  font-weight: 600;
  margin-top: 0.5rem;
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
