<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { submitPublicLandingForm } from '@/api/marketing'
import { getErrorMessage } from '@/api/error'

const route = useRoute()
const { t } = useI18n()

const tenantSlug = route.params.tenantSlug as string
const formSlug = route.params.formSlug as string

const form = ref({ name: '', email: '', phone: '', companyName: '', message: '' })
const saving = ref(false)
const errorMsg = ref('')
const submitted = ref(false)

async function submit() {
  saving.value = true
  errorMsg.value = ''
  try {
    await submitPublicLandingForm(tenantSlug, formSlug, form.value)
    submitted.value = true
  } catch (err) {
    errorMsg.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="public-page">
    <div class="card form-card">
      <h1>{{ t('publicLandingForm.title') }}</h1>

      <div v-if="submitted" class="response-msg success">
        <p>{{ t('publicLandingForm.thanks') }}</p>
      </div>
      <form v-else @submit.prevent="submit">
        <div class="field">
          <label>{{ t('publicLandingForm.name') }}</label>
          <input v-model="form.name" required />
        </div>
        <div class="field" style="margin-top: 0.75rem">
          <label>{{ t('publicLandingForm.email') }}</label>
          <input v-model="form.email" type="email" />
        </div>
        <div class="field" style="margin-top: 0.75rem">
          <label>{{ t('publicLandingForm.phone') }}</label>
          <input v-model="form.phone" />
        </div>
        <div class="field" style="margin-top: 0.75rem">
          <label>{{ t('publicLandingForm.company') }}</label>
          <input v-model="form.companyName" />
        </div>
        <div class="field" style="margin-top: 0.75rem">
          <label>{{ t('publicLandingForm.message') }}</label>
          <textarea v-model="form.message" rows="4"></textarea>
        </div>
        <p v-if="errorMsg" class="error-text" style="margin-top: 0.75rem">{{ errorMsg }}</p>
        <button class="btn" style="margin-top: 1rem" :disabled="saving" type="submit">{{ t('publicLandingForm.submit') }}</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.public-page {
  min-height: 100vh;
  background: var(--color-bg);
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}
.form-card {
  width: 100%;
  max-width: 560px;
  height: fit-content;
}
.form-card h1 {
  font-size: 1.2rem;
  margin-bottom: 1.25rem;
}
textarea {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  width: 100%;
}
.response-msg {
  padding: 0.75rem;
  border-radius: var(--radius);
  background: oklch(0.93 0.06 145);
  color: oklch(0.42 0.1 150);
}
</style>
