import Dexie from 'dexie'

const db = new Dexie('CoffeeFlavorProfile')

db.version(11).stores({
  beans: '++id, name, origin, variety, process, flavorTags, createdAt',
  roasts: '++id, beanId, curveId, date, level, temperature, duration, notes, createdAt',
  extractions: '++id, roastId, beanId, date, method, ratio, temperature, time, notes, createdAt',
  ratings: '++id, beanId, acidity, sweetness, body, aftertaste, balance, createdAt',
  cuppingComparisons: '++id, name, beanIds, roastIds, extractionIds, notes, createdAt, updatedAt',
  roastCurves: '++id, name, beanId, description, createdAt',
  beanSkus: '++id, beanId, skuCode, weight, grind, stock, reservedStock, roastReservedStock, price, presalePrice, deposit, status, updatedAt',
  promotions: '++id, name, type, discount, discountType, minAmount, startTime, endTime, status, couponTemplateId, createdAt, updatedAt',
  couponTemplates: '++id, name, type, discountType, discount, minAmount, scope, scopeValue, validType, validDays, validStart, validEnd, totalCount, issuedCount, status, promotionId, createdAt, updatedAt',
  coupons: '++id, templateId, code, memberPhone, memberName, status, receivedAt, validStart, validEnd, usedAt, orderId, discountAmount, createdAt',
  orders: '++id, orderNo, type, status, customerName, customerPhone, totalAmount, depositAmount, balanceAmount, discountAmount, payAmount, promotionId, couponId, depositPaidAt, balancePaidAt, balanceDueAt, depositDueAt, canceledAt, cancelReason, estimatedDeliveryDate, createdAt, updatedAt',
  orderItems: '++id, orderId, beanId, beanName, skuId, skuCode, skuWeight, skuGrind, quantity, unitPrice, subtotal, discount, createdAt',
  payments: '++id, orderId, type, amount, method, transactionNo, paidAt, remark, createdAt',
  paymentReminders: '++id, orderId, type, content, sentAt, createdAt',
  promotionRedemptions: '++id, orderId, promotionId, discountAmount, redeemedAt, createdAt',
  extractionParams: '++id, beanType, beanVariety, origin, process, roastLevel, ratio, temperature, brewTime, overallScore, sampleCount, createdAt, updatedAt',
  recommendationFeedbacks: '++id, paramRecordId, beanVariety, roastLevel, satisfaction, actualUsed, createdAt',
  orderQRCodes: '++id, orderId, beanId, beanName, skuId, skuWeight, skuGrind, qrUrl, snapshot, generatedAt, createdAt',
  roastPlans: '++id, orderId, orderItemId, beanId, beanName, skuId, skuWeight, skuGrind, quantity, status, scheduledDate, estimatedDeliveryDate, roastLevel, curveId, startedAt, completedAt, notes, createdAt, updatedAt',
}).upgrade(async tx => {
  const inventoryTable = tx.table('inventory')
  if (!inventoryTable) return

  const oldInventories = await inventoryTable.toArray()
  if (oldInventories.length === 0) return

  const nowStr = new Date().toISOString()
  const newSkus = []

  const weightMultipliers = { 100: 1.0, 250: 2.3, 500: 4.3, 1000: 8.0 }
  const grindSurcharge = { bean: 0, coarse: 0, medium: 0, fine: 2 }
  const weightCodes = { 100: 'W1', 250: 'W2', 500: 'W3', 1000: 'W4' }
  const grindCodes = { bean: 'G0', coarse: 'G1', medium: 'G2', fine: 'G3' }
  const weights = [100, 250, 500, 1000]
  const grinds = ['bean', 'coarse', 'medium', 'fine']

  for (const oldInv of oldInventories) {
    for (const weight of weights) {
      for (const grind of grinds) {
        const isDefault = (weight === 250 && grind === 'bean')
        const mult = weightMultipliers[weight] || 1
        const surcharge = grindSurcharge[grind] || 0
        const basePrice = oldInv.price || 100

        let price, presalePrice, deposit, stock, status
        if (isDefault) {
          price = +(oldInv.price || basePrice).toFixed(2)
          presalePrice = +(oldInv.presalePrice || price * 0.85).toFixed(2)
          deposit = +(oldInv.deposit || price * 0.3).toFixed(2)
          stock = oldInv.stock || 0
          status = oldInv.status || 'off_shelf'
        } else {
          price = +(basePrice * mult + surcharge).toFixed(2)
          presalePrice = +(price * 0.85).toFixed(2)
          deposit = +(price * 0.3).toFixed(2)
          stock = 0
          status = 'off_shelf'
        }

        newSkus.push({
          beanId: oldInv.beanId,
          skuCode: `${weightCodes[weight] || 'WX'}-${grindCodes[grind] || 'GX'}`,
          weight,
          grind,
          stock,
          reservedStock: oldInv.reservedStock && isDefault ? oldInv.reservedStock : 0,
          roastReservedStock: oldInv.roastReservedStock && isDefault ? oldInv.roastReservedStock : 0,
          price,
          presalePrice,
          deposit,
          status,
          updatedAt: nowStr,
        })
      }
    }
  }

  await tx.table('beanSkus').bulkAdd(newSkus)
})

export const WEIGHT_OPTIONS = [
  { value: 100, label: '100g' },
  { value: 250, label: '250g' },
  { value: 500, label: '500g' },
  { value: 1000, label: '1kg' },
]

export const GRIND_OPTIONS = [
  { value: 'bean', label: '咖啡豆' },
  { value: 'coarse', label: '粗研磨 (法压/冷萃)' },
  { value: 'medium', label: '中研磨 (手冲/爱乐压)' },
  { value: 'fine', label: '细研磨 (意式/摩卡壶)' },
]

export function generateSkuCode(weight, grind) {
  const weightCode = { 100: 'W1', 250: 'W2', 500: 'W3', 1000: 'W4' }[weight] || 'WX'
  const grindCode = { bean: 'G0', coarse: 'G1', medium: 'G2', fine: 'G3' }[grind] || 'GX'
  return `${weightCode}-${grindCode}`
}

export function getWeightLabel(weight) {
  const opt = WEIGHT_OPTIONS.find(o => o.value === weight)
  return opt ? opt.label : `${weight}g`
}

export function getGrindLabel(grind) {
  const opt = GRIND_OPTIONS.find(o => o.value === grind)
  return opt ? opt.label : grind
}

export function buildSkuName(beanName, weight, grind) {
  return `${beanName} · ${getWeightLabel(weight)} · ${getGrindLabel(grind)}`
}

export default db
