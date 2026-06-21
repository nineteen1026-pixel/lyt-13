import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { seedDatabase } from './seed.js'
import { useCoffeeStore } from './stores/coffee.js'
import { useInventoryStore } from './stores/inventory.js'
import { usePromotionStore } from './stores/promotion.js'
import { useOrderStore } from './stores/order.js'
import { useCouponStore } from './stores/coupon.js'
import { useExtractionParamsStore } from './stores/extractionParams.js'
import { useRoastPlanStore } from './stores/roastPlan.js'
import { usePointsStore } from './stores/points.js'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.mount('#app')

seedDatabase().then(async () => {
  const coffeeStore = useCoffeeStore()
  const inventoryStore = useInventoryStore()
  const promotionStore = usePromotionStore()
  const orderStore = useOrderStore()
  const couponStore = useCouponStore()
  const extractionStore = useExtractionParamsStore()
  const roastPlanStore = useRoastPlanStore()
  const pointsStore = usePointsStore()

  await coffeeStore.loadAll()

  await coffeeStore.ensureAllBeanSkus(100)

  inventoryStore.setBeanReference(coffeeStore.beans)
  await inventoryStore.loadAll()
  await promotionStore.loadAll()
  await couponStore.loadAll()
  await roastPlanStore.loadAll()
  await orderStore.loadAll()
  await extractionStore.loadAll()
  await pointsStore.loadAll()

  orderStore.startTimeoutChecker()
  setInterval(() => {
    orderStore.checkAndSendPendingReminders()
  }, 5 * 60 * 1000)
})
