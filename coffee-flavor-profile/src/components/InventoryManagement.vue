<template>
  <div class="module-card">
    <div class="module-header">
      <h2>📦 库存管理</h2>
      <button class="btn btn-primary" @click="showEditForm = !showEditForm">
        {{ showEditForm ? '取消编辑' : '编辑库存' }}
      </button>
    </div>

    <div v-if="showEditForm" class="form-section">
      <h3 class="form-title">编辑库存与价格（按克重/研磨度规格）</h3>
      <div class="inventory-edit-list">
        <div v-for="group in invStore.inventoryGroupedByBean" :key="group.beanId" class="bean-group">
          <div class="bean-group-header">
            <span class="group-name">{{ group.beanName }}</span>
            <span class="tag">{{ group.beanOrigin }}</span>
            <span class="tag" :class="'status-' + group.status">
              {{ statusText(group.status) }}
            </span>
          </div>
          <div class="sku-edit-grid">
            <div v-for="sku in group.skus" :key="sku.id" class="sku-edit-card">
              <div class="sku-edit-header">
                <span class="sku-badge weight">{{ sku.weightLabel }}</span>
                <span class="sku-badge grind">{{ sku.grindLabel }}</span>
                <span class="sku-code">{{ sku.skuCode }}</span>
              </div>
              <div class="form-grid sku-form-grid">
                <div class="form-group">
                  <label>总库存</label>
                  <input type="number" v-model.number="editData[sku.id].stock" min="0" />
                </div>
                <div class="form-group">
                  <label>售价 (¥)</label>
                  <input type="number" v-model.number="editData[sku.id].price" min="0" step="0.01" />
                </div>
                <div class="form-group">
                  <label>预售价格 (¥)</label>
                  <input type="number" v-model.number="editData[sku.id].presalePrice" min="0" step="0.01" />
                </div>
                <div class="form-group">
                  <label>定金 (¥)</label>
                  <input type="number" v-model.number="editData[sku.id].deposit" min="0" step="0.01" />
                </div>
                <div class="form-group full-width">
                  <label>状态</label>
                  <select v-model="editData[sku.id].status">
                    <option value="on_sale">在售</option>
                    <option value="presale">预售中</option>
                    <option value="off_shelf">下架</option>
                  </select>
                </div>
              </div>
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
        <div class="stat-label">预售SKU</div>
      </div>
      <div class="stat-card sku">
        <div class="stat-value">{{ skuCount }}</div>
        <div class="stat-label">SKU总数</div>
      </div>
    </div>

    <div class="inventory-list">
      <div v-for="group in invStore.inventoryGroupedByBean" :key="group.beanId" class="bean-inventory-group">
        <div class="group-header">
          <div class="group-title">
            <span class="group-name">{{ group.beanName }}</span>
            <span class="tag">{{ group.beanOrigin }}</span>
            <span class="tag" :class="'status-' + group.status">
              {{ statusText(group.status) }}
            </span>
          </div>
          <div class="group-summary">
            <span>价格: ¥{{ group.minPrice.toFixed(2) }} - ¥{{ group.maxPrice.toFixed(2) }}</span>
            <span class="summary-stock">总库存: {{ group.totalStock }}</span>
            <span class="summary-available">可用: {{ group.totalAvailable }}</span>
          </div>
        </div>
        <div class="sku-list">
          <div v-for="sku in group.skus" :key="sku.id" class="inventory-item sku-item">
            <div class="inventory-info">
              <div class="sku-tags">
                <span class="sku-badge weight">{{ sku.weightLabel }}</span>
                <span class="sku-badge grind">{{ sku.grindLabel }}</span>
                <span class="tag" :class="'status-' + sku.status">
                  {{ statusText(sku.status) }}
                </span>
              </div>
              <div class="inventory-prices">
                <div class="price-row">
                  <span>售价:</span>
                  <span class="price-value">¥{{ sku.price.toFixed(2) }}</span>
                </div>
                <div class="price-row presale">
                  <span>预售价:</span>
                  <span class="price-value">¥{{ sku.presalePrice.toFixed(2) }}</span>
                  <span class="discount-tag">省 ¥{{ (sku.price - sku.presalePrice).toFixed(2) }}</span>
                </div>
                <div class="price-row deposit">
                  <span>定金:</span>
                  <span class="price-value">¥{{ sku.deposit.toFixed(2) }}</span>
                </div>
              </div>
            </div>
            <div class="inventory-stock">
              <div class="stock-bar">
                <div
                  class="stock-fill"
                  :style="{ width: stockPercent(sku) + '%' }"
                  :class="{ low: stockPercent(sku) < 20 }"
                ></div>
              </div>
              <div class="stock-details">
                <div class="stock-row">
                  <span>总库存:</span>
                  <span class="stock-value">{{ sku.stock }}</span>
                </div>
                <div class="stock-row reserved">
                  <span>订单占用:</span>
                  <span class="stock-value">{{ sku.reservedStock }}</span>
                </div>
                <div v-if="sku.roastReservedStock > 0" class="stock-row roasting">
                  <span>烘焙排产:</span>
                  <span class="stock-value">{{ sku.roastReservedStock }}</span>
                </div>
                <div class="stock-row available">
                  <span>可用:</span>
                  <span class="stock-value">{{ sku.availableStock }}</span>
                </div>
              </div>
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
  for (const sku of list) {
    if (!editData[sku.id]) {
      editData[sku.id] = {
        stock: sku.stock,
        price: sku.price,
        presalePrice: sku.presalePrice,
        deposit: sku.deposit,
        status: sku.status,
      }
    }
  }
}, { immediate: true, deep: true })

const totalStock = computed(() => invStore.inventoryList.reduce((s, i) => s + i.stock, 0))
const totalReserved = computed(() => invStore.inventoryList.reduce((s, i) => s + i.reservedStock, 0))
const totalRoastReserved = computed(() => invStore.inventoryList.reduce((s, i) => s + (i.roastReservedStock || 0), 0))
const totalAvailable = computed(() => totalStock.value - totalReserved.value)
const presaleCount = computed(() => invStore.inventoryList.filter(i => i.status === 'presale').length)
const skuCount = computed(() => invStore.inventoryList.length)

function stockPercent(sku) {
  if (sku.stock === 0) return 0
  return Math.round(((sku.stock - sku.reservedStock) / sku.stock) * 100)
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
    for (const sku of invStore.inventoryList) {
      const data = editData[sku.id]
      if (data) {
        await invStore.updateInventory(sku.id, data)
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
  gap: 20px;
  margin-bottom: 16px;
}

.bean-group {
  background: #FFFCF7;
  border: 1px solid #E8D5B7;
  border-radius: 12px;
  padding: 14px;
}

.bean-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #E8D5B7;
}

.group-name {
  font-weight: 600;
  color: #3E2C1C;
  font-size: 15px;
}

.sku-edit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.sku-edit-card {
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 12px;
}

.sku-edit-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.sku-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
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

.sku-code {
  font-size: 11px;
  color: #A08968;
  font-family: monospace;
}

.sku-form-grid {
  grid-template-columns: repeat(2, 1fr);
}

.sku-form-grid .full-width {
  grid-column: 1 / -1;
}

.inventory-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #3E2C1C;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
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

.stat-card.sku .stat-value {
  color: #6F4E37;
}

.inventory-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.bean-inventory-group {
  background: #FFFCF7;
  border: 1px solid #E8D5B7;
  border-radius: 12px;
  padding: 14px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #E8D5B7;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-summary {
  display: flex;
  gap: 14px;
  font-size: 13px;
  color: #6F4E37;
  flex-wrap: wrap;
}

.summary-stock {
  color: #8B4513;
  font-weight: 500;
}

.summary-available {
  color: #065F46;
  font-weight: 500;
}

.sku-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inventory-item {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 16px;
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 14px;
}

.sku-item {
  padding: 12px 14px;
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

.sku-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
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
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed #EDE0D0;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
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
  margin-bottom: 10px;
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
  gap: 3px;
}

.stock-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
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
