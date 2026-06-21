import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db, { buildSkuName, getWeightLabel, getGrindLabel } from '../db.js'
import { useInventoryStore } from './inventory.js'
import { useCouponStore } from './coupon.js'

export const POINT_PRODUCT_TYPE = {
  BEAN: 'bean',
  COUPON: 'coupon',
}

export const POINT_ORDER_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  EXPIRED: 'expired',
  CANCELED: 'canceled',
}

export const POINTS_LOG_TYPE = {
  EARN: 'earn',
  SPEND: 'spend',
  REFUND: 'refund',
}

export const MEMBER_LEVEL = {
  NORMAL: 'normal',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
}

function generatePointOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `PO${y}${m}${d}${rand}`
}

function generateVerifyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export const usePointsStore = defineStore('points', () => {
  const members = ref([])
  const pointsLog = ref([])
  const pointProducts = ref([])
  const pointOrders = ref([])
  const currentMember = ref(null)

  const activeProducts = computed(() => {
    return pointProducts.value
      .filter(p => p.status === 'active' && p.stock > 0)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  })

  const productsWithDetails = computed(() => {
    const invStore = useInventoryStore()
    const couponStore = useCouponStore()
    return pointProducts.value.map(product => {
      let detail = { ...product }
      if (product.type === POINT_PRODUCT_TYPE.BEAN) {
        const sku = invStore.inventoryList.find(s => s.id === product.skuId)
        const bean = window.__coffeeBeans?.find(b => b.id === product.beanId)
        detail.skuName = sku ? buildSkuName(bean?.name || '未知豆种', sku.weight, sku.grind) : product.name
        detail.weightLabel = sku ? getWeightLabel(sku.weight) : ''
        detail.grindLabel = sku ? getGrindLabel(sku.grind) : ''
        detail.beanName = bean?.name || '未知豆种'
      } else if (product.type === POINT_PRODUCT_TYPE.COUPON) {
        const template = couponStore.templates.find(t => t.id === product.couponTemplateId)
        detail.templateName = template?.name || '优惠券'
        detail.discountInfo = template ? formatCouponDiscount(template) : ''
      }
      return detail
    })
  })

  const activeProductsWithDetails = computed(() => {
    return productsWithDetails.value.filter(p => p.status === 'active' && p.stock > 0)
  })

  const memberOrders = computed(() => {
    if (!currentMember.value) return []
    return pointOrders.value
      .filter(o => o.memberId === currentMember.value.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  })

  function formatCouponDiscount(template) {
    if (!template) return ''
    if (template.discountType === 'fixed') {
      return `满${template.minAmount}减${template.discount}`
    } else if (template.discountType === 'percentage') {
      return `${template.discount}折优惠`
    }
    return ''
  }

  async function loadAll() {
    members.value = await db.members.toArray()
    pointsLog.value = await db.pointsLog.toArray()
    pointProducts.value = await db.pointProducts.toArray()
    pointOrders.value = await db.pointOrders.toArray()
    if (members.value.length > 0) {
      currentMember.value = members.value[0]
    }
  }

  async function addMember(memberData) {
    const now = new Date().toISOString()
    const data = {
      ...memberData,
      points: memberData.points || 0,
      level: memberData.level || MEMBER_LEVEL.NORMAL,
      createdAt: now,
      updatedAt: now,
    }
    const id = await db.members.add(data)
    data.id = id
    members.value.push(data)
    if (!currentMember.value) {
      currentMember.value = data
    }
    return data
  }

  async function getMemberByPhone(phone) {
    const member = members.value.find(m => m.phone === phone)
    if (member) return member
    const dbMember = await db.members.where('phone').equals(phone).first()
    return dbMember || null
  }

  async function addPoints(memberId, points, reason = '', orderId = null) {
    const member = members.value.find(m => m.id === memberId)
    if (!member) throw new Error('会员不存在')

    const now = new Date().toISOString()
    const newPoints = member.points + points
    const balance = newPoints

    const logData = {
      memberId,
      type: POINTS_LOG_TYPE.EARN,
      points,
      balance,
      reason,
      orderId,
      createdAt: now,
    }

    await db.transaction('rw', db.members, db.pointsLog, async () => {
      const logId = await db.pointsLog.add(logData)
      logData.id = logId
      pointsLog.value.push(logData)

      await db.members.update(memberId, { points: newPoints, updatedAt: now })
      member.points = newPoints
      member.updatedAt = now
    })

    return logData
  }

  async function deductPoints(memberId, points, reason = '', orderId = null) {
    const member = members.value.find(m => m.id === memberId)
    if (!member) throw new Error('会员不存在')
    if (member.points < points) throw new Error('积分不足')

    const now = new Date().toISOString()
    const newPoints = member.points - points
    const balance = newPoints

    const logData = {
      memberId,
      type: POINTS_LOG_TYPE.SPEND,
      points: -points,
      balance,
      reason,
      orderId,
      createdAt: now,
    }

    await db.transaction('rw', db.members, db.pointsLog, async () => {
      const logId = await db.pointsLog.add(logData)
      logData.id = logId
      pointsLog.value.push(logData)

      await db.members.update(memberId, { points: newPoints, updatedAt: now })
      member.points = newPoints
      member.updatedAt = now
    })

    return logData
  }

  async function refundPoints(memberId, points, reason = '', orderId = null) {
    const member = members.value.find(m => m.id === memberId)
    if (!member) throw new Error('会员不存在')

    const now = new Date().toISOString()
    const newPoints = member.points + points
    const balance = newPoints

    const logData = {
      memberId,
      type: POINTS_LOG_TYPE.REFUND,
      points,
      balance,
      reason,
      orderId,
      createdAt: now,
    }

    await db.transaction('rw', db.members, db.pointsLog, async () => {
      const logId = await db.pointsLog.add(logData)
      logData.id = logId
      pointsLog.value.push(logData)

      await db.members.update(memberId, { points: newPoints, updatedAt: now })
      member.points = newPoints
      member.updatedAt = now
    })

    return logData
  }

  async function addProduct(productData) {
    const now = new Date().toISOString()
    const data = {
      ...productData,
      status: productData.status || 'active',
      sortOrder: productData.sortOrder || 0,
      createdAt: now,
      updatedAt: now,
    }
    const id = await db.pointProducts.add(data)
    data.id = id
    pointProducts.value.push(data)
    return data
  }

  async function updateProduct(productId, data) {
    const updateData = { ...data, updatedAt: new Date().toISOString() }
    await db.pointProducts.update(productId, updateData)
    const idx = pointProducts.value.findIndex(p => p.id === productId)
    if (idx !== -1) {
      pointProducts.value[idx] = { ...pointProducts.value[idx], ...updateData }
    }
  }

  async function deleteProduct(productId) {
    await db.pointProducts.delete(productId)
    pointProducts.value = pointProducts.value.filter(p => p.id !== productId)
  }

  async function redeemProduct(memberId, productId, quantity = 1) {
    const member = members.value.find(m => m.id === memberId)
    if (!member) throw new Error('会员不存在')

    const product = pointProducts.value.find(p => p.id === productId)
    if (!product) throw new Error('商品不存在')
    if (product.status !== 'active') throw new Error('商品已下架')
    if (product.stock < quantity) throw new Error('库存不足')

    const totalPoints = product.points * quantity
    if (member.points < totalPoints) throw new Error('积分不足')

    const invStore = useInventoryStore()
    const couponStore = useCouponStore()

    const now = new Date().toISOString()
    const orderNo = generatePointOrderNo()
    const verifyCode = generateVerifyCode()

    return await db.transaction(
      'rw',
      db.members,
      db.pointsLog,
      db.pointProducts,
      db.pointOrders,
      db.beanSkus,
      db.coupons,
      db.couponTemplates,
      async () => {
        const newPoints = member.points - totalPoints
        await db.members.update(memberId, { points: newPoints, updatedAt: now })
        member.points = newPoints
        member.updatedAt = now

        const logData = {
          memberId,
          type: POINTS_LOG_TYPE.SPEND,
          points: -totalPoints,
          balance: newPoints,
          reason: `兑换${product.name}`,
          orderId: null,
          createdAt: now,
        }
        const logId = await db.pointsLog.add(logData)
        logData.id = logId
        pointsLog.value.push(logData)

        const newStock = product.stock - quantity
        await db.pointProducts.update(productId, { stock: newStock, updatedAt: now })
        product.stock = newStock
        product.updatedAt = now

        let couponId = null
        let skuId = product.skuId || null
        let beanId = product.beanId || null

        if (product.type === POINT_PRODUCT_TYPE.BEAN && product.skuId) {
          const sku = await invStore.getBySkuId(product.skuId)
          if (sku && sku.stock >= quantity) {
            await invStore.deductStock(product.skuId, quantity)
          } else {
            throw new Error('豆种库存不足')
          }
        }

        if (product.type === POINT_PRODUCT_TYPE.COUPON && product.couponTemplateId) {
          try {
            const coupon = await couponStore.issueCoupon(
              product.couponTemplateId,
              member.phone,
              member.name
            )
            couponId = coupon.id
          } catch (e) {
            throw new Error(`优惠券发放失败: ${e.message}`)
          }
        }

        const orderData = {
          orderNo,
          memberId,
          memberName: member.name,
          memberPhone: member.phone,
          productId,
          productType: product.type,
          productName: product.name,
          points: totalPoints,
          quantity,
          status: POINT_ORDER_STATUS.PENDING,
          verifyCode,
          verifiedAt: null,
          skuId,
          beanId,
          couponId,
          createdAt: now,
          updatedAt: now,
        }

        const orderId = await db.pointOrders.add(orderData)
        orderData.id = orderId
        pointOrders.value.push(orderData)

        logData.orderId = orderId
        await db.pointsLog.update(logId, { orderId })

        return orderData
      }
    )
  }

  async function verifyOrder(orderId) {
    const order = pointOrders.value.find(o => o.id === orderId)
    if (!order) throw new Error('订单不存在')
    if (order.status !== POINT_ORDER_STATUS.PENDING) throw new Error('订单状态不允许核销')

    const now = new Date().toISOString()
    const updateData = {
      status: POINT_ORDER_STATUS.VERIFIED,
      verifiedAt: now,
      updatedAt: now,
    }

    await db.pointOrders.update(orderId, updateData)
    const idx = pointOrders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) {
      pointOrders.value[idx] = { ...pointOrders.value[idx], ...updateData }
    }

    return true
  }

  async function cancelOrder(orderId, reason = '') {
    const order = pointOrders.value.find(o => o.id === orderId)
    if (!order) throw new Error('订单不存在')
    if (order.status !== POINT_ORDER_STATUS.PENDING) throw new Error('订单状态不允许取消')

    const product = pointProducts.value.find(p => p.id === order.productId)
    const invStore = useInventoryStore()

    const now = new Date().toISOString()

    return await db.transaction(
      'rw',
      db.pointOrders,
      db.pointProducts,
      db.members,
      db.pointsLog,
      db.beanSkus,
      async () => {
        const updateData = {
          status: POINT_ORDER_STATUS.CANCELED,
          updatedAt: now,
        }
        await db.pointOrders.update(orderId, updateData)
        const idx = pointOrders.value.findIndex(o => o.id === orderId)
        if (idx !== -1) {
          pointOrders.value[idx] = { ...pointOrders.value[idx], ...updateData }
        }

        if (product) {
          const newStock = product.stock + order.quantity
          await db.pointProducts.update(product.id, { stock: newStock, updatedAt: now })
          product.stock = newStock
          product.updatedAt = now
        }

        if (order.productType === POINT_PRODUCT_TYPE.BEAN && order.skuId) {
          try {
            const sku = await invStore.getBySkuId(order.skuId)
            if (sku) {
              await db.beanSkus.update(order.skuId, {
                stock: sku.stock + order.quantity,
                updatedAt: now,
              })
              const invIdx = invStore.inventoryList.findIndex(s => s.id === order.skuId)
              if (invIdx !== -1) {
                invStore.inventoryList[invIdx].stock += order.quantity
              }
            }
          } catch (e) {
            console.error('退回豆种库存失败:', e)
          }
        }

        const member = members.value.find(m => m.id === order.memberId)
        if (member) {
          const refundAmount = order.points
          const newPoints = member.points + refundAmount
          await db.members.update(member.id, { points: newPoints, updatedAt: now })
          member.points = newPoints
          member.updatedAt = now

          const logData = {
            memberId: member.id,
            type: POINTS_LOG_TYPE.REFUND,
            points: refundAmount,
            balance: newPoints,
            reason: `取消兑换${order.productName}`,
            orderId,
            createdAt: now,
          }
          const logId = await db.pointsLog.add(logData)
          logData.id = logId
          pointsLog.value.push(logData)
        }

        return true
      }
    )
  }

  function getMemberPointsLog(memberId) {
    return pointsLog.value
      .filter(l => l.memberId === memberId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  function getProductById(productId) {
    return pointProducts.value.find(p => p.id === productId)
  }

  function getOrderById(orderId) {
    return pointOrders.value.find(o => o.id === orderId)
  }

  function getOrdersByMember(memberId) {
    return pointOrders.value
      .filter(o => o.memberId === memberId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  function setCurrentMember(member) {
    currentMember.value = member
  }

  return {
    members,
    pointsLog,
    pointProducts,
    pointOrders,
    currentMember,
    activeProducts,
    productsWithDetails,
    activeProductsWithDetails,
    memberOrders,
    loadAll,
    addMember,
    getMemberByPhone,
    addPoints,
    deductPoints,
    refundPoints,
    addProduct,
    updateProduct,
    deleteProduct,
    redeemProduct,
    verifyOrder,
    cancelOrder,
    getMemberPointsLog,
    getProductById,
    getOrderById,
    getOrdersByMember,
    setCurrentMember,
  }
})
