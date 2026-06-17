import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '../db.js'

export const usePromotionStore = defineStore('promotion', () => {
  const promotions = ref([])
  const redemptions = ref([])

  const activePromotions = computed(() => {
    const now = new Date()
    return promotions.value.filter(p => {
      if (p.status !== 'active') return false
      const start = new Date(p.startTime)
      const end = new Date(p.endTime)
      return now >= start && now <= end
    })
  })

  async function loadAll() {
    promotions.value = await db.promotions.toArray()
    redemptions.value = await db.promotionRedemptions.toArray()
  }

  async function addPromotion(promo) {
    const data = { ...promo, createdAt: new Date().toISOString() }
    const id = await db.promotions.add(data)
    data.id = id
    promotions.value.push(data)
    return id
  }

  async function updatePromotion(id, data) {
    await db.promotions.update(id, data)
    const idx = promotions.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      promotions.value[idx] = { ...promotions.value[idx], ...data }
    }
  }

  async function deletePromotion(id) {
    await db.promotions.delete(id)
    promotions.value = promotions.value.filter(p => p.id !== id)
  }

  function calculateDiscount(promotion, orderAmount, orderType = 'normal') {
    if (!promotion || promotion.status !== 'active') return 0

    const now = new Date()
    const start = new Date(promotion.startTime)
    const end = new Date(promotion.endTime)
    if (now < start || now > end) return 0

    if (promotion.type === 'presale' && orderType !== 'presale') return 0
    if (promotion.type === 'new_customer' && orderType === 'presale') return 0

    if (orderAmount < promotion.minAmount) return 0

    if (promotion.discountType === 'fixed') {
      return Math.min(promotion.discount, orderAmount)
    } else if (promotion.discountType === 'percentage') {
      return +(orderAmount * promotion.discount / 100).toFixed(2)
    }
    return 0
  }

  function getApplicablePromotions(orderAmount, orderType = 'normal', isNewCustomer = false) {
    const applicable = []
    for (const promo of activePromotions.value) {
      if (promo.type === 'new_customer' && !isNewCustomer) continue
      const discount = calculateDiscount(promo, orderAmount, orderType)
      if (discount > 0) {
        applicable.push({ ...promo, calculatedDiscount: discount })
      }
    }
    applicable.sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)
    return applicable
  }

  async function redeemPromotion(orderId, promotionId, discountAmount) {
    const data = {
      orderId,
      promotionId,
      discountAmount,
      redeemedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    const id = await db.promotionRedemptions.add(data)
    data.id = id
    redemptions.value.push(data)
    return id
  }

  async function getRedemptionByOrderId(orderId) {
    return await db.promotionRedemptions.where('orderId').equals(orderId).first()
  }

  async function rollbackRedemption(orderId) {
    const redemption = await getRedemptionByOrderId(orderId)
    if (redemption) {
      await db.promotionRedemptions.delete(redemption.id)
      redemptions.value = redemptions.value.filter(r => r.id !== redemption.id)
    }
  }

  return {
    promotions,
    redemptions,
    activePromotions,
    loadAll,
    addPromotion,
    updatePromotion,
    deletePromotion,
    calculateDiscount,
    getApplicablePromotions,
    redeemPromotion,
    getRedemptionByOrderId,
    rollbackRedemption,
  }
})
