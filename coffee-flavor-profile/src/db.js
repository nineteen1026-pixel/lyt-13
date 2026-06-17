import Dexie from 'dexie'

const db = new Dexie('CoffeeFlavorProfile')

db.version(2).stores({
  beans: '++id, name, origin, variety, process, createdAt',
  roasts: '++id, beanId, date, level, temperature, duration, notes, createdAt',
  extractions: '++id, roastId, beanId, date, method, ratio, temperature, time, notes, createdAt',
  ratings: '++id, beanId, acidity, sweetness, body, aftertaste, balance, createdAt',
  inventory: '++id, beanId, stock, reservedStock, price, presalePrice, deposit, status, updatedAt',
  promotions: '++id, name, type, discount, discountType, minAmount, startTime, endTime, status, createdAt',
  orders: '++id, orderNo, type, status, customerName, customerPhone, totalAmount, depositAmount, balanceAmount, discountAmount, payAmount, promotionId, depositPaidAt, balancePaidAt, balanceDueAt, depositDueAt, canceledAt, cancelReason, createdAt, updatedAt',
  orderItems: '++id, orderId, beanId, beanName, quantity, unitPrice, subtotal, discount, createdAt',
  payments: '++id, orderId, type, amount, method, transactionNo, paidAt, remark, createdAt',
  paymentReminders: '++id, orderId, type, content, sentAt, createdAt',
  promotionRedemptions: '++id, orderId, promotionId, discountAmount, redeemedAt, createdAt',
})

export default db
