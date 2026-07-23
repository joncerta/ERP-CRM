<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listTicketsPaginated,
  getTicket,
  createTicket,
  assignTicket,
  escalateTicket,
  updateTicketStatus,
  addTicketComment,
  listTicketComments,
  listArticles,
  createArticle,
  updateArticle,
  suggestArticles,
  type CreateTicketPayload,
} from '@/api/support'
import { listCompanies } from '@/api/companies'
import { listContacts } from '@/api/contacts'
import { listUsers, type TenantUser } from '@/api/users'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { Ticket, TicketComment, TicketStatus, KnowledgeArticle, Company, Contact } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

type Tab = 'tickets' | 'knowledge'
const activeTab = ref<Tab>('tickets')

const companies = ref<Company[]>([])
const contacts = ref<Contact[]>([])
const users = ref<TenantUser[]>([])
async function loadPickers() {
  try {
    const [companiesData, contactsData, usersData] = await Promise.all([listCompanies(), listContacts(), listUsers()])
    companies.value = companiesData
    contacts.value = contactsData
    users.value = usersData
  } catch {
    // Pickers are a convenience for the forms — a failure here shouldn't
    // block the tickets list itself.
  }
}
function companyName(id: string | null) {
  if (!id) return '—'
  return companies.value.find((c) => c.id === id)?.name ?? '—'
}
function userName(id: string | null) {
  if (!id) return '—'
  return users.value.find((u) => u.id === id)?.fullName ?? '—'
}

// --- Tickets ---
const { items: tickets, total, page, totalPages, loading, error, search, filters, load, applyAndReload, goToPage } =
  usePaginatedList<Ticket, { status?: string; priority?: string }>(listTicketsPaginated, { defaultSortBy: 'createdAt' })

let searchDebounce: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(applyAndReload, 300)
}

const statusBadge: Record<string, string> = {
  open: 'blue',
  in_progress: 'amber',
  waiting_customer: 'amber',
  resolved: 'green',
  closed: '',
}
const priorityBadge: Record<string, string> = {
  low: '',
  medium: 'blue',
  high: 'amber',
  urgent: 'red',
}
function isSlaBreached(ticket: Ticket): boolean {
  if (!ticket.slaDueAt) return false
  if (['resolved', 'closed'].includes(ticket.status)) return false
  return new Date(ticket.slaDueAt).getTime() < Date.now()
}

const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref<CreateTicketPayload>({ subject: '', description: '', priority: 'medium', contactId: '', companyId: '' })

function openCreateModal() {
  form.value = { subject: '', description: '', priority: 'medium', contactId: '', companyId: '' }
  formError.value = ''
  showModal.value = true
}
async function submit() {
  saving.value = true
  formError.value = ''
  try {
    await createTicket({
      subject: form.value.subject,
      description: form.value.description,
      priority: form.value.priority,
      contactId: form.value.contactId || undefined,
      companyId: form.value.companyId || undefined,
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

const detailTicket = ref<Ticket | null>(null)
const detailLoadingId = ref<string | null>(null)
const comments = ref<TicketComment[]>([])
const actionSaving = ref(false)
const commentForm = ref({ body: '', isInternal: true })
const assigneeId = ref('')

async function openDetail(ticket: Ticket) {
  detailLoadingId.value = ticket.id
  try {
    const [full, commentsData] = await Promise.all([getTicket(ticket.id), listTicketComments(ticket.id)])
    detailTicket.value = full
    comments.value = commentsData
    assigneeId.value = full.assignedToUserId ?? ''
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    detailLoadingId.value = null
  }
}
async function refreshDetail() {
  if (!detailTicket.value) return
  try {
    const [full, commentsData] = await Promise.all([getTicket(detailTicket.value.id), listTicketComments(detailTicket.value.id)])
    detailTicket.value = full
    comments.value = commentsData
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function submitAssign() {
  if (!detailTicket.value || !assigneeId.value) return
  actionSaving.value = true
  try {
    await assignTicket(detailTicket.value.id, assigneeId.value)
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}
async function handleEscalate() {
  if (!detailTicket.value) return
  actionSaving.value = true
  try {
    await escalateTicket(detailTicket.value.id)
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}
async function changeStatus(status: TicketStatus) {
  if (!detailTicket.value) return
  actionSaving.value = true
  try {
    await updateTicketStatus(detailTicket.value.id, status)
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}
async function submitComment() {
  if (!detailTicket.value || !commentForm.value.body.trim()) return
  actionSaving.value = true
  try {
    await addTicketComment(detailTicket.value.id, commentForm.value.body, commentForm.value.isInternal)
    commentForm.value = { body: '', isInternal: true }
    toast.success(t('common.savedOk'))
    await refreshDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    actionSaving.value = false
  }
}

// --- Knowledge base ---
const articles = ref<KnowledgeArticle[]>([])
const articlesLoading = ref(true)
async function loadArticles() {
  articlesLoading.value = true
  try {
    articles.value = await listArticles()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    articlesLoading.value = false
  }
}
const showArticleModal = ref(false)
const articleSaving = ref(false)
const articleFormError = ref('')
const editingArticleId = ref<string | null>(null)
const articleForm = ref({ title: '', content: '', category: '', isPublished: false })

function openCreateArticle() {
  editingArticleId.value = null
  articleForm.value = { title: '', content: '', category: '', isPublished: false }
  articleFormError.value = ''
  showArticleModal.value = true
}
function openEditArticle(article: KnowledgeArticle) {
  editingArticleId.value = article.id
  articleForm.value = { title: article.title, content: article.content, category: article.category ?? '', isPublished: article.isPublished }
  articleFormError.value = ''
  showArticleModal.value = true
}
async function submitArticle() {
  articleSaving.value = true
  articleFormError.value = ''
  try {
    const payload = {
      title: articleForm.value.title,
      content: articleForm.value.content,
      category: articleForm.value.category || undefined,
      isPublished: articleForm.value.isPublished,
    }
    if (editingArticleId.value) {
      await updateArticle(editingArticleId.value, payload)
    } else {
      await createArticle(payload)
    }
    showArticleModal.value = false
    toast.success(t('common.savedOk'))
    await loadArticles()
  } catch (err) {
    articleFormError.value = getErrorMessage(err)
  } finally {
    articleSaving.value = false
  }
}

// --- Chatbot suggestions (used from the ticket detail to help an agent) ---
const chatbotQuery = ref('')
const chatbotResults = ref<KnowledgeArticle[]>([])
const chatbotLoading = ref(false)
async function runChatbotSearch() {
  if (!chatbotQuery.value.trim()) {
    chatbotResults.value = []
    return
  }
  chatbotLoading.value = true
  try {
    chatbotResults.value = await suggestArticles(chatbotQuery.value)
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    chatbotLoading.value = false
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'knowledge' && !articles.value.length) loadArticles()
}

onMounted(() => {
  load()
  loadPickers()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('support.title') }}</h1>
      <button v-if="activeTab === 'tickets'" class="btn" @click="openCreateModal">+ {{ t('support.newTicket') }}</button>
      <button v-else class="btn" @click="openCreateArticle">+ {{ t('support.newArticle') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'tickets' }" @click="switchTab('tickets')">{{ t('support.tickets') }}</button>
      <button class="tab" :class="{ active: activeTab === 'knowledge' }" @click="switchTab('knowledge')">{{ t('support.knowledgeBase') }}</button>
    </div>

    <!-- Tickets -->
    <template v-if="activeTab === 'tickets'">
      <div class="list-filters">
        <input v-model="search" type="text" class="search-input" :placeholder="t('common.search')" @input="onSearchInput" />
        <select v-model="filters.status" @change="applyAndReload">
          <option :value="undefined">{{ t('support.allStatuses') }}</option>
          <option value="open">{{ t('support.status.open') }}</option>
          <option value="in_progress">{{ t('support.status.in_progress') }}</option>
          <option value="waiting_customer">{{ t('support.status.waiting_customer') }}</option>
          <option value="resolved">{{ t('support.status.resolved') }}</option>
          <option value="closed">{{ t('support.status.closed') }}</option>
        </select>
      </div>

      <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
      <p v-else-if="error" class="error-text">{{ error }}</p>
      <template v-else>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('quotes.description') }}</th>
              <th>{{ t('companies.title') }}</th>
              <th>{{ t('support.priority') }}</th>
              <th>Estado</th>
              <th>{{ t('support.assignedTo') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tk in tickets" :key="tk.id">
              <td>{{ tk.ticketNumber }}</td>
              <td>{{ tk.subject }}</td>
              <td>{{ companyName(tk.companyId) }}</td>
              <td><span class="badge" :class="priorityBadge[tk.priority]">{{ t(`support.priorityLevel.${tk.priority}`) }}</span></td>
              <td>
                <span class="badge" :class="statusBadge[tk.status]">{{ t(`support.status.${tk.status}`) }}</span>
                <span v-if="isSlaBreached(tk)" class="badge red" style="margin-left: 0.35rem">{{ t('support.slaBreached') }}</span>
              </td>
              <td>{{ userName(tk.assignedToUserId) }}</td>
              <td class="actions-cell">
                <button class="btn secondary" :disabled="detailLoadingId === tk.id" @click="openDetail(tk)">
                  {{ t('invoices.viewDetail') }}
                </button>
              </td>
            </tr>
            <tr v-if="!tickets.length">
              <td colspan="7" class="muted">—</td>
            </tr>
          </tbody>
        </table>
        <Pagination :page="page" :total-pages="totalPages" :total="total" @go="goToPage" />
      </template>
    </template>

    <!-- Knowledge base -->
    <template v-else>
      <div class="card" style="max-width: 480px; margin-bottom: 1.25rem">
        <h2 style="font-size: 1rem; margin-bottom: 0.25rem">{{ t('support.chatbot') }}</h2>
        <p class="muted" style="margin-bottom: 0.75rem">{{ t('support.chatbotHint') }}</p>
        <div class="inline-form">
          <input v-model="chatbotQuery" :placeholder="t('support.chatbotPlaceholder')" @keyup.enter="runChatbotSearch" />
          <button type="button" class="btn secondary" :disabled="chatbotLoading" @click="runChatbotSearch">{{ t('common.search') }}</button>
        </div>
        <ul class="detail-list" style="margin-top: 0.5rem">
          <li v-for="a in chatbotResults" :key="a.id">{{ a.title }}</li>
          <li v-if="!chatbotResults.length" class="muted">—</li>
        </ul>
      </div>

      <p v-if="articlesLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('support.articleTitle') }}</th>
            <th>{{ t('support.category') }}</th>
            <th>{{ t('support.views') }}</th>
            <th>{{ t('support.published') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in articles" :key="a.id">
            <td>{{ a.title }}</td>
            <td>{{ a.category || '—' }}</td>
            <td>{{ a.viewCount }}</td>
            <td>
              <span class="badge" :class="a.isPublished ? 'green' : ''">{{ a.isPublished ? t('support.published') : t('support.draft') }}</span>
            </td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openEditArticle(a)">{{ t('common.edit') }}</button>
            </td>
          </tr>
          <tr v-if="!articles.length">
            <td colspan="5" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Create ticket modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <form class="modal" @submit.prevent="submit">
        <h2>{{ t('support.newTicket') }}</h2>
        <div class="field">
          <label>{{ t('support.subject') }}</label>
          <input v-model="form.subject" required />
        </div>
        <div class="field">
          <label>{{ t('quotes.description') }}</label>
          <textarea v-model="form.description" rows="4" required></textarea>
        </div>
        <div class="field">
          <label>{{ t('support.priority') }}</label>
          <select v-model="form.priority">
            <option value="low">{{ t('support.priorityLevel.low') }}</option>
            <option value="medium">{{ t('support.priorityLevel.medium') }}</option>
            <option value="high">{{ t('support.priorityLevel.high') }}</option>
            <option value="urgent">{{ t('support.priorityLevel.urgent') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('companies.title') }}</label>
          <select v-model="form.companyId">
            <option value="">—</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('contacts.title') }}</label>
          <select v-model="form.contactId">
            <option value="">—</option>
            <option v-for="c in contacts" :key="c.id" :value="c.id">{{ c.firstName }} {{ c.lastName || '' }}</option>
          </select>
        </div>
        <p v-if="formError" class="error-text">{{ formError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="saving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Create/edit article modal -->
    <div v-if="showArticleModal" class="modal-backdrop" @click.self="showArticleModal = false">
      <form class="modal wide" @submit.prevent="submitArticle">
        <h2>{{ editingArticleId ? t('common.edit') : t('support.newArticle') }}</h2>
        <div class="field">
          <label>{{ t('support.articleTitle') }}</label>
          <input v-model="articleForm.title" required />
        </div>
        <div class="field">
          <label>{{ t('support.category') }}</label>
          <input v-model="articleForm.category" />
        </div>
        <div class="field">
          <label>{{ t('quotes.description') }}</label>
          <textarea v-model="articleForm.content" rows="8" required></textarea>
        </div>
        <label class="checkbox-field" style="margin-top: 0.5rem">
          <input v-model="articleForm.isPublished" type="checkbox" />
          {{ t('support.published') }}
        </label>
        <p v-if="articleFormError" class="error-text">{{ articleFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showArticleModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="articleSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Ticket detail modal -->
    <div v-if="detailTicket" class="modal-backdrop" @click.self="detailTicket = null">
      <div class="modal wide">
        <h2>{{ detailTicket.ticketNumber }} — {{ detailTicket.subject }}</h2>
        <p>
          <span class="badge" :class="statusBadge[detailTicket.status]">{{ t(`support.status.${detailTicket.status}`) }}</span>
          <span class="badge" :class="priorityBadge[detailTicket.priority]" style="margin-left: 0.35rem">
            {{ t(`support.priorityLevel.${detailTicket.priority}`) }}
          </span>
          <span v-if="isSlaBreached(detailTicket)" class="badge red" style="margin-left: 0.35rem">{{ t('support.slaBreached') }}</span>
        </p>
        <p class="muted" style="margin: 0.5rem 0">{{ detailTicket.description }}</p>
        <p v-if="detailTicket.reporterName" class="muted">
          {{ t('support.reporter') }}: {{ detailTicket.reporterName }} ({{ detailTicket.reporterEmail }})
        </p>

        <div class="inline-form">
          <select v-model="assigneeId">
            <option value="" disabled>{{ t('support.assignTo') }}</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
          </select>
          <button type="button" class="btn secondary" :disabled="actionSaving || !assigneeId" @click="submitAssign">
            {{ t('support.assignTo') }}
          </button>
          <button
            v-if="detailTicket.priority !== 'urgent'"
            type="button"
            class="btn secondary"
            :disabled="actionSaving"
            @click="handleEscalate"
          >
            {{ t('support.escalate') }}
          </button>
        </div>

        <div class="modal-actions" style="justify-content: flex-start; flex-wrap: wrap; gap: 0.5rem">
          <button
            v-for="s in ['in_progress', 'waiting_customer', 'resolved', 'closed']"
            :key="s"
            type="button"
            class="btn secondary"
            :disabled="actionSaving || detailTicket.status === s || detailTicket.status === 'closed'"
            @click="changeStatus(s as TicketStatus)"
          >
            {{ t(`support.status.${s}`) }}
          </button>
        </div>

        <h3 class="section-title">{{ t('support.comments') }}</h3>
        <ul class="detail-list">
          <li v-for="c in comments" :key="c.id">
            {{ new Date(c.createdAt).toLocaleString() }} — {{ c.body }}
            <span v-if="c.isInternal" class="badge amber" style="margin-left: 0.35rem">{{ t('support.internal') }}</span>
          </li>
          <li v-if="!comments.length" class="muted">—</li>
        </ul>
        <form class="inline-form" @submit.prevent="submitComment">
          <input v-model="commentForm.body" :placeholder="t('support.addComment')" style="flex: 1" />
          <label class="checkbox-field">
            <input v-model="commentForm.isInternal" type="checkbox" />
            {{ t('support.internal') }}
          </label>
          <button type="submit" class="btn secondary" :disabled="actionSaving">{{ t('common.save') }}</button>
        </form>

        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="detailTicket = null">{{ t('common.cancel') }}</button>
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
</style>
