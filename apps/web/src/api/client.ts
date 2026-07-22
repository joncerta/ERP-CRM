import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import router from '@/router';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
});

apiClient.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      auth.logout();
      router.push({ name: 'login' });
    } else if (!error.response) {
      // No response at all (server down, network drop, CORS) — this is
      // exactly the class of failure most likely to go completely
      // unnoticed otherwise, so it gets a blanket toast here instead of
      // relying on every call site to handle it individually.
      useToastStore().error('No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.');
    }
    return Promise.reject(error);
  },
);
