import Dexie from 'dexie'

const db = new Dexie('CoffeeFlavorProfile')

db.version(10).stores({
  beans: '++id, name, origin, variety, process, flavorTags, createdAt',
  roasts: '++id, beanId, curveId, date, level, temperature, duration, notes, createdAt',
  extractions: '++id, roastId, beanId, date, method, ratio, temperature, time, notes, createdAt',
  ratings: '++id, beanId, acidity, sweetness, body, aftertaste, balance, createdAt',
  cuppingComparisons: '++id, name, beanIds, roastIds, extractionIds, notes, createdAt, updatedAt',
  roastCurves: '++id, name, beanId, description, createdAt',
  inventory: '++id, beanId, stock, reservedStock, roastReservedStock, price, presalePrice, deposit, status, updatedAt',
  promotions: '++id, name, type, discount, discountType, minAmount, startTime, endTime, status, couponTemplateId, createdAt, updatedAt',
  couponTemplates: '++id, name, type, discountType, discount, minAmount, scope, scopeValue, validType, validDays, validStart, validEnd, totalCount, issuedCount, status, promotionId, createdAt, updatedAt',
  coupons: '++id, templateId, code, memberPhone, memberName, status, receivedAt, validStart, validEnd, usedAt, orderId, discountAmount, createdAt',
  orders: '++id, orderNo, type, status, customerName, customerPhone, totalAmount, depositAmount, balanceAmount, discountAmount, payAmount, promotionId, couponId, depositPaidAt, balancePaidAt, balanceDueAt, depositDueAt, canceledAt, cancelReason, estimatedDeliveryDate, createdAt, updatedAt',
  orderItems: '++id, orderId, beanId, beanName, quantity, unitPrice, subtotal, discount, createdAt',
  payments: '++id, orderId, type, amount, method, transactionNo, paidAt, remark, createdAt',
  paymentReminders: '++id, orderId, type, content, sentAt, createdAt',
  promotionRedemptions: '++id, orderId, promotionId, discountAmount, redeemedAt, createdAt',
  extractionParams: '++id, beanType, beanVariety, origin, process, roastLevel, ratio, temperature, brewTime, overallScore, sampleCount, createdAt, updatedAt',
  recommendationFeedbacks: '++id, paramRecordId, beanVariety, roastLevel, satisfaction, actualUsed, createdAt',
  orderQRCodes: '++id, orderId, beanId, beanName, qrUrl, snapshot, generatedAt, createdAt',
  roastPlans: '++id, orderId, orderItemId, beanId, beanName, quantity, status, scheduledDate, estimatedDeliveryDate, roastLevel, curveId, startedAt, completedAt, notes, createdAt, updatedAt',
})

export default db
