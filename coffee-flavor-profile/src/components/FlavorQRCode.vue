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
          <div v-if="generatedAt" class="qr-generated">核销于 {{ formatTime(generatedAt) }}</div>
          <div v-if="usingSnapshot" class="qr-data-badge">📸 快照数据（核销时封存）</div>
          <div v-else class="qr-data-badge qr-data-badge-live">⚡ 实时数据</div>
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

          <div v-if="!qrChunkMode">
            <canvas ref="qrCanvas" class="qr-canvas"></canvas>
            <div v-if="qrTruncated" class="qr-truncated-hint">
              ⚠️ 数据较大，已生成多个分包二维码（见下方），依次扫码即可获得完整档案。
            </div>
          </div>

          <div v-if="qrChunkMode" class="qr-chunks-container">
            <div class="qr-chunk-hint">
              📦 数据较大，已拆分为 {{ qrChunks.length }} 个分包二维码。<br>
              请依次扫码每一段，然后粘贴到「溯源档案 → 粘贴 JSON 查看」页面即可还原完整档案。
            </div>
            <div class="qr-chunks-grid">
              <div v-for="(chunk, i) in qrChunks" :key="i" class="qr-chunk-item">
                <div class="qr-chunk-label">第 {{ i + 1 }} / {{ qrChunks.length }} 段</div>
                <canvas :id="'flavor-qr-chunk-' + i" class="qr-canvas qr-chunk-canvas"></canvas>
              </div>
            </div>
          </div>

          <p class="qr-scan-hint">扫码即可查看溯源档案数据</p>

          <div class="qr-url-display">
            <div class="qr-url-label">深度链接（扫码直接打开完整档案）：</div>
            <a v-if="currentQRUrl" :href="currentQRUrl" target="_blank" class="qr-url-link">{{ currentQRUrl }}</a>
          </div>

          <div class="qr-action-row">
            <button class="btn btn-sm" @click="copyFullData">📋 复制完整数据</button>
            <button class="btn btn-sm" @click="downloadHtml">📄 下载 HTML</button>
            <button class="btn btn-sm" @click="showJsonPreview = !showJsonPreview">
              {{ showJsonPreview ? '隐藏' : '查看' }} JSON
            </button>
          </div>

          <div v-if="showJsonPreview" class="qr-json-preview">
            <textarea readonly :value="fullQRData" class="json-textarea"></textarea>
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
              <span class="chain-stat-val">{{ currentArchive.curves?.length || 0 }}</span>
              <span class="chain-stat-label">曲线</span>
            </div>
            <div class="chain-stat">
              <span class="chain-stat-val">{{ currentArchive.totalRoasts || 0 }}</span>
              <span class="chain-stat-label">烘焙</span>
            </div>
            <div class="chain-stat">
              <span class="chain-stat-val">{{ currentArchive.totalExtractions || 0 }}</span>
              <span class="chain-stat-label">萃取</span>
            </div>
          </div>

          <div v-if="currentArchive.curves?.length" class="qr-detail-section">
            <div class="qr-section-label">烘焙曲线</div>
            <div v-for="curve in currentArchive.curves" :key="curve.id" class="qr-detail-card">
              <div class="detail-card-title">📈 {{ curve.name }}</div>
              <div v-if="curve.description" class="detail-card-desc">{{ curve.description }}</div>
              <div class="detail-card-meta">{{ curve.nodes?.length || 0 }} 个温度节点</div>
            </div>
          </div>

          <div v-if="currentArchive.roastChain?.length" class="qr-detail-section">
            <div class="qr-section-label">烘焙记录</div>
            <div v-for="roast in currentArchive.roastChain" :key="roast.id" class="qr-detail-card">
              <div class="detail-card-title">🔥 {{ roast.date }} · {{ roast.level }}</div>
              <div class="detail-card-meta">{{ roast.temperature }}°C · {{ roast.duration }} min</div>
              <div v-if="roast.curve?.name" class="detail-card-meta">曲线：{{ roast.curve.name }}</div>
              <div v-if="roast.notes" class="detail-card-notes">{{ roast.notes }}</div>
              <div v-if="roast.extractions?.length" class="detail-nested">
                <div v-for="ext in roast.extractions" :key="ext.id" class="nested-row">
                  <span class="nested-method">☕ {{ ext.method }}</span>
                  <span class="nested-meta">{{ ext.ratio }} · {{ ext.temperature }}°C · {{ ext.time }}</span>
                  <div v-if="ext.notes" class="nested-notes">{{ ext.notes }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="currentArchive.unlinkedExtractions?.length" class="qr-detail-section">
            <div class="qr-section-label">独立萃取记录</div>
            <div v-for="ext in currentArchive.unlinkedExtractions" :key="ext.id" class="qr-detail-card">
              <div class="detail-card-title">☕ {{ ext.date }} · {{ ext.method }}</div>
              <div class="detail-card-meta">{{ ext.ratio }} · {{ ext.temperature }}°C · {{ ext.time }}</div>
              <div v-if="ext.notes" class="detail-card-notes">{{ ext.notes }}</div>
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
const showJsonPreview = ref(false)
const qrTruncated = ref(false)
const qrChunkMode = ref(false)
const qrChunks = ref([])

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

const usingSnapshot = computed(() => {
  return props.persistedQRCodes.length > 0
})

function parseSnapshot(qrRecord) {
  if (!qrRecord || !qrRecord.snapshot) return null
  try {
    return JSON.parse(qrRecord.snapshot)
  } catch (e) {
    return null
  }
}

const currentPersistedQR = computed(() => {
  if (!activeBeanId.value || props.persistedQRCodes.length === 0) return null
  return props.persistedQRCodes.find(q => q.beanId === activeBeanId.value) || null
})

const currentArchive = computed(() => {
  if (!activeBeanId.value) return null
  const persisted = currentPersistedQR.value
  if (persisted) {
    const snap = parseSnapshot(persisted)
    if (snap) return snap
  }
  return store.getBeanTraceability(activeBeanId.value)
})

const fullQRData = computed(() => {
  if (!activeBeanId.value) return ''
  const persisted = currentPersistedQR.value
  if (persisted && persisted.qrData) {
    return persisted.qrData
  }
  const archive = currentArchive.value
  if (archive) {
    return JSON.stringify(archive)
  }
  return ''
})

const currentQRUrl = computed(() => {
  const persisted = currentPersistedQR.value
  if (persisted && persisted.qrUrl) {
    const jsonStr = fullQRData.value
    const base = window.location.origin + window.location.pathname
    try {
      const utf8 = unescape(encodeURIComponent(jsonStr))
      const b64 = btoa(utf8)
      return `${base}#/view/${b64}`
    } catch (e) {}
    return persisted.qrUrl
  }
  if (activeBeanId.value) return store.buildQRViewUrl(activeBeanId.value) || store.buildQRUrl(activeBeanId.value)
  return null
})

function getCompactQRData() {
  const archive = currentArchive.value
  if (!archive) return ''
  const compact = {
    v: 1,
    compact: true,
    deepLinkUrl: currentQRUrl.value,
    bean: archive.bean,
    avgRating: archive.avgRating,
    totalRoasts: archive.totalRoasts,
    totalExtractions: archive.totalExtractions,
    curves: (archive.curves || []).map(c => ({
      id: c.id, name: c.name, description: c.description, nodeCount: c.nodes?.length,
    })),
    roastChain: (archive.roastChain || []).map(r => ({
      id: r.id, date: r.date, level: r.level, temperature: r.temperature,
      duration: r.duration, notes: r.notes,
      curve: r.curve ? { name: r.curve.name } : null,
      extractions: (r.extractions || []).map(e => ({
        id: e.id, date: e.date, method: e.method, ratio: e.ratio,
        temperature: e.temperature, time: e.time, notes: e.notes,
      })),
    })),
    unlinkedExtractions: (archive.unlinkedExtractions || []).map(e => ({
      id: e.id, date: e.date, method: e.method, ratio: e.ratio,
      temperature: e.temperature, time: e.time, notes: e.notes,
    })),
  }
  return JSON.stringify(compact)
}

watch(() => props.visible, async (val) => {
  if (val && displayItems.value.length > 0) {
    activeBeanId.value = displayItems.value[0].beanId
    showJsonPreview.value = false
    qrChunkMode.value = false
    qrChunks.value = []
    await renderQR()
  }
})

watch(activeBeanId, async () => {
  showJsonPreview.value = false
  qrChunkMode.value = false
  qrChunks.value = []
  await renderQR()
})

async function renderChunks(chunks) {
  await nextTick()
  for (let i = 0; i < chunks.length; i++) {
    const canvas = document.getElementById(`flavor-qr-chunk-${i}`)
    if (!canvas) continue
    try {
      await QRCode.toCanvas(canvas, store.getChunkQRText(chunks[i]), {
        width: 160,
        margin: 2,
        errorCorrectionLevel: 'L',
        color: { dark: '#3E2C1C', light: '#FFFDF9' },
      })
    } catch (e) {}
  }
}

async function renderQR() {
  await nextTick()
  if (!qrCanvas.value) return
  qrTruncated.value = false
  qrChunkMode.value = false
  qrChunks.value = []
  let primaryUrl = currentQRUrl.value
  if (!primaryUrl) return
  try {
    await QRCode.toCanvas(qrCanvas.value, primaryUrl, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: { dark: '#3E2C1C', light: '#FFFDF9' },
    })
  } catch (e) {
    qrTruncated.value = true
    const jsonStr = fullQRData.value
    const chunks = store.chunkQRPayload(jsonStr)
    if (chunks.length > 1) {
      qrChunkMode.value = true
      qrChunks.value = chunks
      await nextTick()
      await renderChunks(chunks)
    } else if (chunks.length === 1) {
      try {
        await QRCode.toCanvas(qrCanvas.value, store.getChunkQRText(chunks[0]), {
          width: 200,
          margin: 2,
          errorCorrectionLevel: 'L',
          color: { dark: '#3E2C1C', light: '#FFFDF9' },
        })
      } catch (e2) {}
    }
  }
}

function switchBean(beanId) {
  activeBeanId.value = beanId
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

async function copyFullData() {
  const data = fullQRData.value
  if (!data) return
  try {
    await navigator.clipboard.writeText(data)
    alert('完整溯源数据已复制到剪贴板')
  } catch (e) {
    alert('复制失败，请手动从 JSON 预览框复制')
    showJsonPreview.value = true
  }
}

function downloadHtml() {
  if (!currentArchive.value) return
  const html = store.buildStandaloneHtml(currentArchive.value)
  if (!html) return
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const name = (currentArchive.value.bean?.name || 'traceability').replace(/[^\w\u4e00-\u9fa5-]/g, '_')
  a.href = url
  a.download = `${name}_溯源档案.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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
  max-width: 460px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(62, 44, 28, 0.25);
  max-height: 92vh;
  overflow-y: auto;
}
.qr-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #EDE0D0;
  position: sticky;
  top: 0;
  background: #FFFDF9;
  z-index: 1;
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
.qr-data-badge {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 10px;
  background: #E8F5E9;
  color: #2E7D32;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}
.qr-data-badge-live {
  background: #FFF3E0;
  color: #E65100;
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
  margin: 0 auto 6px;
  border-radius: 8px;
}
.qr-truncated-hint {
  font-size: 11px;
  color: #D84315;
  background: #FBE9E7;
  padding: 6px 10px;
  border-radius: 8px;
  margin-bottom: 6px;
}
.qr-chunks-container {
  text-align: center;
  margin-bottom: 8px;
}
.qr-chunk-hint {
  background: #FFF3E0;
  color: #5D4037;
  padding: 8px 12px;
  border-radius: 8px;
  margin: 6px 0 10px;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
}
.qr-chunks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.qr-chunk-item {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 8px;
}
.qr-chunk-label {
  font-size: 11px;
  font-weight: 600;
  color: #6F4E37;
  margin-bottom: 4px;
}
.qr-chunk-canvas {
  width: 140px !important;
  height: 140px !important;
}
.qr-scan-hint {
  font-size: 12px;
  color: #A08968;
  margin-bottom: 10px;
}
.qr-url-display {
  margin-bottom: 12px;
  text-align: left;
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 8px;
  padding: 8px 12px;
}
.qr-url-label {
  font-size: 11px;
  color: #8B7355;
  margin-bottom: 2px;
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
.qr-action-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 14px;
}
.qr-action-row .btn-sm {
  background: #FFF8F0;
  border: 1px solid #D2B48C;
  color: #6F4E37;
}
.qr-action-row .btn-sm:hover {
  background: #F0E0D0;
}
.qr-json-preview {
  margin-bottom: 14px;
}
.json-textarea {
  width: 100%;
  height: 160px;
  font-family: monospace;
  font-size: 11px;
  padding: 8px;
  border: 1px solid #EDE0D0;
  border-radius: 8px;
  background: #FFFDF9;
  color: #3E2C1C;
  resize: vertical;
}
.qr-section-label {
  font-size: 13px;
  font-weight: 600;
  color: #6F4E37;
  margin-bottom: 8px;
  text-align: left;
}
.qr-flavor-section {
  margin-bottom: 14px;
  text-align: left;
}
.qr-flavor-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-start;
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
  text-align: left;
}
.qr-rating-grid {
  display: flex;
  gap: 6px;
  justify-content: flex-start;
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
  padding: 12px 0;
  margin-bottom: 14px;
  border-top: 1px dashed #EDE0D0;
  border-bottom: 1px dashed #EDE0D0;
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
.qr-detail-section {
  margin-bottom: 14px;
  text-align: left;
}
.qr-detail-card {
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 6px;
}
.detail-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 2px;
}
.detail-card-desc {
  font-size: 12px;
  color: #8B7355;
  font-style: italic;
  margin-bottom: 2px;
}
.detail-card-meta {
  font-size: 12px;
  color: #A08968;
}
.detail-card-notes {
  font-size: 12px;
  color: #6F4E37;
  font-style: italic;
  margin-top: 2px;
}
.detail-nested {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #E0D0B8;
}
.nested-row {
  padding: 4px 0;
}
.nested-method {
  font-size: 12px;
  font-weight: 500;
  color: #6F4E37;
}
.nested-meta {
  font-size: 12px;
  color: #A08968;
  margin-left: 6px;
}
.nested-notes {
  font-size: 11px;
  color: #8B7355;
  font-style: italic;
  margin-top: 1px;
}
.qr-empty {
  text-align: center;
  padding: 30px 0;
  color: #B0A090;
  font-size: 14px;
}
</style>
