<template>
  <div class="module-card">
    <div class="module-header">
      <h2>📜 溯源档案</h2>
    </div>

    <div v-if="!selectedArchive" class="bean-selector">
      <p class="selector-hint">选择一颗豆种，查看其从产地到杯中的完整溯源链</p>
      <div class="bean-cards">
        <div
          v-for="archive in store.traceabilityArchives"
          :key="archive.bean.id"
          class="bean-card"
          @click="selectedBeanId = archive.bean.id"
        >
          <div class="bean-card-name">{{ archive.bean.name }}</div>
          <div class="bean-card-origin">{{ archive.bean.origin }}</div>
          <div class="bean-card-stats">
            <span>🔥 {{ archive.totalRoasts }}</span>
            <span>☕ {{ archive.totalExtractions }}</span>
          </div>
        </div>
      </div>
      <div v-if="store.beans.length === 0" class="empty-state">
        暂无豆种数据，请先在「豆种登记」中添加豆种
      </div>
    </div>

    <div v-else class="traceability-view">
      <button class="btn btn-back" @click="selectedBeanId = null">← 返回列表</button>

      <div class="archive-header">
        <div class="archive-title-row">
          <h3 class="archive-bean-name">{{ selectedArchive.bean.name }}</h3>
          <button class="btn btn-primary btn-sm" @click="showQR = true">🔳 风味二维码</button>
        </div>
        <div class="archive-meta">
          <span class="tag">{{ selectedArchive.bean.origin }}</span>
          <span class="tag">{{ selectedArchive.bean.variety }}</span>
          <span class="tag">{{ selectedArchive.bean.process }}</span>
        </div>
        <div v-if="selectedArchive.bean.flavorTags?.length" class="archive-flavors">
          <span v-for="tag in selectedArchive.bean.flavorTags" :key="tag" class="tag flavor-tag">{{ tag }}</span>
        </div>
      </div>

      <div class="timeline">
        <div class="timeline-step origin-step">
          <div class="step-icon">🌍</div>
          <div class="step-content">
            <div class="step-label">产地信息</div>
            <div class="step-detail">
              <div class="detail-row"><span class="detail-key">产地</span><span class="detail-val">{{ selectedArchive.bean.origin }}</span></div>
              <div class="detail-row"><span class="detail-key">品种</span><span class="detail-val">{{ selectedArchive.bean.variety }}</span></div>
              <div class="detail-row"><span class="detail-key">处理法</span><span class="detail-val">{{ selectedArchive.bean.process }}</span></div>
            </div>
          </div>
          <div class="step-connector"></div>
        </div>

        <div v-if="selectedArchive.curves.length > 0" class="timeline-step curve-step">
          <div class="step-icon">📈</div>
          <div class="step-content">
            <div class="step-label">烘焙曲线 ({{ selectedArchive.curves.length }})</div>
            <div v-for="curve in selectedArchive.curves" :key="curve.id" class="chain-card">
              <div class="chain-card-title">{{ curve.name }}</div>
              <div v-if="curve.description" class="chain-card-desc">{{ curve.description }}</div>
              <div class="chain-card-meta">{{ curve.nodes?.length || 0 }} 个温度节点</div>
            </div>
          </div>
          <div class="step-connector"></div>
        </div>

        <div v-if="selectedArchive.roastChain.length > 0" class="timeline-step roast-step">
          <div class="step-icon">🔥</div>
          <div class="step-content">
            <div class="step-label">烘焙记录 ({{ selectedArchive.totalRoasts }})</div>
            <div v-for="roast in selectedArchive.roastChain" :key="roast.id" class="chain-card roast-card">
              <div class="chain-card-header">
                <span class="chain-card-title">{{ roast.date }}</span>
                <span class="tag level-tag">{{ roast.level }}</span>
                <span v-if="roast.curve" class="tag curve-tag">📈 {{ roast.curve.name }}</span>
              </div>
              <div class="chain-card-meta">
                <span>{{ roast.temperature }}°C</span>
                <span>{{ roast.duration }} min</span>
              </div>
              <div v-if="roast.notes" class="chain-card-notes">{{ roast.notes }}</div>
              <div v-if="roast.extractions.length > 0" class="nested-extractions">
                <div class="nested-label">☕ 关联萃取 ({{ roast.extractions.length }})</div>
                <div v-for="ext in roast.extractions" :key="ext.id" class="nested-item">
                  <span class="tag method-tag">{{ ext.method }}</span>
                  <span class="nested-meta">{{ ext.ratio }} · {{ ext.temperature }}°C · {{ ext.time }}</span>
                  <div v-if="ext.notes" class="nested-notes">{{ ext.notes }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="step-connector"></div>
        </div>

        <div v-if="selectedArchive.unlinkedExtractions.length > 0" class="timeline-step extraction-step">
          <div class="step-icon">☕</div>
          <div class="step-content">
            <div class="step-label">独立萃取记录 ({{ selectedArchive.unlinkedExtractions.length }})</div>
            <div v-for="ext in selectedArchive.unlinkedExtractions" :key="ext.id" class="chain-card">
              <div class="chain-card-header">
                <span class="chain-card-title">{{ ext.date }}</span>
                <span class="tag method-tag">{{ ext.method }}</span>
              </div>
              <div class="chain-card-meta">
                <span v-if="ext.ratio">{{ ext.ratio }}</span>
                <span v-if="ext.temperature">{{ ext.temperature }}°C</span>
                <span v-if="ext.time">{{ ext.time }}</span>
              </div>
              <div v-if="ext.notes" class="chain-card-notes">{{ ext.notes }}</div>
            </div>
          </div>
          <div class="step-connector"></div>
        </div>

        <div v-if="selectedArchive.avgRating" class="timeline-step rating-step">
          <div class="step-icon">📊</div>
          <div class="step-content">
            <div class="step-label">风味评分</div>
            <div class="rating-bars">
              <div v-for="(val, key) in selectedArchive.avgRating" :key="key" class="rating-bar-row">
                <span class="rating-bar-label">{{ ratingLabels[key] }}</span>
                <div class="rating-bar-track">
                  <div class="rating-bar-fill" :style="{ width: (val / 10 * 100) + '%' }"></div>
                </div>
                <span class="rating-bar-val">{{ val }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedArchive.totalRoasts === 0 && selectedArchive.totalExtractions === 0" class="timeline-step empty-step">
          <div class="step-icon">📝</div>
          <div class="step-content">
            <div class="step-label">暂无后续记录</div>
            <p class="step-hint">该豆种尚无烘焙与萃取记录，请先在「烘焙记录」和「萃取日志」中添加数据</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showQR" class="qr-overlay" @click.self="showQR = false">
      <div class="qr-modal">
        <div class="qr-modal-header">
          <h3>风味二维码</h3>
          <button class="btn btn-danger btn-sm" @click="showQR = false">×</button>
        </div>
        <div class="qr-modal-body">
          <div class="qr-bean-name">{{ selectedArchive?.bean.name }}</div>
          <div class="qr-bean-meta">
            <span>{{ selectedArchive?.bean.origin }}</span>
            <span>{{ selectedArchive?.bean.variety }}</span>
            <span>{{ selectedArchive?.bean.process }}</span>
          </div>
          <canvas ref="qrCanvas" class="qr-canvas"></canvas>
          <p class="qr-hint">扫描二维码查看豆种溯源与风味档案</p>
          <div class="qr-summary">
            <div v-if="selectedArchive?.avgRating" class="qr-rating-summary">
              <span v-for="(val, key) in selectedArchive.avgRating" :key="key" class="qr-rating-item">
                {{ ratingLabels[key] }} {{ val }}
              </span>
            </div>
            <div v-if="selectedArchive?.bean.flavorTags?.length" class="qr-flavor-tags">
              <span v-for="tag in selectedArchive.bean.flavorTags" :key="tag" class="tag flavor-tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import QRCode from 'qrcode'
import { useCoffeeStore } from '../stores/coffee.js'

const store = useCoffeeStore()
const selectedBeanId = ref(null)
const showQR = ref(false)
const qrCanvas = ref(null)

const ratingLabels = {
  acidity: '酸质',
  sweetness: '甜感',
  body: '醇厚度',
  aftertaste: '余韵',
  balance: '平衡度',
}

const selectedArchive = computed(() => {
  if (!selectedBeanId.value) return null
  return store.getBeanTraceability(selectedBeanId.value)
})

watch(showQR, async (val) => {
  if (val && selectedBeanId.value) {
    await nextTick()
    const payload = store.buildQRPayload(selectedBeanId.value)
    if (payload && qrCanvas.value) {
      QRCode.toCanvas(qrCanvas.value, payload, {
        width: 220,
        margin: 2,
        color: { dark: '#3E2C1C', light: '#FFFDF9' },
      })
    }
  }
})
</script>

<style scoped>
.bean-selector {
  text-align: center;
  padding: 10px 0;
}
.selector-hint {
  font-size: 14px;
  color: #8B7355;
  margin-bottom: 20px;
}
.bean-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}
.bean-card {
  background: #FFF8F0;
  border: 2px solid #EDE0D0;
  border-radius: 12px;
  padding: 18px 16px;
  cursor: pointer;
  transition: all 0.25s;
  text-align: left;
}
.bean-card:hover {
  border-color: #6F4E37;
  box-shadow: 0 4px 16px rgba(111, 78, 55, 0.15);
  transform: translateY(-2px);
}
.bean-card-name {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 6px;
}
.bean-card-origin {
  font-size: 13px;
  color: #8B7355;
  margin-bottom: 8px;
}
.bean-card-stats {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #A08968;
}
.btn-back {
  background: transparent;
  color: #6F4E37;
  border: 1px solid #D2B48C;
  margin-bottom: 16px;
}
.btn-back:hover {
  background: #F0E0D0;
}
.archive-header {
  margin-bottom: 24px;
}
.archive-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.archive-bean-name {
  font-size: 22px;
  font-weight: 700;
  color: #3E2C1C;
}
.archive-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.archive-flavors {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.flavor-tag {
  background: linear-gradient(135deg, #FFF0E0, #FFE0C0);
  color: #8B4513;
}
.timeline {
  position: relative;
  padding-left: 12px;
}
.timeline-step {
  position: relative;
  display: flex;
  gap: 16px;
  padding-bottom: 24px;
}
.step-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: #FFF8F0;
  border: 2px solid #EDE0D0;
  border-radius: 50%;
  z-index: 1;
}
.origin-step .step-icon {
  border-color: #6F4E37;
  background: #F5EDE4;
}
.curve-step .step-icon {
  border-color: #D4A574;
  background: #FFF5EB;
}
.roast-step .step-icon {
  border-color: #C0392B;
  background: #FEF0EE;
}
.extraction-step .step-icon {
  border-color: #8B6914;
  background: #FFFDE7;
}
.rating-step .step-icon {
  border-color: #3E6B3E;
  background: #F0F7F0;
}
.step-connector {
  position: absolute;
  left: 21px;
  top: 44px;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #D2B48C, #EDE0D0);
}
.step-content {
  flex: 1;
  min-width: 0;
}
.step-label {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 10px;
}
.step-detail {
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 14px 16px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
}
.detail-key {
  color: #8B7355;
  font-weight: 500;
}
.detail-val {
  color: #3E2C1C;
  font-weight: 600;
}
.step-hint {
  font-size: 13px;
  color: #A08968;
  margin-top: 4px;
}
.chain-card {
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 8px;
}
.chain-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.chain-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #3E2C1C;
}
.chain-card-desc {
  font-size: 13px;
  color: #8B7355;
  margin-bottom: 4px;
  font-style: italic;
}
.chain-card-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #A08968;
}
.chain-card-notes {
  font-size: 13px;
  color: #6F4E37;
  font-style: italic;
  margin-top: 4px;
}
.curve-tag {
  background: linear-gradient(135deg, #FFF0E0, #FFE0C0);
  color: #8B4513;
}
.nested-extractions {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #EDE0D0;
}
.nested-label {
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
  margin-bottom: 8px;
}
.nested-item {
  background: #FFFCF7;
  border: 1px solid #F0E0D0;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 6px;
}
.nested-meta {
  font-size: 12px;
  color: #8B7355;
  margin-left: 8px;
}
.nested-notes {
  font-size: 12px;
  color: #6F4E37;
  font-style: italic;
  margin-top: 2px;
}
.rating-bars {
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 14px 16px;
}
.rating-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}
.rating-bar-label {
  width: 56px;
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
  flex-shrink: 0;
}
.rating-bar-track {
  flex: 1;
  height: 10px;
  background: #F0E0D0;
  border-radius: 5px;
  overflow: hidden;
}
.rating-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #D2B48C, #6F4E37);
  border-radius: 5px;
  transition: width 0.4s ease;
}
.rating-bar-val {
  width: 28px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: #3E2C1C;
}
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
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(62, 44, 28, 0.25);
}
.qr-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #EDE0D0;
}
.qr-modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #3E2C1C;
}
.qr-modal-body {
  padding: 24px;
  text-align: center;
}
.qr-bean-name {
  font-size: 18px;
  font-weight: 700;
  color: #3E2C1C;
  margin-bottom: 6px;
}
.qr-bean-meta {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
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
  margin: 0 auto 16px;
  border-radius: 8px;
}
.qr-hint {
  font-size: 12px;
  color: #A08968;
  margin-bottom: 16px;
}
.qr-summary {
  text-align: left;
}
.qr-rating-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  justify-content: center;
}
.qr-rating-item {
  font-size: 12px;
  color: #6F4E37;
  background: #FFF8F0;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid #EDE0D0;
}
.qr-flavor-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
