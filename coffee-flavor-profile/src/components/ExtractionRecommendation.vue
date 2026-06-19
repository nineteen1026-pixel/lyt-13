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
            {{ store.isComputing ? '计算中...' : '🧪 快速验证' }}
          </button>
        </div>
      </div>

      <div class="sub-header">
        <p class="intro">基于 <strong>加权回归 + KNN相似匹配</strong> 算法，结合历史萃取评分数据，科学推荐粉水比、水温和萃取时间</p>
        <div class="weights-display">
          <span class="weights-label">当前算法权重：</span>
          <span class="weight-tag" v-for="(val, key) in weightLabels" :key="key">
            {{ val.label }} {{ (store.currentWeights[key] * 100).toFixed(0) }}%
          </span>
        </div>
      </div>

      <div class="action-tabs">
        <button
          v-for="tab in actionTabs"
          :key="tab.key"
          :class="['action-tab', { active: activeActionTab === tab.key }]"
          @click="activeActionTab = tab.key"
        >{{ tab.icon }} {{ tab.label }}</button>
      </div>

      <div v-if="activeActionTab === 'recommend'" class="tab-content">
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
      </div>

      <div v-if="activeActionTab === 'history'" class="tab-content">
        <ExtractionHistoryEntry @submit="handleHistoryEntry" />
      </div>

      <div v-if="activeActionTab === 'validate'" class="tab-content">
        <div class="validate-panel">
          <div class="validate-actions">
            <button class="btn btn-validate" @click="runFullValidation" :disabled="store.isComputing">
              {{ store.isComputing ? '验证中...' : '🔍 全量验证 (230+组合)' }}
            </button>
            <button class="btn btn-stress" @click="runStressTest" :disabled="store.isComputing">
              {{ store.isComputing ? '压测中...' : '⚡ 并发压测 (1000请求)' }}
            </button>
          </div>

          <div v-if="store.lastFullValidation" class="validation-report">
            <div class="report-header">
              <h3>📊 全量验证满意度报告</h3>
              <span :class="['report-status', { pass: store.lastFullValidation.overallPass }]">
                {{ store.lastFullValidation.overallPass ? '✅ 全部达标' : '⚠️ 部分未达标' }}
              </span>
            </div>

            <div class="report-gates">
              <div :class="['gate', { pass: store.lastFullValidation.meetsCoverageGate }]">
                <span class="gate-icon">{{ store.lastFullValidation.meetsCoverageGate ? '✅' : '❌' }}</span>
                <span class="gate-label">组合覆盖 ≥100</span>
                <span class="gate-value">{{ store.lastFullValidation.totalCombinations }} 种</span>
              </div>
              <div :class="['gate', { pass: store.lastFullValidation.meetsQualityGate }]">
                <span class="gate-icon">{{ store.lastFullValidation.meetsQualityGate ? '✅' : '❌' }}</span>
                <span class="gate-label">满意度 ≥4.0</span>
                <span class="gate-value">{{ store.lastFullValidation.avgSatisfaction }} 分</span>
              </div>
              <div :class="['gate', { pass: store.lastFullValidation.meetsPerformanceGate }]">
                <span class="gate-icon">{{ store.lastFullValidation.meetsPerformanceGate ? '✅' : '❌' }}</span>
                <span class="gate-label">响应 ≤2s</span>
                <span class="gate-value">{{ store.lastFullValidation.avgResponseTimeMs }}ms</span>
              </div>
              <div :class="['gate', { pass: store.lastFullValidation.allValid }]">
                <span class="gate-icon">{{ store.lastFullValidation.allValid ? '✅' : '❌' }}</span>
                <span class="gate-label">参数全部合法</span>
                <span class="gate-value">{{ store.lastFullValidation.validCombinations }}/{{ store.lastFullValidation.totalCombinations }}</span>
              </div>
            </div>

            <div class="report-metrics">
              <div class="metric-card">
                <span class="metric-val">{{ store.lastFullValidation.avgConfidence }}%</span>
                <span class="metric-lbl">平均置信度</span>
              </div>
              <div class="metric-card highlight">
                <span class="metric-val">{{ store.lastFullValidation.avgSatisfaction }}</span>
                <span class="metric-lbl">平均满意度</span>
              </div>
              <div class="metric-card">
                <span class="metric-val">{{ store.lastFullValidation.avgResponseTimeMs }}ms</span>
                <span class="metric-lbl">平均响应</span>
              </div>
              <div class="metric-card">
                <span class="metric-val">{{ store.lastFullValidation.totalTimeMs }}ms</span>
                <span class="metric-lbl">总验证耗时</span>
              </div>
            </div>

            <div class="report-sections">
              <div class="report-section">
                <h4>📈 满意度分布</h4>
                <div class="sat-bars">
                  <div v-for="(count, range) in store.lastFullValidation.satisfactionDistribution" :key="range" class="sat-bar-row">
                    <span class="sat-range">{{ range }}</span>
                    <div class="sat-bar-track">
                      <div
                        class="sat-bar-fill"
                        :style="{ width: (count / store.lastFullValidation.totalCombinations * 100) + '%' }"
                        :class="rangeClass(range)"
                      ></div>
                    </div>
                    <span class="sat-count">{{ count }}</span>
                  </div>
                </div>
              </div>

              <div class="report-section">
                <h4>🫘 按豆种大类统计</h4>
                <table class="report-table">
                  <thead>
                    <tr><th>大类</th><th>组合数</th><th>平均满意度</th><th>平均置信度</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(stats, type) in store.lastFullValidation.byBeanType" :key="type">
                      <td>{{ type }}</td>
                      <td>{{ stats.count }}</td>
                      <td :class="satClass(stats.avgSatisfaction)">{{ stats.avgSatisfaction }}</td>
                      <td>{{ stats.avgConfidence }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="report-section">
                <h4>🔥 按烘焙度统计</h4>
                <table class="report-table">
                  <thead>
                    <tr><th>烘焙度</th><th>组合数</th><th>平均满意度</th><th>平均置信度</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(stats, level) in store.lastFullValidation.byRoastLevel" :key="level">
                      <td>{{ level }}</td>
                      <td>{{ stats.count }}</td>
                      <td :class="satClass(stats.avgSatisfaction)">{{ stats.avgSatisfaction }}</td>
                      <td>{{ stats.avgConfidence }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="store.lastFullValidation.lowResults.length > 0" class="report-section">
                <h4>⚠️ 低满意度组合 (需关注)</h4>
                <table class="report-table warn">
                  <thead>
                    <tr><th>豆种</th><th>烘焙度</th><th>粉水比</th><th>水温</th><th>时间</th><th>满意度</th><th>偏差</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, i) in store.lastFullValidation.lowResults" :key="i">
                      <td>{{ r.beanVariety }}</td>
                      <td>{{ r.roastLevel }}</td>
                      <td>1:{{ r.ratio.toFixed(1) }}</td>
                      <td>{{ r.temperature }}℃</td>
                      <td>{{ r.brewTime }}分</td>
                      <td class="sat-low">{{ r.satisfaction }}</td>
                      <td>比{{ r.ratioDeviation }}% / 温{{ r.tempDeviation }}% / 时{{ r.timeDeviation }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-if="store.lastStressTest" class="stress-report">
            <div class="report-header">
              <h3>⚡ 并发压测报告</h3>
              <span :class="['report-status', { pass: store.lastStressTest.meetsRequirement }]">
                {{ store.lastStressTest.meetsRequirement ? '✅ 达标' : '⚠️ 未达标' }}
              </span>
            </div>

            <div class="report-metrics">
              <div class="metric-card">
                <span class="metric-val">{{ store.lastStressTest.concurrency }}</span>
                <span class="metric-lbl">并发数</span>
              </div>
              <div class="metric-card">
                <span class="metric-val">{{ store.lastStressTest.totalTimeMs }}ms</span>
                <span class="metric-lbl">总耗时</span>
              </div>
              <div class="metric-card highlight">
                <span class="metric-val">{{ store.lastStressTest.avgResponseMs }}ms</span>
                <span class="metric-lbl">平均响应</span>
              </div>
              <div class="metric-card">
                <span class="metric-val">{{ store.lastStressTest.successRate }}%</span>
                <span class="metric-lbl">成功率</span>
              </div>
              <div class="metric-card">
                <span class="metric-val">{{ store.lastStressTest.p50Ms }}ms</span>
                <span class="metric-lbl">P50</span>
              </div>
              <div class="metric-card">
                <span class="metric-val">{{ store.lastStressTest.p95Ms }}ms</span>
                <span class="metric-lbl">P95</span>
              </div>
              <div class="metric-card">
                <span class="metric-val">{{ store.lastStressTest.p99Ms }}ms</span>
                <span class="metric-lbl">P99</span>
              </div>
              <div class="metric-card">
                <span class="metric-val">{{ store.lastStressTest.throughput }}</span>
                <span class="metric-lbl">吞吐量(req/s)</span>
              </div>
            </div>

            <div class="confidence-dist">
              <h4>📊 置信度分布</h4>
              <div class="dist-bars">
                <div class="dist-bar-row">
                  <span class="dist-label">高 (≥80%)</span>
                  <div class="dist-bar-track"><div class="dist-bar-fill high" :style="{ width: (store.lastStressTest.confidenceDistribution.high / store.lastStressTest.concurrency * 100) + '%' }"></div></div>
                  <span class="dist-count">{{ store.lastStressTest.confidenceDistribution.high }}</span>
                </div>
                <div class="dist-bar-row">
                  <span class="dist-label">中 (60-79%)</span>
                  <div class="dist-bar-track"><div class="dist-bar-fill medium" :style="{ width: (store.lastStressTest.confidenceDistribution.medium / store.lastStressTest.concurrency * 100) + '%' }"></div></div>
                  <span class="dist-count">{{ store.lastStressTest.confidenceDistribution.medium }}</span>
                </div>
                <div class="dist-bar-row">
                  <span class="dist-label">低 (<60%)</span>
                  <div class="dist-bar-track"><div class="dist-bar-fill low" :style="{ width: (store.lastStressTest.confidenceDistribution.low / store.lastStressTest.concurrency * 100) + '%' }"></div></div>
                  <span class="dist-count">{{ store.lastStressTest.confidenceDistribution.low }}</span>
                </div>
              </div>
            </div>

            <div v-if="store.lastStressTest.tierResults.length > 0" class="tier-table">
              <h4>📈 分层压测结果</h4>
              <table class="report-table">
                <thead>
                  <tr><th>并发数</th><th>总耗时</th><th>平均响应</th><th>P50</th><th>P95</th><th>P99</th><th>成功率</th><th>吞吐量</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(t, i) in store.lastStressTest.tierResults" :key="i">
                    <td>{{ t.concurrency }}</td>
                    <td>{{ t.totalTimeMs }}ms</td>
                    <td>{{ t.avgResponseMs }}ms</td>
                    <td>{{ t.p50Ms }}ms</td>
                    <td>{{ t.p95Ms }}ms</td>
                    <td>{{ t.p99Ms }}ms</td>
                    <td>{{ t.successRate }}%</td>
                    <td>{{ t.throughput }}/s</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeActionTab === 'weights'" class="tab-content">
        <div class="weights-panel">
          <div class="weights-header">
            <h3>⚙️ 算法权重迭代</h3>
            <button class="btn btn-iterate" @click="runWeightIteration" :disabled="store.feedbacks.length < 3">
              {{ store.feedbacks.length < 3 ? '需要≥3条反馈' : '🔄 执行权重迭代' }}
            </button>
          </div>
          <p class="weights-desc">基于用户反馈数据，通过梯度下降自动调整相似度计算的四个维度权重，使推荐结果更贴合实际体验。</p>

          <div class="current-weights-viz">
            <div v-for="(val, key) in weightLabels" :key="key" class="weight-viz-row">
              <span class="wv-label">{{ val.icon }} {{ val.label }}</span>
              <div class="wv-track">
                <div class="wv-fill" :style="{ width: (store.currentWeights[key] * 100) + '%', background: val.color }"></div>
              </div>
              <span class="wv-value">{{ (store.currentWeights[key] * 100).toFixed(1) }}%</span>
            </div>
          </div>

          <div v-if="store.lastWeightIteration" class="iteration-result">
            <div class="iteration-meta">
              <span>📅 {{ store.lastWeightIteration.timestamp }}</span>
              <span>📊 基于 {{ store.lastWeightIteration.feedbackCount }} 条反馈</span>
              <span>📉 梯度范数: {{ store.lastWeightIteration.gradientNorm }}</span>
            </div>
            <div class="weight-changes">
              <div v-for="(val, key) in weightLabels" :key="key" class="wc-row">
                <span class="wc-label">{{ val.label }}</span>
                <span class="wc-old">{{ (store.lastWeightIteration.previousWeights[key] * 100).toFixed(1) }}%</span>
                <span class="wc-arrow">→</span>
                <span class="wc-new">{{ (store.lastWeightIteration.newWeights[key] * 100).toFixed(1) }}%</span>
                <span :class="['wc-diff', store.lastWeightIteration.newWeights[key] > store.lastWeightIteration.previousWeights[key] ? 'up' : 'down']">
                  {{ store.lastWeightIteration.newWeights[key] > store.lastWeightIteration.previousWeights[key] ? '↑' : '↓' }}
                  {{ Math.abs((store.lastWeightIteration.newWeights[key] - store.lastWeightIteration.previousWeights[key]) * 100).toFixed(2) }}%
                </span>
              </div>
            </div>
          </div>

          <div v-if="store.weightHistory.length > 1" class="weight-history">
            <h4>📜 迭代历史</h4>
            <table class="report-table compact">
              <thead>
                <tr><th>#</th><th>时间</th><th>反馈数</th><th>梯度范数</th><th>豆种大类</th><th>品种</th><th>烘焙度</th><th>处理法</th></tr>
              </thead>
              <tbody>
                <tr v-for="(h, i) in store.weightHistory" :key="i">
                  <td>{{ i + 1 }}</td>
                  <td>{{ new Date(h.timestamp).toLocaleTimeString('zh-CN') }}</td>
                  <td>{{ h.feedbackCount }}</td>
                  <td>{{ h.gradientNorm }}</td>
                  <td>{{ (h.newWeights.typeW * 100).toFixed(1) }}%</td>
                  <td>{{ (h.newWeights.varietyW * 100).toFixed(1) }}%</td>
                  <td>{{ (h.newWeights.roastW * 100).toFixed(1) }}%</td>
                  <td>{{ (h.newWeights.processW * 100).toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="store.lastBatchTest && activeActionTab === 'recommend'" class="batch-test-result">
        <div class="test-header">
          <h3>🧪 快速验证报告</h3>
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
              <tr><th>豆种</th><th>烘焙度</th><th>粉水比</th><th>水温</th><th>时间</th><th>置信度</th></tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in store.lastBatchTest.sampleResults" :key="i">
                <td class="variety-cell">{{ s.variety }}</td>
                <td><span class="tag level-tag">{{ s.roast }}</span></td>
                <td class="ratio-cell">1:{{ s.ratio.toFixed(1) }}</td>
                <td class="temp-cell">{{ s.temp }}℃</td>
                <td class="time-cell">{{ s.time }}分</td>
                <td><span :class="['confidence-chip', confidenceClass(s.confidence)]">{{ s.confidence }}%</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ExtractionParamsCharts
        :store="store"
      />

      <ExtractionParamsRecordForm @submit="handleAddRecord" />

      <ExtractionParamsAdvanced :store="store" />
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
import ExtractionHistoryEntry from './ExtractionHistoryEntry.vue'
import ExtractionParamsCharts from './ExtractionParamsCharts.vue'
import ExtractionParamsRecordForm from './ExtractionParamsRecordForm.vue'
import ExtractionParamsAdvanced from './ExtractionParamsAdvanced.vue'

const store = useExtractionParamsStore()
const roastLevels = ROAST_LEVELS

const selectedBeanVariety = ref('')
const selectedRoastLevel = ref('')
const hasRecommended = ref(false)
const showFeedbackPanel = ref(false)
const activeActionTab = ref('recommend')

const actionTabs = [
  { key: 'recommend', icon: '🎯', label: '智能推荐' },
  { key: 'history', icon: '📝', label: '历史录入' },
  { key: 'validate', icon: '🧪', label: '验证与压测' },
  { key: 'weights', icon: '⚙️', label: '权重迭代' },
]

const weightLabels = {
  typeW: { label: '豆种大类', icon: '🫘', color: '#8B4513' },
  varietyW: { label: '具体品种', icon: '🌿', color: '#2E8B57' },
  roastW: { label: '烘焙度', icon: '🔥', color: '#CD5C5C' },
  processW: { label: '处理法', icon: '💧', color: '#4169E1' },
}

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

async function handleHistoryEntry(data) {
  await store.addParamRecord(data)
}

async function handleAddRecord(data) {
  await store.addParamRecord(data)
}

async function runBatchTest() {
  await store.batchTestCombinations()
}

async function runFullValidation() {
  await store.runFullValidation()
}

async function runStressTest() {
  await store.runStressTest(1000)
}

function runWeightIteration() {
  store.iterateWeights()
}

function confidenceClass(c) {
  if (c >= 80) return 'high'
  if (c >= 60) return 'medium'
  return 'low'
}

function satClass(s) {
  if (s >= 4.0) return 'sat-good'
  if (s >= 3.5) return 'sat-ok'
  return 'sat-low'
}

function rangeClass(range) {
  if (range === '≥4.5') return 'excellent'
  if (range === '4.0-4.4') return 'good'
  if (range === '3.5-3.9') return 'ok'
  return 'poor'
}
</script>

<style scoped>
.extraction-recommendation {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sub-header {
  margin: -8px 0 16px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #FFF5E6, #FFE8CC);
  border-radius: 10px;
  border-left: 4px solid #D2691E;
}

.intro {
  font-size: 13px;
  color: #6F4E37;
  line-height: 1.6;
  margin: 0 0 8px;
}

.intro strong { color: #3E2C1C; }

.weights-display {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.weights-label {
  font-size: 11px;
  color: #8B7355;
}

.weight-tag {
  padding: 2px 8px;
  background: #FFF8F0;
  border: 1px solid #E0D0B8;
  border-radius: 10px;
  font-size: 11px;
  color: #6F4E37;
  font-weight: 500;
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

.action-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 2px solid #E0D0B8;
  padding-bottom: 2px;
}

.action-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #8B7355;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.15s;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.action-tab:hover {
  background: #FFF8F0;
  color: #6F4E37;
}

.action-tab.active {
  background: #FFF8F0;
  color: #3E2C1C;
  border-bottom-color: #D2691E;
  font-weight: 600;
}

.tab-content {
  min-height: 100px;
}

.empty-recommendation {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(180deg, #FFFBF5 0%, #FFF8F0 100%);
  border-radius: 14px;
  border: 2px dashed #E0D0B8;
}

.empty-illustration { font-size: 64px; margin-bottom: 12px; }
.empty-recommendation h3 { font-size: 18px; color: #3E2C1C; margin-bottom: 8px; }
.empty-recommendation p { font-size: 13px; color: #8B7355; margin-bottom: 24px; }
.empty-recommendation strong { color: #6F4E37; }

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

.feature-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(62, 44, 28, 0.1); }
.feature-icon { font-size: 28px; margin-bottom: 8px; }
.feature-card h4 { font-size: 14px; color: #3E2C1C; margin-bottom: 4px; }
.feature-card p { font-size: 12px; color: #8B7355; }

.validate-panel {
  padding: 16px;
  background: linear-gradient(180deg, #F8FFFF, #F0F8FF);
  border-radius: 12px;
  border: 1px solid #B8C8E0;
}

.validate-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.btn-validate {
  padding: 10px 20px;
  background: linear-gradient(135deg, #4169E1, #6495ED);
  border: none;
  color: #fff;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(65, 105, 225, 0.3);
  transition: all 0.15s;
}

.btn-validate:hover:not(:disabled) { transform: translateY(-1px); }

.btn-stress {
  padding: 10px 20px;
  background: linear-gradient(135deg, #CD5C5C, #F08080);
  border: none;
  color: #fff;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(205, 92, 92, 0.3);
  transition: all 0.15s;
}

.btn-stress:hover:not(:disabled) { transform: translateY(-1px); }

.validation-report, .stress-report {
  margin-top: 16px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.report-header h3 { font-size: 15px; margin: 0; }
.validation-report .report-header h3 { color: #2E3E5A; }
.stress-report .report-header h3 { color: #5A2E2E; }

.report-status {
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  background: #FFF0E0;
  color: #B8860B;
}

.report-status.pass { background: #D4EDDA; color: #2E5A2E; }

.report-gates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.gate {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: #FFFCF7;
  border-radius: 8px;
  border: 1px solid #D0D8E0;
}

.gate.pass { border-color: #B8E0C8; background: #F0FFF4; }
.gate-icon { font-size: 14px; }
.gate-label { font-size: 11px; color: #6F8B6F; flex: 1; }
.gate-value { font-size: 13px; font-weight: 700; color: #3E2C1C; }

.report-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: #FFFCF7;
  border-radius: 8px;
  border: 1px solid #D0D8E0;
}

.metric-card.highlight { background: #FFF8E8; border-color: #E8D0A0; }
.metric-val { font-size: 20px; font-weight: 700; color: #3E2C1C; }
.metric-lbl { font-size: 11px; color: #8B7355; margin-top: 2px; }

.report-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-section h4 { font-size: 13px; color: #3E5A3E; margin-bottom: 8px; }

.sat-bars, .dist-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sat-bar-row, .dist-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sat-range, .dist-label { width: 55px; font-size: 11px; color: #6F4E37; text-align: right; flex-shrink: 0; }
.sat-bar-track, .dist-bar-track { flex: 1; height: 16px; background: #F0F0F0; border-radius: 4px; overflow: hidden; }
.sat-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.sat-bar-fill.excellent { background: #2E8B57; }
.sat-bar-fill.good { background: #66BB6A; }
.sat-bar-fill.ok { background: #FFA726; }
.sat-bar-fill.poor { background: #EF5350; }
.sat-count, .dist-count { width: 30px; font-size: 11px; color: #6F4E37; font-weight: 600; }
.dist-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.dist-bar-fill.high { background: #2E8B57; }
.dist-bar-fill.medium { background: #FFA726; }
.dist-bar-fill.low { background: #EF5350; }

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: #FFFCF7;
  border-radius: 8px;
  overflow: hidden;
}

.report-table th, .report-table td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #E8F0E8; }
.report-table th { background: #E8F0E8; color: #3E5A3E; font-weight: 600; }
.report-table.warn th { background: #FFF0E0; color: #8B4513; }
.report-table.compact th, .report-table.compact td { padding: 5px 8px; font-size: 11px; }

.sat-good { color: #2E8B57; font-weight: 600; }
.sat-ok { color: #DAA520; font-weight: 600; }
.sat-low { color: #CD5C5C; font-weight: 600; }

.confidence-dist { margin-top: 16px; }
.confidence-dist h4, .tier-table h4 { font-size: 13px; color: #5A2E2E; margin-bottom: 8px; }

.batch-test-result {
  margin-top: 16px;
  padding: 18px;
  background: linear-gradient(135deg, #F0FFF4, #E6FFF0);
  border: 1px solid #B8E0C8;
  border-radius: 12px;
}

.test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.test-header h3 { font-size: 15px; color: #2E5A2E; margin: 0; }

.test-status { padding: 4px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; background: #FFF0E0; color: #B8860B; }
.test-status.pass { background: #D4EDDA; color: #2E5A2E; }

.test-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 16px; }

.test-stat { display: flex; flex-direction: column; gap: 4px; padding: 12px; background: #FFFCF7; border-radius: 8px; border: 1px solid #D4E6D4; }
.test-stat-label { font-size: 11px; color: #6F8B6F; }
.test-stat-value { font-size: 20px; font-weight: 700; color: #2E5A2E; }
.test-stat-value.confidence { color: #2E8B57; }

.test-samples h4 { font-size: 13px; color: #3E5A3E; margin-bottom: 10px; }

.sample-table { width: 100%; border-collapse: collapse; font-size: 12px; background: #FFFCF7; border-radius: 8px; overflow: hidden; }
.sample-table th, .sample-table td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #E8F0E8; }
.sample-table th { background: #E8F0E8; color: #3E5A3E; font-weight: 600; }
.sample-table td:last-child { text-align: center; }
.variety-cell { font-weight: 500; color: #3E2C1C; }
.ratio-cell { color: #2E8B57; font-weight: 600; }
.temp-cell { color: #CD5C5C; font-weight: 600; }
.time-cell { color: #4169E1; font-weight: 600; }

.confidence-chip { display: inline-block; padding: 2px 10px; border-radius: 10px; font-weight: 600; }
.confidence-chip.high { background: #D4EDDA; color: #2E5A2E; }
.confidence-chip.medium { background: #FFF3CD; color: #856404; }
.confidence-chip.low { background: #F8D7DA; color: #8B3A3A; }

.weights-panel {
  padding: 16px;
  background: linear-gradient(180deg, #FFF8F0, #FFF5E6);
  border-radius: 12px;
  border: 1px solid #E0D0B8;
}

.weights-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.weights-header h3 { font-size: 15px; color: #3E2C1C; margin: 0; }

.btn-iterate {
  padding: 8px 18px;
  background: linear-gradient(135deg, #8B4513, #A0522D);
  border: none;
  color: #FFF8F0;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(139, 69, 19, 0.3);
  transition: all 0.15s;
}

.btn-iterate:hover:not(:disabled) { transform: translateY(-1px); }
.btn-iterate:disabled { opacity: 0.5; cursor: not-allowed; }

.weights-desc { font-size: 12px; color: #8B7355; line-height: 1.5; margin-bottom: 14px; }

.current-weights-viz {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 14px;
  background: #FFFCF7;
  border-radius: 10px;
  border: 1px solid #EDE0D0;
}

.weight-viz-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wv-label { width: 80px; font-size: 12px; color: #6F4E37; font-weight: 500; }
.wv-track { flex: 1; height: 12px; background: #F0E8DC; border-radius: 6px; overflow: hidden; }
.wv-fill { height: 100%; border-radius: 6px; transition: width 0.4s ease; }
.wv-value { width: 50px; font-size: 13px; font-weight: 600; color: #3E2C1C; text-align: right; }

.iteration-result {
  padding: 14px;
  background: #F0FFF4;
  border: 1px solid #B8E0C8;
  border-radius: 10px;
  margin-bottom: 14px;
}

.iteration-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 11px;
  color: #6F8B6F;
  margin-bottom: 10px;
}

.weight-changes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.wc-label { width: 70px; color: #6F4E37; font-weight: 500; }
.wc-old { color: #8B7355; }
.wc-arrow { color: #B8A090; }
.wc-new { color: #3E2C1C; font-weight: 600; }
.wc-diff { font-size: 11px; font-weight: 600; }
.wc-diff.up { color: #2E8B57; }
.wc-diff.down { color: #CD5C5C; }

.weight-history {
  margin-top: 14px;
}

.weight-history h4 { font-size: 13px; color: #6F4E37; margin-bottom: 8px; }
</style>
