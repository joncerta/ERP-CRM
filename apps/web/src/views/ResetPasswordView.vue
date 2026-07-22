<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { resetPassword } from '@/api/auth'
import { getErrorMessage } from '@/api/error'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const token = route.params.token as string
const newPassword = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await resetPassword(token, newPassword.value)
    done.value = true
    setTimeout(() => router.push({ name: 'login' }), 2000)
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form v-if="!done" class="card login-card" @submit.prevent="submit">
      <div class="brand-mark" style="margin-bottom: 1rem">E</div>
      <h1>{{ t('resetPassword.title') }}</h1>
      <div class="field">
        <label>{{ t('resetPassword.newPassword') }}</label>
        <input v-model="newPassword" type="password" minlength="8" required />
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="btn" type="submit" :disabled="loading" style="width: 100%">
        {{ t('common.save') }}
      </button>
    </form>
    <div v-else class="card login-card">
      <div class="brand-mark" style="margin-bottom: 1rem">E</div>
      <h1>{{ t('resetPassword.title') }}</h1>
      <p class="muted">{{ t('resetPassword.done') }}</p>
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
  margin-bottom: 1rem;
}
</style>
