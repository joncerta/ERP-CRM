<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listProjects,
  createProject,
  updateProject,
  getProjectSummary,
  listMilestones,
  createMilestone,
  completeMilestone,
  delayMilestone,
  listResources,
  assignResource,
  listTimeEntries,
  logTimeEntry,
  type CreateProjectPayload,
  type UpdateProjectPayload,
} from '@/api/projects'
import { listCompanies } from '@/api/companies'
import { listUsers, type TenantUser } from '@/api/users'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { Project, ProjectSummary, ProjectMilestone, ProjectResource, ProjectTimeEntry, Company } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const companies = ref<Company[]>([])
const users = ref<TenantUser[]>([])
async function loadPickers() {
  try {
    const [companyList, userList] = await Promise.all([listCompanies(), listUsers()])
    companies.value = companyList
    users.value = userList
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
function companyName(id: string | null): string {
  return companies.value.find((c) => c.id === id)?.name ?? '—'
}
function userName(id: string): string {
  return users.value.find((u) => u.id === id)?.fullName ?? '—'
}

// --- Proyectos ---
const projects = ref<Project[]>([])
const projectsLoading = ref(true)
async function loadProjects() {
  projectsLoading.value = true
  try {
    projects.value = await listProjects()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    projectsLoading.value = false
  }
}

const showProjectModal = ref(false)
const editingProject = ref<Project | null>(null)
const projectSaving = ref(false)
const projectFormError = ref('')
const projectForm = ref<CreateProjectPayload & { status?: Project['status'] }>({
  name: '',
  leaderUserId: '',
  budget: 0,
  startDate: '',
})

function openCreateProject() {
  editingProject.value = null
  projectForm.value = { name: '', leaderUserId: '', budget: 0, startDate: '' }
  projectFormError.value = ''
  showProjectModal.value = true
}
function openEditProject(project: Project) {
  editingProject.value = project
  projectForm.value = {
    name: project.name,
    companyId: project.companyId ?? undefined,
    leaderUserId: project.leaderUserId,
    description: project.description ?? undefined,
    budget: project.budget,
    startDate: project.startDate,
    plannedEndDate: project.plannedEndDate ?? undefined,
    status: project.status,
  }
  projectFormError.value = ''
  showProjectModal.value = true
}
async function submitProject() {
  projectSaving.value = true
  projectFormError.value = ''
  try {
    if (editingProject.value) {
      const { startDate: _startDate, leaderUserId, ...rest } = projectForm.value
      const payload: UpdateProjectPayload = { ...rest, leaderUserId }
      await updateProject(editingProject.value.id, payload)
    } else {
      await createProject(projectForm.value)
    }
    showProjectModal.value = false
    toast.success(t('common.savedOk'))
    await loadProjects()
  } catch (err) {
    projectFormError.value = getErrorMessage(err)
  } finally {
    projectSaving.value = false
  }
}

// --- Detalle de proyecto ---
const selectedProject = ref<Project | null>(null)
type DetailTab = 'summary' | 'milestones' | 'resources' | 'time'
const detailTab = ref<DetailTab>('summary')

const summary = ref<ProjectSummary | null>(null)
const milestones = ref<ProjectMilestone[]>([])
const resources = ref<ProjectResource[]>([])
const timeEntries = ref<ProjectTimeEntry[]>([])

async function openDetail(project: Project) {
  selectedProject.value = project
  detailTab.value = 'summary'
  // Clear stale data from whichever project was previously open — the tab
  // switchers only reload when their array is empty.
  milestones.value = []
  resources.value = []
  timeEntries.value = []
  await loadSummary()
}
async function loadSummary() {
  if (!selectedProject.value) return
  try {
    summary.value = await getProjectSummary(selectedProject.value.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function loadMilestones() {
  if (!selectedProject.value) return
  try {
    milestones.value = await listMilestones(selectedProject.value.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function loadResources() {
  if (!selectedProject.value) return
  try {
    resources.value = await listResources(selectedProject.value.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function loadTimeEntries() {
  if (!selectedProject.value) return
  try {
    timeEntries.value = await listTimeEntries(selectedProject.value.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
function switchDetailTab(tab: DetailTab) {
  detailTab.value = tab
  if (tab === 'summary') loadSummary()
  else if (tab === 'milestones' && !milestones.value.length) loadMilestones()
  else if (tab === 'resources' && !resources.value.length) loadResources()
  else if (tab === 'time') {
    // The "hours" table displays each entry's resource name, so resources
    // must be loaded even if the user never visited the Resources tab.
    if (!resources.value.length) loadResources()
    if (!timeEntries.value.length) loadTimeEntries()
  }
}

// --- Hitos ---
const showMilestoneModal = ref(false)
const milestoneSaving = ref(false)
const milestoneFormError = ref('')
const milestoneForm = ref({ name: '', dueDate: '' })
function openMilestoneModal() {
  milestoneForm.value = { name: '', dueDate: '' }
  milestoneFormError.value = ''
  showMilestoneModal.value = true
}
async function submitMilestone() {
  if (!selectedProject.value) return
  milestoneSaving.value = true
  milestoneFormError.value = ''
  try {
    await createMilestone(selectedProject.value.id, milestoneForm.value)
    showMilestoneModal.value = false
    toast.success(t('common.savedOk'))
    await loadMilestones()
  } catch (err) {
    milestoneFormError.value = getErrorMessage(err)
  } finally {
    milestoneSaving.value = false
  }
}
async function handleCompleteMilestone(m: ProjectMilestone) {
  try {
    await completeMilestone(m.id)
    toast.success(t('common.savedOk'))
    await loadMilestones()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function handleDelayMilestone(m: ProjectMilestone) {
  try {
    await delayMilestone(m.id)
    toast.success(t('common.savedOk'))
    await loadMilestones()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Recursos ---
const showResourceModal = ref(false)
const resourceSaving = ref(false)
const resourceFormError = ref('')
const resourceForm = ref<{ userId: string; roleLabel: string; hourlyRate: number }>({ userId: '', roleLabel: '', hourlyRate: 0 })
function openResourceModal() {
  resourceForm.value = { userId: '', roleLabel: '', hourlyRate: 0 }
  resourceFormError.value = ''
  showResourceModal.value = true
}
async function submitResource() {
  if (!selectedProject.value) return
  resourceSaving.value = true
  resourceFormError.value = ''
  try {
    await assignResource(selectedProject.value.id, resourceForm.value)
    showResourceModal.value = false
    toast.success(t('common.savedOk'))
    await loadResources()
  } catch (err) {
    resourceFormError.value = getErrorMessage(err)
  } finally {
    resourceSaving.value = false
  }
}

// --- Registro de horas ---
const showTimeModal = ref(false)
const timeSaving = ref(false)
const timeFormError = ref('')
const timeForm = ref<{ resourceId: string; date: string; hours: number; description: string }>({
  resourceId: '',
  date: '',
  hours: 0,
  description: '',
})
function openTimeModal() {
  timeForm.value = { resourceId: '', date: '', hours: 0, description: '' }
  timeFormError.value = ''
  showTimeModal.value = true
  if (!resources.value.length) loadResources()
}
async function submitTimeEntry() {
  if (!selectedProject.value) return
  timeSaving.value = true
  timeFormError.value = ''
  try {
    await logTimeEntry(selectedProject.value.id, timeForm.value)
    showTimeModal.value = false
    toast.success(t('common.savedOk'))
    await loadTimeEntries()
  } catch (err) {
    timeFormError.value = getErrorMessage(err)
  } finally {
    timeSaving.value = false
  }
}

onMounted(async () => {
  await loadPickers()
  await loadProjects()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('projects.title') }}</h1>
      <button class="btn" @click="openCreateProject">+ {{ t('projects.newProject') }}</button>
    </div>

    <p v-if="projectsLoading" class="muted">{{ t('common.loading') }}</p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ t('projects.name') }}</th>
          <th>{{ t('projects.client') }}</th>
          <th>{{ t('projects.leader') }}</th>
          <th>Estado</th>
          <th>{{ t('projects.budget') }}</th>
          <th>{{ t('projects.startDate') }}</th>
          <th>{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in projects" :key="p.id">
          <td>{{ p.name }}</td>
          <td>{{ companyName(p.companyId) }}</td>
          <td>{{ userName(p.leaderUserId) }}</td>
          <td><span class="badge" :class="{ green: p.status === 'completed', red: p.status === 'cancelled' }">{{ t(`projects.status_${p.status}`) }}</span></td>
          <td>{{ p.currencyCode }} {{ Number(p.budget).toLocaleString() }}</td>
          <td>{{ p.startDate }}</td>
          <td class="actions-cell">
            <button class="btn secondary" @click="openDetail(p)">{{ t('projects.viewDetail') }}</button>
            <button class="btn secondary" @click="openEditProject(p)">{{ t('common.edit') }}</button>
          </td>
        </tr>
        <tr v-if="!projects.length">
          <td colspan="7" class="muted">—</td>
        </tr>
      </tbody>
    </table>

    <!-- Detalle de proyecto -->
    <div v-if="selectedProject" style="margin-top: 2rem">
      <h2>{{ selectedProject.name }}</h2>
      <div class="tabs">
        <button class="tab" :class="{ active: detailTab === 'summary' }" @click="switchDetailTab('summary')">{{ t('projects.tabSummary') }}</button>
        <button class="tab" :class="{ active: detailTab === 'milestones' }" @click="switchDetailTab('milestones')">{{ t('projects.tabMilestones') }}</button>
        <button class="tab" :class="{ active: detailTab === 'resources' }" @click="switchDetailTab('resources')">{{ t('projects.tabResources') }}</button>
        <button class="tab" :class="{ active: detailTab === 'time' }" @click="switchDetailTab('time')">{{ t('projects.tabTime') }}</button>
      </div>

      <!-- Resumen -->
      <template v-if="detailTab === 'summary'">
        <div v-if="summary" class="balance-card">
          <div><span>{{ t('projects.progress') }}</span><strong>{{ summary.progressPercent }}%</strong></div>
          <div><span>{{ t('projects.milestonesCompleted') }}</span><strong>{{ summary.completedMilestones }} / {{ summary.totalMilestones }}</strong></div>
          <div><span>{{ t('projects.milestonesDelayed') }}</span><strong>{{ summary.delayedMilestones }}</strong></div>
          <div><span>{{ t('projects.budget') }}</span><strong>{{ Number(summary.budget).toLocaleString() }}</strong></div>
          <div><span>{{ t('projects.totalCost') }}</span><strong>{{ Number(summary.totalCost).toLocaleString() }}</strong></div>
          <div><span>{{ t('projects.profitability') }}</span><strong>{{ Number(summary.profitability).toLocaleString() }}</strong></div>
          <div v-if="summary.marginPercent !== null"><span>{{ t('projects.margin') }}</span><strong>{{ summary.marginPercent }}%</strong></div>
        </div>
      </template>

      <!-- Hitos -->
      <template v-else-if="detailTab === 'milestones'">
        <div class="inline-form">
          <button type="button" class="btn secondary" @click="openMilestoneModal">+ {{ t('projects.newMilestone') }}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('projects.milestoneName') }}</th>
              <th>{{ t('projects.dueDate') }}</th>
              <th>Estado</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in milestones" :key="m.id">
              <td>{{ m.name }}</td>
              <td>{{ m.dueDate }}</td>
              <td><span class="badge" :class="{ green: m.status === 'completed', red: m.status === 'delayed' }">{{ t(`projects.milestoneStatus_${m.status}`) }}</span></td>
              <td class="actions-cell">
                <template v-if="m.status === 'pending'">
                  <button class="btn secondary" @click="handleCompleteMilestone(m)">{{ t('projects.complete') }}</button>
                  <button class="btn secondary" @click="handleDelayMilestone(m)">{{ t('projects.registerDelay') }}</button>
                </template>
              </td>
            </tr>
            <tr v-if="!milestones.length">
              <td colspan="4" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </template>

      <!-- Recursos -->
      <template v-else-if="detailTab === 'resources'">
        <div class="inline-form">
          <button type="button" class="btn secondary" @click="openResourceModal">+ {{ t('projects.assignResource') }}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('projects.resource') }}</th>
              <th>{{ t('projects.roleLabel') }}</th>
              <th>{{ t('projects.hourlyRate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in resources" :key="r.id">
              <td>{{ userName(r.userId) }}</td>
              <td>{{ r.roleLabel }}</td>
              <td>{{ Number(r.hourlyRate).toLocaleString() }}</td>
            </tr>
            <tr v-if="!resources.length">
              <td colspan="3" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </template>

      <!-- Horas -->
      <template v-else>
        <div class="inline-form">
          <button type="button" class="btn secondary" @click="openTimeModal">+ {{ t('projects.logTime') }}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{{ t('projects.dueDate') }}</th>
              <th>{{ t('projects.resource') }}</th>
              <th>{{ t('projects.hours') }}</th>
              <th>{{ t('projects.cost') }}</th>
              <th>{{ t('projects.description') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="te in timeEntries" :key="te.id">
              <td>{{ te.date }}</td>
              <td>{{ userName(resources.find((r) => r.id === te.resourceId)?.userId ?? '') }}</td>
              <td>{{ te.hours }}</td>
              <td>{{ Number(te.cost).toLocaleString() }}</td>
              <td>{{ te.description ?? '—' }}</td>
            </tr>
            <tr v-if="!timeEntries.length">
              <td colspan="5" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>

    <!-- Crear/editar proyecto -->
    <div v-if="showProjectModal" class="modal-backdrop" @click.self="showProjectModal = false">
      <form class="modal" @submit.prevent="submitProject">
        <h2>{{ editingProject ? t('common.edit') : t('projects.newProject') }}</h2>
        <div class="field">
          <label>{{ t('projects.name') }}</label>
          <input v-model="projectForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('projects.client') }}</label>
          <select v-model="projectForm.companyId">
            <option value="">{{ t('documents.noneOption') }}</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('projects.leader') }}</label>
          <select v-model="projectForm.leaderUserId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('projects.budget') }}</label>
          <input v-model.number="projectForm.budget" type="number" min="0" step="0.01" />
        </div>
        <div v-if="!editingProject" class="field">
          <label>{{ t('projects.startDate') }}</label>
          <input v-model="projectForm.startDate" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('projects.plannedEndDate') }}</label>
          <input v-model="projectForm.plannedEndDate" type="date" />
        </div>
        <div v-if="editingProject" class="field">
          <label>Estado</label>
          <select v-model="projectForm.status">
            <option value="planning">{{ t('projects.status_planning') }}</option>
            <option value="in_progress">{{ t('projects.status_in_progress') }}</option>
            <option value="on_hold">{{ t('projects.status_on_hold') }}</option>
            <option value="completed">{{ t('projects.status_completed') }}</option>
            <option value="cancelled">{{ t('projects.status_cancelled') }}</option>
          </select>
        </div>
        <p v-if="projectFormError" class="error-text">{{ projectFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showProjectModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="projectSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Nuevo hito -->
    <div v-if="showMilestoneModal" class="modal-backdrop" @click.self="showMilestoneModal = false">
      <form class="modal" @submit.prevent="submitMilestone">
        <h2>{{ t('projects.newMilestone') }}</h2>
        <div class="field">
          <label>{{ t('projects.milestoneName') }}</label>
          <input v-model="milestoneForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('projects.dueDate') }}</label>
          <input v-model="milestoneForm.dueDate" type="date" required />
        </div>
        <p v-if="milestoneFormError" class="error-text">{{ milestoneFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showMilestoneModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="milestoneSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Asignar recurso -->
    <div v-if="showResourceModal" class="modal-backdrop" @click.self="showResourceModal = false">
      <form class="modal" @submit.prevent="submitResource">
        <h2>{{ t('projects.assignResource') }}</h2>
        <div class="field">
          <label>{{ t('projects.resource') }}</label>
          <select v-model="resourceForm.userId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('projects.roleLabel') }}</label>
          <input v-model="resourceForm.roleLabel" required />
        </div>
        <div class="field">
          <label>{{ t('projects.hourlyRate') }}</label>
          <input v-model.number="resourceForm.hourlyRate" type="number" min="0" step="0.01" />
        </div>
        <p v-if="resourceFormError" class="error-text">{{ resourceFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showResourceModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="resourceSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Registrar horas -->
    <div v-if="showTimeModal" class="modal-backdrop" @click.self="showTimeModal = false">
      <form class="modal" @submit.prevent="submitTimeEntry">
        <h2>{{ t('projects.logTime') }}</h2>
        <div class="field">
          <label>{{ t('projects.resource') }}</label>
          <select v-model="timeForm.resourceId" required>
            <option value="" disabled>{{ t('hr.selectEmployee') }}</option>
            <option v-for="r in resources" :key="r.id" :value="r.id">{{ userName(r.userId) }} ({{ r.roleLabel }})</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('projects.dueDate') }}</label>
          <input v-model="timeForm.date" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('projects.hours') }}</label>
          <input v-model.number="timeForm.hours" type="number" min="0.25" step="0.25" required />
        </div>
        <div class="field">
          <label>{{ t('projects.description') }}</label>
          <textarea v-model="timeForm.description" rows="2"></textarea>
        </div>
        <p v-if="timeFormError" class="error-text">{{ timeFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showTimeModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="timeSaving">{{ t('common.save') }}</button>
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
.balance-card {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
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
</style>
