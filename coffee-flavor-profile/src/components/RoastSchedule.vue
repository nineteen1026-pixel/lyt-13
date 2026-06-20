<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🔥 烘焙排产</h2>
      <div class="header-actions">
        <button class="btn btn-sm" @click="loadData">🔄 刷新</button>
      </div>
    </div>

    <div class="schedule-stats">
      <div class="stat-card">
        <div class="stat-value">{{ planStore.pendingPlans.length }}</div>
        <div class="stat-label">待烘焙</div>
      </div>
      <div class="stat-card roasting">
        <div class="stat-value">{{ planStore.roastingPlans.length }}</div>
        <div class="stat-label">烘焙中</div>
      </div>
      <div class="stat-card completed">
        <div class="stat-value">{{ planStore.completedPlans.length }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card total">
        <div class="stat-value">{{ totalQuantity }}</div>
        <div class="stat-label">待烘焙总量</div>
      </div>
    </div>

    <div class="schedule-filters">
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

    <div class="plan-list">
      <div v-for="plan in filteredPlans" :key="plan.id" class="plan-item" :class="'plan-' + plan.status">
        <div class="plan-header">
          <div class="plan-info">
            <span class="plan-bean">{{ plan.beanName }}</span>
            <span class="tag status-tag" :class="'status-' + plan.status">{{ plan.statusText }}</span>
          </div>
          <div class="plan-qty">
            <span class="qty-value">{{ plan.quantity }}</span>
            <span class="qty-unit">份</span>
          </div>
        </div>

        <div class="plan-meta">
          <div class="meta-row">
            <span class="meta-label">关联订单:</span>
            <span class="meta-value">{{ getOrderNo(plan.orderId) }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">计划烘焙:</span>
            <span class="meta-value">{{ plan.scheduledDate }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">预计交货:</span>
            <span class="meta-value highlight">{{ formatDate(plan.estimatedDeliveryDate) }}</span>
          </div>
          <div v-if="plan.startedAt" class="meta-row">
            <span class="meta-label">开始时间:</span>
            <span class="meta-value">{{ formatDateTime(plan.startedAt) }}</span>
          </div>
          <div v-if="plan.completedAt" class="meta-row">
            <span class="meta-label">完成时间:</span>
            <span class="meta-value">{{ formatDateTime(plan.completedAt) }}</span>
          </div>
        </div>

        <div v-if="plan.notes" class="plan-notes">
          📝 {{ plan.notes }}
        </div>

        <div class="plan-actions">
          <button
            v-if="plan.status === 'pending'"
            class="btn btn-primary btn-sm"
            @click="handleStartRoast(plan.id)"
          >
            开始烘焙
          </button>
          <button
            v-if="plan.status === 'roasting'"
            class="btn btn-primary btn-sm"
            @click="handleCompleteRoast(plan.id)"
          >
            完成烘焙
          </button>
          <button
            v-if="['pending', 'roasting'].includes(plan.status)"
            class="btn btn-danger btn-sm"
            @click="handleCancel(plan.id)"
          >
            取消
          </button>
        </div>
      </div>

      <div v-if="filteredPlans.length === 0" class="empty-state">
        暂无烘焙计划
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoastPlanStore } from '../stores/roastPlan.js'
import { useOrderStore } from '../stores/order.js'

const planStore = useRoastPlanStore()
const orderStore = useOrderStore()

const activeFilter = ref('all')

const filters = computed(() => [
  { key: 'all', label: '全部', count: planStore.roastPlansWithDetails.length },
  { key: 'pending', label: '待烘焙', count: planStore.pendingPlans.length },
  { key: 'roasting', label: '烘焙中', count: planStore.roastingPlans.length },
  { key: 'completed', label: '已完成', count: planStore.completedPlans.length },
])

const filteredPlans = computed(() => {
  const all = planStore.roastPlansWithDetails
  switch (activeFilter.value) {
    case 'pending': return planStore.pendingPlans
    case 'roasting': return planStore.roastingPlans
    case 'completed': return planStore.completedPlans
    default: return all
  }
})

const totalQuantity = computed(() =>
  planStore.pendingPlans.reduce((sum, p) => sum + p.quantity, 0)
)

function getOrderNo(orderId) {
  const order = orderStore.orders.find(o => o.id === orderId)
  return order ? order.orderNo : '-'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

async function loadData() {
  await planStore.loadAll()
}

async function handleStartRoast(planId) {
  try {
    await planStore.startRoast(planId)
  } catch (e) {
    alert('操作失败: ' + e.message)
  }
}

async function handleCompleteRoast(planId) {
  if (!confirm('确定要标记该烘焙计划为完成吗？')) return
  try {
    await planStore.completeRoast(planId)
  } catch (e) {
    alert('操作失败: ' + e.message)
  }
}

async function handleCancel(planId) {
  const reason = prompt('请输入取消原因（可选）:')
  if (reason === null) return
  try {
    await planStore.cancelRoastPlan(planId, reason || '手动取消')
  } catch (e) {
    alert('取消失败: ' + e.message)
  }
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
}

.schedule-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #3E2C1C;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #8B7355;
  margin-top: 4px;
}

.stat-card.roasting .stat-value {
  color: #92400E;
}

.stat-card.completed .stat-value {
  color: #065F46;
}

.stat-card.total .stat-value {
  color: #6F4E37;
}

.schedule-filters {
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

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.plan-item {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 16px;
  transition: border-color 0.2s;
}

.plan-item.plan-pending {
  border-left: 4px solid #F59E0B;
}

.plan-item.plan-roasting {
  border-left: 4px solid #F97316;
}

.plan-item.plan-completed {
  border-left: 4px solid #10B981;
}

.plan-item.plan-canceled {
  border-left: 4px solid #9CA3AF;
  opacity: 0.7;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.plan-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.plan-bean {
  font-weight: 600;
  color: #3E2C1C;
  font-size: 16px;
}

.status-tag {
  font-weight: 500;
  font-size: 12px;
}

.status-pending {
  background: #FEF3C7;
  color: #92400E;
}

.status-roasting {
  background: #FFEDD5;
  color: #9A3412;
}

.status-completed {
  background: #D1FAE5;
  color: #065F46;
}

.status-canceled {
  background: #F3F4F6;
  color: #6B7280;
}

.plan-qty {
  text-align: right;
}

.qty-value {
  font-size: 24px;
  font-weight: 700;
  color: #6F4E37;
}

.qty-unit {
  font-size: 12px;
  color: #8B7355;
  margin-left: 2px;
}

.plan-meta {
  background: #FFF8F0;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 13px;
}

.meta-label {
  color: #8B7355;
}

.meta-value {
  color: #3E2C1C;
  font-weight: 500;
}

.meta-value.highlight {
  color: #C0392B;
}

.plan-notes {
  font-size: 13px;
  color: #6F4E37;
  background: #FFFCF7;
  border: 1px dashed #EDE0D0;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 10px;
  font-style: italic;
}

.plan-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px solid #F0E0D0;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #B0A090;
  font-size: 14px;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: #F0E0D0;
  border-radius: 12px;
  font-size: 12px;
}
</style>
