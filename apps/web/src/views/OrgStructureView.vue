<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  branchesApi,
  costCentersApi,
  departmentsApi,
  positionsApi,
  documentSeriesApi,
  assignUserOrg,
  type Branch,
  type CostCenter,
  type Department,
  type Position,
  type DocumentSeries,
} from '@/api/org'
import { listUsers, type TenantUser } from '@/api/users'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'

const { t } = useI18n()
const toast = useToastStore()

type Tab = 'branches' | 'costCenters' | 'departments' | 'positions' | 'documentSeries' | 'orgChart'
const activeTab = ref<Tab>('branches')

const loading = ref(true)
const error = ref('')

const branches = ref<Branch[]>([])
const costCenters = ref<CostCenter[]>([])
const departments = ref<Department[]>([])
const positions = ref<Position[]>([])
const documentSeries = ref<DocumentSeries[]>([])
const users = ref<TenantUser[]>([])

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const [branchesData, costCentersData, departmentsData, positionsData, seriesData, usersData] = await Promise.all([
      branchesApi.list(),
      costCentersApi.list(),
      departmentsApi.list(),
      positionsApi.list(),
      documentSeriesApi.list(),
      listUsers(),
    ])
    branches.value = branchesData
    costCenters.value = costCentersData
    departments.value = departmentsData
    positions.value = positionsData
    documentSeries.value = seriesData
    users.value = usersData
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function branchName(id: string | null) {
  return branches.value.find((b) => b.id === id)?.name ?? '—'
}
function costCenterName(id: string | null) {
  return costCenters.value.find((c) => c.id === id)?.name ?? '—'
}
function departmentName(id: string | null) {
  return departments.value.find((d) => d.id === id)?.name ?? '—'
}
function userName(id: string | null) {
  return users.value.find((u) => u.id === id)?.fullName ?? '—'
}

// --- Branches ---
const showBranchModal = ref(false)
const editingBranchId = ref<string | null>(null)
const branchForm = ref({ name: '', code: '', address: '', timezone: '', isDefault: false })
const branchSaving = ref(false)
const branchError = ref('')

function openCreateBranch() {
  editingBranchId.value = null
  branchForm.value = { name: '', code: '', address: '', timezone: '', isDefault: false }
  branchError.value = ''
  showBranchModal.value = true
}
function openEditBranch(branch: Branch) {
  editingBranchId.value = branch.id
  branchForm.value = {
    name: branch.name,
    code: branch.code ?? '',
    address: branch.address ?? '',
    timezone: branch.timezone ?? '',
    isDefault: branch.isDefault,
  }
  branchError.value = ''
  showBranchModal.value = true
}
async function submitBranch() {
  branchSaving.value = true
  branchError.value = ''
  try {
    const payload = {
      name: branchForm.value.name,
      code: branchForm.value.code || undefined,
      address: branchForm.value.address || undefined,
      timezone: branchForm.value.timezone || undefined,
      isDefault: branchForm.value.isDefault,
    }
    if (editingBranchId.value) await branchesApi.update(editingBranchId.value, payload)
    else await branchesApi.create(payload)
    showBranchModal.value = false
    toast.success(t('common.savedOk'))
    await loadAll()
  } catch (err) {
    branchError.value = getErrorMessage(err)
  } finally {
    branchSaving.value = false
  }
}
async function removeBranch(branch: Branch) {
  if (!confirm(t('common.confirmDelete'))) return
  try {
    await branchesApi.remove(branch.id)
    toast.success(t('common.deletedOk'))
    await loadAll()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Cost centers ---
const showCostCenterModal = ref(false)
const editingCostCenterId = ref<string | null>(null)
const costCenterForm = ref({ name: '', code: '' })
const costCenterSaving = ref(false)
const costCenterError = ref('')

function openCreateCostCenter() {
  editingCostCenterId.value = null
  costCenterForm.value = { name: '', code: '' }
  costCenterError.value = ''
  showCostCenterModal.value = true
}
function openEditCostCenter(costCenter: CostCenter) {
  editingCostCenterId.value = costCenter.id
  costCenterForm.value = { name: costCenter.name, code: costCenter.code ?? '' }
  costCenterError.value = ''
  showCostCenterModal.value = true
}
async function submitCostCenter() {
  costCenterSaving.value = true
  costCenterError.value = ''
  try {
    const payload = { name: costCenterForm.value.name, code: costCenterForm.value.code || undefined }
    if (editingCostCenterId.value) await costCentersApi.update(editingCostCenterId.value, payload)
    else await costCentersApi.create(payload)
    showCostCenterModal.value = false
    toast.success(t('common.savedOk'))
    await loadAll()
  } catch (err) {
    costCenterError.value = getErrorMessage(err)
  } finally {
    costCenterSaving.value = false
  }
}
async function removeCostCenter(costCenter: CostCenter) {
  if (!confirm(t('common.confirmDelete'))) return
  try {
    await costCentersApi.remove(costCenter.id)
    toast.success(t('common.deletedOk'))
    await loadAll()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Departments ---
const showDepartmentModal = ref(false)
const editingDepartmentId = ref<string | null>(null)
const departmentForm = ref({ name: '', branchId: '', costCenterId: '' })
const departmentSaving = ref(false)
const departmentError = ref('')

function openCreateDepartment() {
  editingDepartmentId.value = null
  departmentForm.value = { name: '', branchId: '', costCenterId: '' }
  departmentError.value = ''
  showDepartmentModal.value = true
}
function openEditDepartment(department: Department) {
  editingDepartmentId.value = department.id
  departmentForm.value = {
    name: department.name,
    branchId: department.branchId ?? '',
    costCenterId: department.costCenterId ?? '',
  }
  departmentError.value = ''
  showDepartmentModal.value = true
}
async function submitDepartment() {
  departmentSaving.value = true
  departmentError.value = ''
  try {
    const payload = {
      name: departmentForm.value.name,
      branchId: departmentForm.value.branchId || undefined,
      costCenterId: departmentForm.value.costCenterId || undefined,
    }
    if (editingDepartmentId.value) await departmentsApi.update(editingDepartmentId.value, payload)
    else await departmentsApi.create(payload)
    showDepartmentModal.value = false
    toast.success(t('common.savedOk'))
    await loadAll()
  } catch (err) {
    departmentError.value = getErrorMessage(err)
  } finally {
    departmentSaving.value = false
  }
}
async function removeDepartment(department: Department) {
  if (!confirm(t('common.confirmDelete'))) return
  try {
    await departmentsApi.remove(department.id)
    toast.success(t('common.deletedOk'))
    await loadAll()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Positions ---
const showPositionModal = ref(false)
const editingPositionId = ref<string | null>(null)
const positionForm = ref({ name: '', departmentId: '' })
const positionSaving = ref(false)
const positionError = ref('')

function openCreatePosition() {
  editingPositionId.value = null
  positionForm.value = { name: '', departmentId: '' }
  positionError.value = ''
  showPositionModal.value = true
}
function openEditPosition(position: Position) {
  editingPositionId.value = position.id
  positionForm.value = { name: position.name, departmentId: position.departmentId ?? '' }
  positionError.value = ''
  showPositionModal.value = true
}
async function submitPosition() {
  positionSaving.value = true
  positionError.value = ''
  try {
    const payload = { name: positionForm.value.name, departmentId: positionForm.value.departmentId || undefined }
    if (editingPositionId.value) await positionsApi.update(editingPositionId.value, payload)
    else await positionsApi.create(payload)
    showPositionModal.value = false
    toast.success(t('common.savedOk'))
    await loadAll()
  } catch (err) {
    positionError.value = getErrorMessage(err)
  } finally {
    positionSaving.value = false
  }
}
async function removePosition(position: Position) {
  if (!confirm(t('common.confirmDelete'))) return
  try {
    await positionsApi.remove(position.id)
    toast.success(t('common.deletedOk'))
    await loadAll()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Document series ---
const showSeriesModal = ref(false)
const seriesForm = ref({ documentType: 'quote', branchId: '', prefix: '', nextNumber: 1, padding: 6 })
const seriesSaving = ref(false)
const seriesError = ref('')

function openCreateSeries() {
  seriesForm.value = { documentType: 'quote', branchId: '', prefix: '', nextNumber: 1, padding: 6 }
  seriesError.value = ''
  showSeriesModal.value = true
}
async function submitSeries() {
  seriesSaving.value = true
  seriesError.value = ''
  try {
    await documentSeriesApi.create({
      documentType: seriesForm.value.documentType as DocumentSeries['documentType'],
      branchId: seriesForm.value.branchId || undefined,
      prefix: seriesForm.value.prefix,
      nextNumber: seriesForm.value.nextNumber,
      padding: seriesForm.value.padding,
    })
    showSeriesModal.value = false
    toast.success(t('common.savedOk'))
    await loadAll()
  } catch (err) {
    seriesError.value = getErrorMessage(err)
  } finally {
    seriesSaving.value = false
  }
}
async function removeSeries(series: DocumentSeries) {
  if (!confirm(t('common.confirmDelete'))) return
  try {
    await documentSeriesApi.remove(series.id)
    toast.success(t('common.deletedOk'))
    await loadAll()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Org chart / user assignment ---
interface OrgDraft {
  managerId: string
  branchId: string
  departmentId: string
  positionId: string
}
const savingUserId = ref<string | null>(null)
const userDrafts = ref<Record<string, OrgDraft>>({})

function draftFor(user: TenantUser): OrgDraft {
  const existing = userDrafts.value[user.id]
  if (existing) return existing
  const created: OrgDraft = {
    managerId: user.managerId ?? '',
    branchId: user.branchId ?? '',
    departmentId: user.departmentId ?? '',
    positionId: user.positionId ?? '',
  }
  userDrafts.value[user.id] = created
  return created
}

async function saveUserOrg(user: TenantUser) {
  const draft = draftFor(user)
  savingUserId.value = user.id
  try {
    await assignUserOrg(user.id, {
      managerId: draft.managerId || undefined,
      branchId: draft.branchId || undefined,
      departmentId: draft.departmentId || undefined,
      positionId: draft.positionId || undefined,
    })
    toast.success(t('common.savedOk'))
    await loadAll()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    savingUserId.value = null
  }
}

const rootUsers = computed(() => users.value.filter((u) => !u.managerId))
function directReports(managerId: string) {
  return users.value.filter((u) => u.managerId === managerId)
}

onMounted(loadAll)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('orgStructure.title') }}</h1>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'branches' }" @click="activeTab = 'branches'">
        {{ t('orgStructure.branches') }}
      </button>
      <button class="tab" :class="{ active: activeTab === 'costCenters' }" @click="activeTab = 'costCenters'">
        {{ t('orgStructure.costCenters') }}
      </button>
      <button class="tab" :class="{ active: activeTab === 'departments' }" @click="activeTab = 'departments'">
        {{ t('orgStructure.departments') }}
      </button>
      <button class="tab" :class="{ active: activeTab === 'positions' }" @click="activeTab = 'positions'">
        {{ t('orgStructure.positions') }}
      </button>
      <button class="tab" :class="{ active: activeTab === 'documentSeries' }" @click="activeTab = 'documentSeries'">
        {{ t('orgStructure.documentSeries') }}
      </button>
      <button class="tab" :class="{ active: activeTab === 'orgChart' }" @click="activeTab = 'orgChart'">
        {{ t('orgStructure.orgChart') }}
      </button>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>

    <template v-else>
      <!-- Branches -->
      <div v-if="activeTab === 'branches'">
        <div class="page-header">
          <p class="muted">{{ t('orgStructure.branchesSubtitle') }}</p>
          <button class="btn" @click="openCreateBranch">+ {{ t('orgStructure.newBranch') }}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('common.name') }}</th>
              <th>{{ t('orgStructure.code') }}</th>
              <th>{{ t('orgStructure.timezone') }}</th>
              <th>{{ t('orgStructure.default') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in branches" :key="b.id">
              <td>{{ b.name }}</td>
              <td>{{ b.code || '—' }}</td>
              <td>{{ b.timezone || '—' }}</td>
              <td>{{ b.isDefault ? t('common.yes') : '—' }}</td>
              <td class="actions-cell">
                <button class="btn secondary" @click="openEditBranch(b)">{{ t('common.edit') }}</button>
                <button class="btn secondary" @click="removeBranch(b)">{{ t('common.delete') }}</button>
              </td>
            </tr>
            <tr v-if="!branches.length">
              <td colspan="5" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Cost centers -->
      <div v-else-if="activeTab === 'costCenters'">
        <div class="page-header">
          <p class="muted">{{ t('orgStructure.costCentersSubtitle') }}</p>
          <button class="btn" @click="openCreateCostCenter">+ {{ t('orgStructure.newCostCenter') }}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('common.name') }}</th>
              <th>{{ t('orgStructure.code') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in costCenters" :key="c.id">
              <td>{{ c.name }}</td>
              <td>{{ c.code || '—' }}</td>
              <td class="actions-cell">
                <button class="btn secondary" @click="openEditCostCenter(c)">{{ t('common.edit') }}</button>
                <button class="btn secondary" @click="removeCostCenter(c)">{{ t('common.delete') }}</button>
              </td>
            </tr>
            <tr v-if="!costCenters.length">
              <td colspan="3" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Departments -->
      <div v-else-if="activeTab === 'departments'">
        <div class="page-header">
          <p class="muted">{{ t('orgStructure.departmentsSubtitle') }}</p>
          <button class="btn" @click="openCreateDepartment">+ {{ t('orgStructure.newDepartment') }}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('common.name') }}</th>
              <th>{{ t('orgStructure.branches') }}</th>
              <th>{{ t('orgStructure.costCenters') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in departments" :key="d.id">
              <td>{{ d.name }}</td>
              <td>{{ branchName(d.branchId) }}</td>
              <td>{{ costCenterName(d.costCenterId) }}</td>
              <td class="actions-cell">
                <button class="btn secondary" @click="openEditDepartment(d)">{{ t('common.edit') }}</button>
                <button class="btn secondary" @click="removeDepartment(d)">{{ t('common.delete') }}</button>
              </td>
            </tr>
            <tr v-if="!departments.length">
              <td colspan="4" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Positions -->
      <div v-else-if="activeTab === 'positions'">
        <div class="page-header">
          <p class="muted">{{ t('orgStructure.positionsSubtitle') }}</p>
          <button class="btn" @click="openCreatePosition">+ {{ t('orgStructure.newPosition') }}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('common.name') }}</th>
              <th>{{ t('orgStructure.departments') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in positions" :key="p.id">
              <td>{{ p.name }}</td>
              <td>{{ departmentName(p.departmentId) }}</td>
              <td class="actions-cell">
                <button class="btn secondary" @click="openEditPosition(p)">{{ t('common.edit') }}</button>
                <button class="btn secondary" @click="removePosition(p)">{{ t('common.delete') }}</button>
              </td>
            </tr>
            <tr v-if="!positions.length">
              <td colspan="3" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Document series -->
      <div v-else-if="activeTab === 'documentSeries'">
        <div class="page-header">
          <p class="muted">{{ t('orgStructure.documentSeriesSubtitle') }}</p>
          <button class="btn" @click="openCreateSeries">+ {{ t('orgStructure.newSeries') }}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('orgStructure.documentType') }}</th>
              <th>{{ t('orgStructure.branches') }}</th>
              <th>{{ t('orgStructure.prefix') }}</th>
              <th>{{ t('orgStructure.nextNumber') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in documentSeries" :key="s.id">
              <td>{{ s.documentType }}</td>
              <td>{{ s.branchId ? branchName(s.branchId) : t('orgStructure.tenantWide') }}</td>
              <td>{{ s.prefix }}</td>
              <td>{{ String(s.nextNumber).padStart(s.padding, '0') }}</td>
              <td class="actions-cell">
                <button class="btn secondary" @click="removeSeries(s)">{{ t('common.delete') }}</button>
              </td>
            </tr>
            <tr v-if="!documentSeries.length">
              <td colspan="5" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Org chart -->
      <div v-else-if="activeTab === 'orgChart'">
        <p class="muted" style="margin-bottom: 1rem">{{ t('orgStructure.orgChartSubtitle') }}</p>
        <div class="card" style="margin-bottom: 1rem" v-for="user in users" :key="user.id">
          <div class="org-user-row">
            <div>
              <strong>{{ user.fullName }}</strong>
              <span class="muted"> — {{ user.role?.name }}</span>
              <div class="muted" style="font-size: 0.8rem">
                {{ t('orgStructure.reportsTo') }}: {{ userName(user.managerId) }}
              </div>
            </div>
            <div class="org-user-fields">
              <select v-model="draftFor(user).managerId">
                <option value="">{{ t('orgStructure.noManager') }}</option>
                <option v-for="u in users.filter((candidate) => candidate.id !== user.id)" :key="u.id" :value="u.id">
                  {{ u.fullName }}
                </option>
              </select>
              <select v-model="draftFor(user).branchId">
                <option value="">{{ t('orgStructure.noBranch') }}</option>
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
              <select v-model="draftFor(user).departmentId">
                <option value="">{{ t('orgStructure.noDepartment') }}</option>
                <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
              <select v-model="draftFor(user).positionId">
                <option value="">{{ t('orgStructure.noPosition') }}</option>
                <option v-for="p in positions" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <button class="btn secondary" :disabled="savingUserId === user.id" @click="saveUserOrg(user)">
                {{ t('common.save') }}
              </button>
            </div>
          </div>
        </div>

        <h2 class="section-title">{{ t('orgStructure.tree') }}</h2>
        <ul class="org-tree">
          <li v-for="root in rootUsers" :key="root.id">
            {{ root.fullName }}
            <ul v-if="directReports(root.id).length">
              <li v-for="report in directReports(root.id)" :key="report.id">{{ report.fullName }}</li>
            </ul>
          </li>
        </ul>
      </div>
    </template>

    <!-- Branch modal -->
    <div v-if="showBranchModal" class="modal-backdrop" @click.self="showBranchModal = false">
      <form class="modal" @submit.prevent="submitBranch">
        <h2>{{ editingBranchId ? t('common.edit') : t('orgStructure.newBranch') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="branchForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('orgStructure.code') }}</label>
          <input v-model="branchForm.code" />
        </div>
        <div class="field">
          <label>{{ t('orgStructure.address') }}</label>
          <input v-model="branchForm.address" />
        </div>
        <div class="field">
          <label>{{ t('orgStructure.timezone') }}</label>
          <input v-model="branchForm.timezone" placeholder="America/Bogota" />
        </div>
        <label class="checkbox-field">
          <input v-model="branchForm.isDefault" type="checkbox" />
          {{ t('orgStructure.default') }}
        </label>
        <p v-if="branchError" class="error-text">{{ branchError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showBranchModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="branchSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Cost center modal -->
    <div v-if="showCostCenterModal" class="modal-backdrop" @click.self="showCostCenterModal = false">
      <form class="modal" @submit.prevent="submitCostCenter">
        <h2>{{ editingCostCenterId ? t('common.edit') : t('orgStructure.newCostCenter') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="costCenterForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('orgStructure.code') }}</label>
          <input v-model="costCenterForm.code" />
        </div>
        <p v-if="costCenterError" class="error-text">{{ costCenterError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showCostCenterModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="costCenterSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Department modal -->
    <div v-if="showDepartmentModal" class="modal-backdrop" @click.self="showDepartmentModal = false">
      <form class="modal" @submit.prevent="submitDepartment">
        <h2>{{ editingDepartmentId ? t('common.edit') : t('orgStructure.newDepartment') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="departmentForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('orgStructure.branches') }}</label>
          <select v-model="departmentForm.branchId">
            <option value="">—</option>
            <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('orgStructure.costCenters') }}</label>
          <select v-model="departmentForm.costCenterId">
            <option value="">—</option>
            <option v-for="c in costCenters" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <p v-if="departmentError" class="error-text">{{ departmentError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showDepartmentModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="departmentSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Position modal -->
    <div v-if="showPositionModal" class="modal-backdrop" @click.self="showPositionModal = false">
      <form class="modal" @submit.prevent="submitPosition">
        <h2>{{ editingPositionId ? t('common.edit') : t('orgStructure.newPosition') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="positionForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('orgStructure.departments') }}</label>
          <select v-model="positionForm.departmentId">
            <option value="">—</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <p v-if="positionError" class="error-text">{{ positionError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showPositionModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="positionSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Document series modal -->
    <div v-if="showSeriesModal" class="modal-backdrop" @click.self="showSeriesModal = false">
      <form class="modal" @submit.prevent="submitSeries">
        <h2>{{ t('orgStructure.newSeries') }}</h2>
        <div class="field">
          <label>{{ t('orgStructure.documentType') }}</label>
          <select v-model="seriesForm.documentType">
            <option value="quote">quote</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('orgStructure.branches') }}</label>
          <select v-model="seriesForm.branchId">
            <option value="">{{ t('orgStructure.tenantWide') }}</option>
            <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('orgStructure.prefix') }}</label>
          <input v-model="seriesForm.prefix" required />
        </div>
        <div class="field">
          <label>{{ t('orgStructure.nextNumber') }}</label>
          <input v-model.number="seriesForm.nextNumber" type="number" min="1" />
        </div>
        <div class="field">
          <label>{{ t('orgStructure.padding') }}</label>
          <input v-model.number="seriesForm.padding" type="number" min="1" />
        </div>
        <p v-if="seriesError" class="error-text">{{ seriesError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showSeriesModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="seriesSaving">{{ t('common.save') }}</button>
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
.tabs {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
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
  font-size: 1rem;
  margin: 1.25rem 0 0.6rem;
}
.org-user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.org-user-fields {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.org-tree ul {
  list-style: none;
  margin-left: 1.25rem;
  padding-left: 0.75rem;
  border-left: 1px solid var(--color-border);
}
.org-tree > li {
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.org-tree li li {
  font-weight: 400;
  margin: 0.25rem 0;
}
</style>
