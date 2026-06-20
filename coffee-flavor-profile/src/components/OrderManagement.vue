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
        <h4 class="cart-title">选择商品（按克重/研磨度规格）</h4>
        <div class="cart-list">
          <div v-for="group in availableInventoryGroups" :key="group.beanId" class="cart-bean-group">
            <div class="cart-bean-header">
              <div class="cart-bean-info">
                <span class="cart-bean-name">{{ group.beanName }}</span>
                <span class="tag">{{ group.beanOrigin }}</span>
                <span class="tag" :class="{ 'presale-tag': group.status === 'presale' }">
                  {{ group.status === 'presale' ? '预售中' : '在售' }}
                </span>
              </div>
              <span class="cart-bean-price">价格区间: ¥{{ group.minPrice.toFixed(2) }} - ¥{{ group.maxPrice.toFixed(2) }}</span>
            </div>
            <div class="cart-sku-grid">
              <div v-for="sku in group.skus" :key="sku.id" class="cart-sku-item" :class="{ disabled: sku.availableStock <= 0 && form.type !== 'presale' }">
                <div class="sku-tags">
                  <span class="sku-badge weight">{{ sku.weightLabel }}</span>
                  <span class="sku-badge grind">{{ sku.grindLabel }}</span>
                  <span class="sku-code-small">{{ sku.skuCode }}</span>
                </div>
                <div class="sku-info-line">
                  <span v-if="form.type === 'presale'" class="sku-price presale-price">
                    预售价: ¥{{ sku.presalePrice.toFixed(2) }}
                  </span>
                  <span v-else class="sku-price">
                    售价: ¥{{ sku.price.toFixed(2) }}
                  </span>
                  <span v-if="form.type === 'presale'" class="sku-deposit">
                    定金: ¥{{ sku.deposit.toFixed(2) }}
                  </span>
                </div>
                <div class="sku-stock-line">
                  <span v-if="form.type === 'presale' || sku.availableStock > 0" class="sku-stock">
                    {{ form.type === 'presale' ? '可预售' : '库存' }}: {{ sku.availableStock }}
                  </span>
                  <span v-else class="sku-out">缺货</span>
                </div>
                <div class="sku-actions">
                  <button
                    class="qty-btn"
                    @click="decreaseQty(sku.id)"
                    :disabled="!form.cart[sku.id]"
                  >-</button>
                  <input
                    type="number"
                    class="qty-input"
                    v-model.number="form.cart[sku.id]"
                    min="0"
                    :max="sku.availableStock"
                    :disabled="sku.availableStock <= 0 && form.type !== 'presale'"
                  />
                  <button
                    class="qty-btn"
                    @click="increaseQty(sku.id, sku.availableStock)"
                    :disabled="sku.availableStock <= 0 && form.type !== 'presale'"
                  >+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="form.customerPhone.trim() && calculateTotals.totalAmount > 0" class="coupon-section">
        <h4 class="section-subtitle">🎫 选择优惠券</h4>
        <div v-if="applicableCoupons.length > 0" class="coupon-select-list">
          <label
            v-for="coupon in applicableCoupons"
            :key="coupon.id"
            class="coupon-select-item"
            :class="{ selected: form.selectedCouponId === coupon.id }"
          >
            <input
              type="radio"
              :value="coupon.id"
              v-model="form.selectedCouponId"
              :name="'coupon-select'"
            />
            <div class="coupon-select-info">
              <div class="coupon-select-amount">
                <span v-if="coupon.template.discountType === 'fixed'">¥</span>
                {{ coupon.template.discount }}
                <span v-if="coupon.template.discountType === 'percentage'">%</span>
              </div>
              <div class="coupon-select-detail">
                <div class="coupon-select-name">{{ coupon.template.name }}</div>
                <div class="coupon-select-condition">满¥{{ coupon.template.minAmount.toFixed(2) }}可用</div>
                <div class="coupon-select-valid">
                  有效期: {{ new Date(coupon.validStart).toLocaleDateString() }} - {{ new Date(coupon.validEnd).toLocaleDateString() }}
                </div>
              </div>
              <div class="coupon-select-discount">
                -¥{{ coupon.calculatedDiscount.toFixed(2) }}
              </div>
            </div>
          </label>
          <label class="coupon-select-item no-use" :class="{ selected: !form.selectedCouponId }">
            <input
              type="radio"
              :value="null"
              v-model="form.selectedCouponId"
              :name="'coupon-select'"
            />
            <span>不使用优惠券</span>
          </label>
        </div>
        <div v-else class="no-coupon-tip">
          暂无可用优惠券
        </div>
      </div>

      <div class="summary-section">
        <div class="summary-row">
          <span>商品总额:</span>
          <span>¥{{ calculateTotals.totalAmount.toFixed(2) }}</span>
        </div>
        <div v-if="calculateTotals.promoDiscount > 0" class="summary-row discount">
          <span>活动优惠 ({{ bestPromotion?.name || '营销活动' }}):</span>
          <span>-¥{{ calculateTotals.promoDiscount.toFixed(2) }}</span>
        </div>
        <div v-if="calculateTotals.couponDiscount > 0" class="summary-row discount">
          <span>优惠券 ({{ selectedCouponInfo?.template?.name || '优惠券' }}):</span>
          <span>-¥{{ calculateTotals.couponDiscount.toFixed(2) }}</span>
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
            <div class="line-item-main">
              <span class="item-name">{{ item.beanName }}</span>
              <span class="item-sku-specs">
                <span class="sku-badge-mini weight">{{ item.skuWeightLabel }}</span>
                <span class="sku-badge-mini grind">{{ item.skuGrindLabel }}</span>
              </span>
            </div>
            <div class="line-item-sub">
              <span class="item-qty">x{{ item.quantity }}</span>
              <span class="item-price">¥{{ item.unitPrice }}</span>
              <span class="item-subtotal">小计: ¥{{ item.subtotal.toFixed(2) }}</span>
            </div>
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

        <div v-if="order.estimatedDeliveryDate" class="delivery-info">
          📦 预计交货: <span class="delivery-date">{{ formatDeliveryDate(order.estimatedDeliveryDate) }}</span>
          <span v-if="order.activeRoastPlans && order.activeRoastPlans.length > 0" class="roast-count">
            ({{ order.activeRoastPlans.length }} 个烘焙待办)
          </span>
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
import { useCouponStore } from '../stores/coupon.js'
import { useRoastPlanStore } from '../stores/roastPlan.js'
import FlavorQRCode from './FlavorQRCode.vue'

const orderStore = useOrderStore()
const invStore = useInventoryStore()
const promoStore = usePromotionStore()
const couponStore = useCouponStore()
const roastPlanStore = useRoastPlanStore()

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
  selectedCouponId: null,
})

const availableInventoryGroups = computed(() => {
  const groups = invStore.inventoryGroupedByBean
  if (form.type === 'presale') {
    return groups.map(g => ({
      ...g,
      skus: g.skus.filter(s => s.status === 'presale' || s.status === 'on_sale').map(s => ({ ...s }))
    })).filter(g => g.skus.length > 0)
  }
  return groups.map(g => ({
    ...g,
    skus: g.skus.filter(s => s.status === 'on_sale').map(s => ({ ...s }))
  })).filter(g => g.skus.some(s => s.availableStock > 0))
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
  const beanIds = []

  for (const sku of invStore.inventoryWithBeans) {
    const qty = form.cart[sku.id] || 0
    if (qty > 0) {
      const price = form.type === ORDER_TYPE.PRESALE ? sku.presalePrice : sku.price
      totalAmount += price * qty
      if (!beanIds.includes(sku.beanId)) beanIds.push(sku.beanId)
      if (form.type === ORDER_TYPE.PRESALE) {
        deposit += sku.deposit * qty
      }
    }
  }

  totalAmount = +totalAmount.toFixed(2)
  deposit = +deposit.toFixed(2)

  const applicablePromos = promoStore.getApplicablePromotions(totalAmount, form.type, form.isNewCustomer)
  const promoDiscount = applicablePromos.length > 0 ? applicablePromos[0].calculatedDiscount : 0

  let couponDiscount = 0
  if (form.selectedCouponId && form.customerPhone.trim()) {
    const coupon = couponStore.getCouponById(form.selectedCouponId)
    const template = couponStore.getTemplateById(coupon?.templateId)
    if (coupon && template && coupon.memberPhone === form.customerPhone.trim()) {
      couponDiscount = couponStore.calculateDiscount(
        template,
        totalAmount,
        form.type,
        beanIds,
        form.isNewCustomer,
        form.customerPhone.trim()
      )
    }
  }

  const discountAmount = +(promoDiscount + couponDiscount).toFixed(2)
  const payAmount = +Math.max(0, totalAmount - discountAmount).toFixed(2)
  let balance = +(payAmount - deposit).toFixed(2)
  if (balance < 0) {
    balance = 0
    deposit = payAmount
  }

  return { totalAmount, deposit, balance, payAmount, discountAmount, promoDiscount, couponDiscount }
})

const bestPromotion = computed(() => {
  const applicable = promoStore.getApplicablePromotions(
    calculateTotals.value.totalAmount,
    form.type,
    form.isNewCustomer
  )
  return applicable.length > 0 ? applicable[0] : null
})

const applicableCoupons = computed(() => {
  if (!form.customerPhone.trim() || calculateTotals.value.totalAmount <= 0) return []

  const beanIds = []
  for (const sku of invStore.inventoryWithBeans) {
    const qty = form.cart[sku.id] || 0
    if (qty > 0 && !beanIds.includes(sku.beanId)) {
      beanIds.push(sku.beanId)
    }
  }

  return couponStore.getApplicableCoupons(
    form.customerPhone.trim(),
    calculateTotals.value.totalAmount,
    form.type,
    beanIds,
    form.isNewCustomer
  )
})

const selectedCouponInfo = computed(() => {
  if (!form.selectedCouponId) return null
  return applicableCoupons.value.find(c => c.id === form.selectedCouponId) || null
})

const canSubmit = computed(() => {
  const hasItems = Object.values(form.cart).some(q => q > 0)
  return hasItems && form.customerName.trim() && form.customerPhone.trim()
})

function increaseQty(skuId, maxStock) {
  const current = form.cart[skuId] || 0
  if (form.type === ORDER_TYPE.PRESALE || current < maxStock) {
    form.cart[skuId] = current + 1
  }
}

function decreaseQty(skuId) {
  const current = form.cart[skuId] || 0
  if (current > 0) {
    form.cart[skuId] = current - 1
  }
}

function resetForm() {
  form.type = 'normal'
  form.customerName = ''
  form.customerPhone = ''
  form.isNewCustomer = false
  form.cart = {}
  form.selectedCouponId = null
}

async function submitOrder() {
  if (!canSubmit.value) return

  const items = []
  for (const sku of invStore.inventoryWithBeans) {
    const qty = form.cart[sku.id] || 0
    if (qty > 0) {
      items.push({ skuId: sku.id, quantity: qty })
    }
  }

  try {
    const order = await orderStore.createOrder({
      type: form.type,
      items,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      isNewCustomer: form.isNewCustomer,
      couponId: form.selectedCouponId,
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
    skuId: item.skuId,
    skuWeight: item.skuWeight,
    skuGrind: item.skuGrind,
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

function formatDeliveryDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

onMounted(async () => {
  await couponStore.loadAll()
  await roastPlanStore.loadAll()
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
  gap: 14px;
}

.cart-bean-group {
  background: #FFF8F0;
  border-radius: 10px;
  border: 1px solid #EDE0D0;
  overflow: hidden;
}

.cart-bean-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #FFFCF7;
  border-bottom: 1px dashed #E8D5B7;
  flex-wrap: wrap;
  gap: 8px;
}

.cart-bean-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.cart-bean-name {
  font-weight: 600;
  color: #3E2C1C;
}

.cart-bean-price {
  font-size: 12px;
  color: #8B4513;
  font-weight: 500;
}

.cart-sku-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  padding: 12px;
}

.cart-sku-item {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s;
}

.cart-sku-item:hover {
  border-color: #D2B48C;
  box-shadow: 0 2px 6px rgba(111, 78, 55, 0.1);
}

.cart-sku-item.disabled {
  opacity: 0.5;
  background: #F9F9F9;
}

.sku-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.sku-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.sku-badge.weight {
  background: #E8D5B7;
  color: #6F4E37;
}

.sku-badge.grind {
  background: #D4E6D4;
  color: #3E6B3E;
}

.sku-badge-mini {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
}

.sku-badge-mini.weight {
  background: #E8D5B7;
  color: #6F4E37;
}

.sku-badge-mini.grind {
  background: #D4E6D4;
  color: #3E6B3E;
}

.sku-code-small {
  font-size: 10px;
  color: #A08968;
  font-family: monospace;
}

.sku-info-line {
  display: flex;
  gap: 8px;
  font-size: 12px;
  flex-wrap: wrap;
}

.sku-price {
  color: #6F4E37;
  font-weight: 600;
}

.sku-price.presale-price {
  color: #C0392B;
}

.sku-deposit {
  color: #8B4513;
  font-size: 11px;
}

.sku-stock-line {
  font-size: 11px;
}

.sku-stock {
  color: #3E6B3E;
  background: #D4E6D4;
  padding: 1px 6px;
  border-radius: 6px;
  font-weight: 500;
}

.sku-out {
  color: #991B1B;
  background: #FEE2E2;
  padding: 1px 6px;
  border-radius: 6px;
  font-weight: 500;
}

.sku-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px dashed #F0E0D0;
}

.presale-tag {
  background: #F9E0D9;
  color: #C0392B;
}

.qty-btn {
  width: 26px;
  height: 26px;
  border: 1px solid #D2B48C;
  background: #FFFDF9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  color: #6F4E37;
}

.qty-btn:hover:not(:disabled) {
  background: #F0E0D0;
}

.qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty-input {
  width: 46px;
  text-align: center;
  padding: 3px 4px;
  border: 1px solid #D2B48C;
  border-radius: 6px;
  font-size: 13px;
}

.qty-input:disabled {
  background: #F9F9F9;
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
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
}

.line-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.item-name {
  color: #3E2C1C;
  font-weight: 500;
  font-size: 13px;
}

.item-sku-specs {
  display: flex;
  gap: 4px;
}

.line-item-sub {
  display: flex;
  gap: 12px;
  padding-left: 0;
  font-size: 12px;
  flex-wrap: wrap;
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

.coupon-section {
  background: #FFFCF7;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 16px;
  margin: 16px 0;
}

.section-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: #6F4E37;
  margin-bottom: 12px;
}

.coupon-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coupon-select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #FFF8F0;
  border: 2px solid #EDE0D0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.coupon-select-item:hover {
  border-color: #D2B48C;
}

.coupon-select-item.selected {
  border-color: #C0392B;
  background: #FEF2F2;
}

.coupon-select-item.no-use {
  background: #F9FAFB;
  border-style: dashed;
  color: #6B7280;
}

.coupon-select-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.coupon-select-amount {
  font-size: 22px;
  font-weight: 700;
  color: #C0392B;
  min-width: 70px;
  text-align: center;
}

.coupon-select-amount span {
  font-size: 12px;
}

.coupon-select-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.coupon-select-name {
  font-size: 13px;
  font-weight: 600;
  color: #3E2C1C;
}

.coupon-select-condition {
  font-size: 12px;
  color: #8B7355;
}

.coupon-select-valid {
  font-size: 11px;
  color: #B0A090;
}

.coupon-select-discount {
  font-size: 14px;
  font-weight: 600;
  color: #C0392B;
}

.no-coupon-tip {
  text-align: center;
  padding: 20px;
  color: #B0A090;
  font-size: 13px;
}

.delivery-info {
  padding: 10px 12px;
  background: #ECFDF5;
  border: 1px solid #6EE7B7;
  border-radius: 8px;
  font-size: 13px;
  color: #065F46;
  margin-bottom: 10px;
}

.delivery-date {
  font-weight: 600;
  color: #047857;
}

.roast-count {
  margin-left: 6px;
  font-size: 12px;
  color: #059669;
  background: #D1FAE5;
  padding: 1px 8px;
  border-radius: 10px;
}
</style>
