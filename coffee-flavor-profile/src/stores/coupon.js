import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '../db.js'

export const COUPON_TYPE = {
  FULL_REDUCTION: 'full_reduction',
  DISCOUNT: 'discount',
  NEW_CUSTOMER: 'new_customer',
  BIRTHDAY: 'birthday',
}

export const COUPON_SCOPE = {
  ALL: 'all',
  CATEGORY: 'category',
  BEAN: 'bean',
  PRESALE: 'presale',
}

export const COUPON_STATUS = {
  UNUSED: 'unused',
  USED: 'used',
  EXPIRED: 'expired',
}

export const TEMPLATE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ENDED: 'ended',
}

function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export const useCouponStore = defineStore('coupon', () => {
  const templates = ref([])
  const coupons = ref([])

  const activeTemplates = computed(() => {
    const now = new Date()
    return templates.value.filter(t => {
      if (t.status !== TEMPLATE_STATUS.ACTIVE) return false
      if (t.totalCount && t.issuedCount >= t.totalCount) return false
      return true
    })
  })

  async function loadAll() {
    templates.value = await db.couponTemplates.toArray()
    coupons.value = await db.coupons.toArray()
    await checkAndMarkExpired()
  }

  async function checkAndMarkExpired() {
    const now = new Date()
    const expired = coupons.value.filter(c =>
      c.status === COUPON_STATUS.UNUSED && new Date(c.validEnd) < now
    )
    for (const c of expired) {
      await db.coupons.update(c.id, { status: COUPON_STATUS.EXPIRED })
      const idx = coupons.value.findIndex(x => x.id === c.id)
      if (idx !== -1) {
        coupons.value[idx].status = COUPON_STATUS.EXPIRED
      }
    }
  }

  async function addTemplate(template) {
    const now = new Date().toISOString()
    const data = {
      ...template,
      issuedCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    const id = await db.couponTemplates.add(data)
    data.id = id
    templates.value.push(data)
    return id
  }

  async function updateTemplate(id, data) {
    const updateData = { ...data, updatedAt: new Date().toISOString() }
    await db.couponTemplates.update(id, updateData)
    const idx = templates.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      templates.value[idx] = { ...templates.value[idx], ...updateData }
    }
  }

  async function deleteTemplate(id) {
    await db.couponTemplates.delete(id)
    templates.value = templates.value.filter(t => t.id !== id)
  }

  function calculateDiscount(template, orderAmount, orderType = 'normal', beanIds = []) {
    if (!template) return 0
    if (template.status !== TEMPLATE_STATUS.ACTIVE) return 0

    if (orderAmount < template.minAmount) return 0

    if (template.scope === COUPON_SCOPE.PRESALE && orderType !== 'presale') return 0

    if (template.scope === COUPON_SCOPE.BEAN && template.scopeValue) {
      const allowedBeanIds = template.scopeValue.split(',').map(Number)
      const hasAllowedBean = beanIds.some(id => allowedBeanIds.includes(id))
      if (!hasAllowedBean) return 0
    }

    if (template.discountType === 'fixed') {
      return Math.min(template.discount, orderAmount)
    } else if (template.discountType === 'percentage') {
      return +(orderAmount * template.discount / 100).toFixed(2)
    }
    return 0
  }

  function getApplicableCoupons(memberPhone, orderAmount, orderType = 'normal', beanIds = []) {
    const applicable = []
    const memberCoupons = coupons.value.filter(c =>
      c.memberPhone === memberPhone && c.status === COUPON_STATUS.UNUSED
    )

    const now = new Date()
    for (const coupon of memberCoupons) {
      if (new Date(coupon.validStart) > now) continue
      if (new Date(coupon.validEnd) < now) continue

      const template = templates.value.find(t => t.id === coupon.templateId)
      if (!template) continue

      const discount = calculateDiscount(template, orderAmount, orderType, beanIds)
      if (discount > 0) {
        applicable.push({
          ...coupon,
          template,
          calculatedDiscount: discount,
        })
      }
    }

    applicable.sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)
    return applicable
  }

  async function issueCoupon(templateId, memberPhone, memberName = '') {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) throw new Error('优惠券模板不存在')
    if (template.totalCount && template.issuedCount >= template.totalCount) {
      throw new Error('优惠券已发放完毕')
    }

    const now = new Date()
    let validStart, validEnd

    if (template.validType === 'fixed') {
      validStart = template.validStart
      validEnd = template.validEnd
    } else {
      validStart = now.toISOString()
      validEnd = new Date(now.getTime() + template.validDays * 24 * 60 * 60 * 1000).toISOString()
    }

    const couponData = {
      templateId,
      code: generateCouponCode(),
      memberPhone,
      memberName,
      status: COUPON_STATUS.UNUSED,
      receivedAt: now.toISOString(),
      validStart,
      validEnd,
      usedAt: null,
      orderId: null,
      discountAmount: 0,
      createdAt: now.toISOString(),
    }

    const id = await db.coupons.add(couponData)
    couponData.id = id
    coupons.value.push(couponData)

    await db.couponTemplates.update(templateId, {
      issuedCount: template.issuedCount + 1,
      updatedAt: now.toISOString(),
    })
    const tIdx = templates.value.findIndex(t => t.id === templateId)
    if (tIdx !== -1) {
      templates.value[tIdx].issuedCount++
      templates.value[tIdx].updatedAt = now.toISOString()
    }

    return couponData
  }

  async function batchIssueCoupons(templateId, members) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) throw new Error('优惠券模板不存在')

    const remaining = template.totalCount ? template.totalCount - template.issuedCount : members.length
    if (remaining < members.length) {
      throw new Error(`库存不足，剩余 ${remaining} 张`)
    }

    const results = []
    const now = new Date()

    for (const member of members) {
      try {
        const coupon = await issueCoupon(templateId, member.phone, member.name || '')
        results.push({ success: true, phone: member.phone, coupon })
      } catch (e) {
        results.push({ success: false, phone: member.phone, error: e.message })
      }
    }

    return results
  }

  async function useCoupon(couponId, orderId, discountAmount) {
    const coupon = coupons.value.find(c => c.id === couponId)
    if (!coupon) throw new Error('优惠券不存在')
    if (coupon.status !== COUPON_STATUS.UNUSED) throw new Error('优惠券状态不可用')

    const now = new Date().toISOString()
    await db.coupons.update(couponId, {
      status: COUPON_STATUS.USED,
      usedAt: now,
      orderId,
      discountAmount,
    })

    const idx = coupons.value.findIndex(c => c.id === couponId)
    if (idx !== -1) {
      coupons.value[idx].status = COUPON_STATUS.USED
      coupons.value[idx].usedAt = now
      coupons.value[idx].orderId = orderId
      coupons.value[idx].discountAmount = discountAmount
    }

    return true
  }

  async function rollbackCoupon(orderId) {
    const coupon = coupons.value.find(c => c.orderId === orderId && c.status === COUPON_STATUS.USED)
    if (!coupon) return false

    await db.coupons.update(coupon.id, {
      status: COUPON_STATUS.UNUSED,
      usedAt: null,
      orderId: null,
      discountAmount: 0,
    })

    const idx = coupons.value.findIndex(c => c.id === coupon.id)
    if (idx !== -1) {
      coupons.value[idx].status = COUPON_STATUS.UNUSED
      coupons.value[idx].usedAt = null
      coupons.value[idx].orderId = null
      coupons.value[idx].discountAmount = 0
    }

    return true
  }

  function getCouponsByPhone(memberPhone) {
    return coupons.value.filter(c => c.memberPhone === memberPhone)
  }

  function getCouponsByTemplate(templateId) {
    return coupons.value.filter(c => c.templateId === templateId)
  }

  function getTemplateById(id) {
    return templates.value.find(t => t.id === id)
  }

  function getCouponById(id) {
    return coupons.value.find(c => c.id === id)
  }

  return {
    templates,
    coupons,
    activeTemplates,
    loadAll,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    calculateDiscount,
    getApplicableCoupons,
    issueCoupon,
    batchIssueCoupons,
    useCoupon,
    rollbackCoupon,
    getCouponsByPhone,
    getCouponsByTemplate,
    getTemplateById,
    getCouponById,
  }
})
