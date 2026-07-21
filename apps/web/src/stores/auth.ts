import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { login as loginRequest, type LoginPayload } from '@/api/auth';

interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  roleId: string;
  permissions: string[];
  exp: number;
}

function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1] ?? '';
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('erp_crm_token'));
  const user = ref<JwtPayload | null>(token.value ? decodeJwt(token.value) : null);

  const isAuthenticated = computed(() => !!token.value);
  const hasPermission = (permission: string) =>
    user.value?.permissions.includes('*') || user.value?.permissions.includes(permission) || false;

  async function login(payload: LoginPayload) {
    const { accessToken } = await loginRequest(payload);
    token.value = accessToken;
    user.value = decodeJwt(accessToken);
    localStorage.setItem('erp_crm_token', accessToken);
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('erp_crm_token');
  }

  return { token, user, isAuthenticated, hasPermission, login, logout };
});
