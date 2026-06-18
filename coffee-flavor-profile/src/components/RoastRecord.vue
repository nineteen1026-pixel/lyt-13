<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🔥 烘焙记录</h2>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? '取消' : '+ 新增记录' }}
      </button>
    </div>

    <div v-if="showForm" class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <label>选择豆种</label>
          <select v-model="form.beanId" @change="onBeanChange">
            <option value="">请选择</option>
            <option v-for="bean in store.beans" :key="bean.id" :value="bean.id">
              {{ bean.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>烘焙日期</label>
          <input type="date" v-model="form.date" />
        </div>
        <div class="form-group">
          <label>烘焙程度</label>
          <select v-model="form.level">
            <option value="">请选择</option>
            <option>极浅烘焙</option>
            <option>浅烘焙</option>
            <option>中浅烘焙</option>
            <option>中烘焙</option>
            <option>中深烘焙</option>
            <option>深烘焙</option>
            <option>极深烘焙</option>
          </select>
        </div>
        <div class="form-group">
          <label>出锅温度 (°C)</label>
          <input type="number" v-model.number="form.temperature" placeholder="196" />
        </div>
        <div class="form-group">
          <label>烘焙时长 (分钟)</label>
          <input type="number" v-model.number="form.duration" step="0.5" placeholder="10" />
        </div>
        <div class="form-group">
          <label>使用曲线模板</label>
          <select v-model="form.curveId" @change="onCurveChange">
            <option value="">不使用曲线</option>
            <optgroup v-if="beanCurves.length > 0" label="推荐曲线（当前豆种）">
              <option v-for="c in beanCurves" :key="c.id" :value="c.id">⭐ {{ c.name }}</option>
            </optgroup>
            <optgroup v-if="generalCurves.length > 0" label="通用曲线">
              <option v-for="c in generalCurves" :key="c.id" :value="c.id">{{ c.name }}</option>
            </optgroup>
            <optgroup v-if="otherBeanCurves.length > 0" label="其他豆种曲线">
              <option v-for="c in otherBeanCurves" :key="c.id" :value="c.id">{{ c.name }}（{{ c.beanName }}）</option>
            </optgroup>
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-top: 4px;">
        <label>备注</label>
        <input v-model="form.notes" placeholder="一爆密集期出锅" />
      </div>

      <div v-if="selectedCurve" class="curve-apply-section">
        <div class="curve-apply-header">
          <span class="curve-apply-label">📐 曲线模板：{{ selectedCurve.name }}</span>
          <button class="btn btn-sm" style="background:#D2B48C;color:#FFF8F0;" @click="applyCurveToForm">填充参数</button>
        </div>
        <v-chart :option="applyCurveOption" autoresize style="height: 200px; margin-top: 8px;" />
      </div>

      <button class="btn btn-primary" @click="submitRoast" :disabled="!form.beanId || !form.level" style="margin-top: 16px;">确认记录</button>
    </div>

    <div class="record-list">
      <div v-for="roast in sortedRoasts" :key="roast.id" class="record-item">
        <div class="record-info">
          <div class="record-title">
            <span class="bean-link">{{ getBeanName(roast.beanId) }}</span>
            <span class="tag level-tag">{{ roast.level }}</span>
            <span v-if="roast.curveId" class="tag curve-tag">📈 {{ getCurveName(roast.curveId) }}</span>
          </div>
          <div class="record-meta">
            <span>{{ roast.date }}</span>
            <span>{{ roast.temperature }}°C</span>
            <span>{{ roast.duration }}min</span>
          </div>
          <div v-if="roast.notes" class="record-notes">{{ roast.notes }}</div>
          <div v-if="roast.curveId && getCurveById(roast.curveId)" class="record-curve-preview">
            <v-chart :option="getMiniCurveOption(roast.curveId)" autoresize style="height: 120px;" />
          </div>
        </div>
        <button class="btn btn-danger btn-sm" @click="handleDelete(roast.id)">删除</button>
      </div>
      <div v-if="store.roasts.length === 0" class="empty-state">
        暂无烘焙记录，先登记豆种再添加烘焙数据
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, MarkPointComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { useCoffeeStore } from '../stores/coffee.js'

use([LineChart, TooltipComponent, GridComponent, MarkPointComponent, CanvasRenderer])

const store = useCoffeeStore()
const showForm = ref(false)
const form = reactive({
  beanId: '',
  date: new Date().toISOString().slice(0, 10),
  level: '',
  temperature: null,
  duration: null,
  notes: '',
  curveId: '',
})

const sortedRoasts = computed(() =>
  [...store.roasts].sort((a, b) => (a.date > b.date ? -1 : 1))
)

const beanCurves = computed(() => {
  if (!form.beanId) return []
  return store.roastCurvesWithDetails.filter(c => c.beanId === Number(form.beanId))
})

const generalCurves = computed(() => {
  return store.roastCurvesWithDetails.filter(c => !c.beanId)
})

const otherBeanCurves = computed(() => {
  if (!form.beanId) return store.roastCurvesWithDetails.filter(c => c.beanId)
  return store.roastCurvesWithDetails.filter(c => c.beanId && c.beanId !== Number(form.beanId))
})

const selectedCurve = computed(() => {
  if (!form.curveId) return null
  return store.roastCurves.find(c => c.id === Number(form.curveId))
})

const applyCurveOption = computed(() => {
  if (!selectedCurve.value?.nodes) return {}
  const nodes = selectedCurve.value.nodes
  const sorted = [...nodes].sort((a, b) => a.time - b.time)
  const markPoints = sorted
    .filter(n => n.event)
    .map(n => ({
      coord: [n.time, n.temperature],
      name: n.event,
      label: { show: true, formatter: '{b}', fontSize: 10, color: '#6F4E37' },
      itemStyle: { color: '#C0392B' },
    }))
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 45, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: sorted.map(n => n.time),
      axisLabel: { fontSize: 11, color: '#8B7355' },
      splitLine: { lineStyle: { type: 'dashed', color: '#EDE0D0' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, color: '#8B7355' },
      splitLine: { lineStyle: { type: 'dashed', color: '#EDE0D0' } },
    },
    series: [{
      type: 'line',
      data: sorted.map(n => n.temperature),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#6F4E37', width: 2 },
      itemStyle: { color: '#6F4E37' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(111,78,55,0.2)' },
            { offset: 1, color: 'rgba(111,78,55,0.02)' },
          ],
        },
      },
      markPoint: { data: markPoints, symbol: 'pin', symbolSize: 32 },
    }],
  }
})

function onBeanChange() {
  form.curveId = ''
}

function onCurveChange() {
  if (form.curveId && selectedCurve.value) {
    applyCurveToForm()
  }
}

function applyCurveToForm() {
  if (!selectedCurve.value?.nodes) return
  const nodes = [...selectedCurve.value.nodes].sort((a, b) => a.time - b.time)
  const last = nodes[nodes.length - 1]
  if (last) {
    form.temperature = last.temperature
    form.duration = last.time
  }
  const events = nodes.filter(n => n.event).map(n => n.event)
  if (events.length > 0) {
    form.notes = events.join(' → ')
  }
}

function getBeanName(beanId) {
  const bean = store.beans.find(b => b.id === beanId)
  return bean ? bean.name : '未知豆种'
}

function getCurveName(curveId) {
  const curve = store.roastCurves.find(c => c.id === curveId)
  return curve ? curve.name : '未知曲线'
}

function getCurveById(curveId) {
  return store.roastCurves.find(c => c.id === curveId)
}

function getMiniCurveOption(curveId) {
  const curve = getCurveById(curveId)
  if (!curve?.nodes) return {}
  const sorted = [...curve.nodes].sort((a, b) => a.time - b.time)
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 35, right: 10, top: 5, bottom: 24 },
    xAxis: {
      type: 'category',
      data: sorted.map(n => n.time),
      axisLabel: { fontSize: 10, color: '#B0A090' },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#B0A090' },
      splitLine: { lineStyle: { type: 'dashed', color: '#F0E0D0' } },
    },
    series: [{
      type: 'line',
      data: sorted.map(n => n.temperature),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#D2B48C', width: 1.5 },
      itemStyle: { color: '#D2B48C' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(210,180,140,0.15)' },
            { offset: 1, color: 'rgba(210,180,140,0.02)' },
          ],
        },
      },
    }],
  }
}

function resetForm() {
  form.beanId = ''
  form.date = new Date().toISOString().slice(0, 10)
  form.level = ''
  form.temperature = null
  form.duration = null
  form.notes = ''
  form.curveId = ''
}

async function submitRoast() {
  if (!form.beanId || !form.level) return
  const data = {
    beanId: Number(form.beanId),
    date: form.date,
    level: form.level,
    temperature: form.temperature,
    duration: form.duration,
    notes: form.notes,
    curveId: form.curveId ? Number(form.curveId) : null,
  }
  await store.addRoast(data)
  resetForm()
  showForm.value = false
}

async function handleDelete(id) {
  await store.deleteRoast(id)
}
</script>

<style scoped>
.curve-tag {
  background: linear-gradient(135deg, #E8D5F5, #D5B8E8);
  color: #6C3483;
}
.curve-apply-section {
  margin-top: 12px;
  padding: 12px 16px;
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
}
.curve-apply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.curve-apply-label {
  font-size: 13px;
  font-weight: 500;
  color: #3E2C1C;
}
.record-curve-preview {
  margin-top: 8px;
  border-top: 1px dashed #EDE0D0;
  padding-top: 8px;
}
</style>
