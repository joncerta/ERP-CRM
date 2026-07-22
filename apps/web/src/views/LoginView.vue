<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const tenantSlug = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login({ tenantSlug: tenantSlug.value, email: email.value, password: password.value })
    const requestedRedirect = route.query.redirect as string | undefined
    // "/pipeline" is just the pre-login guard's generic guess (it can't know
    // yet who's logging in) — ignore it and let "/" pick the right landing
    // page now that we know the user. Honor anything more specific though.
    const redirect = requestedRedirect && requestedRedirect !== '/pipeline' ? requestedRedirect : '/'
    router.push(redirect)
  } catch {
    error.value = t('login.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form class="card login-card" @submit.prevent="handleSubmit">
      <div class="brand-mark" style="margin-bottom: 1rem">E</div>
      <h1>{{ t('login.title') }}</h1>
      <div class="field">
        <label>{{ t('login.tenantSlug') }}</label>
        <input v-model="tenantSlug" type="text" placeholder="acme" required />
      </div>
      <div class="field">
        <label>{{ t('login.email') }}</label>
        <input v-model="email" type="email" required />
      </div>
      <div class="field">
        <label>{{ t('login.password') }}</label>
        <input v-model="password" type="password" required />
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="btn" type="submit" :disabled="loading" style="width: 100%">
        {{ t('login.submit') }}
      </button>
    </form>
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
  margin-bottom: 1.25rem;
}
</style>
