<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { listPipelineStages, listOpportunities, moveOpportunityStage } from '@/api/opportunities'
import { listCompanies } from '@/api/companies'
import { getErrorMessage } from '@/api/error'
import type { PipelineStage, Opportunity, Company } from '@/api/types'

const { t } = useI18n()

const stages = ref<PipelineStage[]>([])
const opportunities = ref<Opportunity[]>([])
const companies = ref<Company[]>([])
const loading = ref(true)
const error = ref('')
const draggingId = ref<string | null>(null)
const dragOverStageId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [stagesData, opportunitiesData, companiesData] = await Promise.all([
      listPipelineStages(),
      listOpportunities(),
      listCompanies(),
    ])
    stages.value = [...stagesData].sort((a, b) => a.order - b.order)
    opportunities.value = opportunitiesData
    companies.value = companiesData
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function opportunitiesByStage(stageId: string) {
  return opportunities.value.filter((o) => o.stageId === stageId)
}

function companyName(id: string | null) {
  return companies.value.find((c) => c.id === id)?.name ?? '—'
}

function formatValue(opp: Opportunity) {
  return `${opp.currencyCode} ${Number(opp.value).toLocaleString()}`
}

function onDragStart(oppId: string) {
  draggingId.value = oppId
}

function onDragOver(stageId: string) {
  dragOverStageId.value = stageId
}

async function onDrop(stageId: string) {
  dragOverStageId.value = null
  if (!draggingId.value) return
  const opp = opportunities.value.find((o) => o.id === draggingId.value)
  if (!opp || opp.stageId === stageId) {
    draggingId.value = null
    return
  }
  const previousStageId = opp.stageId
  opp.stageId = stageId // optimistic update
  draggingId.value = null
  try {
    await moveOpportunityStage(opp.id, stageId)
  } catch {
    opp.stageId = previousStageId
  }
}

const totalsByStage = computed(() => {
  const totals: Record<string, number> = {}
  for (const stage of stages.value) {
    totals[stage.id] = opportunitiesByStage(stage.id).reduce((sum, o) => sum + Number(o.value), 0)
  }
  return totals
})

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('pipeline.title') }}</h1>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <div v-else class="board">
      <div
        v-for="stage in stages"
        :key="stage.id"
        class="column"
        :class="{ over: dragOverStageId === stage.id }"
        @dragover.prevent="onDragOver(stage.id)"
        @drop.prevent="onDrop(stage.id)"
      >
        <div class="column-header">
          <span>{{ stage.name }}</span>
          <span class="muted">{{ opportunitiesByStage(stage.id).length }}</span>
        </div>
        <div class="muted column-total">
          {{ totalsByStage[stage.id]?.toLocaleString() }}
        </div>
        <div class="cards">
          <div
            v-for="opp in opportunitiesByStage(stage.id)"
            :key="opp.id"
            class="card opp-card"
            draggable="true"
            @dragstart="onDragStart(opp.id)"
          >
            <div class="opp-name">{{ opp.name }}</div>
            <div class="muted">{{ companyName(opp.companyId) }}</div>
            <div class="opp-value">{{ formatValue(opp) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  gap: 0.9rem;
  overflow-x: auto;
  padding-bottom: 1rem;
}
.column {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  min-width: 250px;
  max-width: 250px;
  padding: 0.85rem;
  flex-shrink: 0;
}
.column.over {
  outline: 2px dashed var(--color-primary);
}
.column-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--color-heading);
  margin-bottom: 0.15rem;
}
.column-total {
  font-size: 0.78rem;
  margin-bottom: 0.6rem;
}
.cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 40px;
}
.opp-card {
  padding: 0.75rem;
  cursor: grab;
  border-radius: 11px;
}
.opp-name {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 0.15rem;
}
.opp-value {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-top: 0.4rem;
}
</style>
