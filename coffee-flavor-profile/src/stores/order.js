import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '../db.js'
import { useInventoryStore } from './inventory.js'
import { usePromotionStore } from './promotion.js'
import { useCouponStore } from './coupon.js'
import { useCoffeeStore } from './coffee.js'
import { useRoastPlanStore } from './roastPlan.js'

export const ORDER_STATUS = {
  PENDING_DEPOSIT: 'pending_deposit',
  DEPOSIT_PAID: 'deposit_paid',
  PENDING_BALANCE: 'pending_balance',
  BALANCE_PAID: 'balance_paid',
  PAID: 'paid',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
}

export const ORDER_TYPE = {
  NORMAL: 'normal',
  PRESALE: 'presale',
}

export const DEPOSIT_TIMEOUT_MIN = 30
export const BALANCE_TIMEOUT_HOURS = 72

function generateOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `CF${y}${m}${d}${rand}`
}

export const useOrderStore = defineStore('order', () => {
  const orders = ref([])
  const orderItems = ref([])
  const payments = ref([])
  const reminders = ref([])
  const orderQRCodes = ref([])
  let timeoutTimer = null

  const ordersWithDetails = computed(() => {
    const roastPlanStore = useRoastPlanStore()
    return orders.value.map(order => {
      const items = orderItems.value.filter(i => i.orderId === order.id)
      const orderPayments = payments.value.filter(p => p.orderId === order.id)
      const orderReminders = reminders.value.filter(r => r.orderId === order.id)
      const roastPlans = roastPlanStore.roastPlans.filter(p => p.orderId === order.id)
      const activeRoastPlans = roastPlans.filter(p => p.status !== 'canceled')
      const estimatedDeliveryDate = order.estimatedDeliveryDate || (
        activeRoastPlans.length > 0
          ? activeRoastPlans.reduce((max, p) =>
              new Date(p.estimatedDeliveryDate) > new Date(max.estimatedDeliveryDate) ? p : max
            ).estimatedDeliveryDate
          : null
      )
      return {
        ...order,
        items,
        payments: orderPayments,
        reminders: orderReminders,
        roastPlans,
        activeRoastPlans,
        estimatedDeliveryDate,
        statusText: getStatusText(order.status),
        typeText: order.type === ORDER_TYPE.PRESALE ? '预售订单' : '普通订单',
      }
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  })

  const presaleOrders = computed(() => ordersWithDetails.value.filter(o => o.type === ORDER_TYPE.PRESALE))
  const pendingDepositOrders = computed(() => ordersWithDetails.value.filter(o => o.status === ORDER_STATUS.PENDING_DEPOSIT))
  const pendingBalanceOrders = computed(() => ordersWithDetails.value.filter(o => o.status === ORDER_STATUS.PENDING_BALANCE))

  function getStatusText(status) {
    const map = {
      [ORDER_STATUS.PENDING_DEPOSIT]: '待付定金',
      [ORDER_STATUS.DEPOSIT_PAID]: '定金已付',
      [ORDER_STATUS.PENDING_BALANCE]: '待付尾款',
      [ORDER_STATUS.BALANCE_PAID]: '尾款已付',
      [ORDER_STATUS.PAID]: '已付款',
      [ORDER_STATUS.SHIPPED]: '已发货',
      [ORDER_STATUS.COMPLETED]: '已完成',
      [ORDER_STATUS.CANCELED]: '已取消',
    }
    return map[status] || status
  }

  async function loadAll() {
    orders.value = await db.orders.toArray()
    orderItems.value = await db.orderItems.toArray()
    payments.value = await db.payments.toArray()
    reminders.value = await db.paymentReminders.toArray()
    orderQRCodes.value = await db.orderQRCodes.toArray()
  }

  function startTimeoutChecker() {
    if (timeoutTimer) clearInterval(timeoutTimer)
    timeoutTimer = setInterval(() => {
      checkTimeouts()
    }, 60 * 1000)
    checkTimeouts()
  }

  function stopTimeoutChecker() {
    if (timeoutTimer) {
      clearInterval(timeoutTimer)
      timeoutTimer = null
    }
  }

  async function checkTimeouts() {
    const now = new Date()
    const updatedOrders = [...orders.value]
    let changed = false

    for (const order of updatedOrders) {
      if (order.status === ORDER_STATUS.PENDING_DEPOSIT && order.depositDueAt) {
        const due = new Date(order.depositDueAt)
        if (now >= due) {
          order.status = ORDER_STATUS.CANCELED
          order.canceledAt = now.toISOString()
          order.cancelReason = '定金支付超时自动取消'
          order.updatedAt = now.toISOString()
          await db.orders.update(order.id, {
            status: ORDER_STATUS.CANCELED,
            canceledAt: order.canceledAt,
            cancelReason: order.cancelReason,
            updatedAt: order.updatedAt,
          })
          await rollbackOrderResources(order)
          changed = true
        }
      }

      if (order.status === ORDER_STATUS.PENDING_BALANCE && order.balanceDueAt) {
        const due = new Date(order.balanceDueAt)
        if (now >= due) {
          order.status = ORDER_STATUS.CANCELED
          order.canceledAt = now.toISOString()
          order.cancelReason = '尾款支付超时自动取消'
          order.updatedAt = now.toISOString()
          await db.orders.update(order.id, {
            status: ORDER_STATUS.CANCELED,
            canceledAt: order.canceledAt,
            cancelReason: order.cancelReason,
            updatedAt: order.updatedAt,
          })
          await rollbackOrderResources(order)
          changed = true
        }
      }
    }

    if (changed) {
      orders.value = updatedOrders
    }
  }

  async function rollbackOrderResources(order) {
    const invStore = useInventoryStore()
    const promoStore = usePromotionStore()
    const couponStore = useCouponStore()
    const roastPlanStore = useRoastPlanStore()
    const items = orderItems.value.filter(i => i.orderId === order.id)

    for (const item of items) {
      try {
        await invStore.releaseStock(item.beanId, item.quantity)
      } catch (e) {
        console.error('释放库存失败:', e)
      }
    }

    if (order.type === ORDER_TYPE.PRESALE) {
      try {
        await roastPlanStore.cancelRoastPlansByOrderId(order.id, '订单取消')
      } catch (e) {
        console.error('取消烘焙排产失败:', e)
      }
    }

    if (order.promotionId) {
      try {
        await promoStore.rollbackRedemption(order.id)
      } catch (e) {
        console.error('回滚营销活动失败:', e)
      }
    }

    if (order.couponId) {
      try {
        await couponStore.rollbackCoupon(order.id)
      } catch (e) {
        console.error('回滚优惠券失败:', e)
      }
    }
  }

  async function createOrder({ type, items, customerName, customerPhone, promotionId = null, couponId = null, isNewCustomer = false }) {
    const invStore = useInventoryStore()
    const promoStore = usePromotionStore()
    const couponStore = useCouponStore()

    if (!items || items.length === 0) throw new Error('订单商品不能为空')

    const orderItemsData = []
    let totalAmount = 0
    const beanIds = []

    for (const item of items) {
      const inv = await invStore.getByBeanId(item.beanId)
      if (!inv) throw new Error(`商品 ID ${item.beanId} 库存不存在`)

      const available = inv.stock - inv.reservedStock
      if (available < item.quantity) {
        throw new Error(`${inv.beanName || '商品'} 库存不足`)
      }

      let unitPrice = type === ORDER_TYPE.PRESALE ? inv.presalePrice : inv.price
      const subtotal = +(unitPrice * item.quantity).toFixed(2)

      const bean = window.__coffeeBeans?.find(b => b.id === item.beanId)
      orderItemsData.push({
        beanId: item.beanId,
        beanName: bean?.name || '未知豆种',
        quantity: item.quantity,
        unitPrice,
        subtotal,
        discount: 0,
      })

      beanIds.push(item.beanId)
      totalAmount += subtotal
    }

    let promoDiscount = 0
    let finalPromotionId = null

    if (promotionId) {
      const promo = promoStore.promotions.find(p => p.id === promotionId)
      promoDiscount = promoStore.calculateDiscount(promo, totalAmount, type)
      if (promoDiscount > 0) finalPromotionId = promotionId
    } else {
      const applicable = promoStore.getApplicablePromotions(totalAmount, type, isNewCustomer)
      if (applicable.length > 0) {
        promoDiscount = applicable[0].calculatedDiscount
        finalPromotionId = applicable[0].id
      }
    }

    let couponDiscount = 0
    let finalCouponId = null

    if (couponId) {
      const coupon = couponStore.getCouponById(couponId)
      const template = couponStore.getTemplateById(coupon?.templateId)
      if (coupon && template && coupon.memberPhone === customerPhone) {
        const discount = couponStore.calculateDiscount(
          template,
          totalAmount,
          type,
          beanIds,
          isNewCustomer,
          customerPhone
        )
        if (discount > 0) {
          couponDiscount = discount
          finalCouponId = couponId
        }
      }
    }

    totalAmount = +totalAmount.toFixed(2)
    const discountAmount = +(promoDiscount + couponDiscount).toFixed(2)
    const payAmount = +Math.max(0, totalAmount - discountAmount).toFixed(2)

    let depositAmount = 0
    let balanceAmount = 0
    let status = ORDER_STATUS.PENDING_DEPOSIT

    if (type === ORDER_TYPE.PRESALE) {
      for (const item of orderItemsData) {
        const inv = await invStore.getByBeanId(item.beanId)
        depositAmount += +(inv.deposit * item.quantity).toFixed(2)
      }
      depositAmount = +depositAmount.toFixed(2)
      balanceAmount = +(payAmount - depositAmount).toFixed(2)
      if (balanceAmount < 0) {
        depositAmount = payAmount
        balanceAmount = 0
      }
    } else {
      depositAmount = payAmount
      balanceAmount = 0
      status = ORDER_STATUS.PENDING_DEPOSIT
    }

    const now = new Date()
    const depositDueAt = type === ORDER_TYPE.PRESALE
      ? new Date(now.getTime() + DEPOSIT_TIMEOUT_MIN * 60 * 1000).toISOString()
      : new Date(now.getTime() + DEPOSIT_TIMEOUT_MIN * 60 * 1000).toISOString()

    const orderData = {
      orderNo: generateOrderNo(),
      type,
      status,
      customerName,
      customerPhone,
      totalAmount,
      depositAmount,
      balanceAmount,
      discountAmount,
      payAmount,
      promotionId: finalPromotionId,
      couponId: finalCouponId,
      depositDueAt,
      balanceDueAt: null,
      depositPaidAt: null,
      balancePaidAt: null,
      canceledAt: null,
      cancelReason: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    return await db.transaction('rw', db.orders, db.orderItems, db.inventory, db.promotionRedemptions, db.coupons, db.roastPlans, async () => {
      const orderId = await db.orders.add(orderData)
      orderData.id = orderId

      for (const item of orderItemsData) {
        item.orderId = orderId
        item.createdAt = now.toISOString()
        const itemId = await db.orderItems.add(item)
        item.id = itemId
        await invStore.reserveStock(item.beanId, item.quantity)
      }

      if (finalPromotionId && promoDiscount > 0) {
        await promoStore.redeemPromotion(orderId, finalPromotionId, promoDiscount)
      }

      if (finalCouponId && couponDiscount > 0) {
        await couponStore.useCoupon(
          finalCouponId,
          orderId,
          couponDiscount,
          totalAmount,
          customerPhone,
          isNewCustomer,
          type,
          beanIds
        )
      }

      let estimatedDeliveryDate = null
      if (type === ORDER_TYPE.PRESALE) {
        const roastPlanStore = useRoastPlanStore()
        const plans = []
        for (const item of orderItemsData) {
          const plan = await roastPlanStore.createRoastPlan({
            orderId,
            orderItemId: item.id,
            beanId: item.beanId,
            beanName: item.beanName,
            quantity: item.quantity,
            notes: `订单 ${orderData.orderNo} - ${item.beanName}`,
          })
          plans.push(plan)
        }
        if (plans.length > 0) {
          const latest = plans.reduce((max, p) =>
            new Date(p.estimatedDeliveryDate) > new Date(max.estimatedDeliveryDate) ? p : max
          )
          estimatedDeliveryDate = latest.estimatedDeliveryDate
          await db.orders.update(orderId, { estimatedDeliveryDate })
          orderData.estimatedDeliveryDate = estimatedDeliveryDate
        }
      }

      orders.value.push(orderData)
      orderItems.value.push(...orderItemsData)

      return { id: orderId, ...orderData, items: orderItemsData, estimatedDeliveryDate }
    })
  }

  async function payDeposit(orderId, method = 'wechat') {
    const invStore = useInventoryStore()
    const order = orders.value.find(o => o.id === orderId)
    if (!order) throw new Error('订单不存在')
    if (order.status !== ORDER_STATUS.PENDING_DEPOSIT) throw new Error('订单状态不允许支付定金')

    const now = new Date()
    const paymentData = {
      orderId,
      type: order.type === ORDER_TYPE.PRESALE ? 'deposit' : 'full',
      amount: order.depositAmount,
      method,
      transactionNo: `TX${Date.now()}`,
      paidAt: now.toISOString(),
      remark: order.type === ORDER_TYPE.PRESALE ? '定金支付' : '全款支付',
      createdAt: now.toISOString(),
    }

    await db.transaction('rw', db.orders, db.payments, async () => {
      const paymentId = await db.payments.add(paymentData)
      paymentData.id = paymentId
      payments.value.push(paymentData)

      let newStatus
      let updateData = {
        depositPaidAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      if (order.type === ORDER_TYPE.PRESALE) {
        newStatus = ORDER_STATUS.PENDING_BALANCE
        updateData.status = newStatus
        updateData.balanceDueAt = new Date(now.getTime() + BALANCE_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString()
      } else {
        newStatus = ORDER_STATUS.PAID
        updateData.status = newStatus
        const items = orderItems.value.filter(i => i.orderId === orderId)
        for (const item of items) {
          await invStore.deductStock(item.beanId, item.quantity)
        }
      }

      await db.orders.update(orderId, updateData)
      const idx = orders.value.findIndex(o => o.id === orderId)
      if (idx !== -1) {
        orders.value[idx] = { ...orders.value[idx], ...updateData }
      }
    })

    return true
  }

  async function payBalance(orderId, method = 'wechat') {
    const invStore = useInventoryStore()
    const order = orders.value.find(o => o.id === orderId)
    if (!order) throw new Error('订单不存在')
    if (order.status !== ORDER_STATUS.PENDING_BALANCE) throw new Error('订单状态不允许支付尾款')

    const now = new Date()
    const paymentData = {
      orderId,
      type: 'balance',
      amount: order.balanceAmount,
      method,
      transactionNo: `TX${Date.now()}`,
      paidAt: now.toISOString(),
      remark: '尾款支付',
      createdAt: now.toISOString(),
    }

    await db.transaction('rw', db.orders, db.payments, db.inventory, async () => {
      const paymentId = await db.payments.add(paymentData)
      paymentData.id = paymentId
      payments.value.push(paymentData)

      const updateData = {
        status: ORDER_STATUS.PAID,
        balancePaidAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
      await db.orders.update(orderId, updateData)

      const items = orderItems.value.filter(i => i.orderId === orderId)
      for (const item of items) {
        await invStore.deductStock(item.beanId, item.quantity)
      }

      const idx = orders.value.findIndex(o => o.id === orderId)
      if (idx !== -1) {
        orders.value[idx] = { ...orders.value[idx], ...updateData }
      }
    })

    return true
  }

  async function cancelOrder(orderId, reason = '用户取消') {
    const order = orders.value.find(o => o.id === orderId)
    if (!order) throw new Error('订单不存在')
    if ([ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELED].includes(order.status)) {
      throw new Error('当前订单状态不允许取消')
    }

    const now = new Date()
    const updateData = {
      status: ORDER_STATUS.CANCELED,
      canceledAt: now.toISOString(),
      cancelReason: reason,
      updatedAt: now.toISOString(),
    }

    await db.orders.update(orderId, updateData)
    await rollbackOrderResources({ ...order, ...updateData })

    const idx = orders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) {
      orders.value[idx] = { ...orders.value[idx], ...updateData }
    }

    return true
  }

  async function sendBalanceReminder(orderId) {
    const order = orders.value.find(o => o.id === orderId)
    if (!order) throw new Error('订单不存在')
    if (order.status !== ORDER_STATUS.PENDING_BALANCE) throw new Error('只有待付尾款的订单才能催付')

    const now = new Date()
    const content = `尊敬的${order.customerName}，您的预售订单 ${order.orderNo} 还需支付尾款 ¥${order.balanceAmount.toFixed(2)}，请在 ${new Date(order.balanceDueAt).toLocaleString()} 前完成支付，超时订单将自动取消。`

    const reminderData = {
      orderId,
      type: 'balance',
      content,
      sentAt: now.toISOString(),
      createdAt: now.toISOString(),
    }

    const id = await db.paymentReminders.add(reminderData)
    reminderData.id = id
    reminders.value.push(reminderData)

    console.log('[催付通知]', content)
    return reminderData
  }

  async function sendDepositReminder(orderId) {
    const order = orders.value.find(o => o.id === orderId)
    if (!order) throw new Error('订单不存在')
    if (order.status !== ORDER_STATUS.PENDING_DEPOSIT) throw new Error('只有待付定金的订单才能催付')

    const now = new Date()
    const content = `尊敬的${order.customerName}，您的订单 ${order.orderNo} ${order.type === ORDER_TYPE.PRESALE ? '定金' : '款项'} ¥${order.depositAmount.toFixed(2)} 尚未支付，请在 ${new Date(order.depositDueAt).toLocaleString()} 前完成支付，超时订单将自动取消。`

    const reminderData = {
      orderId,
      type: 'deposit',
      content,
      sentAt: now.toISOString(),
      createdAt: now.toISOString(),
    }

    const id = await db.paymentReminders.add(reminderData)
    reminderData.id = id
    reminders.value.push(reminderData)

    console.log('[催付通知]', content)
    return reminderData
  }

  function getOrderQRCodes(orderId) {
    return orderQRCodes.value.filter(q => q.orderId === orderId)
  }

  async function generateOrderQRCodes(orderId) {
    const existing = orderQRCodes.value.filter(q => q.orderId === orderId)
    if (existing.length > 0) return existing

    const coffeeStore = useCoffeeStore()
    const items = orderItems.value.filter(i => i.orderId === orderId)
    const now = new Date()
    const saved = []

    for (const item of items) {
      const archive = coffeeStore.getBeanTraceability(item.beanId)
      const snapshot = {
        v: 1,
        bean: archive?.bean || {
          id: item.beanId,
          name: item.beanName,
          origin: '',
          variety: '',
          process: '',
          flavorTags: [],
        },
        curves: archive?.curves || [],
        roastChain: archive?.roastChain || [],
        unlinkedExtractions: archive?.unlinkedExtractions || [],
        avgRating: archive?.avgRating || null,
        totalRoasts: archive?.totalRoasts || 0,
        totalExtractions: archive?.totalExtractions || 0,
      }
      const record = {
        orderId,
        beanId: item.beanId,
        beanName: item.beanName,
        qrUrl: coffeeStore.buildQRUrl(item.beanId),
        qrData: coffeeStore.buildQRPayload(item.beanId, snapshot),
        snapshot: JSON.stringify(snapshot),
        generatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }
      const id = await db.orderQRCodes.add(record)
      record.id = id
      orderQRCodes.value.push(record)
      saved.push(record)
    }

    return saved
  }

  async function shipOrder(orderId) {
    const order = orders.value.find(o => o.id === orderId)
    if (!order) throw new Error('订单不存在')
    if (order.status !== ORDER_STATUS.PAID) throw new Error('只有已付款的订单才能发货')

    const updateData = {
      status: ORDER_STATUS.SHIPPED,
      updatedAt: new Date().toISOString(),
    }
    await db.orders.update(orderId, updateData)
    const idx = orders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) {
      orders.value[idx] = { ...orders.value[idx], ...updateData }
    }
    return true
  }

  async function completeOrder(orderId) {
    const order = orders.value.find(o => o.id === orderId)
    if (!order) throw new Error('订单不存在')
    if (order.status !== ORDER_STATUS.SHIPPED) throw new Error('只有已发货的订单才能完成')

    const updateData = {
      status: ORDER_STATUS.COMPLETED,
      updatedAt: new Date().toISOString(),
    }
    await db.orders.update(orderId, updateData)
    const idx = orders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) {
      orders.value[idx] = { ...orders.value[idx], ...updateData }
    }
    return true
  }

  async function checkAndSendPendingReminders() {
    const now = new Date()
    for (const order of orders.value) {
      if (order.status === ORDER_STATUS.PENDING_DEPOSIT && order.depositDueAt) {
        const due = new Date(order.depositDueAt)
        const diffMin = (due - now) / (1000 * 60)
        if (diffMin > 0 && diffMin <= 10) {
          const existing = reminders.value.find(r => r.orderId === order.id && r.type === 'deposit')
          if (!existing) {
            await sendDepositReminder(order.id)
          }
        }
      }

      if (order.status === ORDER_STATUS.PENDING_BALANCE && order.balanceDueAt) {
        const due = new Date(order.balanceDueAt)
        const diffHours = (due - now) / (1000 * 60 * 60)
        if (diffHours > 0 && diffHours <= 24) {
          const existing = reminders.value.find(r => r.orderId === order.id && r.type === 'balance')
          if (!existing) {
            await sendBalanceReminder(order.id)
          }
        }
      }
    }
  }

  return {
    orders,
    orderItems,
    payments,
    reminders,
    orderQRCodes,
    ordersWithDetails,
    presaleOrders,
    pendingDepositOrders,
    pendingBalanceOrders,
    loadAll,
    startTimeoutChecker,
    stopTimeoutChecker,
    checkTimeouts,
    createOrder,
    payDeposit,
    payBalance,
    cancelOrder,
    sendBalanceReminder,
    sendDepositReminder,
    shipOrder,
    completeOrder,
    checkAndSendPendingReminders,
    getStatusText,
    getOrderQRCodes,
    generateOrderQRCodes,
  }
})
