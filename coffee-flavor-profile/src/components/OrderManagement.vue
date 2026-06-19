<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🛒 订单管理</h2>
      <button class="btn btn-primary" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? '取消' : '+ 新建订单' }}
      </button>
    </div>

    <div v-if="showCreateForm" class="form-section">
      <h3 class="form-title">{{ form.type === 'presale' ? '创建预售订单' : '创建普通订单' }}</h3>

      <div class="form-grid">
        <div class="form-group">
          <label>订单类型</label>
          <select v-model="form.type">
            <option value="normal">普通订单</option>
            <option value="presale">预售订单</option>
          </select>
        </div>
        <div class="form-group">
          <label>客户姓名</label>
          <input v-model="form.customerName" placeholder="请输入客户姓名" />
        </div>
        <div class="form-group">
          <label>联系电话</label>
          <input v-model="form.customerPhone" placeholder="请输入联系电话" />
        </div>
        <div class="form-group">
          <label>新客首单</label>
          <select v-model="form.isNewCustomer">
            <option :value="false">否</option>
            <option :value="true">是</option>
          </select>
        </div>
      </div>

      <div class="cart-section">
        <h4 class="cart-title">选择商品</h4>
        <div class="cart-list">
          <div v-for="inv in availableInventory" :key="inv.id" class="cart-item">
            <div class="cart-item-info">
              <div class="cart-item-name">{{ inv.beanName }}</div>
              <div class="cart-item-meta">
                <span class="tag">{{ inv.beanOrigin }}</span>
                <span class="tag" :class="{ 'presale-tag': inv.status === 'presale' }">
                  {{ inv.status === 'presale' ? '预售中' : '在售' }}
                </span>
                <span class="tag stock-tag">库存: {{ inv.availableStock }}</span>
              </div>
              <div class="cart-item-price">
                <span v-if="form.type === 'presale'">
                  预售价: ¥{{ inv.presalePrice }} | 定金: ¥{{ inv.deposit }}
                </span>
                <span v-else>售价: ¥{{ inv.price }}</span>
              </div>
            </div>
            <div class="cart-item-actions">
              <button class="qty-btn" @click="decreaseQty(inv.beanId)">-</button>
              <input
                type="number"
                class="qty-input"
                v-model.number="form.cart[inv.beanId]"
                min="0"
                :max="inv.availableStock"
              />
              <button class="qty-btn" @click="increaseQty(inv.beanId, inv.availableStock)">+</button>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <div class="summary-row">
          <span>商品总额:</span>
          <span>¥{{ calculateTotals.totalAmount.toFixed(2) }}</span>
        </div>
        <div v-if="bestPromotion" class="summary-row discount">
          <span>优惠 ({{ bestPromotion.name }}):</span>
          <span>-¥{{ bestPromotion.calculatedDiscount.toFixed(2) }}</span>
        </div>
        <div class="summary-row total">
          <span>应付金额:</span>
          <span>¥{{ calculateTotals.payAmount.toFixed(2) }}</span>
        </div>
        <div v-if="form.type === 'presale'" class="summary-row presale">
          <span>定金:</span>
          <span>¥{{ calculateTotals.deposit.toFixed(2) }}</span>
        </div>
        <div v-if="form.type === 'presale'" class="summary-row presale">
          <span>尾款:</span>
          <span>¥{{ calculateTotals.balance.toFixed(2) }}</span>
        </div>
      </div>

      <button class="btn btn-primary submit-btn" @click="submitOrder" :disabled="!canSubmit">
        创建订单
      </button>
    </div>

    <div class="order-filters">
      <button
        v-for="f in filters"
        :key="f.key"
        :class="['filter-btn', { active: activeFilter === f.key }]"
        @click="activeFilter = f.key"
      >
        {{ f.label }}
        <span class="filter-count">{{ f.count }}</span>
      </button>
    </div>

    <div class="order-list">
      <div v-for="order in filteredOrders" :key="order.id" class="order-item">
        <div class="order-header">
          <div class="order-info">
            <span class="order-no">订单号: {{ order.orderNo }}</span>
            <span class="tag type-tag">{{ order.typeText }}</span>
            <span class="tag status-tag" :class="'status-' + order.status">{{ order.statusText }}</span>
          </div>
          <div class="order-time">{{ new Date(order.createdAt).toLocaleString() }}</div>
        </div>

        <div class="order-customer">
          <span>👤 {{ order.customerName }}</span>
          <span>📞 {{ order.customerPhone }}</span>
        </div>

        <div class="order-items-list">
          <div v-for="item in order.items" :key="item.id" class="order-line-item">
            <span class="item-name">{{ item.beanName }}</span>
            <span class="item-qty">x{{ item.quantity }}</span>
            <span class="item-price">¥{{ item.unitPrice }}</span>
            <span class="item-subtotal">小计: ¥{{ item.subtotal.toFixed(2) }}</span>
          </div>
        </div>

        <div class="order-amounts">
          <div class="amount-row"><span>商品总额:</span><span>¥{{ order.totalAmount.toFixed(2) }}</span></div>
          <div v-if="order.discountAmount > 0" class="amount-row discount">
            <span>优惠:</span><span>-¥{{ order.discountAmount.toFixed(2) }}</span>
          </div>
          <div class="amount-row total"><span>应付:</span><span>¥{{ order.payAmount.toFixed(2) }}</span></div>
          <div v-if="order.type === 'presale'" class="amount-row">
            <span>定金:</span><span>¥{{ order.depositAmount.toFixed(2) }}</span>
          </div>
          <div v-if="order.type === 'presale'" class="amount-row">
            <span>尾款:</span><span>¥{{ order.balanceAmount.toFixed(2) }}</span>
          </div>
        </div>

        <div v-if="order.depositDueAt && order.status === 'pending_deposit'" class="timeout-info deposit">
          ⏰ 定金支付截止: {{ new Date(order.depositDueAt).toLocaleString() }}
          <span class="countdown">{{ getCountdown(order.depositDueAt) }}</span>
        </div>
        <div v-if="order.balanceDueAt && order.status === 'pending_balance'" class="timeout-info balance">
          ⏰ 尾款支付截止: {{ new Date(order.balanceDueAt).toLocaleString() }}
          <span class="countdown">{{ getCountdown(order.balanceDueAt) }}</span>
        </div>
        <div v-if="order.status === 'canceled'" class="cancel-info">
          ❌ {{ order.cancelReason }}
        </div>

        <div v-if="order.reminders.length > 0" class="reminder-info">
          📨 催付记录 ({{ order.reminders.length }}):
          <span v-for="r in order.reminders" :key="r.id" class="reminder-tag">
            {{ r.type === 'balance' ? '尾款' : '定金' }}催付 @{{ new Date(r.sentAt).toLocaleString() }}
          </span>
        </div>

        <div class="order-actions">
          <button
            v-if="order.status === 'pending_deposit'"
            class="btn btn-primary btn-sm"
            @click="handlePayDeposit(order.id)"
          >
            支付{{ order.type === 'presale' ? '定金' : '款项' }}
          </button>
          <button
            v-if="order.status === 'pending_deposit'"
            class="btn btn-sm"
            @click="handleSendDepositReminder(order.id)"
          >
            发送催付
          </button>
          <button
            v-if="order.status === 'pending_balance'"
            class="btn btn-primary btn-sm"
            @click="handlePayBalance(order.id)"
          >
            支付尾款
          </button>
          <button
            v-if="order.status === 'pending_balance'"
            class="btn btn-sm"
            @click="handleSendBalanceReminder(order.id)"
          >
            发送催付
          </button>
          <button
            v-if="['pending_deposit', 'deposit_paid', 'pending_balance'].includes(order.status)"
            class="btn btn-danger btn-sm"
            @click="handleCancel(order.id)"
          >
            取消订单
          </button>
          <button
            v-if="order.status === 'paid'"
            class="btn btn-primary btn-sm"
            @click="handleShip(order.id)"
          >
            发货
          </button>
          <button
            v-if="order.status === 'shipped'"
            class="btn btn-primary btn-sm"
            @click="handleComplete(order.id)"
          >
            完成订单
          </button>
          <button
            v-if="['paid', 'shipped', 'completed'].includes(order.status) || orderHasQR(order.id)"
            class="btn btn-sm qr-btn"
            @click="openQRCode(order)"
          >
            🔲 风味二维码
          </button>
        </div>
      </div>

      <div v-if="filteredOrders.length === 0" class="empty-state">
        暂无订单数据
      </div>
    </div>

    <FlavorQRCode
      :visible="showQRCode"
      :orderNo="qrOrderData.orderNo"
      :customerName="qrOrderData.customerName"
      :beanItems="qrOrderData.beanItems"
      :persistedQRCodes="qrOrderData.persistedQRCodes"
      @close="showQRCode = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useOrderStore, ORDER_TYPE } from '../stores/order.js'
import { useInventoryStore } from '../stores/inventory.js'
import { usePromotionStore } from '../stores/promotion.js'
import FlavorQRCode from './FlavorQRCode.vue'

const orderStore = useOrderStore()
const invStore = useInventoryStore()
const promoStore = usePromotionStore()

const showCreateForm = ref(false)
const activeFilter = ref('all')
const showQRCode = ref(false)
const qrOrderData = ref({ orderNo: '', customerName: '', beanItems: [], persistedQRCodes: [] })
let countdownTimer = null

const form = reactive({
  type: 'normal',
  customerName: '',
  customerPhone: '',
  isNewCustomer: false,
  cart: {},
})

const availableInventory = computed(() => {
  if (form.type === 'presale') {
    return invStore.inventoryWithBeans.filter(i => i.status === 'presale' || i.status === 'on_sale')
  }
  return invStore.inventoryWithBeans.filter(i => i.status === 'on_sale' && i.availableStock > 0)
})

const filters = computed(() => [
  { key: 'all', label: '全部', count: orderStore.ordersWithDetails.length },
  { key: 'presale', label: '预售订单', count: orderStore.presaleOrders.length },
  { key: 'pending_deposit', label: '待付定金', count: orderStore.pendingDepositOrders.length },
  { key: 'pending_balance', label: '待付尾款', count: orderStore.pendingBalanceOrders.length },
  { key: 'paid', label: '已付款', count: orderStore.ordersWithDetails.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'completed').length },
  { key: 'canceled', label: '已取消', count: orderStore.ordersWithDetails.filter(o => o.status === 'canceled').length },
])

const filteredOrders = computed(() => {
  const all = orderStore.ordersWithDetails
  switch (activeFilter.value) {
    case 'presale': return orderStore.presaleOrders
    case 'pending_deposit': return orderStore.pendingDepositOrders
    case 'pending_balance': return orderStore.pendingBalanceOrders
    case 'paid': return all.filter(o => ['paid', 'shipped', 'completed'].includes(o.status))
    case 'canceled': return all.filter(o => o.status === 'canceled')
    default: return all
  }
})

const calculateTotals = computed(() => {
  let totalAmount = 0
  let deposit = 0

  for (const inv of availableInventory.value) {
    const qty = form.cart[inv.beanId] || 0
    if (qty > 0) {
      const price = form.type === ORDER_TYPE.PRESALE ? inv.presalePrice : inv.price
      totalAmount += price * qty
      if (form.type === ORDER_TYPE.PRESALE) {
        deposit += inv.deposit * qty
      }
    }
  }

  totalAmount = +totalAmount.toFixed(2)
  deposit = +deposit.toFixed(2)

  const applicable = promoStore.getApplicablePromotions(totalAmount, form.type, form.isNewCustomer)
  const discountAmount = applicable.length > 0 ? applicable[0].calculatedDiscount : 0
  const payAmount = +(totalAmount - discountAmount).toFixed(2)
  let balance = +(payAmount - deposit).toFixed(2)
  if (balance < 0) {
    balance = 0
    deposit = payAmount
  }

  return { totalAmount, deposit, balance, payAmount, discountAmount }
})

const bestPromotion = computed(() => {
  const applicable = promoStore.getApplicablePromotions(
    calculateTotals.value.totalAmount,
    form.type,
    form.isNewCustomer
  )
  return applicable.length > 0 ? applicable[0] : null
})

const canSubmit = computed(() => {
  const hasItems = Object.values(form.cart).some(q => q > 0)
  return hasItems && form.customerName.trim() && form.customerPhone.trim()
})

function increaseQty(beanId, maxStock) {
  const current = form.cart[beanId] || 0
  if (current < maxStock) {
    form.cart[beanId] = current + 1
  }
}

function decreaseQty(beanId) {
  const current = form.cart[beanId] || 0
  if (current > 0) {
    form.cart[beanId] = current - 1
  }
}

function resetForm() {
  form.type = 'normal'
  form.customerName = ''
  form.customerPhone = ''
  form.isNewCustomer = false
  form.cart = {}
}

async function submitOrder() {
  if (!canSubmit.value) return

  const items = []
  for (const inv of availableInventory.value) {
    const qty = form.cart[inv.beanId] || 0
    if (qty > 0) {
      items.push({ beanId: inv.beanId, quantity: qty })
    }
  }

  try {
    const order = await orderStore.createOrder({
      type: form.type,
      items,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      isNewCustomer: form.isNewCustomer,
    })
    alert(`订单创建成功！订单号: ${order.orderNo}`)
    resetForm()
    showCreateForm.value = false
  } catch (e) {
    alert('创建订单失败: ' + e.message)
  }
}

async function handlePayDeposit(orderId) {
  try {
    await orderStore.payDeposit(orderId)
    alert('支付成功！')
  } catch (e) {
    alert('支付失败: ' + e.message)
  }
}

async function handlePayBalance(orderId) {
  try {
    await orderStore.payBalance(orderId)
    alert('尾款支付成功！')
  } catch (e) {
    alert('支付失败: ' + e.message)
  }
}

async function handleCancel(orderId) {
  if (!confirm('确定要取消该订单吗？库存将被释放，优惠将回滚。')) return
  try {
    await orderStore.cancelOrder(orderId)
    alert('订单已取消')
  } catch (e) {
    alert('取消失败: ' + e.message)
  }
}

async function handleSendDepositReminder(orderId) {
  try {
    await orderStore.sendDepositReminder(orderId)
    alert('催付通知已发送（查看控制台）')
  } catch (e) {
    alert('发送失败: ' + e.message)
  }
}

async function handleSendBalanceReminder(orderId) {
  try {
    await orderStore.sendBalanceReminder(orderId)
    alert('催付通知已发送（查看控制台）')
  } catch (e) {
    alert('发送失败: ' + e.message)
  }
}

async function handleShip(orderId) {
  try {
    await orderStore.shipOrder(orderId)
    alert('已标记发货')
  } catch (e) {
    alert('操作失败: ' + e.message)
  }
}

async function handleComplete(orderId) {
  try {
    await orderStore.completeOrder(orderId)
    await orderStore.generateOrderQRCodes(orderId)
    const order = orderStore.ordersWithDetails.find(o => o.id === orderId)
    if (order) {
      openQRCode(order)
    }
    alert('订单已完成，风味二维码已生成并绑定')
  } catch (e) {
    alert('操作失败: ' + e.message)
  }
}

function openQRCode(order) {
  const items = order.items || orderStore.orderItems.filter(i => i.orderId === order.id)
  const beanItems = items.map(item => ({
    beanId: item.beanId,
    beanName: item.beanName,
  }))
  const persistedQRCodes = orderStore.getOrderQRCodes(order.id)
  qrOrderData.value = {
    orderNo: order.orderNo,
    customerName: order.customerName,
    beanItems,
    persistedQRCodes,
  }
  showQRCode.value = true
}

function orderHasQR(orderId) {
  return orderStore.getOrderQRCodes(orderId).length > 0
}

function getCountdown(dueAtStr) {
  const due = new Date(dueAtStr)
  const now = new Date()
  const diff = due - now
  if (diff <= 0) return '已超时'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const secs = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 0) return `(剩 ${hours}h ${mins}m)`
  if (mins > 0) return `(剩 ${mins}m ${secs}s)`
  return `(剩 ${secs}s)`
}

onMounted(() => {
  countdownTimer = setInterval(() => {
    orderStore.checkTimeouts()
  }, 1000)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.form-title {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 16px;
}

.cart-section {
  background: #FFFCF7;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 16px;
  margin: 16px 0;
}

.cart-title {
  font-size: 14px;
  font-weight: 600;
  color: #6F4E37;
  margin-bottom: 12px;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #FFF8F0;
  border-radius: 8px;
  border: 1px solid #EDE0D0;
}

.cart-item-info {
  flex: 1;
}

.cart-item-name {
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 4px;
}

.cart-item-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.presale-tag {
  background: #F9E0D9;
  color: #C0392B;
}

.stock-tag {
  background: #D4E6D4;
  color: #3E6B3E;
}

.cart-item-price {
  font-size: 13px;
  color: #8B7355;
}

.cart-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #D2B48C;
  background: #FFFDF9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  color: #6F4E37;
}

.qty-btn:hover {
  background: #F0E0D0;
}

.qty-input {
  width: 50px;
  text-align: center;
  padding: 4px 6px;
  border: 1px solid #D2B48C;
  border-radius: 6px;
  font-size: 14px;
}

.summary-section {
  background: #FFF8F0;
  border: 1px solid #E8D5B7;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
  color: #6F4E37;
}

.summary-row.total {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  border-top: 1px dashed #E8D5B7;
  margin-top: 6px;
  padding-top: 10px;
}

.summary-row.discount {
  color: #C0392B;
}

.summary-row.presale {
  color: #8B4513;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  font-size: 15px;
}

.order-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 14px;
  border: 1px solid #D2B48C;
  background: #FFFDF9;
  border-radius: 16px;
  font-size: 13px;
  color: #6F4E37;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-btn:hover {
  background: #F0E0D0;
}

.filter-btn.active {
  background: #6F4E37;
  color: #FFF8F0;
  border-color: #6F4E37;
}

.filter-count {
  background: rgba(0,0,0,0.1);
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.filter-btn.active .filter-count {
  background: rgba(255,255,255,0.2);
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.order-item {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 16px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.order-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.order-no {
  font-weight: 600;
  color: #3E2C1C;
  font-size: 14px;
}

.type-tag {
  background: #E8D5B7;
  color: #6F4E37;
}

.status-tag {
  font-weight: 500;
}

.status-pending_deposit {
  background: #FEF3C7;
  color: #92400E;
}

.status-deposit_paid {
  background: #DBEAFE;
  color: #1E40AF;
}

.status-pending_balance {
  background: #FEE2E2;
  color: #991B1B;
}

.status-balance_paid,
.status-paid {
  background: #D1FAE5;
  color: #065F46;
}

.status-shipped {
  background: #CFFAFE;
  color: #155E75;
}

.status-completed {
  background: #D4E6D4;
  color: #3E6B3E;
}

.status-canceled {
  background: #F3F4F6;
  color: #6B7280;
}

.order-time {
  font-size: 12px;
  color: #8B7355;
}

.order-customer {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #6F4E37;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: #FFF8F0;
  border-radius: 6px;
}

.order-items-list {
  border-top: 1px dashed #EDE0D0;
  border-bottom: 1px dashed #EDE0D0;
  padding: 10px 0;
  margin-bottom: 10px;
}

.order-line-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  font-size: 13px;
}

.item-name {
  flex: 1;
  color: #3E2C1C;
  font-weight: 500;
}

.item-qty {
  color: #8B7355;
}

.item-price {
  color: #8B7355;
}

.item-subtotal {
  color: #6F4E37;
  font-weight: 500;
}

.order-amounts {
  margin-bottom: 10px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 13px;
  color: #6F4E37;
}

.amount-row.total {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
}

.amount-row.discount {
  color: #C0392B;
}

.timeout-info {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 10px;
}

.timeout-info.deposit {
  background: #FEF3C7;
  color: #92400E;
}

.timeout-info.balance {
  background: #FEE2E2;
  color: #991B1B;
}

.countdown {
  font-weight: 600;
  margin-left: 6px;
}

.cancel-info {
  padding: 8px 12px;
  background: #F3F4F6;
  border-radius: 6px;
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 10px;
}

.reminder-info {
  padding: 8px 12px;
  background: #EFF6FF;
  border-radius: 6px;
  font-size: 12px;
  color: #1E40AF;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.reminder-tag {
  display: inline-block;
  padding: 2px 8px;
  background: #DBEAFE;
  border-radius: 10px;
  font-size: 11px;
}

.order-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 6px;
  border-top: 1px solid #F0E0D0;
}

.btn {
  padding: 6px 16px;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.qr-btn {
  background: #F0E6D8;
  color: #6F4E37;
  border: 1px solid #D2B48C;
}
.qr-btn:hover {
  background: #E8D5B7;
}
</style>
