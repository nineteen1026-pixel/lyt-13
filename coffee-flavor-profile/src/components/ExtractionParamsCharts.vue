<template>
  <div class="charts-section">
    <div class="charts-header">
      <h3>📈 数据可视化分析</h3>
      <div class="tabs">
        <button
          v-for="tab in chartTabs"
          :key="tab.key"
          :class="['tab', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="chart-grid" v-if="activeTab === 'scatter'">
      <div class="chart-card">
        <h4>💧 粉水比 vs 综合评分</h4>
        <v-chart :option="scatterOption('ratio')" autoresize class="chart-canvas" />
        <p class="chart-hint">散点大小表示样本验证次数，颜色表示烘焙度深浅</p>
      </div>
      <div class="chart-card">
        <h4>🌡️ 水温 vs 综合评分</h4>
        <v-chart :option="scatterOption('temperature')" autoresize class="chart-canvas" />
        <p class="chart-hint">观察最优评分数值对应的温度区间</p>
      </div>
      <div class="chart-card">
        <h4>⏱️ 萃取时间 vs 综合评分</h4>
        <v-chart :option="scatterOption('brewTime')" autoresize class="chart-canvas" />
        <p class="chart-hint">分析提取时间对咖啡风味的影响</p>
      </div>
    </div>

    <div class="chart-grid" v-if="activeTab === 'heatmap'">
      <div class="chart-card wide">
        <h4>🔥 烘焙度参数热力图</h4>
        <v-chart :option="heatmapOption" autoresize class="chart-canvas tall" />
        <p class="chart-hint">不同烘焙程度下各萃取参数的平均值变化趋势</p>
      </div>
      <div class="chart-card">
        <h4>🏷️ 烘焙度数据分布</h4>
        <v-chart :option="roastDistributionOption" autoresize class="chart-canvas" />
        <p class="chart-hint">各烘焙度的历史记录数量与平均评分</p>
      </div>
    </div>

    <div class="chart-grid" v-if="activeTab === 'trend'">
      <div class="chart-card wide" v-if="store.satisfactionTrend.length > 0">
        <h4>📊 推荐满意度迭代趋势</h4>
        <v-chart :option="satisfactionTrendOption" autoresize class="chart-canvas tall" />
        <p class="chart-hint">随着用户反馈增加，观察推荐质量的变化趋势</p>
      </div>
      <div class="chart-card" v-else>
        <div class="empty-chart">
          <div class="empty-icon">📊</div>
          <h4>暂无满意度数据</h4>
          <p>提交评分反馈后，这里将展示推荐算法迭代优化趋势</p>
        </div>
      </div>
      <div class="chart-card">
        <h4>🫘 豆种大类参数概览</h4>
        <v-chart :option="beanTypeOverviewOption" autoresize class="chart-canvas" />
        <p class="chart-hint">阿拉比卡、罗布斯塔等大类的平均参数对比</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, markRaw } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ScatterChart, HeatmapChart, LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent, TooltipComponent, LegendComponent, GridComponent,
  VisualMapComponent, ToolboxComponent, DataZoomComponent,
} from 'echarts/components'

use([
  CanvasRenderer, ScatterChart, HeatmapChart, LineChart, BarChart, PieChart,
  TitleComponent, TooltipComponent, LegendComponent, GridComponent,
  VisualMapComponent, ToolboxComponent, DataZoomComponent,
])

const props = defineProps({ store: { type: Object, required: true } })

const activeTab = ref('scatter')
const chartTabs = [
  { key: 'scatter', icon: '⚬', label: '参数-评分散点' },
  { key: 'heatmap', icon: '▦', label: '烘焙度热力图' },
  { key: 'trend', icon: '📈', label: '优化趋势' },
]

markRaw(VChart)

const ROAST_COLOR_MAP = {
  '极浅烘焙': '#E8D5B7',
  '浅烘焙': '#D2B48C',
  '中浅烘焙': '#C19A6B',
  '中烘焙': '#A67B5B',
  '中深烘焙': '#8B5E3C',
  '深烘焙': '#6F4E37',
  '极深烘焙': '#3E2C1C',
}

const scatterData = computed(() => props.store.getScatterChartData())
const heatmapData = computed(() => props.store.getHeatmapData())

function scatterOption(paramKey) {
  const paramLabel = { ratio: '粉水比 (1:X)', temperature: '水温 (℃)', brewTime: '萃取时间 (分钟)' }[paramKey]
  const data = scatterData.value.map(d => ({
    name: d.name,
    value: [d[paramKey], d.score],
    itemStyle: {
      color: ROAST_COLOR_MAP[d.roastLevel] || '#8B7355',
      opacity: 0.7,
    },
    symbolSize: Math.min(30, 6 + d.score * 3),
  }))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(62, 44, 28, 0.95)',
      borderColor: '#6F4E37',
      textStyle: { color: '#FFF8F0', fontSize: 12 },
      formatter: p => {
        const parts = p.name.split(' - ')
        return `<b>${parts[0]}</b><br/>烘焙: ${parts[1] || ''}<br/>${paramLabel}: ${p.value[0]}<br/>评分: ${p.value[1].toFixed(1)}`
      },
    },
    grid: { left: 50, right: 16, top: 20, bottom: 40 },
    xAxis: {
      name: paramLabel,
      nameTextStyle: { color: '#6F4E37', fontSize: 11 },
      axisLabel: { color: '#8B7355', fontSize: 10 },
      axisLine: { lineStyle: { color: '#E0D0B8' } },
      splitLine: { lineStyle: { color: '#F0E8DC', type: 'dashed' } },
    },
    yAxis: {
      name: '综合评分',
      nameTextStyle: { color: '#6F4E37', fontSize: 11 },
      min: 1,
      max: 5.5,
      axisLabel: { color: '#8B7355', fontSize: 10 },
      axisLine: { lineStyle: { color: '#E0D0B8' } },
      splitLine: { lineStyle: { color: '#F0E8DC', type: 'dashed' } },
    },
    series: [{ type: 'scatter', data, emphasis: { itemStyle: { opacity: 1, borderColor: '#3E2C1C', borderWidth: 1.5 } } }],
  }
}

const heatmapOption = computed(() => {
  const { xData, yData, data } = heatmapData.value
  const minVals = [10, 80, 1]
  const maxVals = [18, 100, 6]
  const normalizedData = data.map(d => [d[0], d[1], +(
    (d[2] - minVals[d[1]]) / (maxVals[d[1]] - minVals[d[1]]) * 100
  ).toFixed(1)])

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(62, 44, 28, 0.95)',
      borderColor: '#6F4E37',
      textStyle: { color: '#FFF8F0', fontSize: 12 },
      formatter: p => {
        const raw = data.find(d => d[0] === p.value[0] && d[1] === p.value[1])
        return `${xData[p.value[0]]}<br/>${yData[p.value[1]]}<br/><b>${raw ? raw[2] : '-'}</b>`
      },
    },
    grid: { left: 90, right: 20, top: 10, bottom: 70 },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { color: '#6F4E37', fontSize: 11, rotate: 25, interval: 0 },
      axisLine: { lineStyle: { color: '#E0D0B8' } },
      splitArea: { show: true, areaStyle: { color: ['#FFFBF5', '#FFF8F0'] } },
    },
    yAxis: {
      type: 'category',
      data: yData,
      axisLabel: { color: '#6F4E37', fontSize: 11 },
      axisLine: { lineStyle: { color: '#E0D0B8' } },
    },
    visualMap: {
      min: 0,
      max: 100,
      left: 10,
      bottom: 10,
      orient: 'horizontal',
      calculable: true,
      inRange: { color: ['#E8F5E9', '#A5D6A7', '#66BB6A', '#FFA726', '#EF5350'] },
      textStyle: { color: '#6F4E37', fontSize: 10 },
    },
    series: [{
      type: 'heatmap',
      data: normalizedData,
      label: {
        show: true,
        color: '#3E2C1C',
        fontSize: 10,
        formatter: p => {
          const raw = data.find(d => d[0] === p.value[0] && d[1] === p.value[1])
          return raw ? raw[2] : ''
        },
      },
    }],
  }
})

const roastDistributionOption = computed(() => {
  const stats = props.store.statsByRoastLevel
  const levels = Object.keys(stats).filter(k => stats[k].count > 0)
  const counts = levels.map(k => stats[k].count)
  const avgScores = levels.map(k => stats[k].avgScore)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(62, 44, 28, 0.95)',
      borderColor: '#6F4E37',
      textStyle: { color: '#FFF8F0', fontSize: 12 },
    },
    legend: {
      data: ['记录数', '平均评分'],
      textStyle: { color: '#6F4E37', fontSize: 11 },
      top: 0,
    },
    grid: { left: 45, right: 45, top: 36, bottom: 40 },
    xAxis: {
      type: 'category',
      data: levels,
      axisLabel: { color: '#6F4E37', fontSize: 10, rotate: 15 },
      axisLine: { lineStyle: { color: '#E0D0B8' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '记录数',
        nameTextStyle: { color: '#6F4E37', fontSize: 10 },
        axisLabel: { color: '#8B7355', fontSize: 10 },
        axisLine: { lineStyle: { color: '#E0D0B8' } },
        splitLine: { lineStyle: { color: '#F0E8DC', type: 'dashed' } },
      },
      {
        type: 'value',
        name: '评分',
        min: 3,
        max: 5,
        nameTextStyle: { color: '#6F4E37', fontSize: 10 },
        axisLabel: { color: '#8B7355', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '记录数',
        type: 'bar',
        data: counts,
        barWidth: '40%',
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#D2B48C' }, { offset: 1, color: '#A67B5B' }] },
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '平均评分',
        type: 'line',
        yAxisIndex: 1,
        data: avgScores,
        smooth: true,
        lineStyle: { color: '#CD853F', width: 2.5 },
        itemStyle: { color: '#CD853F', borderColor: '#FFFBF5', borderWidth: 2 },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  }
})

const satisfactionTrendOption = computed(() => {
  const trend = props.store.satisfactionTrend
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(62, 44, 28, 0.95)',
      borderColor: '#6F4E37',
      textStyle: { color: '#FFF8F0', fontSize: 12 },
    },
    legend: {
      data: ['当次评分', '滚动平均'],
      textStyle: { color: '#6F4E37', fontSize: 11 },
      top: 0,
    },
    grid: { left: 40, right: 16, top: 36, bottom: 40 },
    xAxis: {
      type: 'category',
      data: trend.map(t => t.date),
      boundaryGap: false,
      axisLabel: { color: '#6F4E37', fontSize: 10 },
      axisLine: { lineStyle: { color: '#E0D0B8' } },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 5,
      name: '满意度',
      nameTextStyle: { color: '#6F4E37', fontSize: 10 },
      axisLabel: { color: '#8B7355', fontSize: 10 },
      axisLine: { lineStyle: { color: '#E0D0B8' } },
      splitLine: { lineStyle: { color: '#F0E8DC', type: 'dashed' } },
    },
    series: [
      {
        name: '当次评分',
        type: 'scatter',
        data: trend.map(t => t.satisfaction),
        itemStyle: { color: '#8B3A62', opacity: 0.6 },
        symbolSize: 10,
      },
      {
        name: '滚动平均',
        type: 'line',
        data: trend.map(t => t.rollingAvg),
        smooth: true,
        lineStyle: { color: '#D2691E', width: 3 },
        itemStyle: { color: '#D2691E' },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(210, 105, 30, 0.35)' }, { offset: 1, color: 'rgba(210, 105, 30, 0.02)' }] },
        },
        symbol: 'none',
      },
      {
        name: '目标线',
        type: 'line',
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#2E8B57', type: 'dashed', width: 1.5 },
          data: [{ yAxis: 4, label: { formatter: '🎯 4.0 目标', color: '#2E8B57', fontSize: 11 } }],
        },
        data: [],
      },
    ],
  }
})

const beanTypeOverviewOption = computed(() => {
  const typeStats = {}
  props.store.paramHistory.forEach(r => {
    if (!typeStats[r.beanType]) {
      typeStats[r.beanType] = { count: 0, ratios: [], temps: [], times: [] }
    }
    typeStats[r.beanType].count++
    typeStats[r.beanType].ratios.push(r.ratio)
    typeStats[r.beanType].temps.push(r.temperature)
    typeStats[r.beanType].times.push(r.brewTime)
  })

  const types = Object.keys(typeStats)
  const avg = arr => +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(62, 44, 28, 0.95)',
      borderColor: '#6F4E37',
      textStyle: { color: '#FFF8F0', fontSize: 12 },
    },
    legend: {
      data: ['平均粉水比(1:X)', '平均水温(℃/10)', '平均萃取时间(分)'],
      textStyle: { color: '#6F4E37', fontSize: 10 },
      top: 0,
      type: 'scroll',
    },
    grid: { left: 50, right: 16, top: 50, bottom: 36 },
    xAxis: {
      type: 'category',
      data: types,
      axisLabel: { color: '#6F4E37', fontSize: 10 },
      axisLine: { lineStyle: { color: '#E0D0B8' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8B7355', fontSize: 10 },
      axisLine: { lineStyle: { color: '#E0D0B8' } },
      splitLine: { lineStyle: { color: '#F0E8DC', type: 'dashed' } },
    },
    series: [
      {
        name: '平均粉水比(1:X)',
        type: 'bar',
        data: types.map(t => avg(typeStats[t].ratios)),
        itemStyle: { color: '#66BB6A', borderRadius: [3, 3, 0, 0] },
        barWidth: 16,
      },
      {
        name: '平均水温(℃/10)',
        type: 'bar',
        data: types.map(t => avg(typeStats[t].temps) / 10),
        itemStyle: { color: '#EF5350', borderRadius: [3, 3, 0, 0] },
        barWidth: 16,
      },
      {
        name: '平均萃取时间(分)',
        type: 'bar',
        data: types.map(t => avg(typeStats[t].times)),
        itemStyle: { color: '#42A5F5', borderRadius: [3, 3, 0, 0] },
        barWidth: 16,
      },
    ],
  }
})
</script>

<style scoped>
.charts-section {
  margin-top: 24px;
  padding: 18px;
  background: linear-gradient(180deg, #FFFBF5, #FFF8F0);
  border-radius: 14px;
  border: 1px solid #E0D0B8;
}

.charts-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px dashed #E0D0B8;
}

.charts-header h3 {
  font-size: 16px;
  color: #3E2C1C;
  margin: 0 0 10px;
}

.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab {
  padding: 6px 14px;
  border: 1.5px solid #E0D0B8;
  background: #FFFCF7;
  border-radius: 16px;
  color: #8B7355;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}

.tab:hover {
  background: #FFF5E6;
  color: #6F4E37;
}

.tab.active {
  background: linear-gradient(135deg, #6F4E37, #8B4513);
  color: #FFF8F0;
  border-color: #6F4E37;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.chart-card {
  background: #FFFCF7;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 14px;
}

.chart-card.wide {
  grid-column: span 2;
}

@media (max-width: 800px) {
  .chart-card.wide { grid-column: span 1; }
}

.chart-card h4 {
  font-size: 13px;
  color: #3E2C1C;
  margin: 0 0 8px;
  font-weight: 600;
}

.chart-canvas {
  width: 100%;
  height: 260px;
}

.chart-canvas.tall {
  height: 340px;
}

.chart-hint {
  font-size: 11px;
  color: #A08968;
  margin: 6px 0 0;
  font-style: italic;
}

.empty-chart {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
  opacity: 0.6;
}

.empty-chart h4 {
  font-size: 14px;
  color: #6F4E37;
  margin-bottom: 4px;
}

.empty-chart p {
  font-size: 12px;
  color: #A08968;
  line-height: 1.5;
  margin: 0;
}
</style>
