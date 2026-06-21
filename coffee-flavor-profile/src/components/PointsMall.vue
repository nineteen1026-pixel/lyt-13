<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🎁 积分商城</h2>
      <div class="header-actions">
        <button v-if="activeTab === 'mall'" class="btn" @click="activeTab = 'admin'">
          ⚙️ 管理后台
        </button>
        <button v-else class="btn btn-primary" @click="activeTab = 'mall'">
          返回商城
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'mall'" class="mall-container">
      <div class="member-card">
        <div class="member-info">
          <div class="member-avatar">👤</div>
          <div class="member-details">
            <div class="member-name">{{ currentMember?.name || '游客' }}</div>
            <div class="member-phone">{{ currentMember?.phone || '请登录' }}</div>
          </div>
        </div>
        <div class="points-display">
          <div class="points-label">可用积分</div>
          <div class="points-value">{{ currentMember?.points || 0 }}</div>
        </div>
        <div class="member-actions">
          <button class="btn btn-sm" @click="showMemberSelect = true">切换会员</button>
          <button class="btn btn-sm btn-primary" @click="showPointsLog = true">积分明细</button>
        </div>
      </div>

      <div class="section-header">
        <h3>热门兑换</h3>
        <div class="filter-tabs">
          <button :class="['filter-btn', { active: productFilter === 'all' }]" @click="productFilter = 'all'">
            全部
          </button>
          <button :class="['filter-btn', { active: productFilter === 'bean' }]" @click="productFilter = 'bean'">
            豆种
          </button>
          <button :class="['filter-btn', { active: productFilter === 'coupon' }]" @click="productFilter = 'coupon'">
            优惠券
          </button>
        </div>
      </div>

      <div class="product-grid">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="product-card"
          :class="{ disabled: product.stock <= 0 || !canAfford(product) }"
        >
          <div class="product-icon">
            <span v-if="product.type === 'bean'">🫘</span>
            <span v-else>🎫</span>
          </div>
          <div class="product-info">
            <div class="product-name">{{ product.name }}</div>
            <div class="product-desc">{{ getProductDesc(product) }}</div>
            <div class="product-stock">库存: {{ product.stock }}</div>
          </div>
          <div class="product-footer">
            <div class="points-badge">
              <span class="points-num">{{ product.points }}</span>
              <span class="points-unit">积分</span>
            </div>
            <button
              class="btn btn-primary btn-sm"
              :disabled="product.stock <= 0 || !canAfford(product)"
              @click="openRedeem(product)"
            >
              {{ product.stock <= 0 ? '已售罄' : '立即兑换' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredProducts.length === 0" class="empty-state">暂无兑换商品</div>

      <div class="section-header" style="margin-top: 24px;">
        <h3>我的兑换订单</h3>
        <span class="order-count">共 {{ memberOrders.length }} 笔订单</span>
      </div>

      <div class="order-list">
        <div v-for="order in memberOrders" :key="order.id" class="order-card">
          <div class="order-header">
            <div class="order-no">订单号: {{ order.orderNo }}</div>
            <span class="tag order-status" :class="'status-' + order.status">
              {{ getOrderStatusText(order.status) }}
            </span>
          </div>
          <div class="order-body">
            <div class="order-product">
              <span class="product-icon-sm">
                <span v-if="order.productType === 'bean'">🫘</span>
                <span v-else>🎫</span>
              </span>
              <div class="order-info">
                <div class="order-product-name">{{ order.productName }}</div>
                <div class="order-meta">数量: {{ order.quantity }} · 消耗: {{ order.points }} 积分</div>
              </div>
            </div>
            <div v-if="order.status === 'pending'" class="order-verify">
              <div class="verify-code">核销码: <strong>{{ order.verifyCode }}</strong></div>
            </div>
          </div>
          <div class="order-footer">
            <span class="order-time">{{ new Date(order.createdAt).toLocaleString() }}</span>
            <div class="order-actions">
              <button
                v-if="order.status === 'pending'"
                class="btn btn-danger btn-sm"
                @click="handleCancelOrder(order)"
              >
                取消兑换
              </button>
            </div>
          </div>
        </div>

        <div v-if="memberOrders.length === 0" class="empty-state">暂无兑换记录，快去兑换心仪的商品吧</div>
      </div>
    </div>

    <div v-else-if="activeTab === 'admin'" class="admin-container">
      <div class="admin-stats">
        <div class="stat-item">
          <span class="stat-num">{{ pointsStore.pointProducts.length }}</span>
          <span class="stat-label">商品总数</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ activeProductCount }}</span>
          <span class="stat-label">在售商品</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ pointsStore.pointOrders.length }}</span>
          <span class="stat-label">兑换订单</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ verifiedOrderCount }}</span>
          <span class="stat-label">已核销</span>
        </div>
      </div>

      <div class="admin-tabs">
        <button :class="['admin-tab', { active: adminTab === 'products' }]" @click="adminTab = 'products'">
          商品管理
        </button>
        <button :class="['admin-tab', { active: adminTab === 'orders' }]" @click="adminTab = 'orders'">
          订单管理
        </button>
        <button :class="['admin-tab', { active: adminTab === 'members' }]" @click="adminTab = 'members'">
          会员管理
        </button>
      </div>

      <div v-if="adminTab === 'products'" class="admin-products">
        <div class="admin-header">
          <h4>积分商品列表</h4>
          <button class="btn btn-primary btn-sm" @click="showAddProduct = true">+ 添加商品</button>
        </div>

        <div class="product-admin-list">
          <div
            v-for="product in pointsStore.productsWithDetails"
            :key="product.id"
            class="product-admin-item"
          >
            <div class="product-admin-info">
              <div class="product-admin-name">
                <span class="product-icon-sm">
                  <span v-if="product.type === 'bean'">🫘</span>
                  <span v-else>🎫</span>
                </span>
                {{ product.name }}
              </div>
              <div class="product-admin-meta">
                <span class="tag">{{ product.type === 'bean' ? '豆种' : '优惠券' }}</span>
                <span>{{ product.points }} 积分</span>
                <span>库存: {{ product.stock }}</span>
                <span class="tag" :class="product.status === 'active' ? 'status-active' : 'status-inactive'">
                  {{ product.status === 'active' ? '上架中' : '已下架' }}
                </span>
              </div>
            </div>
            <div class="product-admin-actions">
              <button class="btn btn-sm" @click="toggleProductStatus(product)">
                {{ product.status === 'active' ? '下架' : '上架' }}
              </button>
              <button class="btn btn-sm" @click="editProduct(product)">编辑</button>
              <button class="btn btn-danger btn-sm" @click="deleteProduct(product.id)">删除</button>
            </div>
          </div>

          <div v-if="pointsStore.pointProducts.length === 0" class="empty-state">暂无商品，点击上方按钮添加</div>
        </div>
      </div>

      <div v-if="adminTab === 'orders'" class="admin-orders">
        <div class="admin-header">
          <h4>兑换订单列表</h4>
          <div class="verify-input">
            <input v-model="verifyCodeInput" placeholder="输入核销码快速核销" />
            <button class="btn btn-primary btn-sm" @click="quickVerify">核销</button>
          </div>
        </div>

        <div class="order-admin-list">
          <div v-for="order in pointsStore.pointOrders" :key="order.id" class="order-admin-item">
            <div class="order-admin-info">
              <div class="order-admin-no">
                {{ order.orderNo }}
                <span class="tag" :class="'status-' + order.status">
                  {{ getOrderStatusText(order.status) }}
                </span>
              </div>
              <div class="order-admin-meta">
                <span>{{ order.memberName }} ({{ order.memberPhone }})</span>
                <span>{{ order.productName }}</span>
                <span>{{ order.points }} 积分</span>
                <span>核销码: {{ order.verifyCode }}</span>
              </div>
            </div>
            <div class="order-admin-actions">
              <button
                v-if="order.status === 'pending'"
                class="btn btn-primary btn-sm"
                @click="handleVerifyOrder(order)"
              >
                核销
              </button>
            </div>
          </div>

          <div v-if="pointsStore.pointOrders.length === 0" class="empty-state">暂无兑换订单</div>
        </div>
      </div>

      <div v-if="adminTab === 'members'" class="admin-members">
        <div class="admin-header">
          <h4>会员列表</h4>
          <button class="btn btn-primary btn-sm" @click="showAddMember = true">+ 添加会员</button>
        </div>

        <div class="member-admin-list">
          <div v-for="member in pointsStore.members" :key="member.id" class="member-admin-item">
            <div class="member-admin-info">
              <div class="member-admin-name">{{ member.name }}</div>
              <div class="member-admin-meta">
                <span>{{ member.phone }}</span>
                <span class="points-highlight">{{ member.points }} 积分</span>
              </div>
            </div>
            <div class="member-admin-actions">
              <button class="btn btn-sm" @click="openAddPoints(member)">调整积分</button>
            </div>
          </div>

          <div v-if="pointsStore.members.length === 0" class="empty-state">暂无会员</div>
        </div>
      </div>
    </div>

    <div v-if="showMemberSelect" class="modal-overlay" @click.self="showMemberSelect = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>选择会员</h3>
          <button class="close-btn" @click="showMemberSelect = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>手机号</label>
            <input v-model="searchPhone" placeholder="输入手机号查询" />
          </div>
          <div class="member-select-list">
            <div
              v-for="member in pointsStore.members"
              :key="member.id"
              class="member-select-item"
              :class="{ active: currentMember?.id === member.id }"
              @click="selectMember(member)"
            >
              <div class="member-select-info">
                <div class="member-select-name">{{ member.name }}</div>
                <div class="member-select-phone">{{ member.phone }}</div>
              </div>
              <div class="member-select-points">{{ member.points }} 积分</div>
            </div>
          </div>
          <div class="add-member-section">
            <button class="btn btn-sm" @click="showAddMember = true; showMemberSelect = false">
              + 添加新会员
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPointsLog" class="modal-overlay" @click.self="showPointsLog = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>积分明细</h3>
          <button class="close-btn" @click="showPointsLog = false">×</button>
        </div>
        <div class="modal-body">
          <div class="points-log-summary">
            <div>当前积分: <strong>{{ currentMember?.points || 0 }}</strong></div>
          </div>
          <div class="points-log-list">
            <div v-for="log in memberPointsLog" :key="log.id" class="points-log-item">
              <div class="log-info">
                <div class="log-reason">{{ log.reason || '积分变动' }}</div>
                <div class="log-time">{{ new Date(log.createdAt).toLocaleString() }}</div>
              </div>
              <div class="log-points" :class="{ positive: log.points > 0, negative: log.points < 0 }">
                {{ log.points > 0 ? '+' : '' }}{{ log.points }}
              </div>
            </div>
            <div v-if="memberPointsLog.length === 0" class="empty-state">暂无积分记录</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showRedeem" class="modal-overlay" @click.self="showRedeem = false">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>确认兑换</h3>
          <button class="close-btn" @click="showRedeem = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="selectedProduct" class="redeem-product">
            <div class="redeem-icon">
              <span v-if="selectedProduct.type === 'bean'">🫘</span>
              <span v-else>🎫</span>
            </div>
            <div class="redeem-info">
              <div class="redeem-name">{{ selectedProduct.name }}</div>
              <div class="redeem-desc">{{ getProductDesc(selectedProduct) }}</div>
            </div>
          </div>
          <div class="redeem-quantity">
            <label>兑换数量</label>
            <div class="quantity-control">
              <button @click="redeemQuantity = Math.max(1, redeemQuantity - 1)">-</button>
              <span>{{ redeemQuantity }}</span>
              <button @click="redeemQuantity = Math.min(selectedProduct?.stock || 0, redeemQuantity + 1)">+</button>
            </div>
          </div>
          <div class="redeem-summary">
            <div class="summary-row">
              <span>单价</span>
              <span>{{ selectedProduct?.points || 0 }} 积分</span>
            </div>
            <div class="summary-row">
              <span>数量</span>
              <span>× {{ redeemQuantity }}</span>
            </div>
            <div class="summary-row total">
              <span>共计</span>
              <span class="total-points">{{ totalRedeemPoints }} 积分</span>
            </div>
            <div class="summary-row">
              <span>当前积分</span>
              <span>{{ currentMember?.points || 0 }} 积分</span>
            </div>
            <div v-if="!canAffordRedeem" class="insufficient-points">积分不足</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showRedeem = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!canAffordRedeem || redeeming"
            @click="confirmRedeem"
          >
            {{ redeeming ? '兑换中...' : '确认兑换' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAddProduct" class="modal-overlay" @click.self="showAddProduct = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingProduct ? '编辑商品' : '添加积分商品' }}</h3>
          <button class="close-btn" @click="closeAddProduct">×</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>商品类型</label>
              <select v-model="productForm.type">
                <option value="bean">豆种</option>
                <option value="coupon">优惠券</option>
              </select>
            </div>
            <div class="form-group">
              <label>商品名称</label>
              <input v-model="productForm.name" placeholder="请输入商品名称" />
            </div>
            <div class="form-group">
              <label>所需积分</label>
              <input type="number" v-model.number="productForm.points" min="1" />
            </div>
            <div class="form-group">
              <label>库存数量</label>
              <input type="number" v-model.number="productForm.stock" min="0" />
            </div>
            <div class="form-group">
              <label>排序</label>
              <input type="number" v-model.number="productForm.sortOrder" min="0" />
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="productForm.status">
                <option value="active">上架</option>
                <option value="inactive">下架</option>
              </select>
            </div>
          </div>

          <div v-if="productForm.type === 'bean'" class="form-section">
            <h4 class="form-section-title">关联豆种</h4>
            <div class="form-group">
              <label>选择 SKU</label>
              <select v-model="productForm.skuId">
                <option :value="null">请选择</option>
                <option v-for="sku in invStore.inventoryWithBeans" :key="sku.id" :value="sku.id">
                  {{ sku.skuName }} - ¥{{ sku.price }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="productForm.type === 'coupon'" class="form-section">
            <h4 class="form-section-title">关联优惠券</h4>
            <div class="form-group">
              <label>选择优惠券模板</label>
              <select v-model="productForm.couponTemplateId">
                <option :value="null">请选择</option>
                <option v-for="tpl in couponStore.templates" :key="tpl.id" :value="tpl.id">
                  {{ tpl.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>商品描述</label>
            <textarea v-model="productForm.description" rows="3" placeholder="请输入商品描述（可选）"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeAddProduct">取消</button>
          <button class="btn btn-primary" @click="submitProduct" :disabled="!canSubmitProduct">
            {{ editingProduct ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAddMember" class="modal-overlay" @click.self="showAddMember = false">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>添加会员</h3>
          <button class="close-btn" @click="showAddMember = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>会员姓名</label>
            <input v-model="memberForm.name" placeholder="请输入姓名" />
          </div>
          <div class="form-group">
            <label>手机号</label>
            <input v-model="memberForm.phone" placeholder="请输入手机号" />
          </div>
          <div class="form-group">
            <label>初始积分</label>
            <input type="number" v-model.number="memberForm.points" min="0" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showAddMember = false">取消</button>
          <button class="btn btn-primary" @click="submitMember" :disabled="!canSubmitMember">
            添加
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAdjustPoints" class="modal-overlay" @click.self="showAdjustPoints = false">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>调整积分</h3>
          <button class="close-btn" @click="showAdjustPoints = false">×</button>
        </div>
        <div class="modal-body">
          <div class="adjust-member-info">
            <span>{{ adjustMember?.name }}</span>
            <span class="current-points">当前积分: {{ adjustMember?.points || 0 }}</span>
          </div>
          <div class="form-group">
            <label>调整方式</label>
            <select v-model="adjustType">
              <option value="add">增加积分</option>
              <option value="deduct">扣减积分</option>
            </select>
          </div>
          <div class="form-group">
            <label>积分数量</label>
            <input type="number" v-model.number="adjustPoints" min="1" />
          </div>
          <div class="form-group">
            <label>原因</label>
            <input v-model="adjustReason" placeholder="请输入调整原因" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showAdjustPoints = false">取消</button>
          <button class="btn btn-primary" @click="confirmAdjustPoints">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { usePointsStore, POINT_ORDER_STATUS } from '../stores/points.js'
import { useInventoryStore } from '../stores/inventory.js'
import { useCouponStore } from '../stores/coupon.js'

const pointsStore = usePointsStore()
const invStore = useInventoryStore()
const couponStore = useCouponStore()

const activeTab = ref('mall')
const adminTab = ref('products')
const productFilter = ref('all')
const showMemberSelect = ref(false)
const showPointsLog = ref(false)
const showRedeem = ref(false)
const showAddProduct = ref(false)
const showAddMember = ref(false)
const showAdjustPoints = ref(false)
const searchPhone = ref('')

const selectedProduct = ref(null)
const redeemQuantity = ref(1)
const redeeming = ref(false)

const editingProduct = ref(null)
const productForm = reactive({
  type: 'bean',
  name: '',
  points: 0,
  stock: 0,
  sortOrder: 0,
  status: 'active',
  skuId: null,
  couponTemplateId: null,
  description: '',
})

const memberForm = reactive({
  name: '',
  phone: '',
  points: 0,
})

const adjustMember = ref(null)
const adjustType = ref('add')
const adjustPoints = ref(0)
const adjustReason = ref('')

const verifyCodeInput = ref('')

const currentMember = computed(() => pointsStore.currentMember)
const memberOrders = computed(() => pointsStore.memberOrders)

const memberPointsLog = computed(() => {
  if (!currentMember.value) return []
  return pointsStore.getMemberPointsLog(currentMember.value.id)
})

const filteredProducts = computed(() => {
  const products = pointsStore.activeProductsWithDetails
  if (productFilter.value === 'all') return products
  return products.filter(p => p.type === productFilter.value)
})

const activeProductCount = computed(() =>
  pointsStore.pointProducts.filter(p => p.status === 'active').length
)

const verifiedOrderCount = computed(() =>
  pointsStore.pointOrders.filter(o => o.status === 'verified').length
)

const totalRedeemPoints = computed(() => {
  if (!selectedProduct.value) return 0
  return selectedProduct.value.points * redeemQuantity.value
})

const canAffordRedeem = computed(() => {
  if (!currentMember.value || !selectedProduct.value) return false
  return currentMember.value.points >= totalRedeemPoints.value
})

const canSubmitProduct = computed(() => {
  if (!productForm.name.trim()) return false
  if (productForm.points <= 0) return false
  if (productForm.stock < 0) return false
  if (productForm.type === 'bean' && !productForm.skuId) return false
  if (productForm.type === 'coupon' && !productForm.couponTemplateId) return false
  return true
})

const canSubmitMember = computed(() => {
  return memberForm.name.trim() && memberForm.phone.trim()
})

function getProductDesc(product) {
  if (product.type === 'bean') {
    return product.skuName || product.description || ''
  } else if (product.type === 'coupon') {
    return product.discountInfo || product.description || ''
  }
  return product.description || ''
}

function canAfford(product) {
  if (!currentMember.value) return false
  return currentMember.value.points >= product.points
}

function getOrderStatusText(status) {
  const map = {
    [POINT_ORDER_STATUS.PENDING]: '待核销',
    [POINT_ORDER_STATUS.VERIFIED]: '已核销',
    [POINT_ORDER_STATUS.EXPIRED]: '已过期',
    [POINT_ORDER_STATUS.CANCELED]: '已取消',
  }
  return map[status] || status
}

function selectMember(member) {
  pointsStore.setCurrentMember(member)
  showMemberSelect.value = false
}

function openRedeem(product) {
  if (!currentMember.value) {
    showMemberSelect.value = true
    return
  }
  selectedProduct.value = product
  redeemQuantity.value = 1
  showRedeem.value = true
}

async function confirmRedeem() {
  if (!selectedProduct.value || !currentMember.value) return

  redeeming.value = true
  try {
    await pointsStore.redeemProduct(
      currentMember.value.id,
      selectedProduct.value.id,
      redeemQuantity.value
    )
    alert('兑换成功！')
    showRedeem.value = false
  } catch (e) {
    alert('兑换失败: ' + e.message)
  } finally {
    redeeming.value = false
  }
}

async function handleCancelOrder(order) {
  if (!confirm('确定要取消这个兑换订单吗？积分将退回。')) return
  try {
    await pointsStore.cancelOrder(order.id)
    alert('取消成功，积分已退回')
  } catch (e) {
    alert('取消失败: ' + e.message)
  }
}

function toggleProductStatus(product) {
  const newStatus = product.status === 'active' ? 'inactive' : 'active'
  pointsStore.updateProduct(product.id, { status: newStatus })
}

function editProduct(product) {
  editingProduct.value = product
  productForm.type = product.type
  productForm.name = product.name
  productForm.points = product.points
  productForm.stock = product.stock
  productForm.sortOrder = product.sortOrder || 0
  productForm.status = product.status
  productForm.skuId = product.skuId || null
  productForm.couponTemplateId = product.couponTemplateId || null
  productForm.description = product.description || ''
  showAddProduct.value = true
}

function resetProductForm() {
  editingProduct.value = null
  productForm.type = 'bean'
  productForm.name = ''
  productForm.points = 0
  productForm.stock = 0
  productForm.sortOrder = 0
  productForm.status = 'active'
  productForm.skuId = null
  productForm.couponTemplateId = null
  productForm.description = ''
}

function closeAddProduct() {
  showAddProduct.value = false
  resetProductForm()
}

async function submitProduct() {
  if (!canSubmitProduct.value) return

  try {
    let beanId = null
    if (productForm.type === 'bean' && productForm.skuId) {
      const sku = invStore.inventoryList.find(s => s.id === productForm.skuId)
      beanId = sku?.beanId || null
    }

    const productData = {
      type: productForm.type,
      name: productForm.name,
      points: productForm.points,
      stock: productForm.stock,
      sortOrder: productForm.sortOrder,
      status: productForm.status,
      beanId,
      skuId: productForm.type === 'bean' ? productForm.skuId : null,
      couponTemplateId: productForm.type === 'coupon' ? productForm.couponTemplateId : null,
      description: productForm.description,
    }

    if (editingProduct.value) {
      await pointsStore.updateProduct(editingProduct.value.id, productData)
      alert('商品更新成功！')
    } else {
      await pointsStore.addProduct(productData)
      alert('商品添加成功！')
    }
    closeAddProduct()
  } catch (e) {
    alert('操作失败: ' + e.message)
  }
}

async function deleteProduct(productId) {
  if (!confirm('确定要删除这个积分商品吗？')) return
  try {
    await pointsStore.deleteProduct(productId)
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

async function submitMember() {
  if (!canSubmitMember.value) return
  try {
    await pointsStore.addMember({
      name: memberForm.name.trim(),
      phone: memberForm.phone.trim(),
      points: memberForm.points || 0,
    })
    alert('会员添加成功！')
    showAddMember.value = false
    memberForm.name = ''
    memberForm.phone = ''
    memberForm.points = 0
  } catch (e) {
    alert('添加失败: ' + e.message)
  }
}

function openAddPoints(member) {
  adjustMember.value = member
  adjustType.value = 'add'
  adjustPoints.value = 0
  adjustReason.value = ''
  showAdjustPoints.value = true
}

async function confirmAdjustPoints() {
  if (!adjustMember.value || adjustPoints.value <= 0) return

  try {
    if (adjustType.value === 'add') {
      await pointsStore.addPoints(
        adjustMember.value.id,
        adjustPoints.value,
        adjustReason.value || '手动调整'
      )
    } else {
      await pointsStore.deductPoints(
        adjustMember.value.id,
        adjustPoints.value,
        adjustReason.value || '手动调整'
      )
    }
    alert('积分调整成功！')
    showAdjustPoints.value = false
  } catch (e) {
    alert('调整失败: ' + e.message)
  }
}

async function handleVerifyOrder(order) {
  if (!confirm(`确认核销订单 ${order.orderNo}？`)) return
  try {
    await pointsStore.verifyOrder(order.id)
    alert('核销成功！')
  } catch (e) {
    alert('核销失败: ' + e.message)
  }
}

async function quickVerify() {
  if (!verifyCodeInput.value.trim()) {
    alert('请输入核销码')
    return
  }
  const order = pointsStore.pointOrders.find(
    o => o.verifyCode === verifyCodeInput.value.trim().toUpperCase()
  )
  if (!order) {
    alert('未找到对应订单')
    return
  }
  if (order.status !== 'pending') {
    alert('订单状态不允许核销')
    return
  }
  try {
    await pointsStore.verifyOrder(order.id)
    alert('核销成功！')
    verifyCodeInput.value = ''
  } catch (e) {
    alert('核销失败: ' + e.message)
  }
}

onMounted(async () => {
  await pointsStore.loadAll()
  await invStore.loadAll()
  await couponStore.loadAll()
})
</script>

<style scoped>
.mall-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #6F4E37 0%, #8B5A2B 100%);
  border-radius: 16px;
  color: #FFF8F0;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.member-avatar {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.member-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-name {
  font-size: 16px;
  font-weight: 600;
}

.member-phone {
  font-size: 13px;
  opacity: 0.8;
}

.points-display {
  text-align: center;
  padding: 0 20px;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
}

.points-label {
  font-size: 12px;
  opacity: 0.8;
}

.points-value {
  font-size: 28px;
  font-weight: 700;
}

.member-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-actions .btn {
  background: rgba(255, 255, 255, 0.2);
  color: #FFF8F0;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.member-actions .btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  background: #FFF8F0;
  border-radius: 20px;
  padding: 4px;
}

.filter-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: #8B7355;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 16px;
  transition: all 0.2s;
}

.filter-btn.active {
  background: #6F4E37;
  color: #FFF8F0;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.product-card {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;
}

.product-card:hover:not(.disabled) {
  box-shadow: 0 4px 12px rgba(62, 44, 28, 0.1);
  transform: translateY(-2px);
}

.product-card.disabled {
  opacity: 0.6;
}

.product-icon {
  width: 48px;
  height: 48px;
  background: #FFF8F0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 4px;
}

.product-desc {
  font-size: 12px;
  color: #8B7355;
  margin-bottom: 6px;
}

.product-stock {
  font-size: 12px;
  color: #B0A090;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.points-badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.points-num {
  font-size: 20px;
  font-weight: 700;
  color: #C0392B;
}

.points-unit {
  font-size: 12px;
  color: #8B7355;
}

.order-count {
  font-size: 13px;
  color: #8B7355;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  overflow: hidden;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #EDE0D0;
}

.order-no {
  font-size: 13px;
  color: #8B7355;
  font-family: monospace;
}

.order-status.status-pending {
  background: #FEF3C7;
  color: #92400E;
}

.order-status.status-verified {
  background: #D1FAE5;
  color: #065F46;
}

.order-status.status-canceled {
  background: #F3F4F6;
  color: #6B7280;
}

.order-status.status-expired {
  background: #FEE2E2;
  color: #991B1B;
}

.order-body {
  padding: 14px 16px;
}

.order-product {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-icon-sm {
  width: 36px;
  height: 36px;
  background: #FFF8F0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.order-info {
  flex: 1;
}

.order-product-name {
  font-size: 14px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 4px;
}

.order-meta {
  font-size: 12px;
  color: #8B7355;
}

.order-verify {
  margin-top: 10px;
  padding: 8px 12px;
  background: #FFF8F0;
  border-radius: 8px;
}

.verify-code {
  font-size: 13px;
  color: #6F4E37;
}

.verify-code strong {
  font-family: monospace;
  font-size: 14px;
  color: #C0392B;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #FFF8F0;
  border-top: 1px solid #EDE0D0;
}

.order-time {
  font-size: 12px;
  color: #B0A090;
}

.order-actions {
  display: flex;
  gap: 8px;
}

.admin-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.admin-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  flex: 1;
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 16px;
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

.admin-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #EDE0D0;
}

.admin-tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: #8B7355;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.admin-tab.active {
  color: #6F4E37;
  border-bottom-color: #6F4E37;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.admin-header h4 {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
  margin: 0;
}

.product-admin-list,
.order-admin-list,
.member-admin-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.product-admin-item,
.order-admin-item,
.member-admin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
}

.product-admin-info,
.order-admin-info,
.member-admin-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-admin-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
}

.product-admin-meta,
.order-admin-meta,
.member-admin-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #8B7355;
  flex-wrap: wrap;
}

.product-admin-actions,
.order-admin-actions,
.member-admin-actions {
  display: flex;
  gap: 8px;
}

.status-active {
  background: #D1FAE5;
  color: #065F46;
}

.status-inactive {
  background: #F3F4F6;
  color: #6B7280;
}

.order-admin-no {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #3E2C1C;
  font-family: monospace;
}

.member-admin-name {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
}

.points-highlight {
  color: #C0392B;
  font-weight: 600;
}

.verify-input {
  display: flex;
  gap: 8px;
}

.verify-input input {
  padding: 6px 12px;
  border: 1px solid #D2B48C;
  border-radius: 6px;
  font-size: 13px;
  width: 180px;
}

.modal-overlay {
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
}

.modal-content {
  background: #FFFDF9;
  border-radius: 16px;
  width: 90%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-content.modal-sm {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #EDE0D0;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #3E2C1C;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: #8B7355;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #3E2C1C;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #EDE0D0;
}

.member-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.member-select-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.member-select-item:hover {
  background: #F0E0D0;
}

.member-select-item.active {
  background: #6F4E37;
  border-color: #6F4E37;
  color: #FFF8F0;
}

.member-select-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-select-name {
  font-size: 14px;
  font-weight: 600;
}

.member-select-phone {
  font-size: 12px;
  opacity: 0.8;
}

.member-select-points {
  font-size: 16px;
  font-weight: 700;
}

.add-member-section {
  padding-top: 12px;
  border-top: 1px solid #EDE0D0;
}

.points-log-summary {
  padding: 12px 16px;
  background: #FFF8F0;
  border-radius: 8px;
  font-size: 14px;
  color: #3E2C1C;
}

.points-log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.points-log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 8px;
}

.log-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-reason {
  font-size: 13px;
  font-weight: 500;
  color: #3E2C1C;
}

.log-time {
  font-size: 11px;
  color: #B0A090;
}

.log-points {
  font-size: 16px;
  font-weight: 700;
}

.log-points.positive {
  color: #065F46;
}

.log-points.negative {
  color: #C0392B;
}

.redeem-product {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #FFF8F0;
  border-radius: 10px;
}

.redeem-icon {
  width: 56px;
  height: 56px;
  background: #FFFDF9;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.redeem-info {
  flex: 1;
}

.redeem-name {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 6px;
}

.redeem-desc {
  font-size: 13px;
  color: #8B7355;
}

.redeem-quantity {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.redeem-quantity label {
  font-size: 14px;
  font-weight: 500;
  color: #6F4E37;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid #D2B48C;
  border-radius: 8px;
  overflow: hidden;
}

.quantity-control button {
  width: 32px;
  height: 32px;
  border: none;
  background: #FFF8F0;
  color: #6F4E37;
  font-size: 16px;
  cursor: pointer;
}

.quantity-control button:hover {
  background: #F0E0D0;
}

.quantity-control span {
  width: 40px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #3E2C1C;
}

.redeem-summary {
  padding: 14px 16px;
  background: #FFF8F0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6F4E37;
}

.summary-row.total {
  padding-top: 10px;
  border-top: 1px dashed #D2B48C;
  font-weight: 600;
}

.total-points {
  font-size: 18px;
  color: #C0392B;
}

.insufficient-points {
  color: #C0392B;
  font-size: 13px;
  text-align: center;
  padding-top: 8px;
}

.form-section {
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 14px;
}

.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #3E2C1C;
  margin: 0 0 12px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 8px 12px;
  border: 1px solid #D2B48C;
  border-radius: 8px;
  font-size: 14px;
  background: #FFFCF7;
  color: #3E2C1C;
  outline: none;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #6F4E37;
}

.form-group textarea {
  resize: vertical;
  font-family: inherit;
}

.adjust-member-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #FFF8F0;
  border-radius: 8px;
  font-size: 14px;
  color: #3E2C1C;
  font-weight: 500;
}

.current-points {
  color: #C0392B;
  font-weight: 600;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
}

.btn {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: #F0E0D0;
  color: #6F4E37;
}

.btn:hover:not(:disabled) {
  background: #E8D5B7;
}

.btn-primary {
  background: #6F4E37;
  color: #FFF8F0;
}

.btn-primary:hover:not(:disabled) {
  background: #5A3E2B;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: transparent;
  color: #C0392B;
  border: 1px solid #E6B0AA;
}

.btn-danger:hover {
  background: #FDEDEC;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 30px 20px;
  color: #B0A090;
  font-size: 14px;
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
</style>
