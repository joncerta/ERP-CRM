<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { forgotPassword } from '@/api/auth'
import { getErrorMessage } from '@/api/error'

const { t } = useI18n()

const tenantSlug = ref('')
const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await forgotPassword(tenantSlug.value, email.value)
    sent.value = true
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form v-if="!sent" class="card login-card" @submit.prevent="submit">
      <div class="brand-mark" style="margin-bottom: 1rem">E</div>
      <h1>{{ t('forgotPassword.title') }}</h1>
      <p class="muted" style="margin-bottom: 1rem">{{ t('forgotPassword.subtitle') }}</p>
      <div class="field">
        <label>{{ t('login.tenantSlug') }}</label>
        <input v-model="tenantSlug" type="text" placeholder="acme" required />
      </div>
      <div class="field">
        <label>{{ t('login.email') }}</label>
        <input v-model="email" type="email" required />
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="btn" type="submit" :disabled="loading" style="width: 100%">
        {{ t('forgotPassword.submit') }}
      </button>
      <RouterLink to="/login" class="back-link">{{ t('forgotPassword.backToLogin') }}</RouterLink>
    </form>
    <div v-else class="card login-card">
      <div class="brand-mark" style="margin-bottom: 1rem">E</div>
      <h1>{{ t('forgotPassword.title') }}</h1>
      <p class="muted">{{ t('forgotPassword.sent') }}</p>
      <RouterLink to="/login" class="back-link">{{ t('forgotPassword.backToLogin') }}</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
}
.login-card {
  width: 100%;
  max-width: 360px;
}
.login-card h1 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}
.back-link {
  display: block;
  margin-top: 1rem;
  text-align: center;
  font-size: 0.85rem;
}
</style>
