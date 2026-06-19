<template>
  <div class="module-card">
    <div class="module-header">
      <h2>📜 溯源档案</h2>
      <div class="header-actions">
        <button class="btn btn-sm" @click="importMode = !importMode">
          {{ importMode ? '📋 返回列表' : '📋 粘贴 JSON 查看' }}
        </button>
      </div>
    </div>

    <div v-if="importMode" class="import-view">
      <p class="selector-hint">将扫码获取的溯源 JSON 粘贴到下方，即可查看完整档案</p>
      <div class="import-box">
        <textarea
          v-model="importedJson"
          class="import-textarea"
          placeholder='例如：{"v":1,"bean":{...},"curves":[...],"roastChain":[...}'
        ></textarea>
        <div class="import-actions">
          <button class="btn btn-primary btn-sm" @click="parseImportedJson" :disabled="!importedJson.trim()">📖 解析查看</button>
          <button class="btn btn-sm" @click="importedJson = ''; importedArchive = null; importError = ''">清空</button>
        </div>
        <div v-if="importError" class="import-error">{{ importError }}</div>
      </div>

      <div v-if="importedArchive" class="imported-archive">
        <div class="archive-header">
          <div class="archive-title-row">
            <h3 class="archive-bean-name">{{ importedArchive.bean.name }}</h3>
            <div class="qr-data-badge">📋 导入数据</div>
          </div>
          <div class="archive-meta">
            <span class="tag">{{ importedArchive.bean.origin }}</span>
            <span class="tag">{{ importedArchive.bean.variety }}</span>
            <span class="tag">{{ importedArchive.bean.process }}</span>
          </div>
          <div v-if="importedArchive.bean.flavorTags?.length" class="archive-flavors">
            <span v-for="tag in importedArchive.bean.flavorTags" :key="tag" class="tag flavor-tag">{{ tag }}</span>
          </div>
          <div v-if="importedArchive.deepLinkUrl" class="archive-deeplink">
            深度链接：<a :href="importedArchive.deepLinkUrl" target="_blank">{{ importedArchive.deepLinkUrl }}</a>
          </div>
        </div>
        <div class="timeline">
          <timeline-origin :archive="importedArchive" />
          <timeline-curves :archive="importedArchive" />
          <timeline-roasts :archive="importedArchive" />
          <timeline-extractions :archive="importedArchive" />
          <timeline-rating :archive="importedArchive" />
          <timeline-empty :archive="importedArchive" />
        </div>
      </div>
    </div>

    <div v-else-if="!selectedArchive" class="bean-selector">
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
        <timeline-origin :archive="selectedArchive" />
        <timeline-curves :archive="selectedArchive" />
        <timeline-roasts :archive="selectedArchive" />
        <timeline-extractions :archive="selectedArchive" />
        <timeline-rating :archive="selectedArchive" />
        <timeline-empty :archive="selectedArchive" />
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
          <div v-if="qrTruncated" class="qr-truncated-hint">
            ⚠️ 数据较大，二维码内为精简数据。点击下方「复制完整数据」获取完整档案。
          </div>
          <p class="qr-hint">扫码即可查看溯源档案数据</p>
          <div class="qr-url-display">
            <div class="qr-url-label">深度链接：</div>
            <a v-if="currentQRUrl" :href="currentQRUrl" target="_blank" class="qr-url-link">{{ currentQRUrl }}</a>
          </div>
          <div class="qr-action-row">
            <button class="btn btn-sm" @click="copyFullData">📋 复制完整数据</button>
            <button class="btn btn-sm" @click="showJsonPreview = !showJsonPreview">
              {{ showJsonPreview ? '隐藏' : '查看' }} JSON
            </button>
          </div>
          <div v-if="showJsonPreview" class="qr-json-preview">
            <textarea readonly :value="fullQRData" class="json-textarea"></textarea>
          </div>
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

<script>
import { h, defineComponent } from 'vue'

const ratingLabels = {
  acidity: '酸质',
  sweetness: '甜感',
  body: '醇厚度',
  aftertaste: '余韵',
  balance: '平衡度',
}

function makeStep(icon, className, label, content, showConnector = true) {
  return h('div', { class: ['timeline-step', className] }, [
    h('div', { class: 'step-icon' }, icon),
    h('div', { class: 'step-content' }, [
      h('div', { class: 'step-label' }, label),
      content,
    ]),
    showConnector ? h('div', { class: 'step-connector' }) : null,
  ])
}

const TimelineOrigin = defineComponent({
  name: 'TimelineOrigin',
  props: { archive: Object },
  setup(props) {
    return () => makeStep('🌍', 'origin-step', '产地信息',
      h('div', { class: 'step-detail' }, [
        h('div', { class: 'detail-row' }, [h('span', { class: 'detail-key' }, '产地'), h('span', { class: 'detail-val' }, props.archive.bean.origin)]),
        h('div', { class: 'detail-row' }, [h('span', { class: 'detail-key' }, '品种'), h('span', { class: 'detail-val' }, props.archive.bean.variety)]),
        h('div', { class: 'detail-row' }, [h('span', { class: 'detail-key' }, '处理法'), h('span', { class: 'detail-val' }, props.archive.bean.process)]),
      ])
    )
  },
})

const TimelineCurves = defineComponent({
  name: 'TimelineCurves',
  props: { archive: Object },
  setup(props) {
    return () => {
      const curves = props.archive.curves || []
      if (!curves.length) return null
      return makeStep('📈', 'curve-step', `烘焙曲线 (${curves.length})`,
        curves.map(curve => h('div', { class: 'chain-card', key: curve.id }, [
          h('div', { class: 'chain-card-title' }, curve.name),
          curve.description ? h('div', { class: 'chain-card-desc' }, curve.description) : null,
          h('div', { class: 'chain-card-meta' }, `${curve.nodes?.length || 0} 个温度节点`),
        ]))
      )
    }
  },
})

const TimelineRoasts = defineComponent({
  name: 'TimelineRoasts',
  props: { archive: Object },
  setup(props) {
    return () => {
      const roasts = props.archive.roastChain || []
      if (!roasts.length) return null
      return makeStep('🔥', 'roast-step', `烘焙记录 (${props.archive.totalRoasts || roasts.length})`,
        roasts.map(roast => h('div', { class: 'chain-card roast-card', key: roast.id }, [
          h('div', { class: 'chain-card-header' }, [
            h('span', { class: 'chain-card-title' }, roast.date),
            h('span', { class: 'tag level-tag' }, roast.level),
            roast.curve ? h('span', { class: 'tag curve-tag' }, `📈 ${roast.curve.name}`) : null,
          ]),
          h('div', { class: 'chain-card-meta' }, [
            h('span', null, `${roast.temperature}°C`),
            h('span', null, `${roast.duration} min`),
          ]),
          roast.notes ? h('div', { class: 'chain-card-notes' }, roast.notes) : null,
          roast.extractions?.length ? h('div', { class: 'nested-extractions' }, [
            h('div', { class: 'nested-label' }, `☕ 关联萃取 (${roast.extractions.length})`),
            ...roast.extractions.map(ext => h('div', { class: 'nested-item', key: ext.id }, [
              h('span', { class: 'tag method-tag' }, ext.method),
              h('span', { class: 'nested-meta' }, `${ext.ratio} · ${ext.temperature}°C · ${ext.time}`),
              ext.notes ? h('div', { class: 'nested-notes' }, ext.notes) : null,
            ])),
          ]) : null,
        ]))
      )
    }
  },
})

const TimelineExtractions = defineComponent({
  name: 'TimelineExtractions',
  props: { archive: Object },
  setup(props) {
    return () => {
      const exts = props.archive.unlinkedExtractions || []
      if (!exts.length) return null
      return makeStep('☕', 'extraction-step', `独立萃取记录 (${exts.length})`,
        exts.map(ext => h('div', { class: 'chain-card', key: ext.id }, [
          h('div', { class: 'chain-card-header' }, [
            h('span', { class: 'chain-card-title' }, ext.date),
            h('span', { class: 'tag method-tag' }, ext.method),
          ]),
          h('div', { class: 'chain-card-meta' }, [
            ext.ratio ? h('span', null, ext.ratio) : null,
            ext.temperature ? h('span', null, `${ext.temperature}°C`) : null,
            ext.time ? h('span', null, ext.time) : null,
          ]),
          ext.notes ? h('div', { class: 'chain-card-notes' }, ext.notes) : null,
        ]))
      )
    }
  },
})

const TimelineRating = defineComponent({
  name: 'TimelineRating',
  props: { archive: Object },
  setup(props) {
    return () => {
      const rating = props.archive.avgRating
      if (!rating) return null
      return makeStep('📊', 'rating-step', '风味评分',
        h('div', { class: 'rating-bars' },
          Object.entries(rating).map(([key, val]) => h('div', { class: 'rating-bar-row', key }, [
            h('span', { class: 'rating-bar-label' }, ratingLabels[key]),
            h('div', { class: 'rating-bar-track' }, [
              h('div', { class: 'rating-bar-fill', style: { width: `${(val / 10 * 100)}%` } }),
            ]),
            h('span', { class: 'rating-bar-val' }, String(val)),
          ]))
        ),
        false
      )
    }
  },
})

const TimelineEmpty = defineComponent({
  name: 'TimelineEmpty',
  props: { archive: Object },
  setup(props) {
    return () => {
      const hasAny = (props.archive.totalRoasts || (props.archive.roastChain?.length) || (props.archive.totalExtractions) || (props.archive.unlinkedExtractions?.length))
      if (hasAny) return null
      return makeStep('📝', 'empty-step', '暂无后续记录',
        h('p', { class: 'step-hint' }, '该豆种尚无烘焙与萃取记录'),
        false
      )
    }
  },
})

import { ref, computed, watch, nextTick, onMounted } from 'vue'
import QRCode from 'qrcode'
import { useCoffeeStore } from '../stores/coffee.js'

export default {
  components: { TimelineOrigin, TimelineCurves, TimelineRoasts, TimelineExtractions, TimelineRating, TimelineEmpty },
  props: {
    initialBeanId: { type: Number, default: null },
  },
  setup(props) {
    const store = useCoffeeStore()

    const selectedBeanId = ref(null)
    const importMode = ref(false)
    const importedJson = ref('')
    const importedArchive = ref(null)
    const importError = ref('')
    const showQR = ref(false)
    const showJsonPreview = ref(false)
    const qrCanvas = ref(null)
    const qrTruncated = ref(false)

    const selectedArchive = computed(() => {
      if (!selectedBeanId.value) return null
      return store.getBeanTraceability(selectedBeanId.value)
    })

    const fullQRData = computed(() => {
      if (!selectedArchive.value) return ''
      return store.buildQRPayload(selectedBeanId.value)
    })

    const currentQRUrl = computed(() => {
      if (selectedBeanId.value) return store.buildQRUrl(selectedBeanId.value)
      return null
    })

    onMounted(() => {
      if (props.initialBeanId) {
        selectedBeanId.value = props.initialBeanId
      }
    })

    watch(() => props.initialBeanId, (val) => {
      if (val) {
        selectedBeanId.value = val
      }
    })

    function parseImportedJson() {
      importError.value = ''
      importedArchive.value = null
      const result = store.parseQRPayload(importedJson.value)
      if (!result) {
        importError.value = '解析失败：请粘贴有效的溯源 JSON 数据'
        return
      }
      importedArchive.value = result
    }

    function getCompactQRData() {
      const archive = selectedArchive.value
      if (!archive) return ''
      return JSON.stringify({
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
      })
    }

    watch(showQR, async (val) => {
      if (val && selectedBeanId.value) {
        await nextTick()
        showJsonPreview.value = false
        qrTruncated.value = false
        let data = fullQRData.value
        if (!data) return
        try {
          await QRCode.toCanvas(qrCanvas.value, data, {
            width: 220,
            margin: 2,
            errorCorrectionLevel: 'L',
            color: { dark: '#3E2C1C', light: '#FFFDF9' },
          })
        } catch (e) {
          qrTruncated.value = true
          const compact = getCompactQRData()
          try {
            await QRCode.toCanvas(qrCanvas.value, compact, {
              width: 220,
              margin: 2,
              errorCorrectionLevel: 'L',
              color: { dark: '#3E2C1C', light: '#FFFDF9' },
            })
          } catch (e2) {
            try {
              await QRCode.toCanvas(qrCanvas.value, currentQRUrl.value || '', {
                width: 220,
                margin: 2,
                errorCorrectionLevel: 'L',
                color: { dark: '#3E2C1C', light: '#FFFDF9' },
              })
            } catch (e3) {}
          }
        }
      }
    })

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

    return {
      store,
      selectedBeanId,
      importMode,
      importedJson,
      importedArchive,
      importError,
      selectedArchive,
      showQR,
      showJsonPreview,
      qrCanvas,
      qrTruncated,
      ratingLabels,
      fullQRData,
      currentQRUrl,
      parseImportedJson,
      copyFullData,
    }
  },
}
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
}
.import-view {
  padding: 10px 0;
}
.import-box {
  background: #FFF8F0;
  border: 2px solid #EDE0D0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}
.import-textarea {
  width: 100%;
  min-height: 140px;
  font-family: monospace;
  font-size: 12px;
  padding: 10px;
  border: 1px solid #E0D0B8;
  border-radius: 8px;
  background: #FFFDF9;
  color: #3E2C1C;
  resize: vertical;
  margin-bottom: 10px;
}
.import-textarea:focus {
  outline: none;
  border-color: #6F4E37;
}
.import-actions {
  display: flex;
  gap: 8px;
}
.import-error {
  margin-top: 10px;
  color: #D84315;
  font-size: 13px;
}
.imported-archive {
  margin-bottom: 16px;
}
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
  margin-bottom: 8px;
}
.archive-deeplink {
  font-size: 12px;
  color: #6F4E37;
  margin-top: 6px;
  word-break: break-all;
}
.archive-deeplink a {
  color: #6F4E37;
  text-decoration: underline;
}
.flavor-tag {
  background: linear-gradient(135deg, #FFF0E0, #FFE0C0);
  color: #8B4513;
}
.qr-data-badge {
  display: inline-block;
  padding: 3px 10px;
  background: #F3E5F5;
  color: #6A1B9A;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
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
  font-size: 18px;
  font-weight: 600;
  color: #3E2C1C;
  margin: 0;
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
  margin-bottom: 16px;
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
.qr-hint {
  font-size: 12px;
  color: #A08968;
  margin-bottom: 12px;
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
  height: 140px;
  font-family: monospace;
  font-size: 11px;
  padding: 8px;
  border: 1px solid #EDE0D0;
  border-radius: 8px;
  background: #FFFDF9;
  color: #3E2C1C;
  resize: vertical;
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
