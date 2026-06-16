<template>
  <div class="module-card">
    <div class="module-header">
      <h2>📊 评分雷达图</h2>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? '取消' : '+ 新增评分' }}
      </button>
    </div>

    <div v-if="showForm" class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <label>选择豆种</label>
          <select v-model="form.beanId">
            <option value="">请选择</option>
            <option v-for="bean in store.beans" :key="bean.id" :value="bean.id">
              {{ bean.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>酸度 (1-10)</label>
          <input type="range" v-model.number="form.acidity" min="1" max="10" step="0.5" />
          <span class="range-value">{{ form.acidity }}</span>
        </div>
        <div class="form-group">
          <label>甜度 (1-10)</label>
          <input type="range" v-model.number="form.sweetness" min="1" max="10" step="0.5" />
          <span class="range-value">{{ form.sweetness }}</span>
        </div>
        <div class="form-group">
          <label>醇厚度 (1-10)</label>
          <input type="range" v-model.number="form.body" min="1" max="10" step="0.5" />
          <span class="range-value">{{ form.body }}</span>
        </div>
        <div class="form-group">
          <label>余韵 (1-10)</label>
          <input type="range" v-model.number="form.aftertaste" min="1" max="10" step="0.5" />
          <span class="range-value">{{ form.aftertaste }}</span>
        </div>
        <div class="form-group">
          <label>平衡 (1-10)</label>
          <input type="range" v-model.number="form.balance" min="1" max="10" step="0.5" />
          <span class="range-value">{{ form.balance }}</span>
        </div>
      </div>
      <button class="btn btn-primary" @click="submitRating" :disabled="!form.beanId">确认评分</button>
    </div>

    <div class="radar-section">
      <div v-for="bean in ratedBeans" :key="bean.id" class="radar-item">
        <div class="radar-header">
          <span class="bean-link">{{ bean.name }}</span>
          <span class="avg-score">均分 {{ getAvgScore(bean.avgRating) }}</span>
        </div>
        <v-chart :option="getRadarOption(bean)" class="radar-chart" autoresize />
      </div>
      <div v-if="ratedBeans.length === 0" class="empty-state">
        暂无评分数据，先登记豆种再添加评分
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
const form = reactive({
  beanId: '', acidity: 5, sweetness: 5, body: 5, aftertaste: 5, balance: 5,
})

const ratedBeans = computed(() => store.beansWithDetails.filter(b => b.avgRating))

const DIMENSIONS = ['酸度', '甜度', '醇厚度', '余韵', '平衡']
const DIM_KEYS = ['acidity', 'sweetness', 'body', 'aftertaste', 'balance']
const BEAN_COLORS = ['#6F4E37', '#C4A882', '#8B6914', '#D2A679', '#A0522D', '#DEB887']

function getRadarOption(bean) {
  const avg = bean.avgRating
  const avgData = DIM_KEYS.map(k => avg[k])
  const allRatings = store.ratings.filter(r => r.beanId === bean.id)
  const seriesData = [{ value: avgData, name: '平均评分', areaStyle: { opacity: 0.3 } }]
  allRatings.forEach((r, i) => {
    if (allRatings.length > 1) {
      seriesData.push({
        value: DIM_KEYS.map(k => r[k]),
        name: `评分 #${i + 1}`,
        lineStyle: { type: 'dashed', opacity: 0.5 },
        areaStyle: { opacity: 0.05 },
      })
    }
  })
  return {
    tooltip: {},
    radar: {
      indicator: DIMENSIONS.map(d => ({ name: d, max: 10 })),
      shape: 'polygon',
      splitNumber: 5,
      axisName: { color: '#6F4E37', fontSize: 12 },
      splitArea: { areaStyle: { color: ['#FFF8F0', '#FFF1E0', '#FFEAD0', '#FFE3C0', '#FFDDB0'] } },
    },
    series: [{
      type: 'radar',
      data: seriesData,
      itemStyle: { color: BEAN_COLORS[(bean.id - 1) % BEAN_COLORS.length] },
    }],
  }
}

function getAvgScore(rating) {
  if (!rating) return '-'
  const vals = DIM_KEYS.map(k => rating[k])
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
}

function resetForm() {
  form.beanId = ''
  form.acidity = 5
  form.sweetness = 5
  form.body = 5
  form.aftertaste = 5
  form.balance = 5
}

async function submitRating() {
  if (!form.beanId) return
  await store.addRating({
    beanId: Number(form.beanId),
    acidity: form.acidity,
    sweetness: form.sweetness,
    body: form.body,
    aftertaste: form.aftertaste,
    balance: form.balance,
  })
  resetForm()
  showForm.value = false
}
</script>

<style scoped>
.radar-section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.radar-item {
  background: #FFF8F0;
  border-radius: 12px;
  padding: 12px;
}
.radar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.avg-score {
  font-size: 13px;
  font-weight: 600;
  color: #6F4E37;
  background: #F0E0D0;
  padding: 2px 10px;
  border-radius: 20px;
}
.radar-chart {
  width: 100%;
  height: 280px;
}
.range-value {
  display: inline-block;
  min-width: 28px;
  text-align: center;
  font-weight: 600;
  color: #6F4E37;
  margin-left: 8px;
}
.form-group input[type="range"] {
  flex: 1;
}
</style>
