<template>
  <div class="module-card">
    <div class="module-header">
      <h2>📈 烘焙曲线管理</h2>
      <button class="btn btn-primary" @click="openCreateForm">
        {{ showForm && !editingId ? '取消' : '+ 新增曲线' }}
      </button>
    </div>

    <div v-if="showForm && !editingId" class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <label>曲线名称</label>
          <input v-model="form.name" placeholder="例：浅烘花果香曲线" />
        </div>
        <div class="form-group">
          <label>绑定豆种（可选）</label>
          <select v-model="form.beanId">
            <option value="">通用曲线</option>
            <option v-for="bean in store.beans" :key="bean.id" :value="bean.id">
              {{ bean.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label>曲线说明</label>
        <input v-model="form.description" placeholder="简要描述该曲线的适用场景和特点" />
      </div>

      <div class="nodes-section">
        <div class="nodes-header">
          <label>升温节点</label>
          <button class="btn btn-primary btn-sm" @click="addNode">+ 添加节点</button>
        </div>
        <p class="nodes-hint">按时间顺序录入，每个节点包含时间、温度和可选事件标记</p>
        <div class="nodes-list">
          <div v-for="(node, idx) in form.nodes" :key="idx" class="node-row">
            <div class="node-fields">
              <div class="form-group node-field">
                <label>时间 (分钟)</label>
                <input type="number" v-model.number="node.time" step="0.5" min="0" placeholder="0" />
              </div>
              <div class="form-group node-field">
                <label>温度 (°C)</label>
                <input type="number" v-model.number="node.temperature" min="0" max="300" placeholder="150" />
              </div>
              <div class="form-group node-field node-event-field">
                <label>事件标记</label>
                <select v-model="node.event">
                  <option value="">无</option>
                  <option>入豆</option>
                  <option>转黄点</option>
                  <option>一爆开始</option>
                  <option>一爆密集</option>
                  <option>一爆结束</option>
                  <option>二爆开始</option>
                  <option>二爆密集</option>
                  <option>出锅</option>
                </select>
              </div>
            </div>
            <button class="btn btn-danger btn-sm" @click="removeNode(idx)" :disabled="form.nodes.length <= 1">×</button>
          </div>
        </div>
      </div>

      <div v-if="form.nodes.length >= 2" class="curve-preview">
        <label>曲线预览</label>
        <v-chart :option="previewOption" autoresize style="height: 260px; margin-top: 8px;" />
      </div>

      <button class="btn btn-primary" @click="submitCurve" :disabled="!form.name || form.nodes.length < 2" style="margin-top: 16px;">
        确认创建
      </button>
    </div>

    <div class="curve-list">
      <div v-for="curve in sortedCurves" :key="curve.id" class="curve-item">
        <div class="curve-info">
          <div class="curve-title">
            <span class="curve-name">{{ curve.name }}</span>
            <span class="tag" :class="curve.beanId ? 'bean-tag' : 'general-tag'">
              {{ curve.beanName }}
            </span>
          </div>
          <div v-if="curve.description" class="curve-desc">{{ curve.description }}</div>
          <div class="curve-meta">
            <span>{{ curve.nodes?.length || 0 }} 个节点</span>
            <span>已使用 {{ curve.roastCount }} 次</span>
          </div>
        </div>
        <div class="curve-actions">
          <button class="btn btn-primary btn-sm" @click="openReview(curve)">复盘</button>
          <button class="btn btn-sm" style="background:#D2B48C;color:#FFF8F0;" @click="openEdit(curve)">编辑</button>
          <button class="btn btn-danger btn-sm" @click="handleDelete(curve.id)">删除</button>
        </div>
      </div>
      <div v-if="store.roastCurves.length === 0" class="empty-state">
        暂无烘焙曲线，点击上方按钮创建第一条曲线模板
      </div>
    </div>

    <div v-if="showReview" class="review-overlay" @click.self="closeReview">
      <div class="review-modal">
        <div class="review-header">
          <h3>{{ reviewCurve.name }} — 曲线复盘</h3>
          <button class="btn btn-danger btn-sm" @click="closeReview">×</button>
        </div>
        <div class="review-body">
          <div class="review-meta">
            <span class="tag" :class="reviewCurve.beanId ? 'bean-tag' : 'general-tag'">
              {{ reviewCurve.beanName }}
            </span>
            <span v-if="reviewCurve.description" class="review-desc">{{ reviewCurve.description }}</span>
          </div>
          <v-chart :option="reviewOption" autoresize style="height: 340px; margin: 16px 0;" />
          <div class="review-nodes">
            <h4>节点详情</h4>
            <table class="nodes-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>温度</th>
                  <th>升温速率</th>
                  <th>事件</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(node, idx) in reviewCurve.nodes" :key="idx">
                  <td>{{ node.time }} min</td>
                  <td>{{ node.temperature }}°C</td>
                  <td>{{ getRate(idx) }}</td>
                  <td>
                    <span v-if="node.event" class="tag event-tag">{{ node.event }}</span>
                    <span v-else class="muted">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="reviewRoasts.length > 0" class="review-history">
            <h4>使用该曲线的烘焙记录</h4>
            <div v-for="roast in reviewRoasts" :key="roast.id" class="review-roast-item">
              <span class="bean-link">{{ getBeanName(roast.beanId) }}</span>
              <span class="tag level-tag">{{ roast.level }}</span>
              <span class="muted">{{ roast.date }}</span>
              <span class="muted">{{ roast.temperature }}°C / {{ roast.duration }}min</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="review-overlay" @click.self="closeEdit">
      <div class="review-modal">
        <div class="review-header">
          <h3>编辑曲线 — {{ editForm.name }}</h3>
          <button class="btn btn-danger btn-sm" @click="closeEdit">×</button>
        </div>
        <div class="review-body">
          <div class="form-grid">
            <div class="form-group">
              <label>曲线名称</label>
              <input v-model="editForm.name" />
            </div>
            <div class="form-group">
              <label>绑定豆种</label>
              <select v-model="editForm.beanId">
                <option value="">通用曲线</option>
                <option v-for="bean in store.beans" :key="bean.id" :value="bean.id">
                  {{ bean.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-top: 12px;">
            <label>曲线说明</label>
            <input v-model="editForm.description" />
          </div>
          <div class="nodes-section" style="margin-top: 16px;">
            <div class="nodes-header">
              <label>升温节点</label>
              <button class="btn btn-primary btn-sm" @click="editForm.nodes.push({ time: 0, temperature: 0, event: '' })">+ 添加节点</button>
            </div>
            <div class="nodes-list">
              <div v-for="(node, idx) in editForm.nodes" :key="idx" class="node-row">
                <div class="node-fields">
                  <div class="form-group node-field">
                    <label>时间 (分钟)</label>
                    <input type="number" v-model.number="node.time" step="0.5" min="0" />
                  </div>
                  <div class="form-group node-field">
                    <label>温度 (°C)</label>
                    <input type="number" v-model.number="node.temperature" min="0" max="300" />
                  </div>
                  <div class="form-group node-field node-event-field">
                    <label>事件标记</label>
                    <select v-model="node.event">
                      <option value="">无</option>
                      <option>入豆</option>
                      <option>转黄点</option>
                      <option>一爆开始</option>
                      <option>一爆密集</option>
                      <option>一爆结束</option>
                      <option>二爆开始</option>
                      <option>二爆密集</option>
                      <option>出锅</option>
                    </select>
                  </div>
                </div>
                <button class="btn btn-danger btn-sm" @click="editForm.nodes.splice(idx, 1)" :disabled="editForm.nodes.length <= 1">×</button>
              </div>
            </div>
          </div>
          <div v-if="editForm.nodes.length >= 2" class="curve-preview">
            <label>曲线预览</label>
            <v-chart :option="editPreviewOption" autoresize style="height: 260px; margin-top: 8px;" />
          </div>
          <button class="btn btn-primary" @click="submitEdit" :disabled="!editForm.name || editForm.nodes.length < 2" style="margin-top: 16px;">
            保存修改
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useCoffeeStore } from '../stores/coffee.js'
import VChart from 'vue-echarts'

const store = useCoffeeStore()
const showForm = ref(false)
const showReview = ref(false)
const showEditModal = ref(false)
const editingId = ref(null)
const reviewCurve = ref(null)

const defaultForm = () => ({
  name: '',
  beanId: '',
  description: '',
  nodes: [
    { time: 0, temperature: 90, event: '入豆' },
    { time: 5, temperature: 150, event: '转黄点' },
    { time: 8, temperature: 180, event: '一爆开始' },
    { time: 10, temperature: 196, event: '出锅' },
  ],
})

const form = reactive(defaultForm())
const editForm = reactive({ name: '', beanId: '', description: '', nodes: [] })

const sortedCurves = computed(() =>
  [...store.roastCurvesWithDetails].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
)

const reviewRoasts = computed(() => {
  if (!reviewCurve.value) return []
  return store.roasts.filter(r => r.curveId === reviewCurve.value.id)
})

function buildChartOption(nodes, title) {
  const sorted = [...nodes].sort((a, b) => a.time - b.time)
  const times = sorted.map(n => n.time)
  const temps = sorted.map(n => n.temperature)
  const markPoints = sorted
    .filter(n => n.event)
    .map(n => ({
      coord: [n.time, n.temperature],
      name: n.event,
      label: { show: true, formatter: '{b}', fontSize: 11, color: '#6F4E37' },
      itemStyle: { color: '#C0392B' },
    }))

  return {
    title: title ? { text: title, textStyle: { fontSize: 14, color: '#3E2C1C' } } : undefined,
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        const node = sorted[p.dataIndex]
        let s = `${p.axisValue} min / ${p.value}°C`
        if (node?.event) s += `<br/>📌 ${node.event}`
        return s
      },
    },
    grid: { left: 50, right: 30, top: title ? 40 : 20, bottom: 36 },
    xAxis: {
      type: 'category',
      data: times,
      name: '时间 (min)',
      nameTextStyle: { fontSize: 12, color: '#8B7355' },
      axisLabel: { color: '#6F4E37' },
      splitLine: { lineStyle: { type: 'dashed', color: '#EDE0D0' } },
    },
    yAxis: {
      type: 'value',
      name: '温度 (°C)',
      nameTextStyle: { fontSize: 12, color: '#8B7355' },
      axisLabel: { color: '#6F4E37' },
      splitLine: { lineStyle: { type: 'dashed', color: '#EDE0D0' } },
    },
    series: [{
      type: 'line',
      data: temps,
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { color: '#6F4E37', width: 2.5 },
      itemStyle: { color: '#6F4E37' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(111,78,55,0.25)' },
            { offset: 1, color: 'rgba(111,78,55,0.02)' },
          ],
        },
      },
      markPoint: { data: markPoints, symbol: 'pin', symbolSize: 40 },
    }],
  }
}

const previewOption = computed(() => buildChartOption(form.nodes, '曲线预览'))
const editPreviewOption = computed(() => buildChartOption(editForm.nodes, '编辑预览'))
const reviewOption = computed(() => {
  if (!reviewCurve.value?.nodes) return {}
  return buildChartOption(reviewCurve.value.nodes, reviewCurve.value.name)
})

function addNode() {
  const last = form.nodes[form.nodes.length - 1] || { time: 0, temperature: 100 }
  form.nodes.push({ time: +(last.time + 2).toFixed(1), temperature: +(last.temperature + 10), event: '' })
}

function removeNode(idx) {
  form.nodes.splice(idx, 1)
}

function openCreateForm() {
  if (showForm.value && !editingId.value) {
    showForm.value = false
    return
  }
  Object.assign(form, defaultForm())
  showForm.value = true
}

async function submitCurve() {
  if (!form.name || form.nodes.length < 2) return
  const sorted = [...form.nodes].sort((a, b) => a.time - b.time)
  await store.addRoastCurve({
    name: form.name,
    beanId: form.beanId ? Number(form.beanId) : null,
    description: form.description,
    nodes: sorted,
  })
  Object.assign(form, defaultForm())
  showForm.value = false
}

function openReview(curve) {
  reviewCurve.value = curve
  showReview.value = true
}

function closeReview() {
  showReview.value = false
  reviewCurve.value = null
}

function getRate(idx) {
  if (!reviewCurve.value?.nodes || idx === 0) return '—'
  const prev = reviewCurve.value.nodes[idx - 1]
  const curr = reviewCurve.value.nodes[idx]
  const dt = curr.time - prev.time
  if (dt <= 0) return '—'
  const rate = ((curr.temperature - prev.temperature) / dt).toFixed(1)
  return `${rate} °C/min`
}

function openEdit(curve) {
  editingId.value = curve.id
  editForm.name = curve.name
  editForm.beanId = curve.beanId || ''
  editForm.description = curve.description || ''
  editForm.nodes = curve.nodes ? curve.nodes.map(n => ({ ...n })) : [{ time: 0, temperature: 0, event: '' }]
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false
  editingId.value = null
}

async function submitEdit() {
  if (!editForm.name || editForm.nodes.length < 2) return
  const sorted = [...editForm.nodes].sort((a, b) => a.time - b.time)
  await store.updateRoastCurve(editingId.value, {
    name: editForm.name,
    beanId: editForm.beanId ? Number(editForm.beanId) : null,
    description: editForm.description,
    nodes: sorted,
  })
  closeEdit()
}

async function handleDelete(id) {
  if (confirm('删除该曲线模板？已使用该曲线的烘焙记录不会被删除。')) {
    await store.deleteRoastCurve(id)
  }
}

function getBeanName(beanId) {
  const bean = store.beans.find(b => b.id === beanId)
  return bean ? bean.name : '未知豆种'
}
</script>

<style scoped>
.nodes-section {
  margin-top: 16px;
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 16px;
}
.nodes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.nodes-header label {
  font-size: 14px;
  font-weight: 600;
  color: #3E2C1C;
}
.nodes-hint {
  font-size: 12px;
  color: #A08968;
  margin-bottom: 12px;
}
.nodes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.node-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.node-fields {
  display: flex;
  gap: 10px;
  flex: 1;
}
.node-field {
  flex: 1;
  min-width: 0;
}
.node-event-field {
  flex: 1.2;
}
.curve-preview {
  margin-top: 16px;
}
.curve-preview label {
  font-size: 14px;
  font-weight: 500;
  color: #3E2C1C;
}
.curve-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.curve-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 16px;
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  transition: box-shadow 0.2s;
}
.curve-item:hover {
  box-shadow: 0 2px 8px rgba(62, 44, 28, 0.1);
}
.curve-info {
  flex: 1;
}
.curve-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.curve-name {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
}
.bean-tag {
  background: linear-gradient(135deg, #FFF0E0, #FFE0C0);
  color: #8B4513;
}
.general-tag {
  background: #D4E6D4;
  color: #3E6B3E;
}
.curve-desc {
  font-size: 13px;
  color: #8B7355;
  margin-bottom: 4px;
}
.curve-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #A08968;
}
.curve-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.review-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(62, 44, 28, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.review-modal {
  background: #FFFDF9;
  border-radius: 16px;
  max-width: 720px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(62, 44, 28, 0.2);
}
.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #EDE0D0;
}
.review-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #3E2C1C;
}
.review-body {
  padding: 20px 24px;
}
.review-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.review-desc {
  font-size: 13px;
  color: #8B7355;
}
.review-nodes {
  margin-top: 16px;
}
.review-nodes h4,
.review-history h4 {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 10px;
}
.nodes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.nodes-table th {
  text-align: left;
  padding: 8px 12px;
  background: #FFF8F0;
  color: #6F4E37;
  font-weight: 500;
  border-bottom: 2px solid #EDE0D0;
}
.nodes-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #F0E0D0;
  color: #3E2C1C;
}
.event-tag {
  background: linear-gradient(135deg, #FDEDEC, #F5B7B1);
  color: #922B21;
}
.muted {
  color: #B0A090;
}
.review-history {
  margin-top: 20px;
}
.review-roast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}
</style>
