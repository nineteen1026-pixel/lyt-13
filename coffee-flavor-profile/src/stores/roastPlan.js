import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '../db.js'
import { useInventoryStore } from './inventory.js'

export const ROAST_PLAN_STATUS = {
  PENDING: 'pending',
  ROASTING: 'roasting',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
}

export const ROAST_LEAD_DAYS = 1
export const CURING_DAYS = 2
export const SHIPPING_DAYS = 1

export function calculateEstimatedDelivery(baseDate = new Date()) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + ROAST_LEAD_DAYS + CURING_DAYS + SHIPPING_DAYS)
  return date.toISOString()
}

export function calculateScheduledDate(baseDate = new Date()) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + ROAST_LEAD_DAYS)
  return date.toISOString().slice(0, 10)
}

export const useRoastPlanStore = defineStore('roastPlan', () => {
  const roastPlans = ref([])

  const roastPlansWithDetails = computed(() => {
    return roastPlans.value.map(plan => ({
      ...plan,
      statusText: getStatusText(plan.status),
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  })

  const pendingPlans = computed(() =>
    roastPlansWithDetails.value.filter(p => p.status === ROAST_PLAN_STATUS.PENDING)
  )

  const roastingPlans = computed(() =>
    roastPlansWithDetails.value.filter(p => p.status === ROAST_PLAN_STATUS.ROASTING)
  )

  const completedPlans = computed(() =>
    roastPlansWithDetails.value.filter(p => p.status === ROAST_PLAN_STATUS.COMPLETED)
  )

  function getStatusText(status) {
    const map = {
      [ROAST_PLAN_STATUS.PENDING]: '待烘焙',
      [ROAST_PLAN_STATUS.ROASTING]: '烘焙中',
      [ROAST_PLAN_STATUS.COMPLETED]: '已完成',
      [ROAST_PLAN_STATUS.CANCELED]: '已取消',
    }
    return map[status] || status
  }

  async function loadAll() {
    roastPlans.value = await db.roastPlans.toArray()
  }

  async function getByOrderId(orderId) {
    return roastPlans.value.filter(p => p.orderId === orderId)
  }

  async function createRoastPlan({ orderId, orderItemId, beanId, beanName, quantity, roastLevel = null, curveId = null, notes = '', isPresale = false }) {
    const invStore = useInventoryStore()

    const inv = await invStore.getByBeanId(beanId)
    if (!inv) throw new Error('库存记录不存在')

    if (!isPresale) {
      const roastReserved = inv.roastReservedStock || 0
      const availableForRoast = inv.reservedStock - roastReserved
      if (availableForRoast < quantity) {
        throw new Error(`${beanName || '商品'} 可用于烘焙排产的库存不足`)
      }
    }

    const now = new Date()
    const planData = {
      orderId,
      orderItemId,
      beanId,
      beanName,
      quantity,
      status: ROAST_PLAN_STATUS.PENDING,
      scheduledDate: calculateScheduledDate(now),
      estimatedDeliveryDate: calculateEstimatedDelivery(now),
      roastLevel,
      curveId,
      isPresale: !!isPresale,
      startedAt: null,
      completedAt: null,
      notes,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    return await db.transaction('rw', db.roastPlans, db.inventory, async () => {
      const id = await db.roastPlans.add(planData)
      planData.id = id

      if (!isPresale) {
        await invStore.reserveRoastStock(beanId, quantity)
      }

      roastPlans.value.push(planData)
      return planData
    })
  }

  async function createRoastPlansFromOrder(order) {
    const items = order.items || []
    const plans = []

    for (const item of items) {
      const plan = await createRoastPlan({
        orderId: order.id,
        orderItemId: item.id,
        beanId: item.beanId,
        beanName: item.beanName,
        quantity: item.quantity,
        notes: `订单 ${order.orderNo} - ${item.beanName}`,
      })
      plans.push(plan)
    }

    return plans
  }

  async function startRoast(planId) {
    const plan = roastPlans.value.find(p => p.id === planId)
    if (!plan) throw new Error('烘焙计划不存在')
    if (plan.status !== ROAST_PLAN_STATUS.PENDING) {
      throw new Error('只有待烘焙状态的计划才能开始烘焙')
    }

    const now = new Date()
    const updateData = {
      status: ROAST_PLAN_STATUS.ROASTING,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    await db.roastPlans.update(planId, updateData)
    const idx = roastPlans.value.findIndex(p => p.id === planId)
    if (idx !== -1) {
      roastPlans.value[idx] = { ...roastPlans.value[idx], ...updateData }
    }

    return true
  }

  async function completeRoast(planId, roastRecordId = null) {
    const invStore = useInventoryStore()
    const plan = roastPlans.value.find(p => p.id === planId)
    if (!plan) throw new Error('烘焙计划不存在')
    if (plan.status !== ROAST_PLAN_STATUS.ROASTING) {
      throw new Error('只有烘焙中的计划才能标记完成')
    }

    const now = new Date()
    const updateData = {
      status: ROAST_PLAN_STATUS.COMPLETED,
      completedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    await db.transaction('rw', db.roastPlans, db.inventory, async () => {
      await db.roastPlans.update(planId, updateData)
      if (!plan.isPresale) {
        await invStore.releaseRoastStock(plan.beanId, plan.quantity)
      }
    })

    const idx = roastPlans.value.findIndex(p => p.id === planId)
    if (idx !== -1) {
      roastPlans.value[idx] = { ...roastPlans.value[idx], ...updateData }
    }

    return true
  }

  async function cancelRoastPlan(planId, reason = '') {
    const invStore = useInventoryStore()
    const plan = roastPlans.value.find(p => p.id === planId)
    if (!plan) throw new Error('烘焙计划不存在')
    if ([ROAST_PLAN_STATUS.COMPLETED, ROAST_PLAN_STATUS.CANCELED].includes(plan.status)) {
      throw new Error('当前状态无法取消')
    }

    const now = new Date()
    const updateData = {
      status: ROAST_PLAN_STATUS.CANCELED,
      notes: reason ? `${plan.notes || ''} | 取消原因: ${reason}` : plan.notes,
      updatedAt: now.toISOString(),
    }

    await db.transaction('rw', db.roastPlans, db.inventory, async () => {
      await db.roastPlans.update(planId, updateData)
      if (!plan.isPresale) {
        await invStore.releaseRoastStock(plan.beanId, plan.quantity)
      }
    })

    const idx = roastPlans.value.findIndex(p => p.id === planId)
    if (idx !== -1) {
      roastPlans.value[idx] = { ...roastPlans.value[idx], ...updateData }
    }

    return true
  }

  async function cancelRoastPlansByOrderId(orderId, reason = '') {
    const plans = roastPlans.value.filter(p => p.orderId === orderId)
    for (const plan of plans) {
      if ([ROAST_PLAN_STATUS.PENDING, ROAST_PLAN_STATUS.ROASTING].includes(plan.status)) {
        await cancelRoastPlan(plan.id, reason)
      }
    }
    return true
  }

  async function updateRoastPlan(planId, data) {
    const updateData = { ...data, updatedAt: new Date().toISOString() }
    await db.roastPlans.update(planId, updateData)
    const idx = roastPlans.value.findIndex(p => p.id === planId)
    if (idx !== -1) {
      roastPlans.value[idx] = { ...roastPlans.value[idx], ...updateData }
    }
    return true
  }

  function getLatestEstimatedDelivery(orderId) {
    const plans = roastPlans.value.filter(p => p.orderId === orderId && p.status !== ROAST_PLAN_STATUS.CANCELED)
    if (plans.length === 0) return null
    const latest = plans.reduce((max, p) =>
      new Date(p.estimatedDeliveryDate) > new Date(max.estimatedDeliveryDate) ? p : max
    )
    return latest.estimatedDeliveryDate
  }

  return {
    roastPlans,
    roastPlansWithDetails,
    pendingPlans,
    roastingPlans,
    completedPlans,
    loadAll,
    getByOrderId,
    createRoastPlan,
    createRoastPlansFromOrder,
    startRoast,
    completeRoast,
    cancelRoastPlan,
    cancelRoastPlansByOrderId,
    updateRoastPlan,
    getStatusText,
    getLatestEstimatedDelivery,
  }
})
