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
    },
    {
      path: '/leads',
      name: 'leads',
      component: () => import('@/views/LeadsView.vue'),
    },
    {
      path: '/companies',
      name: 'companies',
      component: () => import('@/views/CompaniesView.vue'),
    },
    {
      path: '/quotes',
      name: 'quotes',
      component: () => import('@/views/QuotesView.vue'),
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
  return true;
});

export default router;
