<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'

const route = useRoute()
const isPublic = computed(() => route.meta.public === true)
</script>

<template>
  <RouterView v-if="isPublic" />
  <AppLayout v-else>
    <RouterView />
  </AppLayout>
</template>
