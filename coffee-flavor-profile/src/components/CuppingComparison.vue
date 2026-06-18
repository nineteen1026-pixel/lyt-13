<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🔍 杯测对比模式</h2>
      <div class="header-actions">
        <button
          v-if="!showForm && !activeComparison"
          class="btn btn-primary"
          @click="startNewComparison"
        >
          + 新建对比档案
        </button>
        <button
          v-if="showForm || activeComparison"
          class="btn btn-danger btn-sm"
          @click="exitDetailView"
        >
          返回列表
        </button>
      </div>
    </div>

    <div v-if="showForm" class="form-section">
      <h3 class="form-title">{{ editingId ? '编辑对比档案' : '新建对比档案' }}</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>档案名称</label>
          <input v-model="form.name" placeholder="例：春季埃塞豆种横评 #1" />
        </div>
      </div>

      <div class="form-group" style="margin-top: 16px;">
        <label>选择参与对比的豆种（多选，至少 2 支）</label>
        <div class="bean-select-grid">
          <div
            v-for="bean in store.beans"
            :key="bean.id"
            :class="['bean-select-card', { active: form.beanIds.includes(bean.id) }]"
            @click="toggleBeanSelection(bean.id)"
          >
            <div class="bs-bean-name">{{ bean.name }}</div>
            <div class="bs-bean-meta">
              <span class="tag">{{ bean.origin }}</span>
              <span class="tag">{{ bean.process }}</span>
            </div>
            <div v-if="bean.flavorTags?.length" class="bs-bean-tags">
              <span v-for="t in bean.flavorTags.slice(0, 3)" :key="t" class="tag flavor-tag">{{ t }}</span>
            </div>
            <div class="bs-bean-stats">
              <span>🔥{{ getRoastCount(bean.id) }}</span>
              <span>☕{{ getExtractionCount(bean.id) }}</span>
              <span>📊{{ getRatingCount(bean.id) }}</span>
            </div>
          </div>
        </div>
        <p class="flavor-hint">已选 {{ form.beanIds.length }} 支豆种</p>
      </div>

      <div v-if="form.beanIds.length > 0" class="linked-records-section">
        <h4 class="section-subtitle">关联烘焙批次（自动关联所选豆种的全部记录，可取消个别关联）</h4>
        <div class="linked-list">
          <div
            v-for="roast in availableRoasts"
            :key="roast.id"
            :class="['linked-item', { active: form.roastIds.includes(roast.id) }]"
            @click="toggleRoastSelection(roast.id)"
          >
            <span class="li-icon">🔥</span>
            <div class="li-content">
              <div class="li-title">{{ getBeanName(roast.beanId) }}</div>
              <div class="li-meta">
                <span class="tag level-tag">{{ roast.level }}</span>
                <span>{{ roast.date }}</span>
                <span v-if="roast.temperature">{{ roast.temperature }}°C</span>
                <span v-if="roast.duration">{{ roast.duration }}min</span>
              </div>
            </div>
          </div>
          <div v-if="availableRoasts.length === 0" class="empty-hint">所选豆种暂无烘焙记录</div>
        </div>

        <h4 class="section-subtitle">关联萃取记录（自动关联所选豆种的全部记录，可取消个别关联）</h4>
        <div class="linked-list">
          <div
            v-for="ext in availableExtractions"
            :key="ext.id"
            :class="['linked-item', { active: form.extractionIds.includes(ext.id) }]"
            @click="toggleExtractionSelection(ext.id)"
          >
            <span class="li-icon">☕</span>
            <div class="li-content">
              <div class="li-title">{{ getBeanName(ext.beanId) }}</div>
              <div class="li-meta">
                <span class="tag method-tag">{{ ext.method }}</span>
                <span>{{ ext.date }}</span>
                <span v-if="ext.ratio">{{ ext.ratio }}</span>
                <span v-if="ext.temperature">{{ ext.temperature }}°C</span>
              </div>
              <div v-if="ext.notes" class="li-notes">{{ ext.notes }}</div>
            </div>
          </div>
          <div v-if="availableExtractions.length === 0" class="empty-hint">所选豆种暂无萃取记录</div>
        </div>
      </div>

      <div class="form-group" style="margin-top: 16px;">
        <label>评测备注</label>
        <textarea
          v-model="form.notes"
          rows="3"
          placeholder="记录整体横向评测结论、风味差异、推荐人群等..."
          class="notes-textarea"
        ></textarea>
      </div>

      <div class="form-actions">
        <button class="btn btn-primary" @click="submitComparison" :disabled="!form.name || form.beanIds.length < 2">
          {{ editingId ? '保存修改' : '创建档案' }}
        </button>
      </div>
    </div>

    <div v-else-if="activeComparison" class="comparison-detail">
      <div class="detail-header">
        <div>
          <h3 class="detail-title">{{ activeComparison.name }}</h3>
          <div class="detail-meta">
            <span>创建：{{ formatDate(activeComparison.createdAt) }}</span>
            <span>更新：{{ formatDate(activeComparison.updatedAt) }}</span>
            <span>豆种：{{ activeComparison.beans.length }} 支</span>
            <span>烘焙：{{ activeComparison.roasts.length }} 批次</span>
            <span>萃取：{{ activeComparison.extractions.length }} 次</span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-sm" @click="editComparison(activeComparison)">编辑</button>
          <button class="btn btn-danger btn-sm" @click="handleDelete(activeComparison.id)">删除档案</button>
        </div>
      </div>

      <div class="radar-section-full">
        <h4 class="section-subtitle">📊 风味雷达横向对比</h4>
        <v-chart :option="combinedRadarOption" class="radar-chart-large" autoresize />
        <div class="radar-legend-custom">
          <div
            v-for="(bean, idx) in activeComparison.beans"
            :key="bean.id"
            class="legend-item"
          >
            <span class="legend-color" :style="{ background: BEAN_COLORS[idx % BEAN_COLORS.length] }"></span>
            <span class="legend-name">{{ bean.name }}</span>
            <span class="legend-score">均分 {{ getAvgScore(bean.avgRating) }}</span>
          </div>
        </div>
      </div>

      <div class="score-table-section">
        <h4 class="section-subtitle">📋 评分维度对照表</h4>
        <div class="score-table-wrap">
          <table class="score-table">
            <thead>
              <tr>
                <th>豆种</th>
                <th v-for="dim in DIMENSIONS" :key="dim">{{ dim }}</th>
                <th>均分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(bean, idx) in sortedBeansByScore" :key="bean.id">
                <td>
                  <span class="td-color" :style="{ background: BEAN_COLORS[idx % BEAN_COLORS.length] }"></span>
                  {{ bean.name }}
                </td>
                <td v-for="key in DIM_KEYS" :key="key" :class="{ 'score-highlight': isMaxInDimension(key, bean) }">
                  {{ bean.avgRating ? bean.avgRating[key] : '-' }}
                </td>
                <td class="score-total">{{ getAvgScore(bean.avgRating) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="beans-parallel-section">
        <h4 class="section-subtitle">🫘 豆种档案并列展示</h4>
        <div class="parallel-bean-grid">
          <div
            v-for="(bean, idx) in activeComparison.beans"
            :key="bean.id"
            class="parallel-bean-card"
          >
            <div class="pbc-header">
              <span class="pbc-color-bar" :style="{ background: BEAN_COLORS[idx % BEAN_COLORS.length] }"></span>
              <div class="pbc-name">{{ bean.name }}</div>
              <div class="pbc-score">均分 {{ getAvgScore(bean.avgRating) }}</div>
            </div>
            <div class="pbc-meta">
              <span class="tag">{{ bean.origin }}</span>
              <span class="tag">{{ bean.variety }}</span>
              <span class="tag">{{ bean.process }}</span>
            </div>
            <div v-if="bean.flavorTags?.length" class="pbc-tags">
              <span v-for="t in bean.flavorTags" :key="t" class="tag flavor-tag">{{ t }}</span>
            </div>

            <div class="pbc-records-section">
              <div class="pbc-records-title">🔥 关联烘焙批次（{{ bean.roasts.length }}）</div>
              <div v-if="bean.roasts.length > 0" class="pbc-record-list">
                <div v-for="r in bean.roasts" :key="r.id" class="pbc-record-item">
                  <div class="pri-row">
                    <span class="tag level-tag">{{ r.level }}</span>
                    <span>{{ r.date }}</span>
                  </div>
                  <div class="pri-row pri-meta">
                    <span v-if="r.temperature">{{ r.temperature }}°C</span>
                    <span v-if="r.duration">{{ r.duration }}min</span>
                  </div>
                  <div v-if="r.notes" class="pri-notes">{{ r.notes }}</div>
                </div>
              </div>
              <div v-else class="pbc-empty">无关联烘焙</div>
            </div>

            <div class="pbc-records-section">
              <div class="pbc-records-title">☕ 关联萃取记录（{{ bean.extractions.length }}）</div>
              <div v-if="bean.extractions.length > 0" class="pbc-record-list">
                <div v-for="e in bean.extractions" :key="e.id" class="pbc-record-item">
                  <div class="pri-row">
                    <span class="tag method-tag">{{ e.method }}</span>
                    <span>{{ e.date }}</span>
                  </div>
                  <div class="pri-row pri-meta">
                    <span v-if="e.ratio">{{ e.ratio }}</span>
                    <span v-if="e.temperature">{{ e.temperature }}°C</span>
                    <span v-if="e.time">{{ e.time }}</span>
                  </div>
                  <div v-if="e.notes" class="pri-notes">{{ e.notes }}</div>
                </div>
              </div>
              <div v-else class="pbc-empty">无关联萃取</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeComparison.notes" class="notes-section">
        <h4 class="section-subtitle">📝 评测备注</h4>
        <div class="notes-content">{{ activeComparison.notes }}</div>
      </div>
    </div>

    <div v-else class="comparison-list-section">
      <div v-if="store.cuppingComparisonsWithDetails.length > 0" class="comparison-list">
        <div
          v-for="cmp in sortedComparisons"
          :key="cmp.id"
          class="comparison-card"
          @click="openComparison(cmp)"
        >
          <div class="cc-header">
            <h3 class="cc-name">{{ cmp.name }}</h3>
            <div class="cc-actions" @click.stop>
              <button class="btn btn-sm" @click="editComparison(cmp)">编辑</button>
              <button class="btn btn-danger btn-sm" @click="handleDelete(cmp.id)">删除</button>
            </div>
          </div>
          <div class="cc-meta">
            <span>{{ formatDate(cmp.createdAt) }}</span>
            <span>🫘 {{ cmp.beans.length }} 支豆种</span>
            <span>🔥 {{ cmp.roasts.length }} 烘焙</span>
            <span>☕ {{ cmp.extractions.length }} 萃取</span>
          </div>
          <div class="cc-beans">
            <span
              v-for="(bean, idx) in cmp.beans.slice(0, 5)"
              :key="bean.id"
              class="cc-bean-chip"
              :style="{ borderColor: BEAN_COLORS[idx % BEAN_COLORS.length] }"
            >
              <span class="cc-bean-dot" :style="{ background: BEAN_COLORS[idx % BEAN_COLORS.length] }"></span>
              {{ bean.name }}
            </span>
            <span v-if="cmp.beans.length > 5" class="cc-bean-more">+{{ cmp.beans.length - 5 }}</span>
          </div>
          <div v-if="cmp.notes" class="cc-notes">{{ cmp.notes }}</div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>暂无杯测对比档案</p>
        <p class="empty-sub">点击右上角按钮，创建第一份横向评测档案</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { use } from 'echarts/core'
import { RadarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { useCoffeeStore } from '../stores/coffee.js'

use([RadarChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const store = useCoffeeStore()

const showForm = ref(false)
const editingId = ref(null)
const activeComparison = ref(null)

const form = reactive({
  name: '',
  beanIds: [],
  roastIds: [],
  extractionIds: [],
  notes: '',
})

const DIMENSIONS = ['酸度', '甜度', '醇厚度', '余韵', '平衡']
const DIM_KEYS = ['acidity', 'sweetness', 'body', 'aftertaste', 'balance']
const BEAN_COLORS = [
  '#6F4E37', '#C4A882', '#8B6914', '#D2A679',
  '#A0522D', '#DEB887', '#8B4513', '#CD853F',
  '#B8860B', '#D2691E',
]

const sortedComparisons = computed(() =>
  [...store.cuppingComparisonsWithDetails].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
)

const availableRoasts = computed(() =>
  store.roasts.filter(r => form.beanIds.includes(r.beanId))
)

const availableExtractions = computed(() =>
  store.extractions.filter(e => form.beanIds.includes(e.beanId))
)

const combinedRadarOption = computed(() => {
  if (!activeComparison.value) return {}
  const beans = activeComparison.value.beans
  const seriesData = beans.map((bean, idx) => {
    const color = BEAN_COLORS[idx % BEAN_COLORS.length]
    const data = bean.avgRating ? DIM_KEYS.map(k => bean.avgRating[k]) : [0, 0, 0, 0, 0]
    return {
      value: data,
      name: bean.name,
      itemStyle: { color },
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.12 },
    }
  })
  return {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      show: false,
    },
    radar: {
      indicator: DIMENSIONS.map(d => ({ name: d, max: 10 })),
      shape: 'polygon',
      splitNumber: 5,
      center: ['50%', '52%'],
      radius: '65%',
      axisName: {
        color: '#6F4E37',
        fontSize: 13,
        fontWeight: 500,
      },
      splitArea: {
        areaStyle: {
          color: ['#FFF8F0', '#FFF1E0', '#FFEAD0', '#FFE3C0', '#FFDDB0'],
        },
      },
      splitLine: {
        lineStyle: {
          color: '#E0D0B8',
        },
      },
      axisLine: {
        lineStyle: {
          color: '#D2B48C',
        },
      },
    },
    series: [{
      type: 'radar',
      data: seriesData,
    }],
  }
})

const sortedBeansByScore = computed(() => {
  if (!activeComparison.value) return []
  return [...activeComparison.value.beans].sort((a, b) => {
    const sa = a.avgRating ? calcAvg(a.avgRating) : 0
    const sb = b.avgRating ? calcAvg(b.avgRating) : 0
    return sb - sa
  })
})

function calcAvg(rating) {
  const vals = DIM_KEYS.map(k => rating[k])
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function isMaxInDimension(key, bean) {
  if (!activeComparison.value || !bean.avgRating) return false
  const beans = activeComparison.value.beans.filter(b => b.avgRating)
  if (beans.length < 2) return false
  const maxVal = Math.max(...beans.map(b => b.avgRating[key]))
  return bean.avgRating[key] === maxVal
}

function getBeanName(id) {
  const b = store.beans.find(x => x.id === id)
  return b ? b.name : '未知'
}

function getRoastCount(beanId) {
  return store.roasts.filter(r => r.beanId === beanId).length
}

function getExtractionCount(beanId) {
  return store.extractions.filter(e => e.beanId === beanId).length
}

function getRatingCount(beanId) {
  return store.ratings.filter(r => r.beanId === beanId).length
}

function getAvgScore(rating) {
  if (!rating) return '-'
  return calcAvg(rating).toFixed(1)
}

function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('zh-CN')
}

function toggleBeanSelection(id) {
  const idx = form.beanIds.indexOf(id)
  if (idx >= 0) {
    form.beanIds.splice(idx, 1)
    form.roastIds = form.roastIds.filter(rid => {
      const r = store.roasts.find(x => x.id === rid)
      return r && form.beanIds.includes(r.beanId)
    })
    form.extractionIds = form.extractionIds.filter(eid => {
      const e = store.extractions.find(x => x.id === eid)
      return e && form.beanIds.includes(e.beanId)
    })
  } else {
    form.beanIds.push(id)
    store.roasts
      .filter(r => r.beanId === id)
      .forEach(r => { if (!form.roastIds.includes(r.id)) form.roastIds.push(r.id) })
    store.extractions
      .filter(e => e.beanId === id)
      .forEach(e => { if (!form.extractionIds.includes(e.id)) form.extractionIds.push(e.id) })
  }
}

function toggleRoastSelection(id) {
  const idx = form.roastIds.indexOf(id)
  if (idx >= 0) form.roastIds.splice(idx, 1)
  else form.roastIds.push(id)
}

function toggleExtractionSelection(id) {
  const idx = form.extractionIds.indexOf(id)
  if (idx >= 0) form.extractionIds.splice(idx, 1)
  else form.extractionIds.push(id)
}

function resetForm() {
  form.name = ''
  form.beanIds = []
  form.roastIds = []
  form.extractionIds = []
  form.notes = ''
  editingId.value = null
}

function startNewComparison() {
  resetForm()
  activeComparison.value = null
  showForm.value = true
}

function exitDetailView() {
  showForm.value = false
  activeComparison.value = null
  resetForm()
}

function openComparison(cmp) {
  activeComparison.value = cmp
}

function editComparison(cmp) {
  editingId.value = cmp.id
  form.name = cmp.name
  form.beanIds = [...(cmp.beanIds || [])]
  form.roastIds = [...(cmp.roastIds || [])]
  form.extractionIds = [...(cmp.extractionIds || [])]
  form.notes = cmp.notes || ''
  activeComparison.value = null
  showForm.value = true
}

async function submitComparison() {
  if (!form.name || form.beanIds.length < 2) return
  if (editingId.value) {
    await store.updateCuppingComparison(editingId.value, {
      name: form.name,
      beanIds: [...form.beanIds],
      roastIds: [...form.roastIds],
      extractionIds: [...form.extractionIds],
      notes: form.notes,
    })
    const updated = store.cuppingComparisonsWithDetails.find(c => c.id === editingId.value)
    if (updated) activeComparison.value = updated
  } else {
    const id = await store.addCuppingComparison({
      name: form.name,
      beanIds: [...form.beanIds],
      roastIds: [...form.roastIds],
      extractionIds: [...form.extractionIds],
      notes: form.notes,
    })
    const created = store.cuppingComparisonsWithDetails.find(c => c.id === id)
    if (created) activeComparison.value = created
  }
  showForm.value = false
  resetForm()
}

async function handleDelete(id) {
  if (confirm('确定删除这份杯测对比档案？关联的豆种、烘焙、萃取数据不会被删除。')) {
    await store.deleteCuppingComparison(id)
    if (activeComparison.value?.id === id) {
      activeComparison.value = null
    }
  }
}
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
}

.form-title {
  font-size: 17px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 16px;
}

.section-subtitle {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
  margin: 20px 0 12px;
  padding-left: 8px;
  border-left: 3px solid #6F4E37;
}

.bean-select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.bean-select-card {
  padding: 12px;
  border: 2px solid #E0D0B8;
  border-radius: 10px;
  background: #FFFCF7;
  cursor: pointer;
  transition: all 0.2s;
}

.bean-select-card:hover {
  border-color: #C4A882;
  background: #FFF8F0;
}

.bean-select-card.active {
  border-color: #6F4E37;
  background: #FFF1E0;
  box-shadow: 0 0 0 2px rgba(111, 78, 55, 0.15);
}

.bs-bean-name {
  font-size: 14px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 6px;
}

.bs-bean-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.bs-bean-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.bs-bean-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #8B7355;
  padding-top: 6px;
  border-top: 1px dashed #E0D0B8;
}

.linked-records-section {
  margin-top: 20px;
}

.linked-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding: 8px;
  background: #FFFCF7;
  border: 1px solid #EDE0D0;
  border-radius: 8px;
}

.linked-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border: 1.5px solid #E0D0B8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.linked-item:hover {
  background: #FFF8F0;
  border-color: #C4A882;
}

.linked-item.active {
  background: #F0E6D6;
  border-color: #6F4E37;
}

.li-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.li-content {
  flex: 1;
  min-width: 0;
}

.li-title {
  font-size: 13px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 4px;
}

.li-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #8B7355;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.li-notes {
  font-size: 12px;
  color: #6F4E37;
  font-style: italic;
  margin-top: 2px;
}

.empty-hint {
  text-align: center;
  padding: 16px;
  color: #B0A090;
  font-size: 13px;
}

.notes-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D2B48C;
  border-radius: 8px;
  font-size: 14px;
  background: #FFFCF7;
  color: #3E2C1C;
  outline: none;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;
}

.notes-textarea:focus {
  border-color: #6F4E37;
}

.form-actions {
  margin-top: 20px;
}

.comparison-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  background: linear-gradient(135deg, #FFF8F0, #FFEAD0);
  border-radius: 12px;
  border: 1px solid #E0D0B8;
}

.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: #3E2C1C;
  margin-bottom: 6px;
}

.detail-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #8B7355;
  flex-wrap: wrap;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.radar-section-full {
  padding: 20px;
  background: #FFFCF7;
  border-radius: 12px;
  border: 1px solid #EDE0D0;
}

.radar-chart-large {
  width: 100%;
  height: 420px;
}

.radar-legend-custom {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px dashed #E0D0B8;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-name {
  font-weight: 500;
  color: #3E2C1C;
}

.legend-score {
  color: #6F4E37;
  font-weight: 600;
  background: #F0E0D0;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.score-table-section {
  padding: 20px;
  background: #FFFCF7;
  border-radius: 12px;
  border: 1px solid #EDE0D0;
}

.score-table-wrap {
  overflow-x: auto;
}

.score-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.score-table th,
.score-table td {
  padding: 12px 14px;
  text-align: center;
  border-bottom: 1px solid #EDE0D0;
}

.score-table th {
  background: #F0E6D6;
  color: #3E2C1C;
  font-weight: 600;
  font-size: 13px;
}

.score-table th:first-child,
.score-table td:first-child {
  text-align: left;
}

.score-table tbody tr:hover {
  background: #FFF8F0;
}

.score-highlight {
  background: #FFF1D0 !important;
  font-weight: 700;
  color: #8B4513;
}

.score-total {
  font-weight: 700;
  color: #6F4E37;
  background: #F0E0D0 !important;
}

.td-color {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 8px;
  vertical-align: middle;
}

.beans-parallel-section {
  padding: 20px;
  background: #FFFCF7;
  border-radius: 12px;
  border: 1px solid #EDE0D0;
}

.parallel-bean-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.parallel-bean-card {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pbc-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #FFF8F0;
  border-bottom: 1px solid #EDE0D0;
}

.pbc-color-bar {
  width: 4px;
  height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
}

.pbc-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
}

.pbc-score {
  font-size: 12px;
  font-weight: 600;
  color: #6F4E37;
  background: #F0E0D0;
  padding: 3px 10px;
  border-radius: 12px;
}

.pbc-meta,
.pbc-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  padding: 10px 14px 0;
}

.pbc-records-section {
  padding: 12px 14px;
  border-top: 1px dashed #EDE0D0;
  margin-top: 10px;
}

.pbc-records-title {
  font-size: 13px;
  font-weight: 600;
  color: #6F4E37;
  margin-bottom: 8px;
}

.pbc-record-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pbc-record-item {
  padding: 8px 10px;
  background: #FFF8F0;
  border-radius: 6px;
  border: 1px solid #F0E6D6;
}

.pri-row {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #8B7355;
  flex-wrap: wrap;
}

.pri-meta {
  margin-top: 3px;
}

.pri-notes {
  font-size: 11px;
  color: #6F4E37;
  font-style: italic;
  margin-top: 3px;
}

.pbc-empty {
  font-size: 12px;
  color: #B0A090;
  font-style: italic;
  padding: 6px 0;
}

.notes-section {
  padding: 20px;
  background: #FFFCF7;
  border-radius: 12px;
  border: 1px solid #EDE0D0;
}

.notes-content {
  padding: 14px 16px;
  background: #FFF8F0;
  border-left: 3px solid #6F4E37;
  border-radius: 0 8px 8px 0;
  font-size: 14px;
  color: #3E2C1C;
  line-height: 1.7;
  white-space: pre-wrap;
}

.comparison-list-section {
  margin-top: 4px;
}

.comparison-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comparison-card {
  padding: 18px 20px;
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.comparison-card:hover {
  border-color: #D2B48C;
  box-shadow: 0 4px 16px rgba(62, 44, 28, 0.08);
  transform: translateY(-1px);
}

.cc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.cc-name {
  font-size: 17px;
  font-weight: 600;
  color: #3E2C1C;
}

.cc-actions {
  display: flex;
  gap: 6px;
}

.cc-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #8B7355;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.cc-beans {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.cc-bean-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border: 1.5px solid;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
  color: #3E2C1C;
  background: #FFF8F0;
}

.cc-bean-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.cc-bean-more {
  padding: 3px 10px;
  font-size: 12px;
  color: #8B7355;
  background: #F0E6D6;
  border-radius: 14px;
}

.cc-notes {
  font-size: 13px;
  color: #6F4E37;
  padding: 10px 12px;
  background: #FFF8F0;
  border-radius: 8px;
  border-left: 3px solid #D2B48C;
  line-height: 1.6;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-sub {
  font-size: 13px;
  margin-top: 6px;
  color: #A08968;
}

.btn {
  background: #F0E0D0;
  color: #6F4E37;
}

.btn:hover {
  background: #E8D0B8;
}
</style>
