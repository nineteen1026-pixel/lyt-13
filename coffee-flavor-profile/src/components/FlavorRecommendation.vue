<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🧠 风味推荐引擎</h2>
      <div class="mode-switch">
        <button
          :class="['mode-btn', { active: recommendMode === 'personal' }]"
          @click="recommendMode = 'personal'"
        >
          👤 个性化推荐
        </button>
        <button
          :class="['mode-btn', { active: recommendMode === 'similar' }]"
          @click="recommendMode = 'similar'"
        >
          🔍 相似豆种
        </button>
      </div>
    </div>

    <div v-if="!recStore.hasEnoughData" class="empty-state">
      <div class="empty-icon">☕</div>
      <p>请先登记至少 2 款豆种，推荐引擎才能开始工作</p>
    </div>

    <template v-else>
      <div v-if="recommendMode === 'personal'" class="recommend-section">
        <div v-if="!recStore.hasUserPreferences" class="empty-state">
          <div class="empty-icon">📊</div>
          <p>暂无评分数据，先去「评分雷达」为几款豆子评分吧</p>
          <p class="hint-text">评分越多，推荐越精准</p>
        </div>

        <template v-else>
          <div class="user-profile-card">
            <h3>🎯 你的风味偏好画像</h3>
            <div class="profile-content">
              <div class="profile-ratings">
                <div v-for="(dim, idx) in DIMENSIONS" :key="dim" class="profile-dim">
                  <span class="dim-label">{{ dim }}</span>
                  <div class="dim-bar">
                    <div
                      class="dim-fill"
                      :style="{ width: `${(userPreferenceVector[idx] || 5) * 10}%` }"
                    ></div>
                  </div>
                  <span class="dim-value">{{ userPreferenceVector[idx]?.toFixed(1) || '-' }}</span>
                </div>
              </div>
              <div class="profile-tags" v-if="preferredTags.length > 0">
                <h4>偏好风味标签</h4>
                <div class="tag-list">
                  <span v-for="tag in preferredTags" :key="tag" class="preferred-tag">{{ tag }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="recommend-results">
            <h3>✨ 为你推荐</h3>
            <div v-if="personalRecommendations.length === 0" class="empty-state small">
              暂无匹配的豆种，请添加更多评分数据
            </div>
            <div class="bean-recommend-list">
              <div
                v-for="rec in personalRecommendations"
                :key="rec.bean.id"
                class="bean-recommend-card"
                :class="{ 'card-presale': rec.stockStatus === recStore.STOCK_STATUS.PRESALE, 'card-out': rec.stockStatus === recStore.STOCK_STATUS.OUT_OF_STOCK || rec.stockStatus === recStore.STOCK_STATUS.OFF_SHELF }"
                @click="selectBean(rec.bean)"
              >
                <div class="recommend-header">
                  <div>
                    <div class="bean-name">
                      {{ rec.bean.name }}
                      <span v-if="rec.stockStatus === recStore.STOCK_STATUS.PRESALE" class="stock-badge presale">预售</span>
                      <span v-else-if="rec.stockStatus === recStore.STOCK_STATUS.OUT_OF_STOCK" class="stock-badge out">缺货</span>
                      <span v-else-if="rec.stockStatus === recStore.STOCK_STATUS.OFF_SHELF" class="stock-badge off">下架</span>
                      <span v-else class="stock-badge in">有货</span>
                    </div>
                    <div class="bean-meta">
                      <span class="tag">{{ rec.bean.origin }}</span>
                      <span class="tag">{{ rec.bean.process }}</span>
                    </div>
                  </div>
                  <div class="similarity-badge">
                    <span class="similarity-value">{{ rec.similarityPercent }}%</span>
                    <span class="similarity-label">匹配度</span>
                  </div>
                </div>
                <div v-if="rec.bean.flavorTags?.length" class="bean-flavor-tags">
                  <span v-for="tag in rec.bean.flavorTags" :key="tag" class="flavor-tag">{{ tag }}</span>
                </div>
                <div class="match-reasons">
                  <span v-if="rec.matchReasons.ratingMatch" class="reason-tag">📊 风味维度匹配</span>
                  <span v-if="rec.matchReasons.tagMatch" class="reason-tag">🏷️ 风味标签匹配</span>
                </div>
                <div v-if="rec.highlights.roast || rec.highlights.extraction" class="brew-highlights">
                  <div v-if="rec.highlights.roast" class="highlight-item">
                    <span class="highlight-icon">🔥</span>
                    <span class="highlight-label">烘焙:</span>
                    <span class="highlight-value level-tag">{{ rec.highlights.roast.level }}</span>
                  </div>
                  <div v-if="rec.highlights.extraction" class="highlight-item">
                    <span class="highlight-icon">☕</span>
                    <span class="highlight-label">冲煮:</span>
                    <span class="highlight-value method-tag">{{ rec.highlights.extraction.method }}</span>
                    <span class="highlight-params">
                      {{ rec.highlights.extraction.ratio }} · {{ rec.highlights.extraction.temperature }}°C · {{ rec.highlights.extraction.time }}
                    </span>
                  </div>
                </div>
                <div class="card-footer">
                  <div class="price-section">
                    <span v-if="rec.inventory && rec.stockStatus === recStore.STOCK_STATUS.PRESALE" class="price presale-price">
                      ¥{{ rec.inventory.presalePrice.toFixed(2) }}
                      <span class="price-label">预售价</span>
                    </span>
                    <span v-else-if="rec.inventory" class="price normal-price">
                      ¥{{ rec.inventory.price.toFixed(2) }}
                      <span class="price-label" v-if="rec.stockStatus === recStore.STOCK_STATUS.IN_STOCK">售价</span>
                    </span>
                    <span v-if="rec.inventory && rec.stockStatus === recStore.STOCK_STATUS.IN_STOCK" class="stock-info">
                      库存: {{ rec.inventory.availableStock }}
                    </span>
                  </div>
                  <button
                    class="btn-cart"
                    :disabled="rec.stockStatus === recStore.STOCK_STATUS.OUT_OF_STOCK || rec.stockStatus === recStore.STOCK_STATUS.OFF_SHELF"
                    @click.stop="openQuickOrder(rec)"
                  >
                    {{ rec.stockStatus === recStore.STOCK_STATUS.PRESALE ? '🔔 预售下单' : '🛒 立即购买' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-else class="recommend-section">
        <div class="bean-selector">
          <label class="selector-label">选择一款豆种，查找相似风味：</label>
          <select v-model="selectedBeanId" class="bean-select">
            <option value="">请选择豆种</option>
            <option v-for="bean in coffeeStore.beans" :key="bean.id" :value="bean.id">
              {{ bean.name }}
            </option>
          </select>
        </div>

        <div v-if="selectedBeanId && selectedBean" class="selected-bean-info">
          <h4>🔎 目标豆种：{{ selectedBean.name }}</h4>
          <div v-if="selectedBean.flavorTags?.length" class="bean-flavor-tags">
            <span v-for="tag in selectedBean.flavorTags" :key="tag" class="flavor-tag">{{ tag }}</span>
          </div>
        </div>

        <div v-if="selectedBeanId" class="recommend-results">
          <h3>🔗 相似豆种</h3>
          <div v-if="similarRecommendations.length === 0" class="empty-state small">
            暂无足够相似的豆种，请添加更多评分或风味标签
          </div>
          <div class="bean-recommend-list">
            <div
              v-for="rec in similarRecommendations"
              :key="rec.bean.id"
              class="bean-recommend-card"
              :class="{ 'card-presale': rec.stockStatus === recStore.STOCK_STATUS.PRESALE, 'card-out': rec.stockStatus === recStore.STOCK_STATUS.OUT_OF_STOCK || rec.stockStatus === recStore.STOCK_STATUS.OFF_SHELF }"
              @click="selectBean(rec.bean)"
            >
              <div class="recommend-header">
                <div>
                  <div class="bean-name">
                    {{ rec.bean.name }}
                    <span v-if="rec.stockStatus === recStore.STOCK_STATUS.PRESALE" class="stock-badge presale">预售</span>
                    <span v-else-if="rec.stockStatus === recStore.STOCK_STATUS.OUT_OF_STOCK" class="stock-badge out">缺货</span>
                    <span v-else-if="rec.stockStatus === recStore.STOCK_STATUS.OFF_SHELF" class="stock-badge off">下架</span>
                    <span v-else class="stock-badge in">有货</span>
                  </div>
                  <div class="bean-meta">
                    <span class="tag">{{ rec.bean.origin }}</span>
                    <span class="tag">{{ rec.bean.process }}</span>
                  </div>
                </div>
                <div class="similarity-badge">
                  <span class="similarity-value">{{ rec.similarityPercent }}%</span>
                  <span class="similarity-label">相似度</span>
                </div>
              </div>
              <div v-if="rec.bean.flavorTags?.length" class="bean-flavor-tags">
                <span v-for="tag in rec.bean.flavorTags" :key="tag" class="flavor-tag">{{ tag }}</span>
              </div>
              <div v-if="rec.highlights.roast || rec.highlights.extraction" class="brew-highlights">
                <div v-if="rec.highlights.roast" class="highlight-item">
                  <span class="highlight-icon">🔥</span>
                  <span class="highlight-label">烘焙:</span>
                  <span class="highlight-value level-tag">{{ rec.highlights.roast.level }}</span>
                </div>
                <div v-if="rec.highlights.extraction" class="highlight-item">
                  <span class="highlight-icon">☕</span>
                  <span class="highlight-label">冲煮:</span>
                  <span class="highlight-value method-tag">{{ rec.highlights.extraction.method }}</span>
                  <span class="highlight-params">
                    {{ rec.highlights.extraction.ratio }} · {{ rec.highlights.extraction.temperature }}°C · {{ rec.highlights.extraction.time }}
                  </span>
                </div>
              </div>
              <div class="card-footer">
                <div class="price-section">
                  <span v-if="rec.inventory && rec.stockStatus === recStore.STOCK_STATUS.PRESALE" class="price presale-price">
                    ¥{{ rec.inventory.presalePrice.toFixed(2) }}
                    <span class="price-label">预售价</span>
                  </span>
                  <span v-else-if="rec.inventory" class="price normal-price">
                    ¥{{ rec.inventory.price.toFixed(2) }}
                    <span class="price-label" v-if="rec.stockStatus === recStore.STOCK_STATUS.IN_STOCK">售价</span>
                  </span>
                  <span v-if="rec.inventory && rec.stockStatus === recStore.STOCK_STATUS.IN_STOCK" class="stock-info">
                    库存: {{ rec.inventory.availableStock }}
                  </span>
                </div>
                <button
                  class="btn-cart"
                  :disabled="rec.stockStatus === recStore.STOCK_STATUS.OUT_OF_STOCK || rec.stockStatus === recStore.STOCK_STATUS.OFF_SHELF"
                  @click.stop="openQuickOrder(rec)"
                >
                  {{ rec.stockStatus === recStore.STOCK_STATUS.PRESALE ? '🔔 预售下单' : '🛒 立即购买' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showQuickOrder" class="quick-order-modal" @click.self="showQuickOrder = false">
        <div class="quick-order-panel">
          <div class="quick-order-header">
            <h3>🛒 快速下单</h3>
            <button class="btn-close" @click="showQuickOrder = false">×</button>
          </div>

          <div v-if="quickOrderData.bean" class="quick-order-content">
            <div class="order-bean-info">
              <div class="order-bean-name">{{ quickOrderData.bean.name }}</div>
              <div class="order-bean-meta">
                <span class="tag">{{ quickOrderData.bean.origin }}</span>
                <span class="tag">{{ quickOrderData.bean.process }}</span>
                <span
                  class="tag stock-tag"
                  :class="{
                    'tag-in': quickOrderData.stockStatus === recStore.STOCK_STATUS.IN_STOCK,
                    'tag-presale': quickOrderData.stockStatus === recStore.STOCK_STATUS.PRESALE,
                    'tag-out': quickOrderData.stockStatus === recStore.STOCK_STATUS.OUT_OF_STOCK,
                  }"
                >
                  {{ quickOrderData.stockStatus === recStore.STOCK_STATUS.IN_STOCK ? '有货' : quickOrderData.stockStatus === recStore.STOCK_STATUS.PRESALE ? '预售' : '缺货' }}
                </span>
              </div>
              <div v-if="quickOrderData.bean.flavorTags?.length" class="bean-flavor-tags">
                <span v-for="tag in quickOrderData.bean.flavorTags" :key="tag" class="flavor-tag">{{ tag }}</span>
              </div>
            </div>

            <div class="order-price-section">
              <div v-if="quickOrderData.stockStatus === recStore.STOCK_STATUS.PRESALE" class="price-row">
                <span>预售价:</span>
                <span class="price-value presale">¥{{ quickOrderData.inventory?.presalePrice?.toFixed(2) }}</span>
              </div>
              <div class="price-row">
                <span>售价:</span>
                <span class="price-value">¥{{ quickOrderData.inventory?.price?.toFixed(2) }}</span>
              </div>
              <div v-if="quickOrderData.stockStatus === recStore.STOCK_STATUS.PRESALE" class="price-row">
                <span>定金:</span>
                <span class="price-value">¥{{ quickOrderData.inventory?.deposit?.toFixed(2) }}</span>
              </div>
              <div v-if="quickOrderData.stockStatus === recStore.STOCK_STATUS.IN_STOCK" class="price-row">
                <span>可用库存:</span>
                <span class="stock-value">{{ quickOrderData.inventory?.availableStock }}</span>
              </div>
            </div>

            <div class="order-quantity-section">
              <label>购买数量:</label>
              <div class="quantity-control">
                <button class="qty-btn" @click="decreaseQty">-</button>
                <input
                  type="number"
                  v-model.number="orderForm.quantity"
                  min="1"
                  :max="quickOrderData.inventory?.availableStock || 999"
                  class="qty-input"
                />
                <button class="qty-btn" @click="increaseQty">+</button>
              </div>
            </div>

            <div class="order-customer-section">
              <div class="form-group">
                <label>客户姓名</label>
                <input v-model="orderForm.customerName" placeholder="请输入客户姓名" />
              </div>
              <div class="form-group">
                <label>联系电话</label>
                <input v-model="orderForm.customerPhone" placeholder="请输入联系电话" />
              </div>
            </div>

            <div class="order-summary">
              <div class="summary-row">
                <span>商品金额:</span>
                <span>¥{{ orderSummary.subtotal.toFixed(2) }}</span>
              </div>
              <div v-if="quickOrderData.stockStatus === recStore.STOCK_STATUS.PRESALE" class="summary-row">
                <span>定金:</span>
                <span>¥{{ orderSummary.deposit.toFixed(2) }}</span>
              </div>
              <div class="summary-row total">
                <span>应付金额:</span>
                <span>¥{{ orderSummary.total.toFixed(2) }}</span>
              </div>
            </div>

            <button
              class="btn btn-primary btn-submit-order"
              :disabled="!canSubmitOrder"
              @click="submitQuickOrder"
            >
              {{ quickOrderData.stockStatus === recStore.STOCK_STATUS.PRESALE ? '提交预售订单' : '提交订单' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="detailBean" class="detail-panel">
        <div class="detail-header">
          <h3>📋 {{ detailBean.name }} - 酿造建议</h3>
          <button class="btn btn-danger btn-sm" @click="detailBean = null">关闭</button>
        </div>

        <div class="detail-tabs">
          <button
            :class="['detail-tab', { active: detailTab === 'roast' }]"
            @click="detailTab = 'roast'"
          >
            🔥 烘焙建议
          </button>
          <button
            :class="['detail-tab', { active: detailTab === 'extraction' }]"
            @click="detailTab = 'extraction'"
          >
            ☕ 萃取建议
          </button>
        </div>

        <div v-if="detailTab === 'roast'" class="detail-content">
          <div v-if="roastRecommendations.length > 0" class="recommend-list">
            <div
              v-for="(rec, idx) in roastRecommendations"
              :key="rec.level"
              class="recommend-item"
            >
              <div class="recommend-rank">#{{ idx + 1 }}</div>
              <div class="recommend-main">
                <div class="recommend-title">
                  <span class="level-tag large">{{ rec.level }}</span>
                  <span v-if="idx === 0" class="top-pick-badge">✨ 首推</span>
                  <span class="confidence-badge">{{ rec.confidence }}% 置信度</span>
                </div>
                <div class="recommend-reason">{{ rec.reason }}</div>
                <div class="roast-tips">
                  <span v-if="rec.level.includes('浅')">💡 建议出锅温度 190-198°C，时长 8-10 分钟</span>
                  <span v-else-if="rec.level.includes('中') && !rec.level.includes('深')">💡 建议出锅温度 200-212°C，时长 10-12 分钟</span>
                  <span v-else-if="rec.level.includes('深')">💡 建议出锅温度 215-230°C，时长 12-15 分钟</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="detailTab === 'extraction'" class="detail-content">
          <div class="roast-filter">
            <label>选择烘焙度：</label>
            <select v-model="selectedRoastForExtraction" class="roast-select">
              <option value="">不指定</option>
              <option>极浅烘焙</option>
              <option>浅烘焙</option>
              <option>中浅烘焙</option>
              <option>中烘焙</option>
              <option>中深烘焙</option>
              <option>深烘焙</option>
              <option>极深烘焙</option>
            </select>
          </div>
          <div v-if="extractionRecommendations.length > 0" class="recommend-list">
            <div
              v-for="(rec, idx) in extractionRecommendations"
              :key="rec.method"
              class="recommend-item"
            >
              <div class="recommend-rank">#{{ idx + 1 }}</div>
              <div class="recommend-main">
                <div class="recommend-title">
                  <span class="method-tag large">{{ rec.method }}</span>
                  <span v-if="idx === 0" class="top-pick-badge">✨ 首推</span>
                  <span class="confidence-badge">{{ rec.confidence }}% 置信度</span>
                </div>
                <div class="extraction-params">
                  <div class="param-item">
                    <span class="param-label">粉水比</span>
                    <span class="param-value">{{ rec.ratio }}</span>
                  </div>
                  <div class="param-item">
                    <span class="param-label">水温</span>
                    <span class="param-value">{{ rec.temperature }}°C</span>
                  </div>
                  <div class="param-item">
                    <span class="param-label">时间</span>
                    <span class="param-value">{{ rec.time }}</span>
                  </div>
                </div>
                <div class="recommend-reason">{{ rec.reason }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useCoffeeStore } from '../stores/coffee.js'
import { useRecommendationStore } from '../stores/recommendation.js'
import { useOrderStore, ORDER_TYPE } from '../stores/order.js'

const DIMENSIONS = ['酸度', '甜度', '醇厚度', '余韵', '平衡']

const coffeeStore = useCoffeeStore()
const recStore = useRecommendationStore()
const orderStore = useOrderStore()

const recommendMode = ref('personal')
const selectedBeanId = ref('')
const detailBean = ref(null)
const detailTab = ref('roast')
const selectedRoastForExtraction = ref('')

const showQuickOrder = ref(false)
const quickOrderData = ref({
  bean: null,
  inventory: null,
  stockStatus: null,
})
const orderForm = reactive({
  quantity: 1,
  customerName: '',
  customerPhone: '',
})

const userPreferenceVector = computed(() => recStore.getUserPreferenceVector() || [5, 5, 5, 5, 5])
const preferredTags = computed(() => recStore.getUserPreferredFlavorTags())

const personalRecommendations = computed(() => {
  if (!recStore.hasUserPreferences) return []
  const recs = recStore.recommendByUserPreference(5)
  return recs.map(rec => ({
    ...rec,
    highlights: recStore.getBeanRecommendHighlights(rec.bean.id),
  }))
})

const selectedBean = computed(() => {
  if (!selectedBeanId.value) return null
  return coffeeStore.beans.find(b => b.id === Number(selectedBeanId.value))
})

const similarRecommendations = computed(() => {
  if (!selectedBeanId.value) return []
  const recs = recStore.recommendBySimilarBean(Number(selectedBeanId.value), 5)
  return recs.map(rec => ({
    ...rec,
    highlights: recStore.getBeanRecommendHighlights(rec.bean.id),
  }))
})

const roastRecommendations = computed(() => {
  if (!detailBean.value) return []
  return recStore.recommendRoastLevel(detailBean.value.id)
})

const extractionRecommendations = computed(() => {
  if (!detailBean.value) return []
  return recStore.recommendExtractionParams(
    detailBean.value.id,
    selectedRoastForExtraction.value || null
  )
})

function selectBean(bean) {
  detailBean.value = bean
  const roastRecs = recStore.recommendRoastLevel(bean.id)
  selectedRoastForExtraction.value = roastRecs[0]?.level || ''
  detailTab.value = 'roast'
}

const orderSummary = computed(() => {
  const inv = quickOrderData.value.inventory
  const qty = orderForm.quantity || 0
  if (!inv || qty <= 0) {
    return { subtotal: 0, deposit: 0, total: 0 }
  }
  const isPresale = quickOrderData.value.stockStatus === recStore.STOCK_STATUS.PRESALE
  const unitPrice = isPresale ? inv.presalePrice : inv.price
  const subtotal = +(unitPrice * qty).toFixed(2)
  const deposit = isPresale ? +(inv.deposit * qty).toFixed(2) : subtotal
  return { subtotal, deposit, total: subtotal }
})

const canSubmitOrder = computed(() => {
  return (
    orderForm.quantity > 0 &&
    orderForm.customerName.trim() &&
    orderForm.customerPhone.trim() &&
    quickOrderData.value.bean
  )
})

function openQuickOrder(rec) {
  quickOrderData.value = {
    bean: rec.bean,
    inventory: rec.inventory,
    stockStatus: rec.stockStatus,
  }
  orderForm.quantity = 1
  orderForm.customerName = ''
  orderForm.customerPhone = ''
  showQuickOrder.value = true
}

function increaseQty() {
  const maxStock = quickOrderData.value.inventory?.availableStock || 999
  if (orderForm.quantity < maxStock) {
    orderForm.quantity++
  }
}

function decreaseQty() {
  if (orderForm.quantity > 1) {
    orderForm.quantity--
  }
}

async function submitQuickOrder() {
  if (!canSubmitOrder.value) return

  const isPresale = quickOrderData.value.stockStatus === recStore.STOCK_STATUS.PRESALE
  const orderType = isPresale ? ORDER_TYPE.PRESALE : ORDER_TYPE.NORMAL

  try {
    const order = await orderStore.createOrder({
      type: orderType,
      items: [
        {
          beanId: quickOrderData.value.bean.id,
          quantity: orderForm.quantity,
        },
      ],
      customerName: orderForm.customerName.trim(),
      customerPhone: orderForm.customerPhone.trim(),
    })
    alert(`订单创建成功！\n订单号: ${order.orderNo}\n应付金额: ¥${order.payAmount.toFixed(2)}${isPresale ? `\n定金: ¥${order.depositAmount.toFixed(2)}` : ''}`)
    showQuickOrder.value = false
  } catch (e) {
    alert('创建订单失败: ' + e.message)
  }
}
</script>

<style scoped>
.mode-switch {
  display: flex;
  gap: 8px;
}
.mode-btn {
  padding: 6px 14px;
  border: 1.5px solid #D2B48C;
  background: #FFF8F0;
  color: #6F4E37;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.mode-btn.active {
  background: #6F4E37;
  color: #FFF8F0;
  border-color: #6F4E37;
}
.recommend-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.empty-state.small {
  padding: 24px;
  font-size: 13px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.hint-text {
  font-size: 12px;
  color: #A08968;
  margin-top: 4px;
}
.user-profile-card {
  background: linear-gradient(135deg, #FFF8F0, #FFEAD0);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #E0D0B8;
}
.user-profile-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 16px;
}
.profile-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
@media (max-width: 640px) {
  .profile-content {
    grid-template-columns: 1fr;
  }
}
.profile-ratings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.profile-dim {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dim-label {
  font-size: 13px;
  color: #6F4E37;
  font-weight: 500;
  width: 56px;
  flex-shrink: 0;
}
.dim-bar {
  flex: 1;
  height: 8px;
  background: #E8D5B7;
  border-radius: 4px;
  overflow: hidden;
}
.dim-fill {
  height: 100%;
  background: linear-gradient(90deg, #C4A882, #6F4E37);
  border-radius: 4px;
  transition: width 0.3s;
}
.dim-value {
  font-size: 13px;
  font-weight: 600;
  color: #3E2C1C;
  width: 32px;
  text-align: right;
}
.profile-tags h4 {
  font-size: 13px;
  font-weight: 600;
  color: #6F4E37;
  margin-bottom: 8px;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.preferred-tag {
  padding: 3px 12px;
  background: #6F4E37;
  color: #FFF8F0;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.recommend-results h3 {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 14px;
}
.bean-selector {
  background: #FFF8F0;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #E0D0B8;
}
.selector-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
  margin-bottom: 8px;
}
.bean-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #D2B48C;
  border-radius: 8px;
  font-size: 14px;
  background: #FFFCF7;
  color: #3E2C1C;
  outline: none;
}
.selected-bean-info {
  background: #FFF0E0;
  border-radius: 10px;
  padding: 12px 16px;
}
.selected-bean-info h4 {
  font-size: 14px;
  font-weight: 600;
  color: #6F4E37;
  margin-bottom: 8px;
}
.bean-recommend-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bean-recommend-card {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.bean-recommend-card:hover {
  box-shadow: 0 4px 12px rgba(62, 44, 28, 0.12);
  border-color: #D2B48C;
  transform: translateY(-1px);
}
.recommend-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.bean-name {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 4px;
}
.bean-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tag {
  display: inline-block;
  padding: 2px 10px;
  background: #F0E0D0;
  color: #6F4E37;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.similarity-badge {
  text-align: center;
  background: linear-gradient(135deg, #6F4E37, #8B6914);
  color: #FFF8F0;
  padding: 6px 12px;
  border-radius: 10px;
  min-width: 64px;
}
.similarity-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}
.similarity-label {
  font-size: 10px;
  opacity: 0.85;
}
.bean-flavor-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.flavor-tag {
  padding: 2px 8px;
  background: linear-gradient(135deg, #FFF0E0, #FFE0C0);
  color: #8B4513;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}
.match-reasons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.reason-tag {
  padding: 2px 8px;
  background: #E8F0E8;
  color: #3E6B3E;
  border-radius: 8px;
  font-size: 11px;
}
.detail-panel {
  margin-top: 20px;
  background: #FFFDF9;
  border: 2px solid #D2B48C;
  border-radius: 14px;
  padding: 20px;
  animation: slideIn 0.3s ease;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.detail-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
}
.detail-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.detail-tab {
  padding: 8px 18px;
  border: 1.5px solid #E0D0B8;
  background: #FFF8F0;
  color: #8B7355;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.detail-tab.active {
  background: #6F4E37;
  color: #FFF8F0;
  border-color: #6F4E37;
}
.detail-content {
  min-height: 200px;
}
.roast-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #FFF8F0;
  border-radius: 8px;
}
.roast-filter label {
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
}
.roast-select {
  padding: 6px 12px;
  border: 1px solid #D2B48C;
  border-radius: 6px;
  font-size: 13px;
  background: #FFFCF7;
  color: #3E2C1C;
  outline: none;
}
.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.recommend-item {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
}
.recommend-rank {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #C4A882, #6F4E37);
  color: #FFF8F0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}
.recommend-main {
  flex: 1;
}
.recommend-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.level-tag,
.method-tag {
  padding: 4px 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
}
.level-tag {
  background: #FFE0B2;
  color: #8B4513;
}
.level-tag.large {
  font-size: 15px;
  padding: 5px 18px;
}
.method-tag {
  background: #C8E6C9;
  color: #2E5A2E;
}
.method-tag.large {
  font-size: 15px;
  padding: 5px 18px;
}
.confidence-badge {
  padding: 3px 10px;
  background: #E8F0E8;
  color: #3E6B3E;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.top-pick-badge {
  padding: 3px 10px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #5A3E00;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.recommend-reason {
  font-size: 13px;
  color: #6F4E37;
  margin-bottom: 8px;
}
.roast-tips {
  font-size: 12px;
  color: #A08968;
  font-style: italic;
}
.extraction-params {
  display: flex;
  gap: 20px;
  margin: 10px 0;
  padding: 10px 14px;
  background: #FFFCF7;
  border-radius: 8px;
  border: 1px solid #E8D5B7;
}
.param-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.param-label {
  font-size: 11px;
  color: #8B7355;
}
.param-value {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
}
.brew-highlights {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #E8D5B7;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.highlight-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
}
.highlight-icon {
  font-size: 13px;
}
.highlight-label {
  color: #8B7355;
  font-weight: 500;
}
.highlight-value {
  padding: 2px 10px;
  font-size: 11px;
}
.highlight-value.level-tag {
  background: #FFE8CC;
  color: #A0522D;
}
.highlight-value.method-tag {
  background: #D4E6D4;
  color: #2E5A2E;
}
.highlight-params {
  color: #6F4E37;
  font-weight: 500;
  margin-left: 4px;
}

.stock-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 8px;
  vertical-align: middle;
}

.stock-badge.in {
  background: #D1FAE5;
  color: #065F46;
}

.stock-badge.presale {
  background: #FEE2E2;
  color: #991B1B;
}

.stock-badge.out {
  background: #F3F4F6;
  color: #6B7280;
}

.stock-badge.off {
  background: #F3F4F6;
  color: #6B7280;
}

.bean-recommend-card.card-presale {
  border-color: #FCA5A5;
  background: #FEF2F2;
}

.bean-recommend-card.card-out {
  opacity: 0.6;
}

.card-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #E8D5B7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.price-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.price {
  font-weight: 700;
  color: #3E2C1C;
  font-size: 16px;
}

.price .price-label {
  font-size: 11px;
  font-weight: 400;
  color: #8B7355;
  margin-left: 4px;
}

.price.presale-price {
  color: #C0392B;
}

.stock-info {
  font-size: 11px;
  color: #065F46;
  background: #D1FAE5;
  padding: 1px 6px;
  border-radius: 8px;
  display: inline-block;
  margin-top: 2px;
  width: fit-content;
}

.btn-cart {
  padding: 6px 14px;
  background: linear-gradient(135deg, #6F4E37, #8B6914);
  color: #FFF8F0;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-cart:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(62, 44, 28, 0.25);
}

.btn-cart:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quick-order-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.quick-order-panel {
  background: #FFFDF9;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.quick-order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid #EDE0D0;
  position: sticky;
  top: 0;
  background: #FFFDF9;
  z-index: 1;
  border-radius: 16px 16px 0 0;
}

.quick-order-header h3 {
  font-size: 17px;
  font-weight: 600;
  color: #3E2C1C;
  margin: 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #F0E0D0;
  color: #6F4E37;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #E0D0B8;
}

.quick-order-content {
  padding: 20px;
}

.order-bean-info {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #E8D5B7;
}

.order-bean-name {
  font-size: 18px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 6px;
}

.order-bean-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.stock-tag.tag-in {
  background: #D1FAE5;
  color: #065F46;
}

.stock-tag.tag-presale {
  background: #FEE2E2;
  color: #991B1B;
}

.stock-tag.tag-out {
  background: #F3F4F6;
  color: #6B7280;
}

.order-price-section {
  background: #FFF8F0;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 16px;
}

.order-price-section .price-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
  color: #6F4E37;
}

.order-price-section .price-value {
  font-weight: 600;
  color: #3E2C1C;
}

.order-price-section .price-value.presale {
  color: #C0392B;
}

.order-price-section .stock-value {
  font-weight: 600;
  color: #065F46;
}

.order-quantity-section {
  margin-bottom: 16px;
}

.order-quantity-section label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
  margin-bottom: 8px;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.qty-btn {
  width: 36px;
  height: 36px;
  border: 1.5px solid #D2B48C;
  background: #FFFDF9;
  color: #6F4E37;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.qty-btn:hover {
  background: #F0E0D0;
}

.qty-input {
  width: 80px;
  text-align: center;
  padding: 8px 10px;
  border: 1.5px solid #D2B48C;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
  background: #FFFCF7;
}

.order-customer-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.order-customer-section .form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.order-customer-section label {
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
}

.order-customer-section input {
  padding: 10px 12px;
  border: 1.5px solid #D2B48C;
  border-radius: 8px;
  font-size: 14px;
  background: #FFFCF7;
  color: #3E2C1C;
  outline: none;
  transition: border-color 0.2s;
}

.order-customer-section input:focus {
  border-color: #6F4E37;
}

.order-summary {
  background: #FFF8F0;
  border: 1px solid #E8D5B7;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 16px;
}

.order-summary .summary-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
  color: #6F4E37;
}

.order-summary .summary-row.total {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  border-top: 1px dashed #E8D5B7;
  margin-top: 6px;
  padding-top: 10px;
}

.btn-submit-order {
  width: 100%;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #6F4E37, #8B6914);
  color: #FFF8F0;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit-order:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(62, 44, 28, 0.25);
}

.btn-submit-order:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
