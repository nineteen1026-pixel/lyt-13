import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { seedDatabase } from './seed.js'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.mount('#app')

seedDatabase().then(() => {
  import('./stores/coffee.js').then(({ useCoffeeStore }) => {
    const store = useCoffeeStore()
    store.loadAll()
  })
})
