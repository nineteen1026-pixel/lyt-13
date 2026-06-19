<template>
  <div v-if="visible" class="qr-overlay" @click.self="close">
    <div class="qr-modal">
      <div class="qr-modal-header">
        <h3>🔲 风味溯源二维码</h3>
        <button class="btn btn-danger btn-sm" @click="close">×</button>
      </div>
      <div class="qr-modal-body">
        <div class="qr-order-info">
          <div class="qr-order-no">订单号: {{ orderNo }}</div>
          <div class="qr-customer">{{ customerName }}</div>
          <div v-if="generatedAt" class="qr-generated">生成于 {{ formatTime(generatedAt) }}</div>
        </div>

        <div class="qr-tabs">
          <button
            v-for="item in displayItems"
            :key="item.beanId"
            :class="['qr-tab', { active: activeBeanId === item.beanId }]"
            @click="switchBean(item.beanId)"
          >
            {{ item.beanName }}
          </button>
        </div>

        <div v-if="currentArchive" class="qr-content">
          <div class="qr-bean-info">
            <div class="qr-bean-name">{{ currentArchive.bean.name }}</div>
            <div class="qr-bean-meta">
              <span>{{ currentArchive.bean.origin }}</span>
              <span>{{ currentArchive.bean.variety }}</span>
              <span>{{ currentArchive.bean.process }}</span>
            </div>
          </div>

          <canvas ref="qrCanvas" class="qr-canvas"></canvas>

          <p class="qr-scan-hint">扫码即可打开完整溯源档案</p>
          <div v-if="currentQRUrl" class="qr-url-display">
            <a :href="currentQRUrl" target="_blank" class="qr-url-link">{{ currentQRUrl }}</a>
          </div>

          <div v-if="currentArchive.bean.flavorTags?.length" class="qr-flavor-section">
            <div class="qr-section-label">风味标签</div>
            <div class="qr-flavor-tags">
              <span v-for="tag in currentArchive.bean.flavorTags" :key="tag" class="flavor-dot">{{ tag }}</span>
            </div>
          </div>

          <div v-if="currentArchive.avgRating" class="qr-rating-section">
            <div class="qr-section-label">风味评分</div>
            <div class="qr-rating-grid">
              <div v-for="(val, key) in currentArchive.avgRating" :key="key" class="qr-rating-chip">
                <span class="chip-label">{{ ratingLabels[key] }}</span>
                <span class="chip-val">{{ val }}</span>
              </div>
            </div>
          </div>

          <div class="qr-chain-summary">
            <div class="chain-stat">
              <span class="chain-stat-val">{{ currentArchive.totalRoasts }}</span>
              <span class="chain-stat-label">烘焙</span>
            </div>
            <div class="chain-stat">
              <span class="chain-stat-val">{{ currentArchive.totalExtractions }}</span>
              <span class="chain-stat-label">萃取</span>
            </div>
            <div class="chain-stat">
              <span class="chain-stat-val">{{ currentArchive.curves.length }}</span>
              <span class="chain-stat-label">曲线</span>
            </div>
          </div>
        </div>
        <div v-else class="qr-empty">
          该豆种暂无溯源数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import QRCode from 'qrcode'
import { useCoffeeStore } from '../stores/coffee.js'

const store = useCoffeeStore()

const props = defineProps({
  visible: Boolean,
  orderNo: String,
  customerName: String,
  beanItems: { type: Array, default: () => [] },
  persistedQRCodes: { type: Array, default: () => [] },
})

const emit = defineEmits(['close'])

const qrCanvas = ref(null)
const activeBeanId = ref(null)

const ratingLabels = {
  acidity: '酸质',
  sweetness: '甜感',
  body: '醇厚度',
  aftertaste: '余韵',
  balance: '平衡度',
}

const displayItems = computed(() => {
  if (props.persistedQRCodes.length > 0) {
    return props.persistedQRCodes.map(q => ({
      beanId: q.beanId,
      beanName: q.beanName,
    }))
  }
  return props.beanItems
})

const generatedAt = computed(() => {
  if (props.persistedQRCodes.length > 0) {
    return props.persistedQRCodes[0].generatedAt
  }
  return null
})

const currentQRUrl = computed(() => {
  if (!activeBeanId.value) return null
  if (props.persistedQRCodes.length > 0) {
    const qr = props.persistedQRCodes.find(q => q.beanId === activeBeanId.value)
    if (qr) return qr.qrUrl
  }
  return store.buildQRUrl(activeBeanId.value)
})

const currentArchive = computed(() => {
  if (!activeBeanId.value) return null
  return store.getBeanTraceability(activeBeanId.value)
})

watch(() => props.visible, async (val) => {
  if (val && displayItems.value.length > 0) {
    activeBeanId.value = displayItems.value[0].beanId
    await renderQR()
  }
})

watch(activeBeanId, async () => {
  await renderQR()
})

async function renderQR() {
  await nextTick()
  const url = currentQRUrl.value
  if (url && qrCanvas.value) {
    QRCode.toCanvas(qrCanvas.value, url, {
      width: 200,
      margin: 2,
      color: { dark: '#3E2C1C', light: '#FFFDF9' },
    })
  }
}

function switchBean(beanId) {
  activeBeanId.value = beanId
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

function close() {
  emit('close')
}
</script>

<style scoped>
.qr-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(62, 44, 28, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.qr-modal {
  background: #FFFDF9;
  border-radius: 16px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(62, 44, 28, 0.25);
  max-height: 90vh;
  overflow-y: auto;
}
.qr-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #EDE0D0;
}
.qr-modal-header h3 {
  font-size: 17px;
  font-weight: 600;
  color: #3E2C1C;
}
.qr-modal-body {
  padding: 20px 24px;
}
.qr-order-info {
  text-align: center;
  margin-bottom: 14px;
}
.qr-order-no {
  font-size: 13px;
  color: #8B7355;
}
.qr-customer {
  font-size: 14px;
  font-weight: 500;
  color: #3E2C1C;
}
.qr-generated {
  font-size: 11px;
  color: #A08968;
  margin-top: 2px;
}
.qr-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  justify-content: center;
}
.qr-tab {
  padding: 5px 14px;
  border: 1px solid #D2B48C;
  border-radius: 16px;
  background: #FFF8F0;
  color: #6F4E37;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.qr-tab:hover {
  background: #F0E0D0;
}
.qr-tab.active {
  background: #6F4E37;
  color: #FFF8F0;
  border-color: #6F4E37;
}
.qr-content {
  text-align: center;
}
.qr-bean-info {
  margin-bottom: 16px;
}
.qr-bean-name {
  font-size: 17px;
  font-weight: 700;
  color: #3E2C1C;
  margin-bottom: 6px;
}
.qr-bean-meta {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 13px;
  color: #8B7355;
}
.qr-bean-meta span {
  padding: 2px 10px;
  background: #F0E0D0;
  border-radius: 12px;
}
.qr-canvas {
  display: block;
  margin: 0 auto 10px;
  border-radius: 8px;
}
.qr-scan-hint {
  font-size: 12px;
  color: #A08968;
  margin-bottom: 6px;
}
.qr-url-display {
  margin-bottom: 16px;
}
.qr-url-link {
  font-size: 11px;
  color: #6F4E37;
  word-break: break-all;
  text-decoration: underline;
}
.qr-url-link:hover {
  color: #3E2C1C;
}
.qr-section-label {
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
  margin-bottom: 8px;
}
.qr-flavor-section {
  margin-bottom: 14px;
}
.qr-flavor-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
.flavor-dot {
  display: inline-block;
  padding: 3px 12px;
  background: linear-gradient(135deg, #FFF0E0, #FFE0C0);
  color: #8B4513;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
}
.qr-rating-section {
  margin-bottom: 14px;
}
.qr-rating-grid {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}
.qr-rating-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 14px;
  font-size: 12px;
}
.chip-label {
  color: #8B7355;
}
.chip-val {
  font-weight: 600;
  color: #3E2C1C;
}
.qr-chain-summary {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding-top: 12px;
  border-top: 1px dashed #EDE0D0;
}
.chain-stat {
  text-align: center;
}
.chain-stat-val {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #3E2C1C;
}
.chain-stat-label {
  font-size: 11px;
  color: #A08968;
}
.qr-empty {
  text-align: center;
  padding: 30px 0;
  color: #B0A090;
  font-size: 14px;
}
</style>
