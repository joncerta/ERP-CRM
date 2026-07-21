import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/q/:token',
      name: 'public-quote',
      component: () => import('@/views/PublicQuoteView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      redirect: () => {
        const auth = useAuthStore();
        // Platform operators don't have the CRM module themselves — send
        // them straight to the tenant list instead of a CRM screen that
        // would just 403.
        return auth.hasPermission('platform.tenants.manage')
          ? { name: 'platform-tenants' }
          : { name: 'pipeline' };
      },
    },
    {
      path: '/pipeline',
      name: 'pipeline',
      component: () => import('@/views/PipelineView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/leads',
      name: 'leads',
      component: () => import('@/views/LeadsView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/companies',
      name: 'companies',
      component: () => import('@/views/CompaniesView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: () => import('@/views/ContactsView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/quotes',
      name: 'quotes',
      component: () => import('@/views/QuotesView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/reminders',
      name: 'reminders',
      component: () => import('@/views/RemindersView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/platform/tenants',
      name: 'platform-tenants',
      component: () => import('@/views/PlatformTenantsView.vue'),
      meta: { requiresPermission: 'platform.tenants.manage' },
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.public) return true;
  const auth = useAuthStore();
  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  const requiredPermission = to.meta.requiresPermission as string | undefined;
  if (requiredPermission && !auth.hasPermission(requiredPermission)) {
    return { name: 'pipeline' };
  }
  // Platform operators have no CRM data of their own — keep them out of
  // customer-facing screens entirely, not just off the nav.
  if (to.meta.crmRoute && auth.hasPermission('platform.tenants.manage')) {
    return { name: 'platform-tenants' };
  }
  return true;
});

export default router;
