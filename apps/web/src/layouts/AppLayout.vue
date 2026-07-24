<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getTenantSettings } from '@/api/tenant-settings'
import { applyBranding } from '@/utils/branding'
import { listEnabledModules } from '@/api/modules'
import { useBrandingStore } from '@/stores/branding'

const auth = useAuthStore()
const notificationsStore = useNotificationsStore()
const router = useRouter()
const { t } = useI18n()
const brandingStore = useBrandingStore()

// A platform operator manages tenants/modules — it has no CRM data of its
// own to see, so it gets a completely different nav than a customer admin.
const isPlatformAdmin = computed(() => auth.hasPermission('platform.tenants.manage'))

const enabledModuleCodes = ref<string[]>([])
const notificationsOpen = ref(false)

async function handleLogout() {
  notificationsStore.disconnect()
  await auth.logoutEverywhere()
  router.push({ name: 'login' })
}

function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
}

async function handleMarkAllRead() {
  await notificationsStore.markAllRead()
}

onMounted(async () => {
  try {
    const settings = await getTenantSettings()
    applyBranding({ primaryColor: settings.brandingPrimaryColor, secondaryColor: settings.brandingSecondaryColor })
    brandingStore.setLogo(settings.brandingLogoData)
  } catch {
    // Not critical — the default palette is a perfectly fine fallback.
  }
  if (!isPlatformAdmin.value) {
    listEnabledModules()
      .then((modules) => (enabledModuleCodes.value = modules.map((m) => m.moduleCode)))
      .catch(() => {})
  }
  notificationsStore.connect()
  notificationsStore.load().catch(() => {})
})

onUnmounted(() => {
  notificationsStore.disconnect()
})
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <img v-if="brandingStore.logoDataUrl" :src="brandingStore.logoDataUrl" alt="" class="brand-logo sidebar-logo" />
        <template v-else>
          <div class="brand-mark">E</div>
          <span>ERP-CRM</span>
        </template>
      </div>
      <nav>
        <template v-if="isPlatformAdmin">
          <RouterLink to="/platform/tenants">{{ t('nav.platform') }}</RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/dashboard">{{ t('nav.dashboard') }}</RouterLink>
          <template v-if="enabledModuleCodes.includes('crm')">
            <RouterLink v-if="auth.hasPermission('crm.opportunities.read')" to="/pipeline">{{ t('nav.pipeline') }}</RouterLink>
            <RouterLink v-if="auth.hasPermission('crm.activities.read')" to="/activities">{{ t('nav.activities') }}</RouterLink>
            <RouterLink v-if="auth.hasPermission('crm.quotes.read')" to="/reminders">{{ t('nav.reminders') }}</RouterLink>
            <RouterLink v-if="auth.hasPermission('crm.leads.read')" to="/leads">{{ t('nav.leads') }}</RouterLink>
            <RouterLink v-if="auth.hasPermission('crm.contacts.read')" to="/contacts">{{ t('nav.contacts') }}</RouterLink>
            <RouterLink v-if="auth.hasPermission('crm.contacts.read')" to="/companies">{{ t('nav.companies') }}</RouterLink>
            <RouterLink v-if="auth.hasPermission('crm.quotes.read')" to="/quotes">{{ t('nav.quotes') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('inventory')">
            <RouterLink v-if="auth.hasPermission('inventory.products.read')" to="/inventory/products">{{ t('nav.products') }}</RouterLink>
            <RouterLink v-if="auth.hasPermission('inventory.warehouses.read')" to="/inventory/warehouses">{{ t('nav.warehouses') }}</RouterLink>
            <RouterLink v-if="auth.hasPermission('inventory.stock.read')" to="/inventory/stock">{{ t('nav.stock') }}</RouterLink>
            <RouterLink v-if="auth.hasPermission('inventory.products.read')" to="/inventory/categories-units">{{ t('nav.categoriesUnits') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('sales_invoicing') && auth.hasPermission('finance.invoices.read')">
            <RouterLink to="/invoices">{{ t('nav.invoices') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('purchasing') && auth.hasPermission('finance.purchases.read')">
            <RouterLink to="/purchases">{{ t('nav.purchases') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('accounting') && auth.hasPermission('accounting.entries.read')">
            <RouterLink to="/accounting">{{ t('nav.accounting') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('fixed_assets') && auth.hasPermission('fixed_assets.read')">
            <RouterLink to="/fixed-assets">{{ t('nav.fixedAssets') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('customer_service') && (auth.hasPermission('support.tickets.read') || auth.hasPermission('support.knowledge.read'))">
            <RouterLink to="/support">{{ t('nav.support') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('marketing') && auth.hasPermission('marketing.campaigns.read')">
            <RouterLink to="/marketing">{{ t('nav.marketing') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('automation') && auth.hasPermission('automation.reports.read')">
            <RouterLink to="/automations">{{ t('nav.automations') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('documents') && auth.hasPermission('documents.files.read')">
            <RouterLink to="/documents">{{ t('nav.documents') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('hr') && (auth.hasPermission('hr.employees.read') || auth.hasPermission('hr.leave_requests.read'))">
            <RouterLink to="/hr">{{ t('nav.hr') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('projects') && (auth.hasPermission('projects.projects.read') || auth.hasPermission('projects.time_entries.read'))">
            <RouterLink to="/projects">{{ t('nav.projects') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('production') && (auth.hasPermission('production.bom.read') || auth.hasPermission('production.orders.read'))">
            <RouterLink to="/production">{{ t('nav.production') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('maintenance') && (auth.hasPermission('maintenance.equipment.read') || auth.hasPermission('maintenance.work_orders.read'))">
            <RouterLink to="/maintenance">{{ t('nav.maintenance') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('quality') && auth.hasPermission('quality.inspections.read')">
            <RouterLink to="/quality">{{ t('nav.quality') }}</RouterLink>
          </template>
          <template v-if="enabledModuleCodes.includes('logistics') && (auth.hasPermission('logistics.vehicles.read') || auth.hasPermission('logistics.delivery_notes.read'))">
            <RouterLink to="/logistics">{{ t('nav.logistics') }}</RouterLink>
          </template>
        </template>
      </nav>
      <div class="sidebar-footer">
        <RouterLink v-if="auth.hasPermission('core.users.read')" to="/users" class="settings-link">
          {{ t('nav.users') }}
        </RouterLink>
        <RouterLink v-if="auth.hasPermission('core.roles.read')" to="/roles" class="settings-link">
          {{ t('nav.roles') }}
        </RouterLink>
        <RouterLink v-if="auth.hasPermission('core.audit.read')" to="/audit-logs" class="settings-link">
          {{ t('nav.auditLogs') }}
        </RouterLink>
        <RouterLink v-if="auth.hasPermission('core.org.read')" to="/org-structure" class="settings-link">
          {{ t('nav.orgStructure') }}
        </RouterLink>
        <RouterLink to="/settings" class="settings-link">{{ t('nav.settings') }}</RouterLink>
        <div class="muted">{{ auth.user?.email }}</div>
        <button class="btn secondary" @click="handleLogout">{{ t('nav.logout') }}</button>
      </div>
    </aside>
    <main class="content">
      <div class="topbar">
        <div class="notif-wrap">
          <button class="notif-bell" :aria-label="t('notifications.title')" @click="toggleNotifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span v-if="notificationsStore.unreadCount > 0" class="notif-badge">{{ notificationsStore.unreadCount }}</span>
          </button>
          <div v-if="notificationsOpen" class="notif-dropdown">
            <div class="notif-dropdown-header">
              <span>{{ t('notifications.title') }}</span>
              <button class="link-btn" @click="handleMarkAllRead">{{ t('notifications.markAllRead') }}</button>
            </div>
            <p v-if="notificationsStore.notifications.length === 0" class="muted notif-empty">
              {{ t('notifications.empty') }}
            </p>
            <div v-else class="notif-list">
              <div
                v-for="n in notificationsStore.notifications"
                :key="n.id"
                class="notif-item"
                :class="{ unread: !n.isRead }"
                @click="notificationsStore.markRead(n.id)"
              >
                <div class="notif-item-title">{{ n.title }}</div>
                <div class="notif-item-message muted">{{ n.message }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
  color: var(--color-heading);
  margin-bottom: 1.5rem;
  padding: 0 0.4rem;
}
.sidebar-logo {
  max-height: 30px;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
}
nav a {
  color: var(--color-text);
  padding: 0.55rem 0.6rem;
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-weight: 500;
}
nav a:hover {
  background: var(--color-bg-subtle);
}
nav a.router-link-active {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
  font-weight: 600;
}
.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}
.settings-link {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-muted);
}
.settings-link:hover {
  color: var(--color-text);
}
.content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  overflow-y: auto;
}
.topbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}
.notif-wrap {
  position: relative;
}
.notif-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}
.notif-bell:hover {
  background: var(--color-bg-subtle);
}
.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  background: var(--color-danger);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.notif-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  z-index: 20;
}
.notif-dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border-subtle);
  font-weight: 600;
  font-size: 0.9rem;
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
}
.notif-empty {
  padding: 1.25rem 1rem;
  font-size: 0.85rem;
}
.notif-list {
  overflow-y: auto;
}
.notif-item {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--color-border-subtle);
  cursor: pointer;
}
.notif-item:hover {
  background: var(--color-bg-subtle);
}
.notif-item.unread {
  background: var(--color-primary-soft);
}
.notif-item-title {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.15rem;
}
.notif-item-message {
  font-size: 0.8rem;
}
</style>
