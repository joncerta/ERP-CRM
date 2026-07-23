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
      path: '/pqrs/ticket/:token',
      name: 'public-ticket-track',
      component: () => import('@/views/PublicTicketTrackView.vue'),
      meta: { public: true },
    },
    {
      path: '/pqrs/:tenantSlug',
      name: 'public-ticket-submit',
      component: () => import('@/views/PublicTicketSubmitView.vue'),
      meta: { public: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: { public: true },
    },
    {
      path: '/reset-password/:token',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
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
          : { name: 'dashboard' };
      },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/pipeline',
      name: 'pipeline',
      component: () => import('@/views/PipelineView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/activities',
      name: 'activities',
      component: () => import('@/views/ActivitiesView.vue'),
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
      path: '/invoices',
      name: 'invoices',
      component: () => import('@/views/InvoicesView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/purchases',
      name: 'purchases',
      component: () => import('@/views/PurchasesView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/accounting',
      name: 'accounting',
      component: () => import('@/views/AccountingView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/fixed-assets',
      name: 'fixed-assets',
      component: () => import('@/views/FixedAssetsView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/support',
      name: 'support',
      component: () => import('@/views/SupportView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/inventory/products',
      name: 'inventory-products',
      component: () => import('@/views/ProductsView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/inventory/warehouses',
      name: 'inventory-warehouses',
      component: () => import('@/views/WarehousesView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/inventory/stock',
      name: 'inventory-stock',
      component: () => import('@/views/StockView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/inventory/categories-units',
      name: 'inventory-categories-units',
      component: () => import('@/views/CategoriesUnitsView.vue'),
      meta: { crmRoute: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UsersView.vue'),
      meta: { requiresPermission: 'core.users.read' },
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('@/views/RolesView.vue'),
      meta: { requiresPermission: 'core.roles.read' },
    },
    {
      path: '/audit-logs',
      name: 'audit-logs',
      component: () => import('@/views/AuditLogsView.vue'),
      meta: { requiresPermission: 'core.audit.read' },
    },
    {
      path: '/org-structure',
      name: 'org-structure',
      component: () => import('@/views/OrgStructureView.vue'),
      meta: { requiresPermission: 'core.org.read' },
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
    return { name: 'dashboard' };
  }
  // Platform operators have no CRM data of their own — keep them out of
  // customer-facing screens entirely, not just off the nav.
  if (to.meta.crmRoute && auth.hasPermission('platform.tenants.manage')) {
    return { name: 'platform-tenants' };
  }
  return true;
});

export default router;
