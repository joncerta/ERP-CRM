<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  listLeaveRequests,
  getVacationBalance,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  listPayrollRuns,
  createPayrollRun,
  processPayrollRun,
  listPayrollRunLines,
  listPerformanceReviews,
  createPerformanceReview,
  submitPerformanceReview,
  type CreateEmployeePayload,
  type UpdateEmployeePayload,
  type CreateLeaveRequestPayload,
  type CreatePayrollRunPayload,
  type CreatePerformanceReviewPayload,
} from '@/api/hr'
import { listUsers, type TenantUser } from '@/api/users'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type {
  Employee,
  ContractType,
  DocumentIdType,
  EmploymentStatus,
  LeaveRequest,
  VacationBalance,
  PayrollRun,
  PayrollRunLine,
  PerformanceReview,
  ScoredItem,
} from '@/api/types'

interface EmployeeFormState {
  userId: string
  documentType: DocumentIdType
  documentId: string
  birthDate?: string
  address?: string
  phone?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  contractType: ContractType
  baseSalary: number
  hireDate: string
  vacationDaysPerYear: number
  employmentStatus?: EmploymentStatus
}

const { t } = useI18n()
const toast = useToastStore()

type Tab = 'employees' | 'leave' | 'payroll' | 'performance'
const activeTab = ref<Tab>('employees')

const users = ref<TenantUser[]>([])
async function loadUsers() {
  try {
    users.value = await listUsers()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
function userName(userId: string): string {
  return users.value.find((u) => u.id === userId)?.fullName ?? '—'
}

// --- Empleados ---
const employees = ref<Employee[]>([])
const employeesLoading = ref(true)
async function loadEmployees() {
  employeesLoading.value = true
  try {
    employees.value = await listEmployees()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    employeesLoading.value = false
  }
}

const showEmployeeModal = ref(false)
const editingEmployee = ref<Employee | null>(null)
const employeeSaving = ref(false)
const employeeFormError = ref('')
const employeeForm = ref<EmployeeFormState>({
  userId: '',
  documentType: 'cc',
  documentId: '',
  contractType: 'indefinite',
  baseSalary: 0,
  hireDate: '',
  vacationDaysPerYear: 15,
})

function openCreateEmployee() {
  editingEmployee.value = null
  employeeForm.value = { userId: '', documentType: 'cc', documentId: '', contractType: 'indefinite', baseSalary: 0, hireDate: '', vacationDaysPerYear: 15 }
  employeeFormError.value = ''
  showEmployeeModal.value = true
}
function openEditEmployee(employee: Employee) {
  editingEmployee.value = employee
  employeeForm.value = {
    userId: employee.userId,
    documentType: employee.documentType,
    documentId: employee.documentId,
    birthDate: employee.birthDate ?? undefined,
    address: employee.address ?? undefined,
    phone: employee.phone ?? undefined,
    emergencyContactName: employee.emergencyContactName ?? undefined,
    emergencyContactPhone: employee.emergencyContactPhone ?? undefined,
    contractType: employee.contractType,
    baseSalary: employee.baseSalary,
    hireDate: employee.hireDate,
    vacationDaysPerYear: employee.vacationDaysPerYear,
    employmentStatus: employee.employmentStatus,
  }
  employeeFormError.value = ''
  showEmployeeModal.value = true
}
async function submitEmployee() {
  employeeSaving.value = true
  employeeFormError.value = ''
  try {
    if (editingEmployee.value) {
      const { userId: _userId, ...payload } = employeeForm.value
      await updateEmployee(editingEmployee.value.id, payload as UpdateEmployeePayload)
    } else {
      await createEmployee(employeeForm.value as CreateEmployeePayload)
    }
    showEmployeeModal.value = false
    toast.success(t('common.savedOk'))
    await loadEmployees()
  } catch (err) {
    employeeFormError.value = getErrorMessage(err)
  } finally {
    employeeSaving.value = false
  }
}

// --- Vacaciones y licencias ---
const selectedEmployeeId = ref('')
const leaveRequests = ref<LeaveRequest[]>([])
const leaveLoading = ref(false)
const vacationBalance = ref<VacationBalance | null>(null)

async function loadLeaveData() {
  if (!selectedEmployeeId.value) {
    leaveRequests.value = []
    vacationBalance.value = null
    return
  }
  leaveLoading.value = true
  try {
    const [requests, balance] = await Promise.all([
      listLeaveRequests(selectedEmployeeId.value),
      getVacationBalance(selectedEmployeeId.value),
    ])
    leaveRequests.value = requests
    vacationBalance.value = balance
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    leaveLoading.value = false
  }
}
watch(selectedEmployeeId, loadLeaveData)

const showLeaveModal = ref(false)
const leaveSaving = ref(false)
const leaveFormError = ref('')
const leaveForm = ref<{ type: CreateLeaveRequestPayload['type']; startDate: string; endDate: string; reason: string }>({
  type: 'vacation',
  startDate: '',
  endDate: '',
  reason: '',
})

function openLeaveModal() {
  leaveForm.value = { type: 'vacation', startDate: '', endDate: '', reason: '' }
  leaveFormError.value = ''
  showLeaveModal.value = true
}
async function submitLeaveRequest() {
  leaveSaving.value = true
  leaveFormError.value = ''
  try {
    await createLeaveRequest({ employeeId: selectedEmployeeId.value, ...leaveForm.value })
    showLeaveModal.value = false
    toast.success(t('common.savedOk'))
    await loadLeaveData()
  } catch (err) {
    leaveFormError.value = getErrorMessage(err)
  } finally {
    leaveSaving.value = false
  }
}
async function handleApprove(request: LeaveRequest) {
  try {
    await approveLeaveRequest(request.id)
    toast.success(t('common.savedOk'))
    await loadLeaveData()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function handleReject(request: LeaveRequest) {
  try {
    await rejectLeaveRequest(request.id)
    toast.success(t('common.savedOk'))
    await loadLeaveData()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function handleCancel(request: LeaveRequest) {
  try {
    await cancelLeaveRequest(request.id)
    toast.success(t('common.savedOk'))
    await loadLeaveData()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Nómina ---
const payrollRuns = ref<PayrollRun[]>([])
const payrollLoading = ref(true)
async function loadPayrollRuns() {
  payrollLoading.value = true
  try {
    payrollRuns.value = await listPayrollRuns()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    payrollLoading.value = false
  }
}
const showPayrollModal = ref(false)
const payrollSaving = ref(false)
const payrollFormError = ref('')
const payrollForm = ref<CreatePayrollRunPayload>({ periodLabel: '', periodStart: '', periodEnd: '' })

function openCreatePayrollRun() {
  payrollForm.value = { periodLabel: '', periodStart: '', periodEnd: '' }
  payrollFormError.value = ''
  showPayrollModal.value = true
}
async function submitPayrollRun() {
  payrollSaving.value = true
  payrollFormError.value = ''
  try {
    await createPayrollRun(payrollForm.value)
    showPayrollModal.value = false
    toast.success(t('common.savedOk'))
    await loadPayrollRuns()
  } catch (err) {
    payrollFormError.value = getErrorMessage(err)
  } finally {
    payrollSaving.value = false
  }
}
async function handleProcessRun(run: PayrollRun) {
  try {
    await processPayrollRun(run.id)
    toast.success(t('common.savedOk'))
    await loadPayrollRuns()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

const viewingRun = ref<PayrollRun | null>(null)
const runLines = ref<PayrollRunLine[]>([])
async function viewRunLines(run: PayrollRun) {
  viewingRun.value = run
  try {
    runLines.value = await listPayrollRunLines(run.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Evaluaciones de desempeño ---
const reviews = ref<PerformanceReview[]>([])
const reviewsLoading = ref(false)
async function loadReviews() {
  if (!selectedEmployeeId.value) {
    reviews.value = []
    return
  }
  reviewsLoading.value = true
  try {
    reviews.value = await listPerformanceReviews(selectedEmployeeId.value)
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    reviewsLoading.value = false
  }
}
watch(selectedEmployeeId, () => {
  if (activeTab.value === 'performance') loadReviews()
})

const showReviewModal = ref(false)
const reviewSaving = ref(false)
const reviewFormError = ref('')
const reviewForm = ref<{ periodLabel: string; objectives: ScoredItem[]; competencies: ScoredItem[]; comments: string }>({
  periodLabel: '',
  objectives: [{ description: '', score: 3 }],
  competencies: [{ description: '', score: 3 }],
  comments: '',
})

function openReviewModal() {
  reviewForm.value = { periodLabel: '', objectives: [{ description: '', score: 3 }], competencies: [{ description: '', score: 3 }], comments: '' }
  reviewFormError.value = ''
  showReviewModal.value = true
}
function addObjective() {
  reviewForm.value.objectives.push({ description: '', score: 3 })
}
function addCompetency() {
  reviewForm.value.competencies.push({ description: '', score: 3 })
}
async function submitReview() {
  reviewSaving.value = true
  reviewFormError.value = ''
  try {
    const payload: CreatePerformanceReviewPayload = { employeeId: selectedEmployeeId.value, ...reviewForm.value }
    await createPerformanceReview(payload)
    showReviewModal.value = false
    toast.success(t('common.savedOk'))
    await loadReviews()
  } catch (err) {
    reviewFormError.value = getErrorMessage(err)
  } finally {
    reviewSaving.value = false
  }
}
async function handleSubmitReview(review: PerformanceReview) {
  try {
    await submitPerformanceReview(review.id)
    toast.success(t('common.savedOk'))
    await loadReviews()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'payroll' && !payrollRuns.value.length) loadPayrollRuns()
  if (tab === 'performance' && selectedEmployeeId.value) loadReviews()
}

const selectedEmployeeName = computed(() => (selectedEmployeeId.value ? userName(employees.value.find((e) => e.id === selectedEmployeeId.value)?.userId ?? '') : ''))

onMounted(async () => {
  await loadUsers()
  await loadEmployees()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('hr.title') }}</h1>
      <button v-if="activeTab === 'employees'" class="btn" @click="openCreateEmployee">+ {{ t('hr.newEmployee') }}</button>
      <button v-else-if="activeTab === 'leave' && selectedEmployeeId" class="btn" @click="openLeaveModal">+ {{ t('hr.newLeaveRequest') }}</button>
      <button v-else-if="activeTab === 'payroll'" class="btn" @click="openCreatePayrollRun">+ {{ t('hr.newPayrollRun') }}</button>
      <button v-else-if="activeTab === 'performance' && selectedEmployeeId" class="btn" @click="openReviewModal">+ {{ t('hr.newReview') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'employees' }" @click="switchTab('employees')">{{ t('hr.tabEmployees') }}</button>
      <button class="tab" :class="{ active: activeTab === 'leave' }" @click="switchTab('leave')">{{ t('hr.tabLeave') }}</button>
      <button class="tab" :class="{ active: activeTab === 'payroll' }" @click="switchTab('payroll')">{{ t('hr.tabPayroll') }}</button>
      <button class="tab" :class="{ active: activeTab === 'performance' }" @click="switchTab('performance')">{{ t('hr.tabPerformance') }}</button>
    </div>

    <!-- Empleados -->
    <template v-if="activeTab === 'employees'">
      <p v-if="employeesLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('hr.employee') }}</th>
            <th>{{ t('hr.documentId') }}</th>
            <th>{{ t('hr.contractType') }}</th>
            <th>{{ t('hr.baseSalary') }}</th>
            <th>{{ t('hr.hireDate') }}</th>
            <th>{{ t('hr.employmentStatus') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in employees" :key="e.id">
            <td>{{ userName(e.userId) }}</td>
            <td>{{ e.documentId }}</td>
            <td>{{ t(`hr.contractType_${e.contractType}`) }}</td>
            <td>{{ Number(e.baseSalary).toLocaleString() }}</td>
            <td>{{ e.hireDate }}</td>
            <td><span class="badge" :class="e.employmentStatus === 'active' ? 'green' : ''">{{ t(`hr.employmentStatus_${e.employmentStatus}`) }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditEmployee(e)">{{ t('common.edit') }}</button>
            </td>
          </tr>
          <tr v-if="!employees.length">
            <td colspan="7" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Vacaciones y licencias -->
    <template v-else-if="activeTab === 'leave'">
      <div class="inline-form">
        <select v-model="selectedEmployeeId">
          <option value="">{{ t('hr.selectEmployee') }}</option>
          <option v-for="e in employees" :key="e.id" :value="e.id">{{ userName(e.userId) }}</option>
        </select>
      </div>
      <p v-if="!selectedEmployeeId" class="muted">{{ t('hr.selectEmployeeHint') }}</p>
      <template v-else>
        <div v-if="vacationBalance" class="balance-card">
          <div><span>{{ t('hr.balanceEarned') }}</span><strong>{{ vacationBalance.earned }}</strong></div>
          <div><span>{{ t('hr.balanceTaken') }}</span><strong>{{ vacationBalance.taken }}</strong></div>
          <div><span>{{ t('hr.balanceAvailable') }}</span><strong>{{ vacationBalance.balance }}</strong></div>
        </div>
        <p v-if="leaveLoading" class="muted">{{ t('common.loading') }}</p>
        <table v-else>
          <thead>
            <tr>
              <th>{{ t('hr.leaveType') }}</th>
              <th>{{ t('hr.startDate') }}</th>
              <th>{{ t('hr.endDate') }}</th>
              <th>{{ t('hr.daysRequested') }}</th>
              <th>Estado</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in leaveRequests" :key="r.id">
              <td>{{ t(`hr.leaveType_${r.type}`) }}</td>
              <td>{{ r.startDate }}</td>
              <td>{{ r.endDate }}</td>
              <td>{{ r.daysRequested }}</td>
              <td><span class="badge" :class="{ green: r.status === 'approved', red: r.status === 'rejected' }">{{ t(`hr.leaveStatus_${r.status}`) }}</span></td>
              <td class="actions-cell">
                <template v-if="r.status === 'pending'">
                  <button class="btn secondary" @click="handleApprove(r)">{{ t('hr.approve') }}</button>
                  <button class="btn secondary" @click="handleReject(r)">{{ t('hr.reject') }}</button>
                  <button class="btn secondary" @click="handleCancel(r)">{{ t('common.cancel') }}</button>
                </template>
              </td>
            </tr>
            <tr v-if="!leaveRequests.length">
              <td colspan="6" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>

    <!-- Nómina -->
    <template v-else-if="activeTab === 'payroll'">
      <p v-if="payrollLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('hr.period') }}</th>
            <th>{{ t('hr.startDate') }}</th>
            <th>{{ t('hr.endDate') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="run in payrollRuns" :key="run.id">
            <td>{{ run.periodLabel }}</td>
            <td>{{ run.periodStart }}</td>
            <td>{{ run.periodEnd }}</td>
            <td><span class="badge" :class="run.status === 'processed' ? 'green' : ''">{{ t(`hr.payrollStatus_${run.status}`) }}</span></td>
            <td class="actions-cell">
              <button v-if="run.status === 'draft'" class="btn secondary" @click="handleProcessRun(run)">{{ t('hr.process') }}</button>
              <button class="btn secondary" @click="viewRunLines(run)">{{ t('hr.viewLines') }}</button>
            </td>
          </tr>
          <tr v-if="!payrollRuns.length">
            <td colspan="5" class="muted">—</td>
          </tr>
        </tbody>
      </table>

      <div v-if="viewingRun" style="margin-top: 1.5rem">
        <h3>{{ t('hr.viewLines') }} — {{ viewingRun.periodLabel }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ t('hr.employee') }}</th>
              <th>{{ t('hr.baseSalary') }}</th>
              <th>{{ t('hr.overtimeHours') }}</th>
              <th>{{ t('hr.overtimeAmount') }}</th>
              <th>{{ t('hr.healthDeduction') }}</th>
              <th>{{ t('hr.pensionDeduction') }}</th>
              <th>{{ t('hr.grossPay') }}</th>
              <th>{{ t('hr.netPay') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in runLines" :key="line.id">
              <td>{{ userName(employees.find((e) => e.id === line.employeeId)?.userId ?? '') }}</td>
              <td>{{ Number(line.baseSalary).toLocaleString() }}</td>
              <td>{{ line.overtimeHours }}</td>
              <td>{{ Number(line.overtimeAmount).toLocaleString() }}</td>
              <td>{{ Number(line.healthDeduction).toLocaleString() }}</td>
              <td>{{ Number(line.pensionDeduction).toLocaleString() }}</td>
              <td>{{ Number(line.grossPay).toLocaleString() }}</td>
              <td><strong>{{ Number(line.netPay).toLocaleString() }}</strong></td>
            </tr>
            <tr v-if="!runLines.length">
              <td colspan="8" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Evaluaciones de desempeño -->
    <template v-else>
      <div class="inline-form">
        <select v-model="selectedEmployeeId" @change="loadReviews">
          <option value="">{{ t('hr.selectEmployee') }}</option>
          <option v-for="e in employees" :key="e.id" :value="e.id">{{ userName(e.userId) }}</option>
        </select>
      </div>
      <p v-if="!selectedEmployeeId" class="muted">{{ t('hr.selectEmployeeHint') }}</p>
      <template v-else>
        <p v-if="reviewsLoading" class="muted">{{ t('common.loading') }}</p>
        <table v-else>
          <thead>
            <tr>
              <th>{{ t('hr.period') }}</th>
              <th>Estado</th>
              <th>{{ t('hr.overallScore') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reviews" :key="r.id">
              <td>{{ r.periodLabel }}</td>
              <td><span class="badge" :class="r.status === 'submitted' ? 'green' : ''">{{ t(`hr.reviewStatus_${r.status}`) }}</span></td>
              <td>{{ r.overallScore ?? '—' }}</td>
              <td class="actions-cell">
                <button v-if="r.status === 'draft'" class="btn secondary" @click="handleSubmitReview(r)">{{ t('hr.submitReview') }}</button>
              </td>
            </tr>
            <tr v-if="!reviews.length">
              <td colspan="4" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>

    <!-- Crear/editar empleado -->
    <div v-if="showEmployeeModal" class="modal-backdrop" @click.self="showEmployeeModal = false">
      <form class="modal" @submit.prevent="submitEmployee">
        <h2>{{ editingEmployee ? t('common.edit') : t('hr.newEmployee') }}</h2>
        <div v-if="!editingEmployee" class="field">
          <label>{{ t('hr.employee') }}</label>
          <select v-model="employeeForm.userId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('hr.documentId') }}</label>
          <input v-model="employeeForm.documentId" required />
        </div>
        <div class="field">
          <label>{{ t('hr.contractType') }}</label>
          <select v-model="employeeForm.contractType">
            <option value="indefinite">{{ t('hr.contractType_indefinite') }}</option>
            <option value="fixed_term">{{ t('hr.contractType_fixed_term') }}</option>
            <option value="service_provision">{{ t('hr.contractType_service_provision') }}</option>
            <option value="apprenticeship">{{ t('hr.contractType_apprenticeship') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('hr.baseSalary') }}</label>
          <input v-model.number="employeeForm.baseSalary" type="number" min="0" step="0.01" required />
        </div>
        <div v-if="!editingEmployee" class="field">
          <label>{{ t('hr.hireDate') }}</label>
          <input v-model="employeeForm.hireDate" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('hr.vacationDaysPerYear') }}</label>
          <input v-model.number="employeeForm.vacationDaysPerYear" type="number" min="1" />
        </div>
        <div v-if="editingEmployee" class="field">
          <label>{{ t('hr.employmentStatus') }}</label>
          <select v-model="employeeForm.employmentStatus">
            <option value="active">{{ t('hr.employmentStatus_active') }}</option>
            <option value="on_leave">{{ t('hr.employmentStatus_on_leave') }}</option>
            <option value="terminated">{{ t('hr.employmentStatus_terminated') }}</option>
          </select>
        </div>
        <p v-if="employeeFormError" class="error-text">{{ employeeFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showEmployeeModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="employeeSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Nueva solicitud de vacaciones/licencia -->
    <div v-if="showLeaveModal" class="modal-backdrop" @click.self="showLeaveModal = false">
      <form class="modal" @submit.prevent="submitLeaveRequest">
        <h2>{{ t('hr.newLeaveRequest') }}</h2>
        <p class="muted">{{ selectedEmployeeName }}</p>
        <div class="field">
          <label>{{ t('hr.leaveType') }}</label>
          <select v-model="leaveForm.type">
            <option value="vacation">{{ t('hr.leaveType_vacation') }}</option>
            <option value="sick_leave">{{ t('hr.leaveType_sick_leave') }}</option>
            <option value="unpaid_leave">{{ t('hr.leaveType_unpaid_leave') }}</option>
            <option value="other">{{ t('hr.leaveType_other') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('hr.startDate') }}</label>
          <input v-model="leaveForm.startDate" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('hr.endDate') }}</label>
          <input v-model="leaveForm.endDate" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('hr.reason') }}</label>
          <textarea v-model="leaveForm.reason" rows="2"></textarea>
        </div>
        <p v-if="leaveFormError" class="error-text">{{ leaveFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showLeaveModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="leaveSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Nueva liquidación de nómina -->
    <div v-if="showPayrollModal" class="modal-backdrop" @click.self="showPayrollModal = false">
      <form class="modal" @submit.prevent="submitPayrollRun">
        <h2>{{ t('hr.newPayrollRun') }}</h2>
        <div class="field">
          <label>{{ t('hr.period') }}</label>
          <input v-model="payrollForm.periodLabel" placeholder="2026-07" required />
        </div>
        <div class="field">
          <label>{{ t('hr.startDate') }}</label>
          <input v-model="payrollForm.periodStart" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('hr.endDate') }}</label>
          <input v-model="payrollForm.periodEnd" type="date" required />
        </div>
        <p v-if="payrollFormError" class="error-text">{{ payrollFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showPayrollModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="payrollSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Nueva evaluación de desempeño -->
    <div v-if="showReviewModal" class="modal-backdrop" @click.self="showReviewModal = false">
      <form class="modal" @submit.prevent="submitReview">
        <h2>{{ t('hr.newReview') }}</h2>
        <p class="muted">{{ selectedEmployeeName }}</p>
        <div class="field">
          <label>{{ t('hr.period') }}</label>
          <input v-model="reviewForm.periodLabel" placeholder="2026-S1" required />
        </div>

        <label class="section-label">{{ t('hr.objectives') }}</label>
        <div v-for="(o, i) in reviewForm.objectives" :key="'obj-' + i" class="scored-row">
          <input v-model="o.description" :placeholder="t('hr.itemDescription')" required />
          <input v-model.number="o.score" type="number" min="1" max="5" required />
        </div>
        <button type="button" class="btn secondary" @click="addObjective">+ {{ t('hr.addItem') }}</button>

        <label class="section-label">{{ t('hr.competencies') }}</label>
        <div v-for="(c, i) in reviewForm.competencies" :key="'comp-' + i" class="scored-row">
          <input v-model="c.description" :placeholder="t('hr.itemDescription')" required />
          <input v-model.number="c.score" type="number" min="1" max="5" required />
        </div>
        <button type="button" class="btn secondary" @click="addCompetency">+ {{ t('hr.addItem') }}</button>

        <div class="field" style="margin-top: 0.75rem">
          <label>{{ t('hr.comments') }}</label>
          <textarea v-model="reviewForm.comments" rows="2"></textarea>
        </div>
        <p v-if="reviewFormError" class="error-text">{{ reviewFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showReviewModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="reviewSaving">{{ t('common.save') }}</button>
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
.inline-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  align-items: center;
}
.inline-form select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}
.balance-card {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-subtle);
  border-radius: var(--radius);
}
.balance-card div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.85rem;
}
.balance-card strong {
  font-size: 1.1rem;
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
.scored-row input:first-child {
  flex: 1;
}
.scored-row input:last-child {
  width: 4rem;
}
</style>
