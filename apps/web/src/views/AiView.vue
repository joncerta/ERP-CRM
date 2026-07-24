<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { requestDraft, requestSummary, requestLeadScore, askAssistant } from '@/api/ai'
import { listQuotes } from '@/api/quotes'
import { listTickets } from '@/api/support'
import { listProducts } from '@/api/products'
import { listCompanies } from '@/api/companies'
import { listLeads } from '@/api/leads'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { Quote, Ticket, Product, Company, Lead, DraftType, SummaryType } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

type Tab = 'assistant' | 'drafts' | 'summaries' | 'leadScoring'
const activeTab = ref<Tab>('assistant')

const quotes = ref<Quote[]>([])
const tickets = ref<Ticket[]>([])
const products = ref<Product[]>([])
const companies = ref<Company[]>([])
const leads = ref<Lead[]>([])

async function loadPickers() {
  try {
    const [quoteList, ticketList, productList, companyList, leadList] = await Promise.all([
      listQuotes(),
      listTickets(),
      listProducts(),
      listCompanies(),
      listLeads(),
    ])
    quotes.value = quoteList
    tickets.value = ticketList
    products.value = productList
    companies.value = companyList
    leads.value = leadList
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Asistente ---
interface ConversationEntry {
  question: string
  answer: string
}
const question = ref('')
const conversation = ref<ConversationEntry[]>([])
const asking = ref(false)
async function submitQuestion() {
  if (!question.value.trim()) return
  asking.value = true
  const asked = question.value
  try {
    const { answer } = await askAssistant(asked)
    conversation.value.push({ question: asked, answer })
    question.value = ''
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    asking.value = false
  }
}

// --- Redacción asistida ---
const draftType = ref<DraftType>('quote_followup')
const draftContextId = ref('')
const draftInstructions = ref('')
const draftResult = ref('')
const draftLoading = ref(false)
async function submitDraft() {
  if (!draftContextId.value) return
  draftLoading.value = true
  draftResult.value = ''
  try {
    const { draft } = await requestDraft({ type: draftType.value, contextId: draftContextId.value, instructions: draftInstructions.value || undefined })
    draftResult.value = draft
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    draftLoading.value = false
  }
}
function onDraftTypeChange() {
  draftContextId.value = ''
  draftResult.value = ''
}

// --- Resúmenes ---
const summaryType = ref<SummaryType>('company')
const summaryContextId = ref('')
const summaryResult = ref('')
const summaryLoading = ref(false)
async function submitSummary() {
  if (summaryType.value === 'company' && !summaryContextId.value) return
  summaryLoading.value = true
  summaryResult.value = ''
  try {
    const { summary } = await requestSummary({ type: summaryType.value, contextId: summaryType.value === 'company' ? summaryContextId.value : undefined })
    summaryResult.value = summary
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    summaryLoading.value = false
  }
}

// --- Priorización de leads ---
const scoringLeadId = ref('')
const scoreResult = ref<{ priority: string; reasoning: string } | null>(null)
const scoreLoading = ref(false)
async function submitLeadScore() {
  if (!scoringLeadId.value) return
  scoreLoading.value = true
  scoreResult.value = null
  try {
    const { priority, reasoning } = await requestLeadScore(scoringLeadId.value)
    scoreResult.value = { priority, reasoning }
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    scoreLoading.value = false
  }
}

onMounted(loadPickers)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('ai.title') }}</h1>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'assistant' }" @click="activeTab = 'assistant'">{{ t('ai.tabAssistant') }}</button>
      <button class="tab" :class="{ active: activeTab === 'drafts' }" @click="activeTab = 'drafts'">{{ t('ai.tabDrafts') }}</button>
      <button class="tab" :class="{ active: activeTab === 'summaries' }" @click="activeTab = 'summaries'">{{ t('ai.tabSummaries') }}</button>
      <button class="tab" :class="{ active: activeTab === 'leadScoring' }" @click="activeTab = 'leadScoring'">{{ t('ai.tabLeadScoring') }}</button>
    </div>

    <!-- Asistente -->
    <template v-if="activeTab === 'assistant'">
      <div class="conversation">
        <div v-for="(entry, i) in conversation" :key="i" class="conversation-entry">
          <p class="conversation-question"><strong>{{ t('ai.you') }}:</strong> {{ entry.question }}</p>
          <p class="conversation-answer"><strong>{{ t('ai.assistant') }}:</strong> {{ entry.answer }}</p>
        </div>
        <p v-if="!conversation.length" class="muted">{{ t('ai.assistantPlaceholder') }}</p>
      </div>
      <form class="assistant-form" @submit.prevent="submitQuestion">
        <textarea v-model="question" rows="2" :placeholder="t('ai.assistantPlaceholder')"></textarea>
        <button type="submit" class="btn" :disabled="asking || !question.trim()">{{ asking ? t('ai.thinking') : t('ai.ask') }}</button>
      </form>
    </template>

    <!-- Redacción asistida -->
    <template v-else-if="activeTab === 'drafts'">
      <form @submit.prevent="submitDraft">
        <div class="field">
          <label>{{ t('ai.draftType') }}</label>
          <select v-model="draftType" @change="onDraftTypeChange">
            <option value="quote_followup">{{ t('ai.draftType_quote_followup') }}</option>
            <option value="ticket_reply">{{ t('ai.draftType_ticket_reply') }}</option>
            <option value="product_description">{{ t('ai.draftType_product_description') }}</option>
          </select>
        </div>
        <div v-if="draftType === 'quote_followup'" class="field">
          <label>{{ t('ai.selectQuote') }}</label>
          <select v-model="draftContextId" required>
            <option value="" disabled>{{ t('ai.selectQuote') }}</option>
            <option v-for="q in quotes" :key="q.id" :value="q.id">{{ q.quoteNumber }}</option>
          </select>
        </div>
        <div v-else-if="draftType === 'ticket_reply'" class="field">
          <label>{{ t('ai.selectTicket') }}</label>
          <select v-model="draftContextId" required>
            <option value="" disabled>{{ t('ai.selectTicket') }}</option>
            <option v-for="tk in tickets" :key="tk.id" :value="tk.id">{{ tk.subject }}</option>
          </select>
        </div>
        <div v-else class="field">
          <label>{{ t('ai.selectProduct') }}</label>
          <select v-model="draftContextId" required>
            <option value="" disabled>{{ t('ai.selectProduct') }}</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('ai.additionalInstructions') }}</label>
          <textarea v-model="draftInstructions" rows="2"></textarea>
        </div>
        <button type="submit" class="btn" :disabled="draftLoading || !draftContextId">{{ draftLoading ? t('ai.thinking') : t('ai.generateDraft') }}</button>
      </form>
      <div v-if="draftResult" class="result-box">
        <h3>{{ t('ai.generatedDraft') }}</h3>
        <p>{{ draftResult }}</p>
      </div>
    </template>

    <!-- Resúmenes -->
    <template v-else-if="activeTab === 'summaries'">
      <form @submit.prevent="submitSummary">
        <div class="field">
          <label>{{ t('ai.summaryType') }}</label>
          <select v-model="summaryType">
            <option value="company">{{ t('ai.summaryType_company') }}</option>
            <option value="pipeline">{{ t('ai.summaryType_pipeline') }}</option>
          </select>
        </div>
        <div v-if="summaryType === 'company'" class="field">
          <label>{{ t('ai.selectCompany') }}</label>
          <select v-model="summaryContextId" required>
            <option value="" disabled>{{ t('ai.selectCompany') }}</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <button type="submit" class="btn" :disabled="summaryLoading || (summaryType === 'company' && !summaryContextId)">{{ summaryLoading ? t('ai.thinking') : t('ai.generateSummary') }}</button>
      </form>
      <div v-if="summaryResult" class="result-box">
        <h3>{{ t('ai.generatedSummary') }}</h3>
        <p>{{ summaryResult }}</p>
      </div>
    </template>

    <!-- Priorización de leads -->
    <template v-else>
      <form @submit.prevent="submitLeadScore">
        <div class="field">
          <label>{{ t('ai.selectLead') }}</label>
          <select v-model="scoringLeadId" required>
            <option value="" disabled>{{ t('ai.selectLead') }}</option>
            <option v-for="l in leads" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </div>
        <button type="submit" class="btn" :disabled="scoreLoading || !scoringLeadId">{{ scoreLoading ? t('ai.thinking') : t('ai.evaluateLead') }}</button>
      </form>
      <div v-if="scoreResult" class="result-box">
        <h3>{{ t('ai.suggestedPriority') }}: <span class="badge" :class="{ green: scoreResult.priority === 'low', amber: scoreResult.priority === 'medium', red: scoreResult.priority === 'high' }">{{ scoreResult.priority }}</span></h3>
        <p><strong>{{ t('ai.reasoning') }}:</strong> {{ scoreResult.reasoning }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
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
.conversation {
  margin-bottom: 1rem;
  max-height: 24rem;
  overflow-y: auto;
}
.conversation-entry {
  margin-bottom: 0.9rem;
}
.conversation-question {
  margin: 0 0 0.25rem;
}
.conversation-answer {
  margin: 0;
  color: var(--color-text-muted);
}
.assistant-form {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}
.assistant-form textarea {
  flex: 1;
}
.result-box {
  margin-top: 1.25rem;
  background: var(--color-bg-subtle);
  border-radius: var(--radius);
  padding: 1rem;
}
.result-box h3 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
}
.result-box p {
  margin: 0;
  white-space: pre-wrap;
}
.badge.amber {
  background: #fef3c7;
  color: #92400e;
}
</style>
