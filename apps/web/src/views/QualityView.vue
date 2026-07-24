<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listInspections,
  createInspection,
  updateInspection,
  listAudits,
  createAudit,
  completeAudit,
  cancelAudit,
  listNonConformities,
  createNonConformity,
  closeNonConformity,
  updateAction,
  getIndicators,
  type CreateInspectionPayload,
  type CreateAuditPayload,
  type CreateNonConformityPayload,
  type CorrectiveActionInput,
} from '@/api/quality'
import { listEquipment } from '@/api/maintenance'
import { listProductionOrders } from '@/api/production'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { QualityInspection, QualityAudit, NonConformity, QualityIndicators, Equipment, ProductionOrder, ActionStatus } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

type Tab = 'inspections' | 'nonConformities' | 'audits' | 'indicators'
const activeTab = ref<Tab>('inspections')

// --- Pickers (optional cross-module context) ---
const equipmentList = ref<Equipment[]>([])
const productionOrders = ref<ProductionOrder[]>([])
async function loadPickers() {
  try {
    equipmentList.value = await listEquipment()
  } catch {
    equipmentList.value = []
  }
  try {
    productionOrders.value = await listProductionOrders()
  } catch {
    productionOrders.value = []
  }
}
function equipmentLabel(id: string | null): string {
  if (!id) return '—'
  const e = equipmentList.value.find((e) => e.id === id)
  return e ? `${e.name} (${e.code})` : '—'
}
function orderLabel(id: string | null): string {
  if (!id) return '—'
  const o = productionOrders.value.find((o) => o.id === id)
  return o ? o.orderNumber : '—'
}

// --- Inspecciones ---
const inspections = ref<QualityInspection[]>([])
const inspectionsLoading = ref(true)
async function loadInspections() {
  inspectionsLoading.value = true
  try {
    inspections.value = await listInspections()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    inspectionsLoading.value = false
  }
}

const showInspectionModal = ref(false)
const editingInspection = ref<QualityInspection | null>(null)
const inspectionSaving = ref(false)
const inspectionFormError = ref('')
const inspectionForm = ref<CreateInspectionPayload>({ type: 'incoming', subject: '', inspectionDate: '', result: 'pass' })
function openCreateInspection() {
  editingInspection.value = null
  inspectionForm.value = { type: 'incoming', subject: '', inspectionDate: '', result: 'pass' }
  inspectionFormError.value = ''
  showInspectionModal.value = true
}
function openEditInspection(i: QualityInspection) {
  editingInspection.value = i
  inspectionForm.value = {
    type: i.type,
    subject: i.subject,
    relatedProductionOrderId: i.relatedProductionOrderId ?? undefined,
    relatedEquipmentId: i.relatedEquipmentId ?? undefined,
    inspectionDate: i.inspectionDate,
    result: i.result,
    notes: i.notes ?? undefined,
  }
  inspectionFormError.value = ''
  showInspectionModal.value = true
}
async function submitInspection() {
  inspectionSaving.value = true
  inspectionFormError.value = ''
  try {
    const payload = {
      ...inspectionForm.value,
      relatedProductionOrderId: inspectionForm.value.relatedProductionOrderId || undefined,
      relatedEquipmentId: inspectionForm.value.relatedEquipmentId || undefined,
    }
    if (editingInspection.value) {
      await updateInspection(editingInspection.value.id, payload)
    } else {
      await createInspection(payload)
    }
    showInspectionModal.value = false
    toast.success(t('common.savedOk'))
    await loadInspections()
  } catch (err) {
    inspectionFormError.value = getErrorMessage(err)
  } finally {
    inspectionSaving.value = false
  }
}

// --- No conformidades ---
const nonConformities = ref<NonConformity[]>([])
const nonConformitiesLoading = ref(true)
async function loadNonConformities() {
  nonConformitiesLoading.value = true
  try {
    nonConformities.value = await listNonConformities()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    nonConformitiesLoading.value = false
  }
}

const expandedNcId = ref<string | null>(null)
function toggleActions(nc: NonConformity) {
  expandedNcId.value = expandedNcId.value === nc.id ? null : nc.id
}

const showNcModal = ref(false)
const ncSaving = ref(false)
const ncFormError = ref('')
const ncForm = ref<CreateNonConformityPayload & { actions: CorrectiveActionInput[] }>({
  description: '',
  severity: 'minor',
  detectedDate: '',
  actions: [],
})
function openCreateNc() {
  ncForm.value = { description: '', severity: 'minor', detectedDate: '', actions: [] }
  ncFormError.value = ''
  showNcModal.value = true
}
function addNcAction() {
  ncForm.value.actions.push({ description: '' })
}
function removeNcAction(index: number) {
  ncForm.value.actions.splice(index, 1)
}
async function submitNc() {
  ncSaving.value = true
  ncFormError.value = ''
  try {
    await createNonConformity(ncForm.value)
    showNcModal.value = false
    toast.success(t('common.savedOk'))
    await loadNonConformities()
  } catch (err) {
    ncFormError.value = getErrorMessage(err)
  } finally {
    ncSaving.value = false
  }
}

async function handleCloseNc(nc: NonConformity) {
  try {
    await closeNonConformity(nc.id)
    toast.success(t('common.savedOk'))
    await loadNonConformities()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function handleCompleteAction(nc: NonConformity, actionId: string) {
  try {
    await updateAction(nc.id, actionId, { status: 'completed' as ActionStatus })
    toast.success(t('common.savedOk'))
    await loadNonConformities()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Auditorías ---
const audits = ref<QualityAudit[]>([])
const auditsLoading = ref(true)
async function loadAudits() {
  auditsLoading.value = true
  try {
    audits.value = await listAudits()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    auditsLoading.value = false
  }
}

const showAuditModal = ref(false)
const auditSaving = ref(false)
const auditFormError = ref('')
const auditForm = ref<CreateAuditPayload>({ type: 'internal', scope: '', auditor: '', scheduledDate: '' })
function openCreateAudit() {
  auditForm.value = { type: 'internal', scope: '', auditor: '', scheduledDate: '' }
  auditFormError.value = ''
  showAuditModal.value = true
}
async function submitAudit() {
  auditSaving.value = true
  auditFormError.value = ''
  try {
    await createAudit(auditForm.value)
    showAuditModal.value = false
    toast.success(t('common.savedOk'))
    await loadAudits()
  } catch (err) {
    auditFormError.value = getErrorMessage(err)
  } finally {
    auditSaving.value = false
  }
}

const showCompleteAuditModal = ref(false)
const completingAudit = ref<QualityAudit | null>(null)
const completeAuditSaving = ref(false)
const completeAuditFindings = ref('')
function openCompleteAudit(audit: QualityAudit) {
  completingAudit.value = audit
  completeAuditFindings.value = ''
  showCompleteAuditModal.value = true
}
async function submitCompleteAudit() {
  if (!completingAudit.value) return
  completeAuditSaving.value = true
  try {
    await completeAudit(completingAudit.value.id, completeAuditFindings.value)
    showCompleteAuditModal.value = false
    toast.success(t('common.savedOk'))
    await loadAudits()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    completeAuditSaving.value = false
  }
}
async function handleCancelAudit(audit: QualityAudit) {
  try {
    await cancelAudit(audit.id)
    toast.success(t('common.savedOk'))
    await loadAudits()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Indicadores ---
const indicators = ref<QualityIndicators | null>(null)
const indicatorsLoading = ref(false)
async function loadIndicators() {
  indicatorsLoading.value = true
  try {
    indicators.value = await getIndicators()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    indicatorsLoading.value = false
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'nonConformities' && !nonConformities.value.length) loadNonConformities()
  if (tab === 'audits' && !audits.value.length) loadAudits()
  if (tab === 'indicators') loadIndicators()
}

onMounted(async () => {
  await loadPickers()
  await loadInspections()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('quality.title') }}</h1>
      <button v-if="activeTab === 'inspections'" class="btn" @click="openCreateInspection">+ {{ t('quality.newInspection') }}</button>
      <button v-else-if="activeTab === 'nonConformities'" class="btn" @click="openCreateNc">+ {{ t('quality.newNonConformity') }}</button>
      <button v-else-if="activeTab === 'audits'" class="btn" @click="openCreateAudit">+ {{ t('quality.newAudit') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'inspections' }" @click="switchTab('inspections')">{{ t('quality.tabInspections') }}</button>
      <button class="tab" :class="{ active: activeTab === 'nonConformities' }" @click="switchTab('nonConformities')">{{ t('quality.tabNonConformities') }}</button>
      <button class="tab" :class="{ active: activeTab === 'audits' }" @click="switchTab('audits')">{{ t('quality.tabAudits') }}</button>
      <button class="tab" :class="{ active: activeTab === 'indicators' }" @click="switchTab('indicators')">{{ t('quality.tabIndicators') }}</button>
    </div>

    <!-- Inspecciones -->
    <template v-if="activeTab === 'inspections'">
      <p v-if="inspectionsLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('quality.subject') }}</th>
            <th>{{ t('maintenance.type') }}</th>
            <th>{{ t('quality.inspectionDate') }}</th>
            <th>{{ t('quality.result') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in inspections" :key="i.id">
            <td>{{ i.subject }}</td>
            <td>{{ t(`quality.type_${i.type}`) }}</td>
            <td>{{ i.inspectionDate }}</td>
            <td><span class="badge" :class="{ green: i.result === 'pass', red: i.result === 'fail' }">{{ t(`quality.result_${i.result}`) }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditInspection(i)">{{ t('common.edit') }}</button>
            </td>
          </tr>
          <tr v-if="!inspections.length">
            <td colspan="5" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- No conformidades -->
    <template v-else-if="activeTab === 'nonConformities'">
      <p v-if="nonConformitiesLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('quality.ncNumber') }}</th>
            <th>{{ t('quality.description') }}</th>
            <th>{{ t('quality.severity') }}</th>
            <th>{{ t('quality.detectedDate') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="nc in nonConformities" :key="nc.id">
            <tr>
              <td>{{ nc.ncNumber }}</td>
              <td>{{ nc.description }}</td>
              <td><span class="badge" :class="{ red: nc.severity === 'critical', amber: nc.severity === 'major' }">{{ t(`quality.severity_${nc.severity}`) }}</span></td>
              <td>{{ nc.detectedDate }}</td>
              <td><span class="badge" :class="{ green: nc.status === 'closed' }">{{ t(`quality.ncStatus_${nc.status}`) }}</span></td>
              <td class="actions-cell">
                <button class="btn secondary" @click="toggleActions(nc)">{{ t('quality.viewActions') }}</button>
                <button v-if="nc.status !== 'closed'" class="btn secondary" @click="handleCloseNc(nc)">{{ t('quality.close') }}</button>
              </td>
            </tr>
            <tr v-if="expandedNcId === nc.id">
              <td colspan="6">
                <div class="actions-panel">
                  <h4>{{ t('quality.correctiveActions') }}</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>{{ t('quality.actionDescription') }}</th>
                        <th>{{ t('quality.dueDate') }}</th>
                        <th>Estado</th>
                        <th>{{ t('common.actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="a in nc.actions" :key="a.id">
                        <td>{{ a.description }}</td>
                        <td>{{ a.dueDate ?? '—' }}</td>
                        <td><span class="badge" :class="{ green: a.status === 'completed' }">{{ t(`quality.actionStatus_${a.status}`) }}</span></td>
                        <td>
                          <button v-if="a.status !== 'completed' && a.id" class="btn secondary" @click="handleCompleteAction(nc, a.id)">{{ t('quality.markCompleted') }}</button>
                        </td>
                      </tr>
                      <tr v-if="!nc.actions.length">
                        <td colspan="4" class="muted">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!nonConformities.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Auditorías -->
    <template v-else-if="activeTab === 'audits'">
      <p v-if="auditsLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('quality.auditType') }}</th>
            <th>{{ t('quality.scope') }}</th>
            <th>{{ t('quality.auditor') }}</th>
            <th>{{ t('quality.scheduledDate') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in audits" :key="a.id">
            <td>{{ t(`quality.auditType_${a.type}`) }}</td>
            <td>{{ a.scope }}</td>
            <td>{{ a.auditor }}</td>
            <td>{{ a.scheduledDate }}</td>
            <td><span class="badge" :class="{ green: a.status === 'completed', red: a.status === 'cancelled' }">{{ t(`quality.auditStatus_${a.status}`) }}</span></td>
            <td class="actions-cell">
              <button v-if="a.status === 'planned'" class="btn secondary" @click="openCompleteAudit(a)">{{ t('quality.complete') }}</button>
              <button v-if="a.status === 'planned'" class="btn secondary" @click="handleCancelAudit(a)">{{ t('common.cancel') }}</button>
            </td>
          </tr>
          <tr v-if="!audits.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Indicadores -->
    <template v-else>
      <p v-if="indicatorsLoading" class="muted">{{ t('common.loading') }}</p>
      <div v-else-if="indicators" class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">{{ t('quality.totalInspections') }}</span>
          <span class="stat-value">{{ indicators.inspections.total }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('quality.passRate') }}</span>
          <span class="stat-value">{{ indicators.inspections.passRate ?? '—' }}{{ indicators.inspections.passRate !== null ? '%' : '' }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('quality.openNonConformities') }}</span>
          <span class="stat-value">{{ indicators.nonConformities.open + indicators.nonConformities.inProgress }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('quality.closedNonConformities') }}</span>
          <span class="stat-value">{{ indicators.nonConformities.closed }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('quality.overdueActions') }}</span>
          <span class="stat-value">{{ indicators.correctiveActions.overdue }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('quality.totalAudits') }}</span>
          <span class="stat-value">{{ indicators.audits.total }}</span>
        </div>
        <div class="stat-card wide">
          <span class="stat-label">{{ t('quality.bySeverity') }}</span>
          <span class="stat-value small">
            {{ t('quality.severity_minor') }}: {{ indicators.nonConformities.bySeverity.minor }} ·
            {{ t('quality.severity_major') }}: {{ indicators.nonConformities.bySeverity.major }} ·
            {{ t('quality.severity_critical') }}: {{ indicators.nonConformities.bySeverity.critical }}
          </span>
        </div>
      </div>
    </template>

    <!-- Crear/editar inspección -->
    <div v-if="showInspectionModal" class="modal-backdrop" @click.self="showInspectionModal = false">
      <form class="modal" @submit.prevent="submitInspection">
        <h2>{{ editingInspection ? t('common.edit') : t('quality.newInspection') }}</h2>
        <div class="field">
          <label>{{ t('quality.subject') }}</label>
          <input v-model="inspectionForm.subject" required />
        </div>
        <div class="field">
          <label>{{ t('maintenance.type') }}</label>
          <select v-model="inspectionForm.type">
            <option value="incoming">{{ t('quality.type_incoming') }}</option>
            <option value="in_process">{{ t('quality.type_in_process') }}</option>
            <option value="final">{{ t('quality.type_final') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('quality.relatedEquipment') }}</label>
          <select v-model="inspectionForm.relatedEquipmentId">
            <option :value="undefined">{{ t('documents.noneOption') }}</option>
            <option v-for="e in equipmentList" :key="e.id" :value="e.id">{{ e.name }} ({{ e.code }})</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('quality.relatedProductionOrder') }}</label>
          <select v-model="inspectionForm.relatedProductionOrderId">
            <option :value="undefined">{{ t('documents.noneOption') }}</option>
            <option v-for="o in productionOrders" :key="o.id" :value="o.id">{{ o.orderNumber }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('quality.inspectionDate') }}</label>
          <input v-model="inspectionForm.inspectionDate" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('quality.result') }}</label>
          <select v-model="inspectionForm.result">
            <option value="pass">{{ t('quality.result_pass') }}</option>
            <option value="fail">{{ t('quality.result_fail') }}</option>
            <option value="conditional">{{ t('quality.result_conditional') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('quality.notes') }}</label>
          <textarea v-model="inspectionForm.notes" rows="2"></textarea>
        </div>
        <p v-if="inspectionFormError" class="error-text">{{ inspectionFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showInspectionModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="inspectionSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Nueva no conformidad -->
    <div v-if="showNcModal" class="modal-backdrop" @click.self="showNcModal = false">
      <form class="modal" @submit.prevent="submitNc">
        <h2>{{ t('quality.newNonConformity') }}</h2>
        <div class="field">
          <label>{{ t('quality.description') }}</label>
          <textarea v-model="ncForm.description" rows="2" required></textarea>
        </div>
        <div class="field">
          <label>{{ t('quality.severity') }}</label>
          <select v-model="ncForm.severity">
            <option value="minor">{{ t('quality.severity_minor') }}</option>
            <option value="major">{{ t('quality.severity_major') }}</option>
            <option value="critical">{{ t('quality.severity_critical') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('quality.detectedDate') }}</label>
          <input v-model="ncForm.detectedDate" type="date" required />
        </div>

        <label class="section-label">{{ t('quality.correctiveActions') }}</label>
        <div v-for="(action, i) in ncForm.actions" :key="i" class="scored-row">
          <input v-model="action.description" :placeholder="t('quality.actionDescription')" required />
          <input v-model="action.dueDate" type="date" />
          <button type="button" class="btn secondary" @click="removeNcAction(i)">✕</button>
        </div>
        <button type="button" class="btn secondary" @click="addNcAction">{{ t('quality.addAction') }}</button>

        <p v-if="ncFormError" class="error-text">{{ ncFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showNcModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="ncSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Nueva auditoría -->
    <div v-if="showAuditModal" class="modal-backdrop" @click.self="showAuditModal = false">
      <form class="modal" @submit.prevent="submitAudit">
        <h2>{{ t('quality.newAudit') }}</h2>
        <div class="field">
          <label>{{ t('quality.auditType') }}</label>
          <select v-model="auditForm.type">
            <option value="internal">{{ t('quality.auditType_internal') }}</option>
            <option value="external">{{ t('quality.auditType_external') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('quality.scope') }}</label>
          <textarea v-model="auditForm.scope" rows="2" required></textarea>
        </div>
        <div class="field">
          <label>{{ t('quality.auditor') }}</label>
          <input v-model="auditForm.auditor" required />
        </div>
        <div class="field">
          <label>{{ t('quality.scheduledDate') }}</label>
          <input v-model="auditForm.scheduledDate" type="date" required />
        </div>
        <p v-if="auditFormError" class="error-text">{{ auditFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showAuditModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="auditSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Completar auditoría -->
    <div v-if="showCompleteAuditModal" class="modal-backdrop" @click.self="showCompleteAuditModal = false">
      <form class="modal" @submit.prevent="submitCompleteAudit">
        <h2>{{ t('quality.complete') }}</h2>
        <p class="muted">{{ completingAudit?.scope }}</p>
        <div class="field">
          <label>{{ t('quality.findings') }}</label>
          <textarea v-model="completeAuditFindings" rows="3" required></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showCompleteAuditModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="completeAuditSaving">{{ t('common.save') }}</button>
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
.scored-row input:first-child {
  flex: 1;
}
.actions-panel {
  background: var(--color-bg-subtle);
  border-radius: var(--radius);
  padding: 0.9rem 1rem;
  margin: 0.4rem 0;
}
.actions-panel h4 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
}
.badge.amber {
  background: #fef3c7;
  color: #92400e;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.stat-card.wide {
  grid-column: 1 / -1;
}
.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
}
.stat-value.small {
  font-size: 0.95rem;
  font-weight: 500;
}
</style>
