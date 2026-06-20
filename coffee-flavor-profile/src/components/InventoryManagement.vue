<template>
  <div class="module-card">
    <div class="module-header">
      <h2>📦 库存管理</h2>
      <button class="btn btn-primary" @click="showEditForm = !showEditForm">
        {{ showEditForm ? '取消编辑' : '编辑库存' }}
      </button>
    </div>

    <div v-if="showEditForm" class="form-section">
      <h3 class="form-title">编辑库存与价格</h3>
      <div class="inventory-edit-list">
        <div v-for="inv in invStore.inventoryWithBeans" :key="inv.id" class="inventory-edit-item">
          <div class="edit-item-header">
            <span class="edit-item-name">{{ inv.beanName }}</span>
            <span class="tag">{{ inv.beanOrigin }}</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>总库存</label>
              <input type="number" v-model.number="editData[inv.id].stock" min="0" />
            </div>
            <div class="form-group">
              <label>预售价格 (¥)</label>
              <input type="number" v-model.number="editData[inv.id].presalePrice" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>定金 (¥)</label>
              <input type="number" v-model.number="editData[inv.id].deposit" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="editData[inv.id].status">
                <option value="on_sale">在售</option>
                <option value="presale">预售中</option>
                <option value="off_shelf">下架</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" @click="saveEdits">保存修改</button>
    </div>

    <div class="inventory-stats">
      <div class="stat-card">
        <div class="stat-value">{{ totalStock }}</div>
        <div class="stat-label">总库存</div>
      </div>
      <div class="stat-card reserved">
        <div class="stat-value">{{ totalReserved }}</div>
        <div class="stat-label">订单占用</div>
      </div>
      <div class="stat-card roasting">
        <div class="stat-value">{{ totalRoastReserved }}</div>
        <div class="stat-label">烘焙排产</div>
      </div>
      <div class="stat-card available">
        <div class="stat-value">{{ totalAvailable }}</div>
        <div class="stat-label">可用库存</div>
      </div>
      <div class="stat-card presale">
        <div class="stat-value">{{ presaleCount }}</div>
        <div class="stat-label">预售商品</div>
      </div>
    </div>

    <div class="inventory-list">
      <div v-for="inv in invStore.inventoryWithBeans" :key="inv.id" class="inventory-item">
        <div class="inventory-info">
          <div class="inventory-name">{{ inv.beanName }}</div>
          <div class="inventory-meta">
            <span class="tag">{{ inv.beanOrigin }}</span>
            <span class="tag" :class="'status-' + inv.status">
              {{ statusText(inv.status) }}
            </span>
          </div>
          <div class="inventory-prices">
            <div class="price-row">
              <span>售价:</span>
              <span class="price-value">¥{{ inv.price.toFixed(2) }}</span>
            </div>
            <div class="price-row presale">
              <span>预售价:</span>
              <span class="price-value">¥{{ inv.presalePrice.toFixed(2) }}</span>
              <span class="discount-tag">省 ¥{{ (inv.price - inv.presalePrice).toFixed(2) }}</span>
            </div>
            <div class="price-row deposit">
              <span>定金:</span>
              <span class="price-value">¥{{ inv.deposit.toFixed(2) }}</span>
            </div>
          </div>
        </div>
        <div class="inventory-stock">
          <div class="stock-bar">
            <div
              class="stock-fill"
              :style="{ width: stockPercent(inv) + '%' }"
              :class="{ low: stockPercent(inv) < 20 }"
            ></div>
          </div>
          <div class="stock-details">
            <div class="stock-row">
              <span>总库存:</span>
              <span class="stock-value">{{ inv.stock }}</span>
            </div>
            <div class="stock-row reserved">
              <span>订单占用:</span>
              <span class="stock-value">{{ inv.reservedStock }}</span>
            </div>
            <div v-if="inv.roastReservedStock > 0" class="stock-row roasting">
              <span>烘焙排产:</span>
              <span class="stock-value">{{ inv.roastReservedStock }}</span>
            </div>
            <div class="stock-row available">
              <span>可用:</span>
              <span class="stock-value">{{ inv.availableStock }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useInventoryStore } from '../stores/inventory.js'

const invStore = useInventoryStore()

const showEditForm = ref(false)
const editData = reactive({})

watch(() => invStore.inventoryList, (list) => {
  for (const inv of list) {
    if (!editData[inv.id]) {
      editData[inv.id] = {
        stock: inv.stock,
        price: inv.price,
        presalePrice: inv.presalePrice,
        deposit: inv.deposit,
        status: inv.status,
      }
    }
  }
}, { immediate: true, deep: true })

const totalStock = computed(() => invStore.inventoryList.reduce((s, i) => s + i.stock, 0))
const totalReserved = computed(() => invStore.inventoryList.reduce((s, i) => s + i.reservedStock, 0))
const totalRoastReserved = computed(() => invStore.inventoryList.reduce((s, i) => s + (i.roastReservedStock || 0), 0))
const totalAvailable = computed(() => totalStock.value - totalReserved.value)
const presaleCount = computed(() => invStore.inventoryList.filter(i => i.status === 'presale').length)

function stockPercent(inv) {
  if (inv.stock === 0) return 0
  return Math.round(((inv.stock - inv.reservedStock) / inv.stock) * 100)
}

function statusText(status) {
  const map = {
    on_sale: '在售',
    presale: '预售中',
    off_shelf: '下架',
  }
  return map[status] || status
}

async function saveEdits() {
  try {
    for (const inv of invStore.inventoryList) {
      const data = editData[inv.id]
      if (data) {
        await invStore.updateInventory(inv.id, data)
      }
    }
    alert('库存更新成功！')
    showEditForm.value = false
  } catch (e) {
    alert('保存失败: ' + e.message)
  }
}
</script>

<style scoped>
.form-title {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 16px;
}

.inventory-edit-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.inventory-edit-item {
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 14px;
}

.edit-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.edit-item-name {
  font-weight: 600;
  color: #3E2C1C;
}

.inventory-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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

.stat-card.reserved .stat-value {
  color: #92400E;
}

.stat-card.available .stat-value {
  color: #065F46;
}

.stat-card.presale .stat-value {
  color: #C0392B;
}

.stat-card.roasting .stat-value {
  color: #92400E;
}

.inventory-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.inventory-item {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 20px;
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 18px;
}

@media (max-width: 640px) {
  .inventory-item {
    grid-template-columns: 1fr;
  }
}

.inventory-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inventory-name {
  font-size: 17px;
  font-weight: 600;
  color: #3E2C1C;
}

.inventory-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.status-on_sale {
  background: #D1FAE5;
  color: #065F46;
}

.status-presale {
  background: #F9E0D9;
  color: #C0392B;
}

.status-off_shelf {
  background: #F3F4F6;
  color: #6B7280;
}

.inventory-prices {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px dashed #EDE0D0;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 13px;
  color: #6F4E37;
}

.price-value {
  font-weight: 600;
  color: #3E2C1C;
}

.price-row.presale .price-value {
  color: #C0392B;
}

.discount-tag {
  display: inline-block;
  padding: 1px 8px;
  background: #FEE2E2;
  color: #991B1B;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.price-row.deposit .price-value {
  color: #8B4513;
}

.inventory-stock {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stock-bar {
  height: 8px;
  background: #F0E0D0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.stock-fill {
  height: 100%;
  background: linear-gradient(90deg, #6F4E37, #8B7355);
  border-radius: 4px;
  transition: width 0.3s;
}

.stock-fill.low {
  background: linear-gradient(90deg, #C0392B, #E74C3C);
}

.stock-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stock-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6F4E37;
}

.stock-value {
  font-weight: 600;
  color: #3E2C1C;
}

.stock-row.reserved .stock-value {
  color: #92400E;
}

.stock-row.available .stock-value {
  color: #065F46;
}

.stock-row.roasting .stock-value {
  color: #92400E;
}
</style>
