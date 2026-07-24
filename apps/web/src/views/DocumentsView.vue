<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  logCommunication,
  listCommunicationsByContact,
  type CreateDocumentPayload,
} from '@/api/documents'
import { listCompanies } from '@/api/companies'
import { listContacts } from '@/api/contacts'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { CrmDocument, DocumentCategory, Company, Contact, CommunicationLogEntry, CommunicationChannel, CommunicationDirection } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const MAX_FILE_BYTES = 7 * 1024 * 1024

type Tab = 'documents' | 'communications'
const activeTab = ref<Tab>('documents')

const companies = ref<Company[]>([])
const contacts = ref<Contact[]>([])

async function loadPickers() {
  try {
    const [companyList, contactList] = await Promise.all([listCompanies(), listContacts()])
    companies.value = companyList
    contacts.value = contactList
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

function companyName(id: string | null): string {
  return companies.value.find((c) => c.id === id)?.name ?? '—'
}
function contactName(id: string | null): string {
  const c = contacts.value.find((c) => c.id === id)
  return c ? `${c.firstName} ${c.lastName}` : '—'
}
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// --- Documentos ---
const documents = ref<CrmDocument[]>([])
const documentsLoading = ref(true)
const filterCompanyId = ref('')
const filterContactId = ref('')

async function loadDocuments() {
  documentsLoading.value = true
  try {
    documents.value = await listDocuments({
      companyId: filterCompanyId.value || undefined,
      contactId: filterContactId.value || undefined,
    })
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    documentsLoading.value = false
  }
}

const showUploadModal = ref(false)
const uploadSaving = ref(false)
const uploadError = ref('')
const uploadForm = ref<{ name: string; category: DocumentCategory; companyId: string; contactId: string; fileData: string; mimeType: string }>({
  name: '',
  category: 'other',
  companyId: '',
  contactId: '',
  fileData: '',
  mimeType: '',
})

function openUploadModal() {
  uploadForm.value = { name: '', category: 'other', companyId: '', contactId: '', fileData: '', mimeType: '' }
  uploadError.value = ''
  showUploadModal.value = true
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (file.size > MAX_FILE_BYTES) {
    toast.error(t('documents.fileTooLarge'))
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    uploadForm.value.fileData = reader.result as string
    uploadForm.value.mimeType = file.type || 'application/octet-stream'
    if (!uploadForm.value.name) uploadForm.value.name = file.name
  }
  reader.onerror = () => toast.error(getErrorMessage(reader.error))
  reader.readAsDataURL(file)
}

async function submitUpload() {
  if (!uploadForm.value.fileData) {
    uploadError.value = t('documents.file')
    return
  }
  uploadSaving.value = true
  uploadError.value = ''
  try {
    const payload: CreateDocumentPayload = {
      name: uploadForm.value.name,
      category: uploadForm.value.category,
      mimeType: uploadForm.value.mimeType,
      fileData: uploadForm.value.fileData,
      companyId: uploadForm.value.companyId || undefined,
      contactId: uploadForm.value.contactId || undefined,
    }
    await uploadDocument(payload)
    showUploadModal.value = false
    toast.success(t('common.savedOk'))
    await loadDocuments()
  } catch (err) {
    uploadError.value = getErrorMessage(err)
  } finally {
    uploadSaving.value = false
  }
}

const editingDocument = ref<CrmDocument | null>(null)
const editForm = ref<{ name: string; category: DocumentCategory }>({ name: '', category: 'other' })
function openEdit(doc: CrmDocument) {
  editingDocument.value = doc
  editForm.value = { name: doc.name, category: doc.category }
}
async function submitEdit() {
  if (!editingDocument.value) return
  try {
    await updateDocument(editingDocument.value.id, editForm.value)
    editingDocument.value = null
    toast.success(t('common.savedOk'))
    await loadDocuments()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

async function handleDownload(doc: CrmDocument) {
  try {
    await downloadDocument(doc)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

async function handleDelete(doc: CrmDocument) {
  if (!confirm(t('common.confirmDelete'))) return
  try {
    await deleteDocument(doc.id)
    toast.success(t('common.deletedOk'))
    await loadDocuments()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

watch([filterCompanyId, filterContactId], loadDocuments)

// --- Comunicaciones ---
const commContactId = ref('')
const commEntries = ref<CommunicationLogEntry[]>([])
const commLoading = ref(false)

async function loadCommunications() {
  if (!commContactId.value) {
    commEntries.value = []
    return
  }
  commLoading.value = true
  try {
    commEntries.value = await listCommunicationsByContact(commContactId.value)
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    commLoading.value = false
  }
}
watch(commContactId, loadCommunications)

const showLogModal = ref(false)
const logSaving = ref(false)
const logError = ref('')
const logForm = ref<{ channel: CommunicationChannel; direction: CommunicationDirection; summary: string }>({
  channel: 'call',
  direction: 'outbound',
  summary: '',
})

function openLogModal() {
  logForm.value = { channel: 'call', direction: 'outbound', summary: '' }
  logError.value = ''
  showLogModal.value = true
}
async function submitLog() {
  if (!commContactId.value) return
  logSaving.value = true
  logError.value = ''
  try {
    await logCommunication({ contactId: commContactId.value, ...logForm.value })
    showLogModal.value = false
    toast.success(t('common.savedOk'))
    await loadCommunications()
  } catch (err) {
    logError.value = getErrorMessage(err)
  } finally {
    logSaving.value = false
  }
}

const selectedContactName = computed(() => (commContactId.value ? contactName(commContactId.value) : ''))

function switchTab(tab: Tab) {
  activeTab.value = tab
}

onMounted(async () => {
  await loadPickers()
  await loadDocuments()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('documents.title') }}</h1>
      <button v-if="activeTab === 'documents'" class="btn" @click="openUploadModal">+ {{ t('documents.upload') }}</button>
      <button v-else-if="commContactId" class="btn" @click="openLogModal">+ {{ t('documents.logCommunication') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'documents' }" @click="switchTab('documents')">{{ t('documents.tabDocuments') }}</button>
      <button class="tab" :class="{ active: activeTab === 'communications' }" @click="switchTab('communications')">{{ t('documents.tabCommunications') }}</button>
    </div>

    <!-- Documentos -->
    <template v-if="activeTab === 'documents'">
      <div class="inline-form">
        <select v-model="filterCompanyId">
          <option value="">{{ t('documents.allCompanies') }}</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="filterContactId">
          <option value="">{{ t('documents.allContacts') }}</option>
          <option v-for="c in contacts" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName }}</option>
        </select>
      </div>
      <p v-if="documentsLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('documents.name') }}</th>
            <th>{{ t('documents.category') }}</th>
            <th>{{ t('documents.company') }}</th>
            <th>{{ t('documents.contact') }}</th>
            <th>{{ t('documents.size') }}</th>
            <th>{{ t('documents.uploadedAt') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in documents" :key="doc.id">
            <td>{{ doc.name }}</td>
            <td>{{ t(`documents.category${doc.category.charAt(0).toUpperCase()}${doc.category.slice(1)}`) }}</td>
            <td>{{ companyName(doc.companyId) }}</td>
            <td>{{ contactName(doc.contactId) }}</td>
            <td>{{ formatSize(doc.fileSize) }}</td>
            <td>{{ new Date(doc.createdAt).toLocaleDateString() }}</td>
            <td class="actions-cell">
              <button class="btn secondary" @click="handleDownload(doc)">{{ t('documents.download') }}</button>
              <button class="btn secondary" @click="openEdit(doc)">{{ t('common.edit') }}</button>
              <button class="btn secondary" @click="handleDelete(doc)">{{ t('common.delete') }}</button>
            </td>
          </tr>
          <tr v-if="!documents.length">
            <td colspan="7" class="muted">{{ t('documents.noDocuments') }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Comunicaciones -->
    <template v-else>
      <div class="inline-form">
        <select v-model="commContactId">
          <option value="">{{ t('documents.allContacts') }}</option>
          <option v-for="c in contacts" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName }}</option>
        </select>
      </div>
      <p v-if="!commContactId" class="muted">{{ t('documents.selectContactFirst') }}</p>
      <template v-else>
        <p v-if="commLoading" class="muted">{{ t('common.loading') }}</p>
        <table v-else>
          <thead>
            <tr>
              <th>{{ t('documents.occurredAt') }}</th>
              <th>{{ t('documents.channel') }}</th>
              <th>{{ t('documents.direction') }}</th>
              <th>{{ t('documents.summary') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in commEntries" :key="entry.id">
              <td>{{ new Date(entry.occurredAt).toLocaleString() }}</td>
              <td>{{ t(`documents.channel${entry.channel.charAt(0).toUpperCase()}${entry.channel.slice(1)}`) }}</td>
              <td>{{ t(`documents.direction${entry.direction.charAt(0).toUpperCase()}${entry.direction.slice(1)}`) }}</td>
              <td>{{ entry.summary }} <span v-if="!entry.loggedByUserId" class="muted">({{ t('documents.automatic') }})</span></td>
            </tr>
            <tr v-if="!commEntries.length">
              <td colspan="4" class="muted">{{ t('documents.noEntries') }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>

    <!-- Subir documento -->
    <div v-if="showUploadModal" class="modal-backdrop" @click.self="showUploadModal = false">
      <form class="modal" @submit.prevent="submitUpload">
        <h2>{{ t('documents.upload') }}</h2>
        <div class="field">
          <label>{{ t('documents.file') }}</label>
          <input type="file" @change="handleFileChange" />
        </div>
        <div class="field">
          <label>{{ t('documents.name') }}</label>
          <input v-model="uploadForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('documents.category') }}</label>
          <select v-model="uploadForm.category">
            <option value="contract">{{ t('documents.categoryContract') }}</option>
            <option value="presentation">{{ t('documents.categoryPresentation') }}</option>
            <option value="photo">{{ t('documents.categoryPhoto') }}</option>
            <option value="other">{{ t('documents.categoryOther') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('documents.company') }}</label>
          <select v-model="uploadForm.companyId">
            <option value="">{{ t('documents.noneOption') }}</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('documents.contact') }}</label>
          <select v-model="uploadForm.contactId">
            <option value="">{{ t('documents.noneOption') }}</option>
            <option v-for="c in contacts" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName }}</option>
          </select>
        </div>
        <p v-if="uploadError" class="error-text">{{ uploadError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showUploadModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="uploadSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Editar documento -->
    <div v-if="editingDocument" class="modal-backdrop" @click.self="editingDocument = null">
      <form class="modal" @submit.prevent="submitEdit">
        <h2>{{ t('common.edit') }}</h2>
        <div class="field">
          <label>{{ t('documents.name') }}</label>
          <input v-model="editForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('documents.category') }}</label>
          <select v-model="editForm.category">
            <option value="contract">{{ t('documents.categoryContract') }}</option>
            <option value="presentation">{{ t('documents.categoryPresentation') }}</option>
            <option value="photo">{{ t('documents.categoryPhoto') }}</option>
            <option value="other">{{ t('documents.categoryOther') }}</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="editingDocument = null">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Registrar comunicación -->
    <div v-if="showLogModal" class="modal-backdrop" @click.self="showLogModal = false">
      <form class="modal" @submit.prevent="submitLog">
        <h2>{{ t('documents.logCommunication') }}</h2>
        <p class="muted">{{ selectedContactName }}</p>
        <div class="field">
          <label>{{ t('documents.channel') }}</label>
          <select v-model="logForm.channel">
            <option value="call">{{ t('documents.channelCall') }}</option>
            <option value="whatsapp">{{ t('documents.channelWhatsapp') }}</option>
            <option value="sms">{{ t('documents.channelSms') }}</option>
            <option value="email">{{ t('documents.channelEmail') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('documents.direction') }}</label>
          <select v-model="logForm.direction">
            <option value="outbound">{{ t('documents.directionOutbound') }}</option>
            <option value="inbound">{{ t('documents.directionInbound') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('documents.summary') }}</label>
          <textarea v-model="logForm.summary" rows="3" required></textarea>
        </div>
        <p v-if="logError" class="error-text">{{ logError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showLogModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="logSaving">{{ t('common.save') }}</button>
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
</style>
