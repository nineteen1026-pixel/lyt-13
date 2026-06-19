<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🎁 营销活动</h2>
      <div class="header-actions">
        <button class="btn" @click="goToCouponCenter">
          🎫 优惠券中心
        </button>
        <button class="btn btn-primary" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? '取消' : '+ 新建活动' }}
        </button>
      </div>
    </div>

    <div v-if="showCreateForm" class="form-section">
      <h3 class="form-title">创建营销活动</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>活动名称</label>
          <input v-model="form.name" placeholder="例：新客首单立减" />
        </div>
        <div class="form-group">
          <label>活动类型</label>
          <select v-model="form.type">
            <option value="full_reduction">满减</option>
            <option value="new_customer">新客专享</option>
            <option value="presale">预售专享</option>
          </select>
        </div>
        <div class="form-group">
          <label>优惠方式</label>
          <select v-model="form.discountType">
            <option value="fixed">固定金额</option>
            <option value="percentage">折扣比例(%)</option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ form.discountType === 'fixed' ? '优惠金额(¥)' : '折扣比例(%)' }}</label>
          <input type="number" v-model.number="form.discount" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label>最低消费(¥)</label>
          <input type="number" v-model.number="form.minAmount" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label>开始时间</label>
          <input type="datetime-local" v-model="form.startTime" />
        </div>
        <div class="form-group">
          <label>结束时间</label>
          <input type="datetime-local" v-model="form.endTime" />
        </div>
      </div>
      <button class="btn btn-primary" @click="submitPromotion" :disabled="!canSubmit">
        创建活动
      </button>
    </div>

    <div class="promotion-stats">
      <div class="stat-item active">
        <span class="stat-num">{{ activeCount }}</span>
        <span class="stat-label">进行中</span>
      </div>
      <div class="stat-item total">
        <span class="stat-num">{{ promoStore.promotions.length }}</span>
        <span class="stat-label">总活动数</span>
      </div>
      <div class="stat-item redeemed">
        <span class="stat-num">{{ promoStore.redemptions.length }}</span>
        <span class="stat-label">已核销</span>
      </div>
    </div>

    <div class="promotion-list">
      <div v-for="promo in promoStore.promotions" :key="promo.id" class="promotion-item">
        <div class="promo-header">
          <div class="promo-title-section">
            <span class="promo-name">{{ promo.name }}</span>
            <span class="tag" :class="'type-' + promo.type">{{ typeText(promo.type) }}</span>
            <span
              class="tag status-tag"
              :class="isActive(promo) ? 'status-active' : 'status-inactive'"
            >
              {{ isActive(promo) ? '进行中' : isExpired(promo) ? '已结束' : '未开始' }}
            </span>
          </div>
          <div class="promo-actions">
            <button
              class="btn btn-sm"
              @click="toggleStatus(promo)"
              :class="promo.status === 'active' ? 'btn-danger' : ''"
            >
              {{ promo.status === 'active' ? '停用' : '启用' }}
            </button>
            <button class="btn btn-danger btn-sm" @click="handleDelete(promo.id)">删除</button>
          </div>
        </div>

        <div class="promo-details">
          <div class="promo-row">
            <span class="promo-label">优惠方式:</span>
            <span class="promo-value">
              {{ promo.discountType === 'fixed' ? '立减 ¥' + promo.discount.toFixed(2) : promo.discount + '% 折扣' }}
            </span>
          </div>
          <div class="promo-row">
            <span class="promo-label">门槛:</span>
            <span class="promo-value">满 ¥{{ promo.minAmount.toFixed(2) }} 可用</span>
          </div>
          <div class="promo-row">
            <span class="promo-label">有效期:</span>
            <span class="promo-value">
              {{ formatDate(promo.startTime) }} ~ {{ formatDate(promo.endTime) }}
            </span>
          </div>
          <div class="promo-row" v-if="getRedemptionCount(promo.id) > 0">
            <span class="promo-label">已核销:</span>
            <span class="promo-value highlight">
              {{ getRedemptionCount(promo.id) }} 次，共优惠 ¥{{ getTotalDiscount(promo.id).toFixed(2) }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="promoStore.promotions.length === 0" class="empty-state">
        暂无营销活动，点击上方按钮创建第一个活动吧
      </div>
    </div>

    <div v-if="promoStore.redemptions.length > 0" class="redemption-section">
      <h3 class="section-title">📋 核销记录</h3>
      <div class="redemption-list">
        <div v-for="r in recentRedemptions" :key="r.id" class="redemption-item">
          <span class="redeem-order">订单 #{{ r.orderId }}</span>
          <span class="redeem-promo">{{ getPromoName(r.promotionId) }}</span>
          <span class="redeem-discount">-¥{{ r.discountAmount.toFixed(2) }}</span>
          <span class="redeem-time">{{ formatDate(r.redeemedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { usePromotionStore } from '../stores/promotion.js'

const emit = defineEmits(['navigate'])

const promoStore = usePromotionStore()

const showCreateForm = ref(false)
const now = new Date()
const form = reactive({
  name: '',
  type: 'full_reduction',
  discountType: 'fixed',
  discount: 0,
  minAmount: 0,
  startTime: formatLocal(new Date(now.getTime())),
  endTime: formatLocal(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
  status: 'active',
})

function formatLocal(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const activeCount = computed(() => promoStore.activePromotions.length)

const recentRedemptions = computed(() => {
  return [...promoStore.redemptions]
    .sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt))
    .slice(0, 10)
})

const canSubmit = computed(() => {
  return form.name.trim() && form.discount > 0 && form.startTime && form.endTime
})

function typeText(type) {
  const map = {
    full_reduction: '满减',
    new_customer: '新客专享',
    presale: '预售专享',
  }
  return map[type] || type
}

function isActive(promo) {
  if (promo.status !== 'active') return false
  const now = new Date()
  const start = new Date(promo.startTime)
  const end = new Date(promo.endTime)
  return now >= start && now <= end
}

function isExpired(promo) {
  return new Date() > new Date(promo.endTime)
}

function formatDate(isoStr) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString()
}

function getRedemptionCount(promoId) {
  return promoStore.redemptions.filter(r => r.promotionId === promoId).length
}

function getTotalDiscount(promoId) {
  return promoStore.redemptions
    .filter(r => r.promotionId === promoId)
    .reduce((s, r) => s + r.discountAmount, 0)
}

function getPromoName(promoId) {
  const promo = promoStore.promotions.find(p => p.id === promoId)
  return promo?.name || '未知活动'
}

function resetForm() {
  form.name = ''
  form.type = 'full_reduction'
  form.discountType = 'fixed'
  form.discount = 0
  form.minAmount = 0
  form.startTime = formatLocal(new Date())
  form.endTime = formatLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
}

async function submitPromotion() {
  if (!canSubmit.value) return
  try {
    await promoStore.addPromotion({
      name: form.name,
      type: form.type,
      discount: form.discount,
      discountType: form.discountType,
      minAmount: form.minAmount,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      status: 'active',
    })
    alert('活动创建成功！')
    resetForm()
    showCreateForm.value = false
  } catch (e) {
    alert('创建失败: ' + e.message)
  }
}

async function toggleStatus(promo) {
  const newStatus = promo.status === 'active' ? 'inactive' : 'active'
  await promoStore.updatePromotion(promo.id, { status: newStatus })
}

async function handleDelete(id) {
  if (!confirm('确定要删除该活动吗？')) return
  await promoStore.deletePromotion(id)
}

function goToCouponCenter() {
  emit('navigate', 'coupon')
}
</script>

<style scoped>
.form-title {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.promotion-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-item {
  flex: 1;
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: #3E2C1C;
}

.stat-label {
  font-size: 12px;
  color: #8B7355;
}

.stat-item.active .stat-num {
  color: #065F46;
}

.stat-item.redeemed .stat-num {
  color: #8B4513;
}

.promotion-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.promotion-item {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 16px;
}

.promo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}

.promo-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.promo-name {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
}

.type-full_reduction {
  background: #DBEAFE;
  color: #1E40AF;
}

.type-new_customer {
  background: #FCE7F3;
  color: #9D174D;
}

.type-presale {
  background: #F9E0D9;
  color: #C0392B;
}

.status-active {
  background: #D1FAE5;
  color: #065F46;
}

.status-inactive {
  background: #F3F4F6;
  color: #6B7280;
}

.promo-actions {
  display: flex;
  gap: 8px;
}

.promo-details {
  background: #FFF8F0;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.promo-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.promo-label {
  color: #8B7355;
  min-width: 70px;
}

.promo-value {
  color: #3E2C1C;
  font-weight: 500;
}

.promo-value.highlight {
  color: #C0392B;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn {
  padding: 6px 16px;
}

.redemption-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #EDE0D0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 12px;
}

.redemption-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.redemption-item {
  display: grid;
  grid-template-columns: 100px 1fr auto auto;
  gap: 12px;
  padding: 10px 14px;
  background: #FFF8F0;
  border-radius: 8px;
  font-size: 13px;
  align-items: center;
}

@media (max-width: 640px) {
  .redemption-item {
    grid-template-columns: 1fr 1fr;
  }
}

.redeem-order {
  color: #6F4E37;
  font-weight: 500;
}

.redeem-promo {
  color: #3E2C1C;
}

.redeem-discount {
  color: #C0392B;
  font-weight: 600;
}

.redeem-time {
  color: #8B7355;
  font-size: 12px;
}
</style>
