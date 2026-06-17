import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { seedDatabase } from './seed.js'
import { useCoffeeStore } from './stores/coffee.js'
import { useInventoryStore } from './stores/inventory.js'
import { usePromotionStore } from './stores/promotion.js'
import { useOrderStore } from './stores/order.js'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.mount('#app')

seedDatabase().then(async () => {
  const coffeeStore = useCoffeeStore()
  const inventoryStore = useInventoryStore()
  const promotionStore = usePromotionStore()
  const orderStore = useOrderStore()

  await coffeeStore.loadAll()
  inventoryStore.setBeanReference(coffeeStore.beans)
  await inventoryStore.loadAll()
  await promotionStore.loadAll()
  await orderStore.loadAll()

  orderStore.startTimeoutChecker()
  setInterval(() => {
    orderStore.checkAndSendPendingReminders()
  }, 5 * 60 * 1000)
})
