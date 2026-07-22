<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

// A platform operator manages tenants/modules — it has no CRM data of its
// own to see, so it gets a completely different nav than a customer admin.
const isPlatformAdmin = computed(() => auth.hasPermission('platform.tenants.manage'))

async function handleLogout() {
  await auth.logoutEverywhere()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">E</div>
        <span>ERP-CRM</span>
      </div>
      <nav>
        <template v-if="isPlatformAdmin">
          <RouterLink to="/platform/tenants">{{ t('nav.platform') }}</RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/pipeline">{{ t('nav.pipeline') }}</RouterLink>
          <RouterLink to="/reminders">{{ t('nav.reminders') }}</RouterLink>
          <RouterLink to="/leads">{{ t('nav.leads') }}</RouterLink>
          <RouterLink to="/contacts">{{ t('nav.contacts') }}</RouterLink>
          <RouterLink to="/companies">{{ t('nav.companies') }}</RouterLink>
          <RouterLink to="/quotes">{{ t('nav.quotes') }}</RouterLink>
        </template>
      </nav>
      <div class="sidebar-footer">
        <RouterLink to="/settings" class="settings-link">{{ t('nav.settings') }}</RouterLink>
        <div class="muted">{{ auth.user?.email }}</div>
        <button class="btn secondary" @click="handleLogout">{{ t('nav.logout') }}</button>
      </div>
    </aside>
    <main class="content">
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
</style>
