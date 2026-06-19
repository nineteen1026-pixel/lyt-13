<template>
  <div class="advanced-section">
    <div class="advanced-header">
      <h3>🛠️ 高级功能 & 系统性能验证</h3>
      <div class="advanced-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['adv-tab', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 独立API接口文档 -->
    <div v-if="activeTab === 'api'" class="panel api-panel">
      <div class="panel-intro">
        <p>系统内置独立推荐接口，可脱离UI直接通过脚本或HTTP代理调用</p>
      </div>
      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method-badge">FN</span>
          <code>svc.recommend(beanVariety, roastLevel, options)</code>
        </div>
        <div class="endpoint-body">
          <h5>调用示例：</h5>
          <pre class="code-block">import { getRecommendationService } from '@/utils/recommendationService.js'

const svc = getRecommendationService()
const result = svc.recommend('耶加雪菲·科契尔', '浅烘焙', { topK: 20 })

// 返回结构：
{
  ok: true,
  code: 'OK', // 或 'CACHE_HIT' / 'INVALID_INPUT' / 'NO_DATA'
  data: {
    powderWaterRatio: '1:15.5',
    waterTemperatureC: '91-94℃',
    brewTimeMin: '2-3分钟',
    confidence: 93,
    confidenceLevel: 'high',
    reasons: [...],
    similarTop5: [...],
    meta: {
      algoVersion: 'knn-weighted-v1',
      weights: { typeW:0.25, varietyW:0.35, roastW:0.30, processW:0.10 }
    }
  },
  elapsedMs: 2.37,
  requestId: 1428
}</pre>
        </div>
      </div>

      <div class="quick-api-test">
        <h5>在线测试接口</h5>
        <div class="api-test-row">
          <select v-model="testBean">
            <option v-for="b in quickBeans" :key="b" :value="b">{{ b }}</option>
          </select>
          <select v-model="testRoast">
            <option v-for="r in roastLevels" :key="r" :value="r">{{ r }}</option>
          </select>
          <button class="btn btn-primary btn-sm" @click="runApiTest" :disabled="apiLoading">
            {{ apiLoading ? '执行中...' : '🚀 调用接口' }}
          </button>
        </div>
        <div v-if="apiResult" class="api-result">
          <div class="result-row">
            <span class="r-label">状态</span>
            <span :class="['r-code', apiResult.ok ? 'ok' : 'err']">{{ apiResult.code }}</span>
          </div>
          <div class="result-row" v-if="apiResult.ok">
            <span class="r-label">粉水比</span>
            <span class="r-val green">{{ apiResult.data.powderWaterRatio }}</span>
          </div>
          <div class="result-row" v-if="apiResult.ok">
            <span class="r-label">水温</span>
            <span class="r-val red">{{ apiResult.data.waterTemperatureC }}</span>
          </div>
          <div class="result-row" v-if="apiResult.ok">
            <span class="r-label">时间</span>
            <span class="r-val blue">{{ apiResult.data.brewTimeMin }}</span>
          </div>
          <div class="result-row" v-if="apiResult.ok">
            <span class="r-label">置信度</span>
            <span class="r-val">{{ apiResult.data.confidence }}% ({{ apiResult.data.confidenceLevel }})</span>
          </div>
          <div class="result-row">
            <span class="r-label">耗时</span>
            <span class="r-val">{{ apiResult.elapsedMs }}ms</span>
          </div>
          <div class="result-row">
            <span class="r-label">RequestId</span>
            <span class="r-val mono">#{{ apiResult.requestId }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 并发压测 -->
    <div v-if="activeTab === 'stress'" class="panel stress-panel">
      <div class="stress-intro">
        <p>模拟高并发请求，验证系统支持 <strong>1000+ 并发请求</strong> 的能力</p>
      </div>
      <div class="stress-controls">
        <div class="concurrency-selector">
          <span class="s-label">并发数</span>
          <div class="s-options">
            <button
              v-for="n in concurrencyOptions"
              :key="n"
              :class="['s-btn', { active: concurrency === n }]"
              @click="concurrency = n"
            >
              {{ n }}
            </button>
          </div>
        </div>
        <button class="btn btn-primary" @click="runStress" :disabled="stressLoading">
          {{ stressLoading ? '压测中...' : '🔥 执行并发压测' }}
        </button>
      </div>

      <div v-if="stressResult" class="stress-result">
        <div class="status-header">
          <span :class="['status-badge', stressResult.successRate >= 99.9 ? 'pass' : 'warn']">
            {{ stressResult.successRate >= 99.9 ? '✅ 通过' : '⚠️ 警告' }}
          </span>
          <span class="s-info">{{ stressResult.timestamp }}</span>
        </div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="m-label">总请求数</div>
            <div class="m-value big">{{ stressResult.totalRequests }}</div>
          </div>
          <div class="metric-card">
            <div class="m-label">成功率</div>
            <div class="m-value big green">{{ stressResult.successRate }}%</div>
          </div>
          <div class="metric-card">
            <div class="m-label">缓存命中率</div>
            <div class="m-value big blue">{{ stressResult.cacheHitRate }}%</div>
          </div>
          <div class="metric-card">
            <div class="m-label">吞吐量 QPS</div>
            <div class="m-value big purple">{{ stressResult.throughputQps }}</div>
          </div>
          <div class="metric-card">
            <div class="m-label">平均延迟</div>
            <div class="m-value">{{ stressResult.avgLatencyMs }}ms</div>
          </div>
          <div class="metric-card">
            <div class="m-label">P50 延迟</div>
            <div class="m-value">{{ stressResult.p50LatencyMs }}ms</div>
          </div>
          <div class="metric-card">
            <div class="m-label">P95 延迟</div>
            <div class="m-value">{{ stressResult.p95LatencyMs }}ms</div>
          </div>
          <div class="metric-card">
            <div class="m-label">P99 延迟</div>
            <div class="m-value">{{ stressResult.p99LatencyMs }}ms</div>
          </div>
          <div class="metric-card warn-card" v-if="stressResult.p99LatencyMs > 2000">
            <div class="m-label">P99延迟告警</div>
            <div class="m-value small">要求 ≤ 2000ms</div>
          </div>
          <div class="metric-card pass-card" v-else>
            <div class="m-label">延迟性能</div>
            <div class="m-value small green">满足 ≤2s 要求</div>
          </div>
          <div class="metric-card">
            <div class="m-label">错误数</div>
            <div class="m-value" :class="stressResult.errorCount > 0 ? 'red' : 'green'">{{ stressResult.errorCount }}</div>
          </div>
          <div class="metric-card">
            <div class="m-label">总耗时</div>
            <div class="m-value">{{ stressResult.totalTimeMs }}ms</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 全量组合验证 -->
    <div v-if="activeTab === 'validate'" class="panel validate-panel">
      <div class="validate-intro">
        <p>覆盖 <strong>所有豆种 × 烘焙度有效组合</strong>（当前 ≥ 230 组），输出完整满意度报告</p>
      </div>
      <div class="validate-controls">
        <button class="btn btn-primary" @click="runValidate" :disabled="validateLoading">
          {{ validateLoading ? '验证中（约3秒）...' : '📊 执行全量验证' }}
        </button>
      </div>

      <div v-if="validateResult" class="validate-result">
        <div class="summary-row">
          <span :class="['status-badge', validateResult.passAll ? 'pass' : 'warn']">
            {{ validateResult.passAll ? '🎉 质量验收全部达标' : '⚠️ 部分指标未达标' }}
          </span>
          <span class="generated-time">生成于 {{ validateResult.generatedAt }}</span>
        </div>

        <div class="big-metrics">
          <div class="big-metric-card">
            <div class="bm-icon">🧪</div>
            <div class="bm-body">
              <div class="bm-value">{{ validateResult.totalCombinations }}</div>
              <div class="bm-label">测试组合数</div>
              <div class="bm-sub">{{ validateResult.meetsCombinationThreshold ? '✅ 满足 ≥100 要求' : '❌ 不满足' }}</div>
            </div>
          </div>
          <div class="big-metric-card">
            <div class="bm-icon">😊</div>
            <div class="bm-body">
              <div class="bm-value">{{ validateResult.estimatedSatisfaction }}</div>
              <div class="bm-label">预估满意度（5分制）</div>
              <div class="bm-sub">{{ validateResult.meetsSatisfactionThreshold ? '✅ 满足 ≥4.0 要求' : '❌ 不满足' }}</div>
            </div>
          </div>
          <div class="big-metric-card">
            <div class="bm-icon">📈</div>
            <div class="bm-body">
              <div class="bm-value">{{ validateResult.validRate }}%</div>
              <div class="bm-label">参数有效性</div>
              <div class="bm-sub">{{ validateResult.validCombinations }}/{{ validateResult.totalCombinations }} 组合合法</div>
            </div>
          </div>
          <div class="big-metric-card">
            <div class="bm-icon">🎯</div>
            <div class="bm-body">
              <div class="bm-value">{{ validateResult.avgConfidence }}%</div>
              <div class="bm-label">平均置信度</div>
              <div class="bm-sub">高置信 {{ validateResult.confidenceDistribution.highPct }}% · 中低 {{ 100 - validateResult.confidenceDistribution.highPct }}%</div>
            </div>
          </div>
        </div>

        <div class="two-col">
          <div class="sub-section">
            <h5>📊 豆种大类表现</h5>
            <table class="mini-table">
              <thead>
                <tr><th>豆种大类</th><th>组合数</th><th>平均置信度</th><th>平均分</th><th>有效率</th></tr>
              </thead>
              <tbody>
                <tr v-for="(v, k) in validateResult.byBeanType" :key="k">
                  <td class="bold">{{ k }}</td>
                  <td>{{ v.count }}</td>
                  <td class="blue">{{ v.avgConf }}%</td>
                  <td>{{ v.avgScore }}</td>
                  <td class="green">{{ v.validRate }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="sub-section">
            <h5>🔥 烘焙度表现</h5>
            <table class="mini-table">
              <thead>
                <tr><th>烘焙度</th><th>组合数</th><th>平均置信度</th><th>有效率</th></tr>
              </thead>
              <tbody>
                <tr v-for="(v, k) in validateResult.byRoastLevel" :key="k">
                  <td class="bold">{{ k }}</td>
                  <td>{{ v.count }}</td>
                  <td class="blue">{{ v.count > 0 ? v.avgConf + '%' : '—' }}</td>
                  <td class="green">{{ v.count > 0 ? v.validRate + '%' : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="sub-section">
          <h5>🏆 置信度 Top 10</h5>
          <div class="sample-scroll">
            <table class="mini-table dense">
              <thead>
                <tr><th>豆种</th><th>烘焙度</th><th>粉水比</th><th>水温</th><th>时间</th><th>置信度</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in validateResult.topConfidence" :key="r.beanVariety+r.roastLevel">
                  <td>{{ r.beanVariety }}</td>
                  <td>{{ r.roastLevel }}</td>
                  <td class="green">{{ r.ratioText }}</td>
                  <td class="red">{{ r.temperatureText }}</td>
                  <td class="blue">{{ r.brewTimeText }}</td>
                  <td><span class="conf-high">{{ r.confidence }}%</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="validateResult.invalidResults.length > 0" class="sub-section warn-block">
          <h5>⚠️ 越界参数组合（{{ validateResult.invalidResults.length }}）</h5>
          <div class="invalid-list">
            <span v-for="r in validateResult.invalidResults" :key="r.beanVariety+r.roastLevel" class="invalid-chip">
              {{ r.beanVariety }}·{{ r.roastLevel }}
              <em>{{ r.invalidReason }}</em>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 算法权重迭代 -->
    <div v-if="activeTab === 'weights'" class="panel weights-panel">
      <div class="weights-intro">
        <p>基于用户满意度反馈，通过<strong>梯度搜索</strong>自动优化 KNN 相似度权重</p>
        <div class="feedback-count">
          <span class="fc-value">{{ feedbackCount }}</span>
          <span class="fc-label">条反馈已收集</span>
          <span class="fc-hint" v-if="feedbackCount < 5">（需 ≥5 条有效反馈才能启动迭代）</span>
        </div>
      </div>

      <div class="current-weights">
        <h5>当前权重配置</h5>
        <div class="weight-bars">
          <div v-for="w in weightLabels" :key="w.key" class="wbar">
            <span class="w-name">{{ w.label }}</span>
            <div class="w-bar-bg">
              <div class="w-bar-fill" :style="{ width: (currentWeights[w.key] * 100) + '%', background: w.color }"></div>
            </div>
            <span class="w-val">{{ (currentWeights[w.key] * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <div class="weights-actions">
        <button class="btn btn-primary" @click="iterateWeights" :disabled="feedbackCount < 5 || weightsLoading">
          {{ weightsLoading ? '优化中...' : '🔄 执行权重迭代' }}
        </button>
      </div>

      <div v-if="lastIteration" class="iteration-result">
        <div class="iter-header">
          <span :class="['iter-badge', lastIteration.converged ? 'ok' : 'imp']">
            {{ lastIteration.converged ? '✅ 已收敛' : '📈 有提升' }}
          </span>
          <span class="iter-info">
            迭代 #{{ lastIteration.iteration }} · {{ lastIteration.reason }} · 耗时 {{ lastIteration.elapsedMs }}ms
          </span>
        </div>
        <div class="iter-score">
          <span>旧评分: <b>{{ lastIteration.oldScore }}</b></span>
          <span class="arrow">→</span>
          <span>新评分: <b class="green">{{ lastIteration.newScore }}</b></span>
          <span class="improve" v-if="lastIteration.improvementPct > 0">
            (+{{ lastIteration.improvementPct }}%)
          </span>
        </div>
        <div v-if="lastIteration.weightChanges" class="weight-changes">
          <h6>权重变化：</h6>
          <div class="wc-row" v-for="w in weightLabels" :key="w.key">
            <span>{{ w.label }}</span>
            <span>
              {{ (lastIteration.oldWeights[w.key] * 100).toFixed(1) }}%
              <span class="arrow">→</span>
              <b>{{ (lastIteration.newWeights[w.key] * 100).toFixed(1) }}%</b>
              <em
                v-if="lastIteration.weightChanges[w.key] !== 0"
                :class="lastIteration.weightChanges[w.key] > 0 ? 'up' : 'down'"
              >
                {{ lastIteration.weightChanges[w.key] > 0 ? '▲' : '▼' }}
                {{ Math.abs(lastIteration.weightChanges[w.key] * 100).toFixed(1) }}%
              </em>
            </span>
          </div>
        </div>
      </div>

      <div v-if="weightHistory.length > 0" class="history-section">
        <h5>权重迭代历史</h5>
        <div class="history-list">
          <div v-for="h in weightHistory.slice().reverse().slice(0, 8)" :key="h.iteration" class="history-item">
            <span class="hi-badge">#{{ h.iteration }}</span>
            <span class="hi-score">{{ h.oldScore }}→{{ h.newScore }} ({{ h.improvementPct > 0 ? '+' : '' }}{{ h.improvementPct }}%)</span>
            <span class="hi-time">{{ h.timestamp }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ROAST_LEVELS, BEAN_VARIETIES } from '../utils/recommendationAlgo.js'

const props = defineProps({ store: { type: Object, required: true } })

const activeTab = ref('api')
const tabs = [
  { key: 'api', icon: '🔌', label: '独立API接口' },
  { key: 'stress', icon: '🔥', label: '并发压测' },
  { key: 'validate', icon: '📊', label: '全量验证报告' },
  { key: 'weights', icon: '⚖️', label: '权重迭代优化' },
]

const roastLevels = ROAST_LEVELS
const quickBeans = ['耶加雪菲·科契尔', '瑰夏·翡翠庄园', '苏门答腊·曼特宁·林东', '意式经典拼配', '哥伦比亚·慧兰', '巴西·喜拉多']

// API test
const testBean = ref(quickBeans[0])
const testRoast = ref('浅烘焙')
const apiLoading = ref(false)
const apiResult = ref(null)

async function runApiTest() {
  apiLoading.value = true
  try {
    apiResult.value = await props.store.apiRecommend(testBean.value, testRoast.value)
  } finally {
    apiLoading.value = false
  }
}

// Stress test
const concurrencyOptions = [100, 500, 1000, 2000, 5000]
const concurrency = ref(1000)
const stressLoading = ref(false)
const stressResult = computed(() => props.store.lastStressTest)

async function runStress() {
  stressLoading.value = true
  try {
    await props.store.runStressTest(concurrency.value)
  } finally {
    stressLoading.value = false
  }
}

// Full validation
const validateLoading = ref(false)
const validateResult = computed(() => props.store.lastFullValidation)

async function runValidate() {
  validateLoading.value = true
  try {
    await props.store.runFullValidation()
  } finally {
    validateLoading.value = false
  }
}

// Weight iteration
const weightsLoading = ref(false)
const weightLabels = [
  { key: 'typeW', label: '豆种大类', color: '#66BB6A' },
  { key: 'varietyW', label: '具体豆种', color: '#42A5F5' },
  { key: 'roastW', label: '烘焙度', color: '#FFA726' },
  { key: 'processW', label: '处理法', color: '#AB47BC' },
]

const feedbackCount = computed(() => props.store.feedbacks.filter(f => f.actualUsed && f.satisfaction >= 1).length)
const currentWeights = computed(() => props.store.currentWeights)
const lastIteration = computed(() => props.store.lastWeightIteration)
const weightHistory = computed(() => props.store.weightHistory)

function iterateWeights() {
  weightsLoading.value = true
  try {
    props.store.iterateWeights()
  } finally {
    setTimeout(() => { weightsLoading.value = false }, 300)
  }
}
</script>

<style scoped>
.advanced-section {
  margin-top: 24px;
  padding: 18px;
  background: linear-gradient(180deg, #FFFAF5, #FFF6EE);
  border-radius: 14px;
  border: 1px solid #E5D5C0;
}

.advanced-header {
  padding-bottom: 10px;
  margin-bottom: 14px;
  border-bottom: 2px dashed #E5D5C0;
}

.advanced-header h3 {
  font-size: 16px;
  color: #3E2C1C;
  margin: 0 0 10px;
}

.advanced-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.adv-tab {
  padding: 6px 14px;
  border: 1.5px solid #E5D5C0;
  background: #FFFCF7;
  border-radius: 16px;
  font-size: 12px;
  color: #8B7355;
  cursor: pointer;
  transition: all 0.15s;
}

.adv-tab:hover {
  background: #FFF5E6;
  color: #6F4E37;
}

.adv-tab.active {
  background: linear-gradient(135deg, #6F4E37, #8B4513);
  color: #FFF8F0;
  border-color: #6F4E37;
}

.panel-intro {
  padding: 10px 14px;
  background: #FFF8F0;
  border-left: 3px solid #CD853F;
  border-radius: 6px;
  margin-bottom: 14px;
}

.panel-intro p {
  margin: 0;
  font-size: 13px;
  color: #6F4E37;
}

.endpoint-card {
  border: 1px solid #E5D5C0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 16px;
}

.endpoint-header {
  padding: 10px 14px;
  background: linear-gradient(135deg, #2D3748, #1A202C);
  display: flex;
  align-items: center;
  gap: 10px;
}

.method-badge {
  padding: 2px 8px;
  background: #38A169;
  color: #fff;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.endpoint-header code {
  color: #A0AEC0;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.endpoint-body {
  padding: 12px 14px;
  background: #FFFCF7;
}

.endpoint-body h5 {
  font-size: 12px;
  color: #3E2C1C;
  margin: 0 0 8px;
}

.code-block {
  margin: 0;
  padding: 12px;
  background: #1A202C;
  color: #E2E8F0;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.6;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  overflow-x: auto;
  max-height: 280px;
}

.quick-api-test {
  padding: 14px;
  background: #FFF8F0;
  border-radius: 10px;
  border: 1px dashed #CD853F;
}

.quick-api-test h5 {
  font-size: 12px;
  color: #3E2C1C;
  margin: 0 0 10px;
}

.api-test-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.api-test-row select {
  flex: 1;
  min-width: 140px;
  padding: 7px 10px;
  border: 1.5px solid #D8C8B0;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: #3E2C1C;
  outline: none;
}

.btn {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 11px;
}

.btn-primary {
  background: linear-gradient(135deg, #CD853F, #8B4513);
  color: #FFF8F0;
  box-shadow: 0 2px 8px rgba(139, 69, 19, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.4);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.api-result {
  background: #fff;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid #E5D5C0;
}

.result-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px dashed #F0E8DC;
  font-size: 12px;
}

.result-row:last-child { border-bottom: none; }

.r-label {
  color: #8B7355;
  font-weight: 500;
}

.r-val {
  color: #3E2C1C;
  font-weight: 600;
}

.r-val.green { color: #2E7D32; }
.r-val.red { color: #C62828; }
.r-val.blue { color: #1565C0; }
.r-val.mono { font-family: monospace; }

.r-code {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
}

.r-code.ok { background: #C8E6C9; color: #1B5E20; }
.r-code.err { background: #FFCDD2; color: #B71C1C; }

.stress-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  background: #FFF8F0;
  border-radius: 10px;
  border: 1px dashed #CD853F;
  flex-wrap: wrap;
}

.concurrency-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.s-label {
  font-size: 12px;
  color: #6F4E37;
  font-weight: 500;
}

.s-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.s-btn {
  padding: 5px 12px;
  border: 1.5px solid #D8C8B0;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  color: #6F4E37;
  cursor: pointer;
  transition: all 0.15s;
  font-family: monospace;
  font-weight: 600;
}

.s-btn:hover { background: #FFF5E6; }

.s-btn.active {
  background: linear-gradient(135deg, #EF5350, #C62828);
  color: #fff;
  border-color: #C62828;
}

.stress-result {
  padding: 14px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #E5D5C0;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #E5D5C0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
}

.status-badge.pass {
  background: #C8E6C9;
  color: #1B5E20;
}

.status-badge.warn {
  background: #FFECB3;
  color: #E65100;
}

.s-info {
  font-size: 11px;
  color: #A08968;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.metric-card {
  padding: 10px;
  background: linear-gradient(180deg, #FFFCF7, #FFF8F0);
  border: 1px solid #EDE0D0;
  border-radius: 8px;
  text-align: center;
}

.m-label {
  font-size: 10px;
  color: #A08968;
  margin-bottom: 4px;
}

.m-value {
  font-size: 16px;
  font-weight: 700;
  color: #3E2C1C;
}

.m-value.big { font-size: 22px; }
.m-value.small { font-size: 11px; margin-top: 2px; }
.m-value.green { color: #2E7D32; }
.m-value.blue { color: #1565C0; }
.m-value.red { color: #C62828; }
.m-value.purple { color: #6A1B9A; }

.warn-card { background: #FFF8E1; border-color: #FFECB3; }
.pass-card { background: #E8F5E9; border-color: #C8E6C9; }

.validate-controls {
  margin-bottom: 14px;
  padding: 14px;
  background: #FFF8F0;
  border-radius: 10px;
  border: 1px dashed #CD853F;
}

.validate-result {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #E5D5C0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px dashed #E5D5C0;
}

.generated-time {
  font-size: 11px;
  color: #A08968;
}

.big-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.big-metric-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #FFF8F0, #FFF5E6);
  border-radius: 10px;
  border: 1px solid #EDE0D0;
}

.bm-icon {
  font-size: 32px;
}

.bm-body {
  flex: 1;
}

.bm-value {
  font-size: 26px;
  font-weight: 700;
  color: #3E2C1C;
  line-height: 1.1;
}

.bm-label {
  font-size: 11px;
  color: #8B7355;
  margin-top: 2px;
}

.bm-sub {
  font-size: 11px;
  color: #2E7D32;
  margin-top: 4px;
  font-weight: 500;
}

.two-col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.sub-section h5 {
  font-size: 12px;
  color: #3E2C1C;
  margin: 0 0 8px;
}

.mini-table {
  width: 100%;
  font-size: 11px;
  border-collapse: collapse;
}

.mini-table th, .mini-table td {
  padding: 5px 8px;
  text-align: left;
  border-bottom: 1px solid #F0E8DC;
}

.mini-table th {
  background: #FFF5E6;
  color: #6F4E37;
  font-weight: 600;
}

.mini-table td.bold { font-weight: 600; color: #3E2C1C; }
.mini-table td.green { color: #2E7D32; font-weight: 600; }
.mini-table td.blue { color: #1565C0; font-weight: 600; }
.mini-table.dense th, .mini-table.dense td { padding: 4px 6px; }

.sample-scroll {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #F0E8DC;
  border-radius: 6px;
}

.conf-high {
  display: inline-block;
  padding: 2px 8px;
  background: #C8E6C9;
  color: #1B5E20;
  border-radius: 4px;
  font-weight: 700;
  font-size: 11px;
}

.warn-block {
  margin-top: 14px;
  padding: 12px;
  background: #FFF8E1;
  border-radius: 8px;
  border: 1px dashed #FFC107;
}

.warn-block h5 {
  color: #E65100;
}

.invalid-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.invalid-chip {
  padding: 4px 8px;
  background: #FFF3E0;
  border-radius: 6px;
  font-size: 11px;
  color: #BF360C;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.invalid-chip em {
  font-size: 9px;
  color: #8D6E63;
  font-style: normal;
}

.weights-intro {
  padding: 10px 14px;
  background: #F3E5F5;
  border-left: 3px solid #AB47BC;
  border-radius: 6px;
  margin-bottom: 14px;
}

.weights-intro p { margin: 0; font-size: 13px; color: #4A148C; }

.feedback-count {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.fc-value {
  font-size: 22px;
  font-weight: 700;
  color: #4A148C;
}

.fc-label {
  font-size: 12px;
  color: #6A1B9A;
}

.fc-hint {
  font-size: 11px;
  color: #C62828;
  margin-left: 8px;
}

.current-weights {
  padding: 14px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #E5D5C0;
  margin-bottom: 12px;
}

.current-weights h5 {
  font-size: 12px;
  color: #3E2C1C;
  margin: 0 0 10px;
}

.weight-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wbar {
  display: grid;
  grid-template-columns: 80px 1fr 50px;
  align-items: center;
  gap: 10px;
}

.w-name {
  font-size: 11px;
  color: #6F4E37;
  font-weight: 500;
}

.w-bar-bg {
  height: 14px;
  background: #F0E8DC;
  border-radius: 7px;
  overflow: hidden;
}

.w-bar-fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.5s ease;
}

.w-val {
  font-size: 11px;
  font-weight: 600;
  color: #3E2C1C;
  text-align: right;
}

.weights-actions {
  margin-bottom: 14px;
}

.iteration-result {
  padding: 14px;
  background: #E8F5E9;
  border-radius: 10px;
  border: 1px solid #A5D6A7;
  margin-bottom: 14px;
}

.iter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 6px;
}

.iter-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
}

.iter-badge.ok { background: #C8E6C9; color: #1B5E20; }
.iter-badge.imp { background: #FFF9C4; color: #F57F17; }

.iter-info {
  font-size: 11px;
  color: #388E3C;
}

.iter-score {
  font-size: 14px;
  color: #3E2C1C;
  margin-bottom: 10px;
}

.iter-score b {
  font-family: monospace;
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
}

.iter-score .arrow { margin: 0 6px; color: #8B7355; }

.improve {
  color: #2E7D32;
  font-weight: 700;
  margin-left: 6px;
  padding: 2px 8px;
  background: #C8E6C9;
  border-radius: 4px;
  font-size: 12px;
}

.weight-changes h6 {
  font-size: 11px;
  color: #1B5E20;
  margin: 0 0 6px;
}

.wc-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 11px;
  border-bottom: 1px dashed #A5D6A7;
}

.wc-row:last-child { border-bottom: none; }

.wc-row em {
  font-size: 10px;
  font-style: normal;
  margin-left: 6px;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.wc-row em.up { background: #C8E6C9; color: #1B5E20; }
.wc-row em.down { background: #FFCDD2; color: #B71C1C; }

.history-section {
  padding: 14px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #E5D5C0;
}

.history-section h5 {
  font-size: 12px;
  color: #3E2C1C;
  margin: 0 0 8px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #FFF8F0;
  border-radius: 6px;
  font-size: 11px;
}

.hi-badge {
  font-family: monospace;
  font-weight: 700;
  color: #6F4E37;
  background: #FFE0B2;
  padding: 1px 6px;
  border-radius: 4px;
}

.hi-score {
  color: #1B5E20;
  font-weight: 600;
  font-family: monospace;
}

.hi-time {
  margin-left: auto;
  color: #A08968;
  font-size: 10px;
}
</style>
