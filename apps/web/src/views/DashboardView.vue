<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listLeads } from '@/api/leads'
import { listOpportunities, listPipelineStages } from '@/api/opportunities'
import { listQuotes, listPendingFollowUps } from '@/api/quotes'
import { getErrorMessage } from '@/api/error'
import type { Lead, Opportunity, PipelineStage, Quote, PendingFollowUp } from '@/api/types'

const { t } = useI18n()

const leads = ref<Lead[]>([])
const opportunities = ref<Opportunity[]>([])
const stages = ref<PipelineStage[]>([])
const quotes = ref<Quote[]>([])
const followUps = ref<PendingFollowUp[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [leadsData, opportunitiesData, stagesData, quotesData, followUpsData] = await Promise.all([
      listLeads(),
      listOpportunities(),
      listPipelineStages(),
      listQuotes(),
      listPendingFollowUps(),
    ])
    leads.value = leadsData
    opportunities.value = opportunitiesData
    stages.value = [...stagesData].sort((a, b) => a.order - b.order)
    quotes.value = quotesData
    followUps.value = followUpsData
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const newLeadsThisMonth = computed(() => {
  const now = new Date()
  return leads.value.filter((l) => {
    const created = new Date(l.createdAt)
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length
})

const openOpportunities = computed(() => opportunities.value.filter((o) => o.status === 'open'))

const pipelineValueByCurrency = computed(() => {
  const totals: Record<string, number> = {}
  for (const opp of openOpportunities.value) {
    totals[opp.currencyCode] = (totals[opp.currencyCode] ?? 0) + Number(opp.value)
  }
  return totals
})

const pendingQuotesCount = computed(() => quotes.value.filter((q) => q.status === 'sent' || q.status === 'viewed').length)

const overdueFollowUpsCount = computed(
  () => followUps.value.filter((f) => new Date(f.dueAt).getTime() < Date.now()).length,
)

const stageBreakdown = computed(() =>
  stages.value.map((stage) => ({
    name: stage.name,
    count: opportunities.value.filter((o) => o.stageId === stage.id).length,
  })),
)
const maxStageCount = computed(() => Math.max(1, ...stageBreakdown.value.map((s) => s.count)))

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('dashboard.title') }}</h1>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <template v-else>
      <div class="kpi-grid">
        <div class="card kpi-card">
          <div class="kpi-value">
            <span v-if="!Object.keys(pipelineValueByCurrency).length">0</span>
            <span v-for="(value, currency) in pipelineValueByCurrency" :key="currency" class="kpi-currency-line">
              {{ currency }} {{ value.toLocaleString() }}
            </span>
          </div>
          <div class="kpi-label">{{ t('dashboard.pipelineValue') }}</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-value">{{ openOpportunities.length }}</div>
          <div class="kpi-label">{{ t('dashboard.openOpportunities') }}</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-value">{{ newLeadsThisMonth }}</div>
          <div class="kpi-label">{{ t('dashboard.newLeadsThisMonth') }}</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-value">{{ pendingQuotesCount }}</div>
          <div class="kpi-label">{{ t('dashboard.pendingQuotes') }}</div>
        </div>
        <div class="card kpi-card" :class="{ alert: overdueFollowUpsCount > 0 }">
          <div class="kpi-value">{{ overdueFollowUpsCount }}</div>
          <div class="kpi-label">{{ t('dashboard.overdueFollowUps') }}</div>
        </div>
      </div>

      <div class="card" style="margin-top: 1.25rem">
        <h2 style="font-size: 1rem; margin-bottom: 0.9rem">{{ t('dashboard.stageBreakdown') }}</h2>
        <div v-if="!stageBreakdown.length" class="muted">—</div>
        <div v-else class="stage-bars">
          <div v-for="stage in stageBreakdown" :key="stage.name" class="stage-bar-row">
            <div class="stage-bar-label">{{ stage.name }}</div>
            <div class="stage-bar-track">
              <div class="stage-bar-fill" :style="{ width: `${(stage.count / maxStageCount) * 100}%` }"></div>
            </div>
            <div class="stage-bar-count">{{ stage.count }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.9rem;
}
.kpi-card {
  text-align: left;
}
.kpi-card.alert .kpi-value {
  color: var(--color-danger);
}
.kpi-value {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--color-heading);
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.kpi-currency-line {
  font-size: 1.15rem;
}
.kpi-label {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  margin-top: 0.3rem;
}
.stage-bars {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.stage-bar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.stage-bar-label {
  width: 130px;
  flex-shrink: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
.stage-bar-track {
  flex: 1;
  height: 10px;
  background: var(--color-bg-subtle);
  border-radius: 5px;
  overflow: hidden;
}
.stage-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 5px;
}
.stage-bar-count {
  width: 24px;
  text-align: right;
  font-size: 0.85rem;
  font-weight: 600;
}
</style>
