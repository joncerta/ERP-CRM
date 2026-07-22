<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import ToastContainer from '@/components/ToastContainer.vue'

const route = useRoute()
const isPublic = computed(() => route.meta.public === true)
</script>

<template>
  <RouterView v-if="isPublic" />
  <AppLayout v-else>
    <RouterView />
  </AppLayout>
  <ToastContainer />
</template>
