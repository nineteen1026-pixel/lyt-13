<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🎫 优惠券中心</h2>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? '取消' : '+ 新建优惠券' }}
        </button>
      </div>
    </div>

    <div v-if="showCreateForm" class="form-section">
      <h3 class="form-title">创建优惠券模板</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>优惠券名称</label>
          <input v-model="form.name" placeholder="例：新客首单立减20元" />
        </div>
        <div class="form-group">
          <label>优惠券类型</label>
          <select v-model="form.type">
            <option value="full_reduction">满减券</option>
            <option value="discount">折扣券</option>
            <option value="new_customer">新客专享</option>
            <option value="birthday">生日专享</option>
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
          <label>适用范围</label>
          <select v-model="form.scope">
            <option value="all">全部商品</option>
            <option value="presale">预售专享</option>
            <option value="bean">指定豆种</option>
          </select>
        </div>
        <div v-if="form.scope === 'bean'" class="form-group full-width">
          <label>选择豆种（多选）</label>
          <div class="bean-select-list">
            <label v-for="inv in invStore.inventoryWithBeans" :key="inv.id" class="bean-select-item">
              <input
                type="checkbox"
                :value="inv.beanId"
                v-model="selectedBeanIds"
              />
              <span>{{ inv.beanName }}</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>有效期类型</label>
          <select v-model="form.validType">
            <option value="fixed">固定日期</option>
            <option value="days">领取后N天有效</option>
          </select>
        </div>
        <div v-if="form.validType === 'days'" class="form-group">
          <label>有效天数</label>
          <input type="number" v-model.number="form.validDays" min="1" />
        </div>
        <div v-if="form.validType === 'fixed'" class="form-group">
          <label>开始时间</label>
          <input type="datetime-local" v-model="form.validStart" />
        </div>
        <div v-if="form.validType === 'fixed'" class="form-group">
          <label>结束时间</label>
          <input type="datetime-local" v-model="form.validEnd" />
        </div>
        <div class="form-group">
          <label>发放总量</label>
          <input type="number" v-model.number="form.totalCount" min="0" placeholder="0为不限量" />
        </div>
      </div>
      <button class="btn btn-primary" @click="submitTemplate" :disabled="!canSubmitTemplate">
        创建优惠券
      </button>
    </div>

    <div class="coupon-stats">
      <div class="stat-item active">
        <span class="stat-num">{{ activeTemplateCount }}</span>
        <span class="stat-label">进行中模板</span>
      </div>
      <div class="stat-item total">
        <span class="stat-num">{{ couponStore.templates.length }}</span>
        <span class="stat-label">总模板数</span>
      </div>
      <div class="stat-item issued">
        <span class="stat-num">{{ totalIssued }}</span>
        <span class="stat-label">已发放</span>
      </div>
      <div class="stat-item used">
        <span class="stat-num">{{ totalUsed }}</span>
        <span class="stat-label">已核销</span>
      </div>
    </div>

    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'templates'" class="template-list">
      <div v-for="tpl in couponStore.templates" :key="tpl.id" class="template-item">
        <div class="template-header">
          <div class="template-title-section">
            <span class="template-name">{{ tpl.name }}</span>
            <span class="tag" :class="'type-' + tpl.type">{{ typeText(tpl.type) }}</span>
            <span
              class="tag status-tag"
              :class="tpl.status === 'active' ? 'status-active' : 'status-inactive'"
            >
              {{ tpl.status === 'active' ? '进行中' : '已停用' }}
            </span>
          </div>
          <div class="template-actions">
            <button
              class="btn btn-sm"
              @click="openBatchIssue(tpl)"
            >
              批量发放
            </button>
            <button
              class="btn btn-sm"
              @click="toggleTemplateStatus(tpl)"
              :class="tpl.status === 'active' ? 'btn-danger' : ''"
            >
              {{ tpl.status === 'active' ? '停用' : '启用' }}
            </button>
            <button class="btn btn-danger btn-sm" @click="handleDeleteTemplate(tpl.id)">删除</button>
          </div>
        </div>

        <div class="template-details">
          <div class="detail-row">
            <span class="detail-label">优惠:</span>
            <span class="detail-value highlight">
              {{ tpl.discountType === 'fixed' ? '立减 ¥' + tpl.discount.toFixed(2) : tpl.discount + '% 折扣' }}
            </span>
            <span class="detail-label">门槛:</span>
            <span class="detail-value">满 ¥{{ tpl.minAmount.toFixed(2) }} 可用</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">适用范围:</span>
            <span class="detail-value">{{ scopeText(tpl) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">有效期:</span>
            <span class="detail-value">{{ validText(tpl) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">发放:</span>
            <span class="detail-value">
              {{ tpl.issuedCount }} / {{ tpl.totalCount ? tpl.totalCount : '不限' }} 张
            </span>
            <span class="detail-label">已核销:</span>
            <span class="detail-value">{{ getUsedCount(tpl.id) }} 张</span>
          </div>
        </div>
      </div>

      <div v-if="couponStore.templates.length === 0" class="empty-state">
        暂无优惠券模板，点击上方按钮创建第一个吧
      </div>
    </div>

    <div v-if="activeTab === 'coupons'" class="coupon-list-section">
      <div class="filter-bar">
        <div class="form-group">
          <label>会员手机号</label>
          <input v-model="searchPhone" placeholder="输入手机号查询" />
        </div>
        <button class="btn btn-primary btn-sm" @click="searchCoupons">查询</button>
      </div>

      <div v-if="filteredCoupons.length > 0" class="coupon-list">
        <div v-for="coupon in filteredCoupons" :key="coupon.id" class="coupon-card" :class="'status-' + coupon.status">
          <div class="coupon-left">
            <div class="coupon-amount">
              <span v-if="getTemplate(coupon.templateId)?.discountType === 'fixed'">¥</span>
              {{ getCouponDisplayValue(coupon) }}
              <span v-if="getTemplate(coupon.templateId)?.discountType === 'percentage'">%</span>
            </div>
            <div class="coupon-condition">
              满¥{{ getTemplate(coupon.templateId)?.minAmount?.toFixed(2) || '0.00' }}可用
            </div>
          </div>
          <div class="coupon-right">
            <div class="coupon-name">{{ getTemplate(coupon.templateId)?.name || '未知券' }}</div>
            <div class="coupon-code">券码: {{ coupon.code }}</div>
            <div class="coupon-valid">
              {{ new Date(coupon.validStart).toLocaleDateString() }} - {{ new Date(coupon.validEnd).toLocaleDateString() }}
            </div>
            <div class="coupon-status-tag">
              {{ couponStatusText(coupon.status) }}
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="searchPhone" class="empty-state">
        该会员暂无优惠券
      </div>
      <div v-else class="empty-state">
        请输入会员手机号查询优惠券
      </div>
    </div>

    <div v-if="showBatchIssue" class="modal-overlay" @click.self="showBatchIssue = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>批量发放优惠券</h3>
          <button class="close-btn" @click="showBatchIssue = false">×</button>
        </div>
        <div class="modal-body">
          <div class="selected-template-info">
            <span class="template-name">{{ currentTemplate?.name }}</span>
            <span class="template-discount">
              {{ currentTemplate?.discountType === 'fixed' ? '¥' + currentTemplate.discount.toFixed(2) : currentTemplate.discount + '%' }}
            </span>
          </div>

          <div class="form-group">
            <label>发放方式</label>
            <select v-model="issueMethod">
              <option value="manual">手动输入</option>
              <option value="batch">批量导入</option>
            </select>
          </div>

          <div v-if="issueMethod === 'manual'" class="form-group">
            <label>会员手机号</label>
            <input v-model="issuePhone" placeholder="请输入会员手机号" />
          </div>

          <div v-if="issueMethod === 'manual'" class="form-group">
            <label>会员姓名（可选）</label>
            <input v-model="issueName" placeholder="请输入会员姓名" />
          </div>

          <div v-if="issueMethod === 'batch'" class="form-group">
            <label>批量导入（每行一个，格式：手机号,姓名）</label>
            <textarea
              v-model="batchText"
              rows="8"
              placeholder="示例：&#10;13800138000,张三&#10;13900139000,李四&#10;13700137000"
            ></textarea>
          </div>

          <div v-if="issueResults.length > 0" class="issue-results">
            <h4>发放结果</h4>
            <div class="result-stats">
              <span class="success">成功: {{ successCount }}</span>
              <span class="fail">失败: {{ failCount }}</span>
            </div>
            <div class="result-list">
              <div v-for="(r, i) in issueResults" :key="i" class="result-item" :class="{ fail: !r.success }">
                <span>{{ r.phone }}</span>
                <span v-if="r.success" class="success-text">✓ {{ r.coupon?.code }}</span>
                <span v-else class="fail-text">✗ {{ r.error }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showBatchIssue = false">取消</button>
          <button class="btn btn-primary" @click="handleIssue" :disabled="!canIssue">
            {{ issueMethod === 'manual' ? '发放' : '批量发放' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useCouponStore, TEMPLATE_STATUS } from '../stores/coupon.js'
import { useInventoryStore } from '../stores/inventory.js'

const couponStore = useCouponStore()
const invStore = useInventoryStore()

const showCreateForm = ref(false)
const activeTab = ref('templates')
const searchPhone = ref('')
const filteredCoupons = ref([])
const showBatchIssue = ref(false)
const currentTemplate = ref(null)
const issueMethod = ref('manual')
const issuePhone = ref('')
const issueName = ref('')
const batchText = ref('')
const issueResults = ref([])
const selectedBeanIds = ref([])

const now = new Date()
const form = reactive({
  name: '',
  type: 'full_reduction',
  discountType: 'fixed',
  discount: 0,
  minAmount: 0,
  scope: 'all',
  scopeValue: '',
  validType: 'days',
  validDays: 30,
  validStart: formatLocal(new Date(now.getTime())),
  validEnd: formatLocal(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
  totalCount: 0,
  status: TEMPLATE_STATUS.ACTIVE,
})

const tabs = [
  { key: 'templates', label: '优惠券模板' },
  { key: 'coupons', label: '会员优惠券' },
]

function formatLocal(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const activeTemplateCount = computed(() => couponStore.activeTemplates.length)

const totalIssued = computed(() => {
  return couponStore.templates.reduce((s, t) => s + (t.issuedCount || 0), 0)
})

const totalUsed = computed(() => {
  return couponStore.coupons.filter(c => c.status === 'used').length
})

const canSubmitTemplate = computed(() => {
  if (!form.name.trim()) return false
  if (form.discount <= 0) return false
  if (form.validType === 'fixed') {
    if (!form.validStart || !form.validEnd) return false
  } else {
    if (!form.validDays || form.validDays <= 0) return false
  }
  return true
})

const canIssue = computed(() => {
  if (issueMethod.value === 'manual') {
    return issuePhone.value.trim().length >= 11
  } else {
    return batchText.value.trim().length > 0
  }
})

const successCount = computed(() => issueResults.value.filter(r => r.success).length)
const failCount = computed(() => issueResults.value.filter(r => !r.success).length)

function typeText(type) {
  const map = {
    full_reduction: '满减券',
    discount: '折扣券',
    new_customer: '新客专享',
    birthday: '生日专享',
  }
  return map[type] || type
}

function scopeText(tpl) {
  const map = {
    all: '全部商品',
    presale: '预售专享',
    bean: '指定豆种',
    category: '指定分类',
  }
  if (tpl.scope === 'bean' && tpl.scopeValue) {
    const beanIds = tpl.scopeValue.split(',').map(Number)
    const names = beanIds.map(id => {
      const inv = invStore.inventoryWithBeans.find(i => i.beanId === id)
      return inv?.beanName || '未知'
    }).join('、')
    return `指定豆种: ${names}`
  }
  return map[tpl.scope] || tpl.scope
}

function validText(tpl) {
  if (tpl.validType === 'fixed') {
    return `${new Date(tpl.validStart).toLocaleDateString()} ~ ${new Date(tpl.validEnd).toLocaleDateString()}`
  } else {
    return `领取后 ${tpl.validDays} 天有效`
  }
}

function couponStatusText(status) {
  const map = {
    unused: '未使用',
    used: '已使用',
    expired: '已过期',
  }
  return map[status] || status
}

function getTemplate(templateId) {
  return couponStore.getTemplateById(templateId)
}

function getCouponDisplayValue(coupon) {
  const tpl = getTemplate(coupon.templateId)
  if (!tpl) return '-'
  return tpl.discount
}

function getUsedCount(templateId) {
  return couponStore.coupons.filter(c => c.templateId === templateId && c.status === 'used').length
}

function resetForm() {
  form.name = ''
  form.type = 'full_reduction'
  form.discountType = 'fixed'
  form.discount = 0
  form.minAmount = 0
  form.scope = 'all'
  form.scopeValue = ''
  form.validType = 'days'
  form.validDays = 30
  form.validStart = formatLocal(new Date())
  form.validEnd = formatLocal(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
  form.totalCount = 0
  selectedBeanIds.value = []
}

async function submitTemplate() {
  if (!canSubmitTemplate.value) return

  let scopeValue = ''
  if (form.scope === 'bean' && selectedBeanIds.value.length > 0) {
    scopeValue = selectedBeanIds.value.join(',')
  }

  try {
    await couponStore.addTemplate({
      name: form.name,
      type: form.type,
      discountType: form.discountType,
      discount: form.discount,
      minAmount: form.minAmount,
      scope: form.scope,
      scopeValue,
      validType: form.validType,
      validDays: form.validType === 'days' ? form.validDays : null,
      validStart: form.validType === 'fixed' ? new Date(form.validStart).toISOString() : null,
      validEnd: form.validType === 'fixed' ? new Date(form.validEnd).toISOString() : null,
      totalCount: form.totalCount,
      status: TEMPLATE_STATUS.ACTIVE,
    })
    alert('优惠券模板创建成功！')
    resetForm()
    showCreateForm.value = false
  } catch (e) {
    alert('创建失败: ' + e.message)
  }
}

async function toggleTemplateStatus(tpl) {
  const newStatus = tpl.status === TEMPLATE_STATUS.ACTIVE ? TEMPLATE_STATUS.INACTIVE : TEMPLATE_STATUS.ACTIVE
  await couponStore.updateTemplate(tpl.id, { status: newStatus })
}

async function handleDeleteTemplate(id) {
  if (!confirm('确定要删除该优惠券模板吗？已发放的优惠券不受影响。')) return
  await couponStore.deleteTemplate(id)
}

function openBatchIssue(tpl) {
  currentTemplate.value = tpl
  issueMethod.value = 'manual'
  issuePhone.value = ''
  issueName.value = ''
  batchText.value = ''
  issueResults.value = []
  showBatchIssue.value = true
}

async function handleIssue() {
  if (!currentTemplate.value) return

  try {
    if (issueMethod.value === 'manual') {
      const coupon = await couponStore.issueCoupon(
        currentTemplate.value.id,
        issuePhone.value.trim(),
        issueName.value.trim()
      )
      issueResults.value = [{ success: true, phone: issuePhone.value.trim(), coupon }]
      issuePhone.value = ''
      issueName.value = ''
    } else {
      const lines = batchText.value.trim().split('\n').filter(l => l.trim())
      const members = lines.map(line => {
        const parts = line.split(/[,，]/)
        return {
          phone: parts[0].trim(),
          name: parts[1]?.trim() || '',
        }
      }).filter(m => m.phone)

      const results = await couponStore.batchIssueCoupons(currentTemplate.value.id, members)
      issueResults.value = results
      batchText.value = ''
    }
  } catch (e) {
    alert('发放失败: ' + e.message)
  }
}

function searchCoupons() {
  if (!searchPhone.value.trim()) {
    filteredCoupons.value = []
    return
  }
  filteredCoupons.value = couponStore.getCouponsByPhone(searchPhone.value.trim())
}

onMounted(async () => {
  await couponStore.loadAll()
  await invStore.loadAll()
})
</script>

<style scoped>
.form-title {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 16px;
}

.full-width {
  grid-column: 1 / -1;
}

.bean-select-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  max-height: 120px;
  overflow-y: auto;
  padding: 8px;
  background: #FFFCF7;
  border: 1px solid #EDE0D0;
  border-radius: 8px;
}

.bean-select-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #3E2C1C;
  cursor: pointer;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.coupon-stats {
  display: flex;
  gap: 12px;
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

.stat-item.issued .stat-num {
  color: #1E40AF;
}

.stat-item.used .stat-num {
  color: #8B4513;
}

.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 2px solid #EDE0D0;
}

.tab-bar .tab-btn {
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

.tab-bar .tab-btn.active {
  color: #6F4E37;
  border-bottom-color: #6F4E37;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-item {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 16px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}

.template-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.template-name {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.template-details {
  background: #FFF8F0;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.detail-label {
  color: #8B7355;
  min-width: 60px;
}

.detail-value {
  color: #3E2C1C;
  font-weight: 500;
}

.detail-value.highlight {
  color: #C0392B;
  font-weight: 600;
}

.type-full_reduction {
  background: #DBEAFE;
  color: #1E40AF;
}

.type-discount {
  background: #FCE7F3;
  color: #9D174D;
}

.type-new_customer {
  background: #FCE7F3;
  color: #9D174D;
}

.type-birthday {
  background: #FEF3C7;
  color: #92400E;
}

.status-active {
  background: #D1FAE5;
  color: #065F46;
}

.status-inactive {
  background: #F3F4F6;
  color: #6B7280;
}

.coupon-list-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-bar .form-group {
  flex: 1;
  min-width: 200px;
}

.coupon-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.coupon-card {
  display: flex;
  background: linear-gradient(135deg, #FFF8F0 0%, #FFFCF7 100%);
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.coupon-card::before,
.coupon-card::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  background: #F5EDE4;
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

.coupon-card::before {
  left: -8px;
}

.coupon-card::after {
  right: -8px;
}

.coupon-left {
  flex: 0 0 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  background: linear-gradient(135deg, #C0392B 0%, #E74C3C 100%);
  color: #FFF8F0;
  position: relative;
}

.coupon-card.status-used .coupon-left {
  background: linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%);
}

.coupon-card.status-expired .coupon-left {
  background: linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%);
}

.coupon-amount {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.coupon-amount span {
  font-size: 14px;
}

.coupon-condition {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.9;
}

.coupon-right {
  flex: 1;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  border-left: 2px dashed #EDE0D0;
}

.coupon-name {
  font-size: 14px;
  font-weight: 600;
  color: #3E2C1C;
}

.coupon-code {
  font-size: 12px;
  color: #8B7355;
  font-family: monospace;
}

.coupon-valid {
  font-size: 11px;
  color: #B0A090;
}

.coupon-status-tag {
  font-size: 11px;
  font-weight: 500;
  color: #065F46;
}

.coupon-card.status-used .coupon-status-tag {
  color: #6B7280;
}

.coupon-card.status-expired .coupon-status-tag {
  color: #9CA3AF;
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
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.selected-template-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #FFF8F0;
  border-radius: 8px;
  border: 1px solid #EDE0D0;
}

.selected-template-info .template-name {
  font-weight: 500;
  color: #3E2C1C;
}

.selected-template-info .template-discount {
  font-size: 18px;
  font-weight: 700;
  color: #C0392B;
}

textarea {
  padding: 8px 12px;
  border: 1px solid #D2B48C;
  border-radius: 8px;
  font-size: 13px;
  background: #FFFCF7;
  color: #3E2C1C;
  outline: none;
  resize: vertical;
  font-family: monospace;
}

textarea:focus {
  border-color: #6F4E37;
}

.issue-results {
  border-top: 1px solid #EDE0D0;
  padding-top: 16px;
}

.issue-results h4 {
  font-size: 14px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 10px;
}

.result-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
  font-size: 13px;
}

.result-stats .success {
  color: #065F46;
  font-weight: 500;
}

.result-stats .fail {
  color: #C0392B;
  font-weight: 500;
}

.result-list {
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: #F0FDF4;
  border-radius: 6px;
  font-size: 12px;
}

.result-item.fail {
  background: #FEF2F2;
}

.success-text {
  color: #065F46;
}

.fail-text {
  color: #C0392B;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #EDE0D0;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn {
  padding: 6px 16px;
}
</style>
