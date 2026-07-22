import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBrandingStore = defineStore('branding', () => {
  const logoDataUrl = ref<string | null>(null)

  function setLogo(logoData: string | null | undefined) {
    logoDataUrl.value = logoData ?? null
  }

  return { logoDataUrl, setLogo }
})
