<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  listWebhooks,
  createWebhook,
  updateWebhook,
  processAutomations,
  reportByRep,
  reportByClient,
  reportByCampaign,
  reportForecast,
  downloadReportCsv,
  type CreateAutomationRulePayload,
  type CreateWebhookPayload,
} from '@/api/automations'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type {
  AutomationRule,
  AutomationRuleType,
  WebhookSubscription,
  WebhookEventType,
  RepReportRow,
  ClientReportRow,
  CampaignReportRow,
  ForecastRow,
} from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

type Tab = 'rules' | 'webhooks' | 'reports'
const activeTab = ref<Tab>('rules')

// --- Reglas ---
const rules = ref<AutomationRule[]>([])
const rulesLoading = ref(true)
async function loadRules() {
  rulesLoading.value = true
  try {
    rules.value = await listAutomationRules()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    rulesLoading.value = false
  }
}
const showRuleModal = ref(false)
const ruleSaving = ref(false)
const ruleFormError = ref('')
const ruleForm = ref<{ name: string; type: AutomationRuleType; staleDays: number }>({ name: '', type: 'lead_stale_reminder', staleDays: 7 })

function openCreateRule() {
  ruleForm.value = { name: '', type: 'lead_stale_reminder', staleDays: 7 }
  ruleFormError.value = ''
  showRuleModal.value = true
}
async function submitRule() {
  ruleSaving.value = true
  ruleFormError.value = ''
  try {
    const payload: CreateAutomationRulePayload = {
      name: ruleForm.value.name,
      type: ruleForm.value.type,
      config: ruleForm.value.type === 'lead_stale_reminder' ? { staleDays: ruleForm.value.staleDays } : {},
    }
    await createAutomationRule(payload)
    showRuleModal.value = false
    toast.success(t('common.savedOk'))
    await loadRules()
  } catch (err) {
    ruleFormError.value = getErrorMessage(err)
  } finally {
    ruleSaving.value = false
  }
}
async function toggleRuleActive(rule: AutomationRule) {
  try {
    await updateAutomationRule(rule.id, { isActive: !rule.isActive })
    toast.success(t('common.savedOk'))
    await loadRules()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Webhooks ---
const webhooks = ref<WebhookSubscription[]>([])
const webhooksLoading = ref(true)
async function loadWebhooks() {
  webhooksLoading.value = true
  try {
    webhooks.value = await listWebhooks()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    webhooksLoading.value = false
  }
}
const showWebhookModal = ref(false)
const webhookSaving = ref(false)
const webhookFormError = ref('')
const webhookForm = ref<CreateWebhookPayload>({ name: '', eventType: 'lead.created', url: '' })

function openCreateWebhook() {
  webhookForm.value = { name: '', eventType: 'lead.created', url: '' }
  webhookFormError.value = ''
  showWebhookModal.value = true
}
async function submitWebhook() {
  webhookSaving.value = true
  webhookFormError.value = ''
  try {
    await createWebhook(webhookForm.value)
    showWebhookModal.value = false
    toast.success(t('common.savedOk'))
    await loadWebhooks()
  } catch (err) {
    webhookFormError.value = getErrorMessage(err)
  } finally {
    webhookSaving.value = false
  }
}
async function toggleWebhookActive(webhook: WebhookSubscription) {
  try {
    await updateWebhook(webhook.id, { isActive: !webhook.isActive })
    toast.success(t('common.savedOk'))
    await loadWebhooks()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// --- Disparador manual ---
const processing = ref(false)
async function handleProcess() {
  processing.value = true
  try {
    const result = await processAutomations()
    toast.success(t('automations.processResult', { overdue: result.overdueInvoices, stale: result.staleLeadReminders }))
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    processing.value = false
  }
}

// --- Reportes ---
type ReportKind = 'by-rep' | 'by-client' | 'by-campaign' | 'forecast'
const reportKind = ref<ReportKind>('by-rep')
const reportLoading = ref(false)
const repRows = ref<RepReportRow[]>([])
const clientRows = ref<ClientReportRow[]>([])
const campaignRows = ref<CampaignReportRow[]>([])
const forecastRows = ref<ForecastRow[]>([])

async function loadReport() {
  reportLoading.value = true
  try {
    if (reportKind.value === 'by-rep') repRows.value = await reportByRep()
    else if (reportKind.value === 'by-client') clientRows.value = await reportByClient()
    else if (reportKind.value === 'by-campaign') campaignRows.value = await reportByCampaign()
    else forecastRows.value = await reportForecast()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    reportLoading.value = false
  }
}
function switchReport(kind: ReportKind) {
  reportKind.value = kind
  loadReport()
}
async function handleDownloadCsv() {
  try {
    await downloadReportCsv(reportKind.value)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'webhooks' && !webhooks.value.length) loadWebhooks()
  if (tab === 'reports' && !repRows.value.length) loadReport()
}

onMounted(() => {
  loadRules()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('automations.title') }}</h1>
      <button v-if="activeTab === 'rules'" class="btn" @click="openCreateRule">+ {{ t('automations.newRule') }}</button>
      <button v-else-if="activeTab === 'webhooks'" class="btn" @click="openCreateWebhook">+ {{ t('automations.newWebhook') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'rules' }" @click="switchTab('rules')">{{ t('automations.rules') }}</button>
      <button class="tab" :class="{ active: activeTab === 'webhooks' }" @click="switchTab('webhooks')">{{ t('automations.webhooks') }}</button>
      <button class="tab" :class="{ active: activeTab === 'reports' }" @click="switchTab('reports')">{{ t('automations.reports') }}</button>
    </div>

    <!-- Reglas -->
    <template v-if="activeTab === 'rules'">
      <div class="inline-form">
        <button type="button" class="btn secondary" :disabled="processing" @click="handleProcess">{{ t('automations.processNow') }}</button>
        <span class="muted">{{ t('automations.processHint') }}</span>
      </div>
      <p v-if="rulesLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('automations.name') }}</th>
            <th>{{ t('automations.type') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.id">
            <td>{{ r.name }}</td>
            <td>{{ t(`automations.ruleType.${r.type}`) }}</td>
            <td><span class="badge" :class="r.isActive ? 'green' : ''">{{ r.isActive ? t('marketing.active') : t('marketing.inactive') }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="toggleRuleActive(r)">
                {{ r.isActive ? t('marketing.deactivate') : t('marketing.activate') }}
              </button>
            </td>
          </tr>
          <tr v-if="!rules.length">
            <td colspan="4" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Webhooks -->
    <template v-else-if="activeTab === 'webhooks'">
      <p class="muted" style="margin-bottom: 0.75rem">{{ t('automations.webhooksHint') }}</p>
      <p v-if="webhooksLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('automations.name') }}</th>
            <th>{{ t('automations.event') }}</th>
            <th>URL</th>
            <th>{{ t('automations.lastStatus') }}</th>
            <th>Estado</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in webhooks" :key="w.id">
            <td>{{ w.name }}</td>
            <td>{{ w.eventType }}</td>
            <td><code>{{ w.url }}</code></td>
            <td>{{ w.lastStatus || '—' }}</td>
            <td><span class="badge" :class="w.isActive ? 'green' : ''">{{ w.isActive ? t('marketing.active') : t('marketing.inactive') }}</span></td>
            <td class="actions-cell">
              <button class="btn secondary" @click="toggleWebhookActive(w)">
                {{ w.isActive ? t('marketing.deactivate') : t('marketing.activate') }}
              </button>
            </td>
          </tr>
          <tr v-if="!webhooks.length">
            <td colspan="6" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Reportes -->
    <template v-else>
      <div class="inline-form">
        <select v-model="reportKind" @change="loadReport">
          <option value="by-rep">{{ t('automations.reportByRep') }}</option>
          <option value="by-client">{{ t('automations.reportByClient') }}</option>
          <option value="by-campaign">{{ t('automations.reportByCampaign') }}</option>
          <option value="forecast">{{ t('automations.reportForecast') }}</option>
        </select>
        <button type="button" class="btn secondary" @click="handleDownloadCsv">{{ t('automations.downloadCsv') }}</button>
      </div>
      <p v-if="reportLoading" class="muted">{{ t('common.loading') }}</p>
      <template v-else>
        <table v-if="reportKind === 'by-rep'">
          <thead>
            <tr>
              <th>{{ t('automations.rep') }}</th>
              <th>{{ t('automations.wonOpportunities') }}</th>
              <th>{{ t('automations.wonValue') }}</th>
              <th>{{ t('automations.invoicedTotal') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in repRows" :key="row.ownerUserId">
              <td>{{ row.ownerName }}</td>
              <td>{{ row.wonOpportunities }}</td>
              <td>{{ row.wonValue.toLocaleString() }}</td>
              <td>{{ row.invoicedTotal.toLocaleString() }}</td>
            </tr>
            <tr v-if="!repRows.length"><td colspan="4" class="muted">—</td></tr>
          </tbody>
        </table>
        <table v-else-if="reportKind === 'by-client'">
          <thead>
            <tr>
              <th>{{ t('companies.title') }}</th>
              <th>{{ t('automations.invoiceCount') }}</th>
              <th>{{ t('automations.invoicedTotal') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in clientRows" :key="row.companyId">
              <td>{{ row.companyName }}</td>
              <td>{{ row.invoiceCount }}</td>
              <td>{{ row.invoicedTotal.toLocaleString() }}</td>
            </tr>
            <tr v-if="!clientRows.length"><td colspan="3" class="muted">—</td></tr>
          </tbody>
        </table>
        <table v-else-if="reportKind === 'by-campaign'">
          <thead>
            <tr>
              <th>{{ t('marketing.campaignName') }}</th>
              <th>{{ t('automations.leadCount') }}</th>
              <th>{{ t('automations.convertedCount') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in campaignRows" :key="row.campaign">
              <td>{{ row.campaign }}</td>
              <td>{{ row.leadCount }}</td>
              <td>{{ row.convertedCount }}</td>
            </tr>
            <tr v-if="!campaignRows.length"><td colspan="3" class="muted">—</td></tr>
          </tbody>
        </table>
        <table v-else>
          <thead>
            <tr>
              <th>{{ t('automations.month') }}</th>
              <th>{{ t('automations.openCount') }}</th>
              <th>{{ t('automations.weightedValue') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in forecastRows" :key="row.month">
              <td>{{ row.month }}</td>
              <td>{{ row.openCount }}</td>
              <td>{{ row.weightedValue.toLocaleString() }}</td>
            </tr>
            <tr v-if="!forecastRows.length"><td colspan="3" class="muted">—</td></tr>
          </tbody>
        </table>
      </template>
    </template>

    <!-- Crear regla -->
    <div v-if="showRuleModal" class="modal-backdrop" @click.self="showRuleModal = false">
      <form class="modal" @submit.prevent="submitRule">
        <h2>{{ t('automations.newRule') }}</h2>
        <div class="field">
          <label>{{ t('automations.name') }}</label>
          <input v-model="ruleForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('automations.type') }}</label>
          <select v-model="ruleForm.type">
            <option value="lead_stale_reminder">{{ t('automations.ruleType.lead_stale_reminder') }}</option>
            <option value="auto_assign_lead">{{ t('automations.ruleType.auto_assign_lead') }}</option>
          </select>
        </div>
        <div v-if="ruleForm.type === 'lead_stale_reminder'" class="field">
          <label>{{ t('automations.staleDays') }}</label>
          <input v-model.number="ruleForm.staleDays" type="number" min="1" required />
        </div>
        <p v-if="ruleForm.type === 'auto_assign_lead'" class="muted" style="font-size: 0.8rem">{{ t('automations.autoAssignHint') }}</p>
        <p v-if="ruleFormError" class="error-text">{{ ruleFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showRuleModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="ruleSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Crear webhook -->
    <div v-if="showWebhookModal" class="modal-backdrop" @click.self="showWebhookModal = false">
      <form class="modal" @submit.prevent="submitWebhook">
        <h2>{{ t('automations.newWebhook') }}</h2>
        <div class="field">
          <label>{{ t('automations.name') }}</label>
          <input v-model="webhookForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('automations.event') }}</label>
          <select v-model="webhookForm.eventType">
            <option value="lead.created">lead.created</option>
            <option value="quote.accepted">quote.accepted</option>
            <option value="opportunity.won">opportunity.won</option>
            <option value="invoice.overdue">invoice.overdue</option>
          </select>
        </div>
        <div class="field">
          <label>URL</label>
          <input v-model="webhookForm.url" type="url" placeholder="https://..." required />
        </div>
        <p v-if="webhookFormError" class="error-text">{{ webhookFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showWebhookModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="webhookSaving">{{ t('common.save') }}</button>
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
.inline-form input,
.inline-form select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}
code {
  font-size: 0.78rem;
  background: var(--color-bg-subtle);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}
</style>
