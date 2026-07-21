<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">ERP-CRM</div>
      <nav>
        <RouterLink to="/pipeline">{{ t('nav.pipeline') }}</RouterLink>
        <RouterLink to="/leads">{{ t('nav.leads') }}</RouterLink>
        <RouterLink to="/companies">{{ t('nav.companies') }}</RouterLink>
        <RouterLink to="/quotes">{{ t('nav.quotes') }}</RouterLink>
        <RouterLink v-if="auth.hasPermission('platform.tenants.manage')" to="/platform/tenants">
          {{ t('nav.platform') }}
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
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
  padding: 1.25rem 1rem;
}
.brand {
  font-weight: 700;
  font-size: 1.05rem;
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
  background: var(--color-bg);
}
nav a.router-link-active {
  background: #eef2ff;
  color: var(--color-primary);
}
.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}
.content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
}
</style>
