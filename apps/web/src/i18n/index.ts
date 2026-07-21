import { createI18n } from 'vue-i18n';
import es from './locales/es.json';
import en from './locales/en.json';

export const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('erp_crm_locale') ?? 'es',
  fallbackLocale: 'es',
  messages: { es, en },
});
