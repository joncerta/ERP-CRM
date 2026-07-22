import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

// Wait for the router to resolve the actual navigation before mounting —
// otherwise on a direct deep link (e.g. a public /q/:token quote link)
// App.vue briefly renders against the unresolved initial route, mounts
// AppLayout, and its data fetches 401 and bounce the page to /login before
// the real route ever gets a chance to render.
router.isReady().then(() => app.mount('#app'))
