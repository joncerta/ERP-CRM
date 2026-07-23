<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { listAuditLogs, listAuditEntityTypes } from '@/api/audit-logs'
import { listUsers } from '@/api/users'
import { getErrorMessage } from '@/api/error'
import type { AuditLog } from '@/api/audit-logs'
import type { TenantUser } from '@/api/users'

const { t } = useI18n()

const logs = ref<AuditLog[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const loading = ref(true)
const error = ref('')

const users = ref<TenantUser[]>([])
const entityTypes = ref<string[]>([])
const actorFilter = ref('')
const entityTypeFilter = ref('')
const fromFilter = ref('')
const toFilter = ref('')

const expandedId = ref<string | null>(null)

const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize), 1))

function userName(id: string | null) {
  if (!id) return '—'
  return users.value.find((u) => u.id === id)?.fullName ?? id
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

const actionBadge: Record<string, string> = {
  create: 'green',
  update: 'amber',
  delete: 'red',
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await listAuditLogs({
      actorUserId: actorFilter.value || undefined,
      entityType: entityTypeFilter.value || undefined,
      from: fromFilter.value ? new Date(fromFilter.value).toISOString() : undefined,
      to: toFilter.value ? new Date(toFilter.value).toISOString() : undefined,
      page: page.value,
      pageSize,
    })
    logs.value = result.items
    total.value = result.total
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function loadFilters() {
  try {
    const [usersData, entityTypesData] = await Promise.all([listUsers().catch(() => []), listAuditEntityTypes()])
    users.value = usersData
    entityTypes.value = entityTypesData
  } catch {
    // Filters are a nice-to-have — a failure here shouldn't block the log list itself.
  }
}

function applyFilters() {
  page.value = 1
  load()
}

function goToPage(next: number) {
  if (next < 1 || next > totalPages.value) return
  page.value = next
  load()
}

function toggleExpand(log: AuditLog) {
  expandedId.value = expandedId.value === log.id ? null : log.id
}

watch(page, load)

onMounted(() => {
  loadFilters()
  load()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('audit.title') }}</h1>
    </div>
    <p class="muted" style="margin-bottom: 1rem">{{ t('audit.subtitle') }}</p>

    <div class="list-filters">
      <select v-model="actorFilter" @change="applyFilters">
        <option value="">{{ t('audit.allUsers') }}</option>
        <option v-for="u in users" :key="u.id" :value="u.id">{{ u.fullName }}</option>
      </select>
      <select v-model="entityTypeFilter" @change="applyFilters">
        <option value="">{{ t('audit.allEntities') }}</option>
        <option v-for="et in entityTypes" :key="et" :value="et">{{ et }}</option>
      </select>
      <input v-model="fromFilter" type="date" @change="applyFilters" />
      <input v-model="toFilter" type="date" @change="applyFilters" />
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <template v-else>
      <table>
        <thead>
          <tr>
            <th>{{ t('audit.date') }}</th>
            <th>{{ t('audit.user') }}</th>
            <th>{{ t('audit.entity') }}</th>
            <th>{{ t('audit.action') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="log in logs" :key="log.id">
            <tr class="audit-row" @click="toggleExpand(log)">
              <td>{{ formatDate(log.createdAt) }}</td>
              <td>{{ userName(log.actorUserId) }}</td>
              <td>{{ log.entityType }}</td>
              <td><span class="badge" :class="actionBadge[log.action]">{{ t(`audit.actions.${log.action}`) }}</span></td>
              <td class="muted">{{ expandedId === log.id ? '▲' : '▼' }}</td>
            </tr>
            <tr v-if="expandedId === log.id" class="audit-detail-row">
              <td colspan="5">
                <div v-if="log.changes" class="audit-changes">
                  <template v-if="log.action === 'update'">
                    <div v-for="(change, field) in log.changes" :key="field" class="audit-change">
                      <strong>{{ field }}</strong>
                      <span class="muted">{{ (change as any).before ?? '—' }}</span>
                      <span>→</span>
                      <span>{{ (change as any).after ?? '—' }}</span>
                    </div>
                  </template>
                  <pre v-else class="audit-snapshot">{{ JSON.stringify(log.changes, null, 2) }}</pre>
                </div>
                <p v-else class="muted">{{ t('audit.noDetail') }}</p>
              </td>
            </tr>
          </template>
          <tr v-if="!logs.length">
            <td colspan="5" class="muted">—</td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="pagination">
        <button class="btn secondary" :disabled="page === 1" @click="goToPage(page - 1)">‹</button>
        <span class="muted">{{ t('common.pageOf', { page, totalPages }) }}</span>
        <button class="btn secondary" :disabled="page === totalPages" @click="goToPage(page + 1)">›</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.audit-row {
  cursor: pointer;
}
.audit-detail-row td {
  background: var(--color-bg-subtle);
  padding: 0.85rem 1rem;
}
.audit-changes {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.audit-change {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
}
.audit-snapshot {
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}
</style>
