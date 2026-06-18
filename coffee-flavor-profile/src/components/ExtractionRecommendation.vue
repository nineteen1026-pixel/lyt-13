<template>
  <div class="extraction-recommendation">
    <div class="module-card">
      <div class="module-header">
        <h2>🎯 萃取参数智能推荐系统</h2>
        <div class="header-stats">
          <span class="stat-chip">📚 {{ store.totalCombinationsTested }} 种组合</span>
          <span class="stat-chip">📊 {{ store.totalRecords }} 条数据</span>
          <span class="stat-chip" v-if="store.avgOverallScore > 0">⭐ {{ store.avgOverallScore }} 平均评分</span>
          <span class="stat-chip" v-if="store.avgSatisfaction > 0">😊 {{ store.avgSatisfaction }} 满意度</span>
          <button class="btn btn-sm test-btn" @click="runBatchTest" :disabled="store.isComputing">
            {{ store.isComputing ? '计算中...' : '🧪 验证系统' }}
          </button>
        </div>
      </div>

      <div class="sub-header">
        <p class="intro">基于 <strong>加权回归 + KNN相似匹配</strong> 算法，结合历史萃取评分数据，科学推荐粉水比、水温和萃取时间</p>
      </div>

      <ExtractionParamsInput
        :bean-varieties="store.uniqueBeanVarieties"
        :roast-levels="roastLevels"
        :is-computing="store.isComputing"
        @recommend="handleRecommend"
      />

      <ExtractionParamsResult
        v-if="store.currentRecommendation"
        :recommendation="store.currentRecommendation"
        :bean-variety="selectedBeanVariety"
        :roast-level="selectedRoastLevel"
        :compute-time="store.lastComputedTime"
        @feedback="showFeedbackPanel = true"
      />

      <div v-else-if="!hasRecommended" class="empty-recommendation">
        <div class="empty-illustration">🎯</div>
        <h3>选择豆种与烘焙度，开始智能推荐</h3>
        <p>系统将分析 <strong>{{ store.totalCombinationsTested }}</strong> 种组合的历史数据，为您找到最优萃取方案</p>
        <div class="feature-cards">
          <div class="feature-card">
            <div class="feature-icon">💧</div>
            <h4>粉水比推荐</h4>
            <p>精确到小数点后一位的科学比例</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🌡️</div>
            <h4>水温建议</h4>
            <p>适合豆种特性的温度区间</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⏱️</div>
            <h4>萃取时间</h4>
            <p>最佳风味提取的时间范围</p>
          </div>
        </div>
      </div>

      <ExtractionParamsFeedback
        v-if="showFeedbackPanel && store.currentRecommendation"
        :bean-variety="selectedBeanVariety"
        :roast-level="selectedRoastLevel"
        :recommendation="store.currentRecommendation"
        @submit="handleSubmitFeedback"
        @close="showFeedbackPanel = false"
      />

      <div v-if="store.lastBatchTest" class="batch-test-result">
        <div class="test-header">
          <h3>🧪 系统验证报告</h3>
          <span :class="['test-status', { pass: store.lastBatchTest.allValid }]">
            {{ store.lastBatchTest.allValid ? '✅ 通过' : '⚠️ 警告' }}
          </span>
        </div>
        <div class="test-stats-grid">
          <div class="test-stat">
            <span class="test-stat-label">测试组合数</span>
            <span class="test-stat-value">{{ store.lastBatchTest.totalCombinations }}</span>
          </div>
          <div class="test-stat">
            <span class="test-stat-label">平均置信度</span>
            <span class="test-stat-value confidence">{{ store.lastBatchTest.avgConfidence }}%</span>
          </div>
          <div class="test-stat">
            <span class="test-stat-label">单次响应</span>
            <span class="test-stat-value">{{ store.lastBatchTest.avgResponseTime }}ms</span>
          </div>
          <div class="test-stat">
            <span class="test-stat-label">总耗时</span>
            <span class="test-stat-value">{{ store.lastBatchTest.totalTime }}ms</span>
          </div>
        </div>
        <div class="test-samples">
          <h4>测试样例 (前5组)</h4>
          <table class="sample-table">
            <thead>
              <tr>
                <th>豆种</th>
                <th>烘焙度</th>
                <th>粉水比</th>
                <th>水温</th>
                <th>时间</th>
                <th>置信度</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in store.lastBatchTest.sampleResults" :key="i">
                <td class="variety-cell">{{ s.variety }}</td>
                <td><span class="tag level-tag">{{ s.roast }}</span></td>
                <td class="ratio-cell">1:{{ s.ratio.toFixed(1) }}</td>
                <td class="temp-cell">{{ s.temp }}℃</td>
                <td class="time-cell">{{ s.time }}分</td>
                <td>
                  <span :class="['confidence-chip', confidenceClass(s.confidence)]">
                    {{ s.confidence }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ExtractionParamsCharts
        :store="store"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useExtractionParamsStore } from '../stores/extractionParams.js'
import { ROAST_LEVELS } from '../utils/recommendationAlgo.js'
import ExtractionParamsInput from './ExtractionParamsInput.vue'
import ExtractionParamsResult from './ExtractionParamsResult.vue'
import ExtractionParamsFeedback from './ExtractionParamsFeedback.vue'
import ExtractionParamsCharts from './ExtractionParamsCharts.vue'

const store = useExtractionParamsStore()
const roastLevels = ROAST_LEVELS

const selectedBeanVariety = ref('')
const selectedRoastLevel = ref('')
const hasRecommended = ref(false)
const showFeedbackPanel = ref(false)

async function handleRecommend(payload) {
  selectedBeanVariety.value = payload.beanVariety
  selectedRoastLevel.value = payload.roastLevel
  await store.recommend(payload.beanVariety, payload.roastLevel, true)
  hasRecommended.value = true
  showFeedbackPanel.value = false
}

async function handleSubmitFeedback(fb) {
  await store.submitFeedback(fb)
  showFeedbackPanel.value = false
}

async function runBatchTest() {
  await store.batchTestCombinations()
}

function confidenceClass(c) {
  if (c >= 80) return 'high'
  if (c >= 60) return 'medium'
  return 'low'
}
</script>

<style scoped>
.extraction-recommendation {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sub-header {
  margin: -8px 0 20px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #FFF5E6, #FFE8CC);
  border-radius: 10px;
  border-left: 4px solid #D2691E;
}

.intro {
  font-size: 13px;
  color: #6F4E37;
  line-height: 1.6;
}

.intro strong {
  color: #3E2C1C;
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-chip {
  padding: 4px 12px;
  background: #FFF8F0;
  border: 1px solid #E0D0B8;
  border-radius: 12px;
  font-size: 12px;
  color: #6F4E37;
  font-weight: 500;
}

.test-btn {
  background: linear-gradient(135deg, #2E8B57, #3CB371);
  color: #fff;
  border: none;
  padding: 5px 14px;
  font-size: 12px;
}

.test-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #276749, #2E8B57);
}

.empty-recommendation {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(180deg, #FFFBF5 0%, #FFF8F0 100%);
  border-radius: 14px;
  border: 2px dashed #E0D0B8;
}

.empty-illustration {
  font-size: 64px;
  margin-bottom: 12px;
}

.empty-recommendation h3 {
  font-size: 18px;
  color: #3E2C1C;
  margin-bottom: 8px;
}

.empty-recommendation p {
  font-size: 13px;
  color: #8B7355;
  margin-bottom: 24px;
}

.empty-recommendation strong {
  color: #6F4E37;
}

.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.feature-card {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  padding: 16px 12px;
  transition: all 0.2s;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(62, 44, 28, 0.1);
}

.feature-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.feature-card h4 {
  font-size: 14px;
  color: #3E2C1C;
  margin-bottom: 4px;
}

.feature-card p {
  font-size: 12px;
  color: #8B7355;
}

.batch-test-result {
  margin-top: 16px;
  padding: 18px;
  background: linear-gradient(135deg, #F0FFF4, #E6FFF0);
  border: 1px solid #B8E0C8;
  border-radius: 12px;
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.test-header h3 {
  font-size: 15px;
  color: #2E5A2E;
  margin: 0;
}

.test-status {
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  background: #FFF0E0;
  color: #B8860B;
}

.test-status.pass {
  background: #D4EDDA;
  color: #2E5A2E;
}

.test-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.test-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #FFFCF7;
  border-radius: 8px;
  border: 1px solid #D4E6D4;
}

.test-stat-label {
  font-size: 11px;
  color: #6F8B6F;
}

.test-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #2E5A2E;
}

.test-stat-value.confidence {
  color: #2E8B57;
}

.test-samples h4 {
  font-size: 13px;
  color: #3E5A3E;
  margin-bottom: 10px;
}

.sample-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: #FFFCF7;
  border-radius: 8px;
  overflow: hidden;
}

.sample-table th,
.sample-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #E8F0E8;
}

.sample-table th {
  background: #E8F0E8;
  color: #3E5A3E;
  font-weight: 600;
}

.sample-table td:last-child {
  text-align: center;
}

.variety-cell {
  font-weight: 500;
  color: #3E2C1C;
}

.ratio-cell {
  color: #2E8B57;
  font-weight: 600;
}

.temp-cell {
  color: #CD5C5C;
  font-weight: 600;
}

.time-cell {
  color: #4169E1;
  font-weight: 600;
}

.confidence-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 600;
}

.confidence-chip.high {
  background: #D4EDDA;
  color: #2E5A2E;
}

.confidence-chip.medium {
  background: #FFF3CD;
  color: #856404;
}

.confidence-chip.low {
  background: #F8D7DA;
  color: #8B3A3A;
}
</style>
