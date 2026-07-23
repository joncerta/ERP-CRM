<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listCampaignsPaginated,
  createCampaign,
  cancelCampaign,
  sendCampaign,
  listCampaignRecipients,
  listLandingForms,
  createLandingForm,
  updateLandingForm,
  listNurtureSequences,
  createNurtureSequence,
  enrollContactsInSequence,
  listSequenceEnrollments,
  cancelEnrollment,
  processNurtureSequences,
  querySegmentContacts,
  type CreateCampaignPayload,
  type CreateLandingFormPayload,
  type CreateNurtureSequencePayload,
  type SegmentQuery,
} from '@/api/marketing'
import { listContacts } from '@/api/contacts'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type {
  Campaign,
  CampaignRecipient,
  Contact,
  LandingForm,
  NurtureEnrollment,
  NurtureSequence,
  NurtureStep,
  SegmentContact,
} from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

type Tab = 'campaigns' | 'forms' | 'nurture' | 'segments'
const activeTab = ref<Tab>('campaigns')

const contacts = ref<Contact[]>([])
async function loadContacts() {
  try {
    contacts.value = await listContacts()
  } catch {
    // Convenience picker only — the rest of the screen still works without it.
  }
}
function contactName(id: string) {
  const c = contacts.value.find((x) => x.id === id)
  return c ? `${c.firstName} ${c.lastName || ''}`.trim() : id
}

// --- Campañas ---
const { items: campaigns, total, page, totalPages, loading, error, load, goToPage } = usePaginatedList(listCampaignsPaginated, {
  defaultSortBy: 'createdAt',
})

const statusBadge: Record<string, string> = { draft: '', sent: 'green', cancelled: 'red' }
const recipientBadge: Record<string, string> = { pending: '', sent: 'green', simulated: 'amber', failed: 'red' }

const showCampaignModal = ref(false)
const campaignSaving = ref(false)
const campaignFormError = ref('')
const campaignForm = ref<CreateCampaignPayload>({ name: '', channel: 'email', subject: '', content: '' })

function openCreateCampaign() {
  campaignForm.value = { name: '', channel: 'email', subject: '', content: '' }
  campaignFormError.value = ''
  showCampaignModal.value = true
}
async function submitCampaign() {
  campaignSaving.value = true
  campaignFormError.value = ''
  try {
    await createCampaign({
      name: campaignForm.value.name,
      channel: campaignForm.value.channel,
      subject: campaignForm.value.subject || undefined,
      content: campaignForm.value.content,
    })
    showCampaignModal.value = false
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    campaignFormError.value = getErrorMessage(err)
  } finally {
    campaignSaving.value = false
  }
}

const detailCampaign = ref<Campaign | null>(null)
const recipients = ref<CampaignRecipient[]>([])
const selectedContactIds = ref<string[]>([])
const campaignActionSaving = ref(false)

async function openCampaignDetail(campaign: Campaign) {
  detailCampaign.value = campaign
  selectedContactIds.value = []
  try {
    recipients.value = await listCampaignRecipients(campaign.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function refreshCampaignDetail() {
  if (!detailCampaign.value) return
  try {
    recipients.value = await listCampaignRecipients(detailCampaign.value.id)
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function submitSend() {
  if (!detailCampaign.value || !selectedContactIds.value.length) return
  campaignActionSaving.value = true
  try {
    const updated = await sendCampaign(detailCampaign.value.id, selectedContactIds.value)
    detailCampaign.value = updated
    toast.success(t('common.savedOk'))
    await refreshCampaignDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    campaignActionSaving.value = false
  }
}
async function handleCancelCampaign() {
  if (!detailCampaign.value) return
  campaignActionSaving.value = true
  try {
    detailCampaign.value = await cancelCampaign(detailCampaign.value.id)
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    campaignActionSaving.value = false
  }
}

// --- Formularios de captura ---
const forms = ref<LandingForm[]>([])
const formsLoading = ref(true)
async function loadForms() {
  formsLoading.value = true
  try {
    forms.value = await listLandingForms()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    formsLoading.value = false
  }
}
const showFormModal = ref(false)
const formSaving = ref(false)
const formModalError = ref('')
const landingFormForm = ref<CreateLandingFormPayload>({ name: '', campaignName: '' })

function openCreateForm() {
  landingFormForm.value = { name: '', campaignName: '' }
  formModalError.value = ''
  showFormModal.value = true
}
async function submitForm() {
  formSaving.value = true
  formModalError.value = ''
  try {
    await createLandingForm({ name: landingFormForm.value.name, campaignName: landingFormForm.value.campaignName || undefined })
    showFormModal.value = false
    toast.success(t('common.savedOk'))
    await loadForms()
  } catch (err) {
    formModalError.value = getErrorMessage(err)
  } finally {
    formSaving.value = false
  }
}
async function toggleFormActive(form: LandingForm) {
  try {
    await updateLandingForm(form.id, { active: !form.active })
    toast.success(t('common.savedOk'))
    await loadForms()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Nutrición ---
const sequences = ref<NurtureSequence[]>([])
const sequencesLoading = ref(true)
async function loadSequences() {
  sequencesLoading.value = true
  try {
    sequences.value = await listNurtureSequences()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    sequencesLoading.value = false
  }
}
const showSequenceModal = ref(false)
const sequenceSaving = ref(false)
const sequenceFormError = ref('')
const sequenceForm = ref<{ name: string; steps: NurtureStep[] }>({ name: '', steps: [{ delayDays: 0, subject: '', content: '' }] })

function openCreateSequence() {
  sequenceForm.value = { name: '', steps: [{ delayDays: 0, subject: '', content: '' }] }
  sequenceFormError.value = ''
  showSequenceModal.value = true
}
function addStep() {
  sequenceForm.value.steps.push({ delayDays: 1, subject: '', content: '' })
}
function removeStep(index: number) {
  sequenceForm.value.steps.splice(index, 1)
}
async function submitSequence() {
  sequenceSaving.value = true
  sequenceFormError.value = ''
  try {
    await createNurtureSequence({ name: sequenceForm.value.name, steps: sequenceForm.value.steps })
    showSequenceModal.value = false
    toast.success(t('common.savedOk'))
    await loadSequences()
  } catch (err) {
    sequenceFormError.value = getErrorMessage(err)
  } finally {
    sequenceSaving.value = false
  }
}

const detailSequence = ref<NurtureSequence | null>(null)
const enrollments = ref<NurtureEnrollment[]>([])
const enrollContactIds = ref<string[]>([])
const sequenceActionSaving = ref(false)

async function openSequenceDetail(sequence: NurtureSequence) {
  detailSequence.value = sequence
  enrollContactIds.value = []
  try {
    enrollments.value = await listSequenceEnrollments(sequence.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function refreshSequenceDetail() {
  if (!detailSequence.value) return
  try {
    enrollments.value = await listSequenceEnrollments(detailSequence.value.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function submitEnroll() {
  if (!detailSequence.value || !enrollContactIds.value.length) return
  sequenceActionSaving.value = true
  try {
    await enrollContactsInSequence(detailSequence.value.id, enrollContactIds.value)
    enrollContactIds.value = []
    toast.success(t('common.savedOk'))
    await refreshSequenceDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    sequenceActionSaving.value = false
  }
}
async function handleCancelEnrollment(id: string) {
  try {
    await cancelEnrollment(id)
    toast.success(t('common.savedOk'))
    await refreshSequenceDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
const processing = ref(false)
async function handleProcess() {
  processing.value = true
  try {
    const result = await processNurtureSequences()
    toast.success(t('marketing.processResult', { sent: result.sent, completed: result.completed }))
    if (detailSequence.value) await refreshSequenceDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    processing.value = false
  }
}

// --- Segmentación ---
const segmentQuery = ref<SegmentQuery>({ industry: '', city: '', position: '' })
const segmentResults = ref<SegmentContact[]>([])
const segmentTotal = ref(0)
const segmentLoading = ref(false)
async function runSegmentQuery() {
  segmentLoading.value = true
  try {
    const params: SegmentQuery = {}
    if (segmentQuery.value.industry) params.industry = segmentQuery.value.industry
    if (segmentQuery.value.city) params.city = segmentQuery.value.city
    if (segmentQuery.value.position) params.position = segmentQuery.value.position
    if (segmentQuery.value.minEmployees) params.minEmployees = segmentQuery.value.minEmployees
    if (segmentQuery.value.maxEmployees) params.maxEmployees = segmentQuery.value.maxEmployees
    const result = await querySegmentContacts(params)
    segmentResults.value = result.items
    segmentTotal.value = result.total
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    segmentLoading.value = false
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'forms' && !forms.value.length) loadForms()
  if (tab === 'nurture' && !sequences.value.length) loadSequences()
  if (tab === 'segments' && !segmentResults.value.length) runSegmentQuery()
}

onMounted(() => {
  load()
  loadContacts()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('marketing.title') }}</h1>
      <button v-if="activeTab === 'campaigns'" class="btn" @click="openCreateCampaign">+ {{ t('marketing.newCampaign') }}</button>
      <button v-else-if="activeTab === 'forms'" class="btn" @click="openCreateForm">+ {{ t('marketing.newForm') }}</button>
      <button v-else-if="activeTab === 'nurture'" class="btn" @click="openCreateSequence">+ {{ t('marketing.newSequence') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'campaigns' }" @click="switchTab('campaigns')">{{ t('marketing.campaigns') }}</button>
      <button class="tab" :class="{ active: activeTab === 'forms' }" @click="switchTab('forms')">{{ t('marketing.landingForms') }}</button>
      <button class="tab" :class="{ active: activeTab === 'nurture' }" @click="switchTab('nurture')">{{ t('marketing.nurture') }}</button>
      <button class="tab" :class="{ active: activeTab === 'segments' }" @click="switchTab('segments')">{{ t('marketing.segments') }}</button>
    </div>

    <!-- Campañas -->
    <template v-if="activeTab === 'campaigns'">
      <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
      <p v-else-if="error" class="error-text">{{ error }}</p>
      <template v-else>
        <table>
          <thead>
            <tr>
              <th>{{ t('marketing.name') }}</th>
              <th>{{ t('marketing.channel') }}</th>
              <th>Estado</th>
              <th>{{ t('marketing.sentAt') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in campaigns" :key="c.id">
              <td>{{ c.name }}</td>
              <td>{{ t(`marketing.channelLabel.${c.channel}`) }}</td>
              <td><span class="badge" :class="statusBadge[c.status]">{{ t(`marketing.statusLabel.${c.status}`) }}</span></td>
              <td>{{ c.sentAt ? new Date(c.sentAt).toLocaleString() : '—' }}</td>
              <td class="actions-cell">
                <button class="btn secondary" @click="openCampaignDetail(c)">{{ t('invoices.viewDetail') }}</button>
              </td>
            </tr>
            <tr v-if="!campaigns.length">
              <td colspan="5" class="muted">—</td>
            </tr>
          </tbody>
        </table>
        <Pagination :page="page" :total-pages="totalPages" :total="total" @go="goToPage" />
      </template>
    </template>

    <!-- Formularios de captura -->
    <template v-else-if="activeTab === 'forms'">
      <p class="muted" style="margin-bottom: 0.75rem">{{ t('marketing.formsHint') }}</p>
      <p v-if="formsLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('marketing.name') }}</th>
            <th>{{ t('marketing.formPath') }}</th>
            <th>{{ t('marketing.campaignName') }}</th>
            <th>{{ t('marketing.submissions') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in forms" :key="f.id">
            <td>{{ f.name }}</td>
            <td><code>/lp/&lt;tu-slug&gt;/{{ f.slug }}</code></td>
            <td>{{ f.campaignName || '—' }}</td>
            <td>{{ f.submissionCount }}</td>
            <td><span class="badge" :class="f.active ? 'green' : ''">{{ f.active ? t('marketing.active') : t('marketing.inactive') }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="toggleFormActive(f)">
                {{ f.active ? t('marketing.deactivate') : t('marketing.activate') }}
              </button>
            </td>
          </tr>
          <tr v-if="!forms.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Nutrición -->
    <template v-else-if="activeTab === 'nurture'">
      <div class="inline-form">
        <button type="button" class="btn secondary" :disabled="processing" @click="handleProcess">
          {{ t('marketing.processNow') }}
        </button>
        <span class="muted">{{ t('marketing.processHint') }}</span>
      </div>
      <p v-if="sequencesLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('marketing.name') }}</th>
            <th>{{ t('marketing.steps') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sequences" :key="s.id">
            <td>{{ s.name }}</td>
            <td>{{ s.steps.length }}</td>
            <td><span class="badge" :class="s.active ? 'green' : ''">{{ s.active ? t('marketing.active') : t('marketing.inactive') }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openSequenceDetail(s)">{{ t('invoices.viewDetail') }}</button>
            </td>
          </tr>
          <tr v-if="!sequences.length">
            <td colspan="4" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Segmentación -->
    <template v-else>
      <div class="card" style="margin-bottom: 1.25rem">
        <div class="inline-form">
          <input v-model="segmentQuery.industry" :placeholder="t('companies.industry')" />
          <input v-model="segmentQuery.city" :placeholder="t('companies.city')" />
          <input v-model="segmentQuery.position" :placeholder="t('contacts.position')" />
          <input v-model.number="segmentQuery.minEmployees" type="number" min="0" :placeholder="t('marketing.minEmployees')" style="width: 8rem" />
          <input v-model.number="segmentQuery.maxEmployees" type="number" min="0" :placeholder="t('marketing.maxEmployees')" style="width: 8rem" />
          <button type="button" class="btn secondary" :disabled="segmentLoading" @click="runSegmentQuery">{{ t('common.search') }}</button>
        </div>
      </div>
      <p v-if="segmentLoading" class="muted">{{ t('common.loading') }}</p>
      <template v-else>
        <p class="muted" style="margin-bottom: 0.5rem">{{ t('marketing.segmentTotal', { total: segmentTotal }) }}</p>
        <table>
          <thead>
            <tr>
              <th>{{ t('contacts.title') }}</th>
              <th>{{ t('contacts.position') }}</th>
              <th>{{ t('companies.title') }}</th>
              <th>{{ t('companies.industry') }}</th>
              <th>{{ t('companies.city') }}</th>
              <th>{{ t('marketing.employeeCount') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in segmentResults" :key="c.id">
              <td>{{ c.firstName }} {{ c.lastName || '' }}</td>
              <td>{{ c.position || '—' }}</td>
              <td>{{ c.company?.name || '—' }}</td>
              <td>{{ c.company?.industry || '—' }}</td>
              <td>{{ c.company?.city || '—' }}</td>
              <td>{{ c.company?.employeeCount ?? '—' }}</td>
            </tr>
            <tr v-if="!segmentResults.length">
              <td colspan="6" class="muted">—</td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>

    <!-- Crear campaña -->
    <div v-if="showCampaignModal" class="modal-backdrop" @click.self="showCampaignModal = false">
      <form class="modal wide" @submit.prevent="submitCampaign">
        <h2>{{ t('marketing.newCampaign') }}</h2>
        <div class="field">
          <label>{{ t('marketing.name') }}</label>
          <input v-model="campaignForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('marketing.channel') }}</label>
          <select v-model="campaignForm.channel">
            <option value="email">{{ t('marketing.channelLabel.email') }}</option>
            <option value="sms">{{ t('marketing.channelLabel.sms') }}</option>
            <option value="whatsapp">{{ t('marketing.channelLabel.whatsapp') }}</option>
          </select>
        </div>
        <div v-if="campaignForm.channel === 'email'" class="field">
          <label>{{ t('marketing.subject') }}</label>
          <input v-model="campaignForm.subject" />
        </div>
        <div class="field">
          <label>{{ t('marketing.content') }}</label>
          <textarea v-model="campaignForm.content" rows="6" required></textarea>
        </div>
        <p v-if="campaignForm.channel !== 'email'" class="muted" style="font-size: 0.8rem">{{ t('marketing.simulatedHint') }}</p>
        <p v-if="campaignFormError" class="error-text">{{ campaignFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showCampaignModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="campaignSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Detalle de campaña -->
    <div v-if="detailCampaign" class="modal-backdrop" @click.self="detailCampaign = null">
      <div class="modal wide">
        <h2>{{ detailCampaign.name }}</h2>
        <p>
          <span class="badge" :class="statusBadge[detailCampaign.status]">{{ t(`marketing.statusLabel.${detailCampaign.status}`) }}</span>
          <span class="badge" style="margin-left: 0.35rem">{{ t(`marketing.channelLabel.${detailCampaign.channel}`) }}</span>
        </p>

        <template v-if="detailCampaign.status === 'draft'">
          <h3 class="section-title">{{ t('marketing.selectRecipients') }}</h3>
          <div class="checkbox-list">
            <label v-for="ct in contacts" :key="ct.id" class="checkbox-field">
              <input type="checkbox" :value="ct.id" v-model="selectedContactIds" />
              {{ ct.firstName }} {{ ct.lastName || '' }}
            </label>
          </div>
          <div class="modal-actions" style="justify-content: flex-start; gap: 0.5rem">
            <button type="button" class="btn" :disabled="campaignActionSaving || !selectedContactIds.length" @click="submitSend">
              {{ t('marketing.send') }}
            </button>
            <button type="button" class="btn secondary" :disabled="campaignActionSaving" @click="handleCancelCampaign">
              {{ t('common.cancel') }}
            </button>
          </div>
        </template>

        <h3 class="section-title">{{ t('marketing.recipients') }}</h3>
        <ul class="detail-list">
          <li v-for="r in recipients" :key="r.id">
            {{ contactName(r.contactId) }} —
            <span class="badge" :class="recipientBadge[r.status]">{{ t(`marketing.recipientStatus.${r.status}`) }}</span>
            <span v-if="r.failureReason" class="muted"> ({{ r.failureReason }})</span>
          </li>
          <li v-if="!recipients.length" class="muted">—</li>
        </ul>

        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="detailCampaign = null">{{ t('common.cancel') }}</button>
        </div>
      </div>
    </div>

    <!-- Crear formulario -->
    <div v-if="showFormModal" class="modal-backdrop" @click.self="showFormModal = false">
      <form class="modal" @submit.prevent="submitForm">
        <h2>{{ t('marketing.newForm') }}</h2>
        <div class="field">
          <label>{{ t('marketing.name') }}</label>
          <input v-model="landingFormForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('marketing.campaignName') }}</label>
          <input v-model="landingFormForm.campaignName" />
        </div>
        <p v-if="formModalError" class="error-text">{{ formModalError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showFormModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="formSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Crear secuencia -->
    <div v-if="showSequenceModal" class="modal-backdrop" @click.self="showSequenceModal = false">
      <form class="modal wide" @submit.prevent="submitSequence">
        <h2>{{ t('marketing.newSequence') }}</h2>
        <div class="field">
          <label>{{ t('marketing.name') }}</label>
          <input v-model="sequenceForm.name" required />
        </div>
        <div v-for="(step, i) in sequenceForm.steps" :key="i" class="card" style="margin-bottom: 0.75rem">
          <div class="inline-form">
            <label style="margin: 0">{{ t('marketing.delayDays') }}</label>
            <input v-model.number="step.delayDays" type="number" min="0" style="width: 6rem" />
            <button v-if="sequenceForm.steps.length > 1" type="button" class="btn secondary" @click="removeStep(i)">
              {{ t('common.delete') }}
            </button>
          </div>
          <div class="field">
            <label>{{ t('marketing.subject') }}</label>
            <input v-model="step.subject" required />
          </div>
          <div class="field">
            <label>{{ t('marketing.content') }}</label>
            <textarea v-model="step.content" rows="3" required></textarea>
          </div>
        </div>
        <button type="button" class="btn secondary" @click="addStep">+ {{ t('marketing.addStep') }}</button>
        <p v-if="sequenceFormError" class="error-text">{{ sequenceFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showSequenceModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="sequenceSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Detalle de secuencia -->
    <div v-if="detailSequence" class="modal-backdrop" @click.self="detailSequence = null">
      <div class="modal wide">
        <h2>{{ detailSequence.name }}</h2>
        <ol class="detail-list">
          <li v-for="(step, i) in detailSequence.steps" :key="i">
            {{ t('marketing.stepSummary', { day: step.delayDays, subject: step.subject }) }}
          </li>
        </ol>

        <h3 class="section-title">{{ t('marketing.enroll') }}</h3>
        <div class="checkbox-list">
          <label v-for="ct in contacts" :key="ct.id" class="checkbox-field">
            <input type="checkbox" :value="ct.id" v-model="enrollContactIds" />
            {{ ct.firstName }} {{ ct.lastName || '' }}
          </label>
        </div>
        <div class="modal-actions" style="justify-content: flex-start">
          <button type="button" class="btn secondary" :disabled="sequenceActionSaving || !enrollContactIds.length" @click="submitEnroll">
            {{ t('marketing.enroll') }}
          </button>
        </div>

        <h3 class="section-title">{{ t('marketing.enrollments') }}</h3>
        <ul class="detail-list">
          <li v-for="e in enrollments" :key="e.id">
            {{ contactName(e.contactId) }} —
            <span class="badge" :class="e.status === 'completed' ? 'green' : e.status === 'cancelled' ? 'red' : ''">
              {{ t(`marketing.enrollmentStatus.${e.status}`) }}
            </span>
            <span class="muted"> ({{ t('marketing.stepOf', { current: e.currentStep + 1, total: detailSequence.steps.length }) }})</span>
            <button v-if="e.status === 'active'" type="button" class="btn secondary" style="margin-left: 0.5rem" @click="handleCancelEnrollment(e.id)">
              {{ t('common.cancel') }}
            </button>
          </li>
          <li v-if="!enrollments.length" class="muted">—</li>
        </ul>

        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="detailSequence = null">{{ t('common.cancel') }}</button>
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
.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-height: 12rem;
  overflow-y: auto;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}
.inline-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  align-items: center;
}
.inline-form input,
.inline-form select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}
textarea {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  width: 100%;
}
code {
  font-size: 0.78rem;
  background: var(--color-bg-subtle);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}
</style>
