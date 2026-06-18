<template>
  <div class="result-section">
    <div class="result-header">
      <div class="result-title">
        <h3>📋 推荐萃取参数</h3>
        <div class="target-info">
          <span class="bean-chip">{{ beanVariety }}</span>
          <span class="roast-chip">{{ roastLevel }}</span>
        </div>
      </div>
      <div class="meta-row">
        <div class="confidence-meter">
          <div class="confidence-ring" :style="ringStyle">
            <div class="confidence-inner">
              <span class="confidence-value">{{ recommendation.confidence }}%</span>
              <span class="confidence-label">置信度</span>
            </div>
          </div>
        </div>
        <div class="meta-stats">
          <div class="meta-item">
            <span class="meta-icon">📊</span>
            <div>
              <span class="meta-value">{{ recommendation.dataPoints }}</span>
              <span class="meta-label">分析数据点</span>
            </div>
          </div>
          <div class="meta-item" v-if="recommendation.exactMatches > 0">
            <span class="meta-icon">✅</span>
            <div>
              <span class="meta-value">{{ recommendation.exactMatches }}</span>
              <span class="meta-label">精确匹配</span>
            </div>
          </div>
          <div class="meta-item" v-if="recommendation.avgHistoricalScore > 0">
            <span class="meta-icon">⭐</span>
            <div>
              <span class="meta-value">{{ recommendation.avgHistoricalScore }}</span>
              <span class="meta-label">历史评分</span>
            </div>
          </div>
          <div class="meta-item" v-if="computeTime > 0">
            <span class="meta-icon">⚡</span>
            <div>
              <span class="meta-value">{{ computeTime }}ms</span>
              <span class="meta-label">计算耗时</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="param-cards">
      <div class="param-card ratio-card">
        <div class="param-icon-bg">💧</div>
        <div class="param-content">
          <div class="param-label">粉水比建议</div>
          <div class="param-main">
            <span class="ratio-prefix">1 : </span>
            <span class="param-big-value">{{ recommendation.ratio.toFixed(1) }}</span>
          </div>
          <div class="param-range">
            推荐区间: <strong>1:{{ recommendation.ratioRange[0].toFixed(1) }} ~ 1:{{ recommendation.ratioRange[1].toFixed(1) }}</strong>
          </div>
          <div class="param-bar">
            <div
              class="param-bar-fill ratio-fill"
              :style="{ width: ((recommendation.ratio - 10) / 8 * 100) + '%' }"
            ></div>
            <div
              class="param-bar-marker"
              :style="{ left: ((recommendation.ratio - 10) / 8 * 100) + '%' }"
            ></div>
          </div>
          <div class="bar-scale">
            <span>1:10 浓</span>
            <span>1:18 淡</span>
          </div>
        </div>
      </div>

      <div class="param-card temp-card">
        <div class="param-icon-bg">🌡️</div>
        <div class="param-content">
          <div class="param-label">水温建议范围</div>
          <div class="param-main">
            <span class="param-big-value">{{ recommendation.temperatureRange[0] }}</span>
            <span class="range-sep">~</span>
            <span class="param-big-value">{{ recommendation.temperatureRange[1] }}</span>
            <span class="unit-suffix">℃</span>
          </div>
          <div class="param-range">
            推荐中心值: <strong>{{ recommendation.temperature }}℃</strong>
          </div>
          <div class="param-bar">
            <div
              class="param-bar-fill temp-fill"
              :style="{ width: ((recommendation.temperature - 80) / 20 * 100) + '%' }"
            ></div>
            <div
              class="param-bar-marker"
              :style="{ left: ((recommendation.temperature - 80) / 20 * 100) + '%' }"
            ></div>
          </div>
          <div class="bar-scale">
            <span>80℃ 低温</span>
            <span>100℃ 高温</span>
          </div>
        </div>
      </div>

      <div class="param-card time-card">
        <div class="param-icon-bg">⏱️</div>
        <div class="param-content">
          <div class="param-label">萃取时间区间</div>
          <div class="param-main">
            <span class="param-big-value">{{ recommendation.brewTimeRange[0] }}</span>
            <span class="range-sep">~</span>
            <span class="param-big-value">{{ recommendation.brewTimeRange[1] }}</span>
            <span class="unit-suffix">分钟</span>
          </div>
          <div class="param-range">
            推荐中心值: <strong>{{ recommendation.brewTime.toFixed(1) }} 分钟</strong>
          </div>
          <div class="param-bar">
            <div
              class="param-bar-fill time-fill"
              :style="{ width: (Math.min(recommendation.brewTime, 6) / 6 * 100) + '%' }"
            ></div>
            <div
              class="param-bar-marker"
              :style="{ left: (Math.min(recommendation.brewTime, 6) / 6 * 100) + '%' }"
            ></div>
          </div>
          <div class="bar-scale">
            <span>1分 短萃</span>
            <span>6分 长萃</span>
          </div>
        </div>
      </div>
    </div>

    <div class="reasons-section">
      <h4>💡 推荐依据</h4>
      <ul class="reason-list">
        <li v-for="(reason, i) in recommendation.reasons" :key="i" class="reason-item">
          <span class="reason-bullet">{{ i + 1 }}</span>
          {{ reason }}
        </li>
      </ul>
    </div>

    <div class="similar-section" v-if="recommendation.similarRecords?.length > 0">
      <div class="similar-header">
        <h4>🔗 历史相似数据对比</h4>
        <span class="similar-hint">Top {{ recommendation.similarRecords.length }} 最相似历史记录</span>
      </div>
      <div class="similar-table-wrap">
        <table class="similar-table">
          <thead>
            <tr>
              <th>相似度</th>
              <th>豆种</th>
              <th>烘焙度</th>
              <th>粉水比</th>
              <th>水温</th>
              <th>时间</th>
              <th>评分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in recommendation.similarRecords" :key="i">
              <td>
                <span :class="['sim-chip', simClass(r.similarityPercent)]">
                  {{ r.similarityPercent }}%
                </span>
              </td>
              <td class="sim-variety">{{ r.beanVariety }}</td>
              <td><span class="tag level-tag small">{{ r.roastLevel }}</span></td>
              <td>1:{{ r.ratio.toFixed(1) }}</td>
              <td>{{ r.temperature }}℃</td>
              <td>{{ r.brewTime.toFixed(1) }}分</td>
              <td>
                <span class="score-display">
                  <span class="score-stars">{{ starCount(r.overallScore) }}</span>
                  <span class="score-num">{{ r.overallScore.toFixed(1) }}</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="result-actions">
      <button class="btn btn-primary feedback-btn" @click="$emit('feedback')">
        ✍️ 使用后评分反馈
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  recommendation: { type: Object, required: true },
  beanVariety: { type: String, default: '' },
  roastLevel: { type: String, default: '' },
  computeTime: { type: Number, default: 0 },
})

defineEmits(['feedback'])

const ringStyle = computed(() => {
  const c = props.recommendation.confidence
  const deg = c * 3.6
  const color = c >= 80 ? '#2E8B57' : c >= 60 ? '#CD853F' : '#8B4513'
  return {
    background: `conic-gradient(${color} 0deg, ${color} ${deg}deg, #E8D5B7 ${deg}deg, #E8D5B7 360deg)`,
  }
})

function simClass(p) {
  if (p >= 80) return 'high'
  if (p >= 60) return 'medium'
  return 'low'
}

function starCount(score) {
  const s = Math.max(0, Math.min(5, Math.round(score)))
  return '★'.repeat(s) + '☆'.repeat(5 - s)
}
</script>

<style scoped>
.result-section {
  margin-top: 20px;
  padding: 22px;
  background: linear-gradient(180deg, #FFFBF5, #FFF8F0);
  border-radius: 14px;
  border: 1px solid #E0D0B8;
  box-shadow: 0 2px 8px rgba(62, 44, 28, 0.06);
  animation: fadeInUp 0.35s ease;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px dashed #E0D0B8;
}

.result-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 10px;
}

.result-title h3 {
  font-size: 17px;
  color: #3E2C1C;
  margin: 0;
}

.target-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bean-chip {
  padding: 4px 12px;
  background: #E8F0E8;
  color: #3E5A3E;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.roast-chip {
  padding: 4px 12px;
  background: #FFE0B2;
  color: #8B4513;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.meta-row {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.confidence-meter {
  flex-shrink: 0;
}

.confidence-ring {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.5s;
}

.confidence-inner {
  width: 70px;
  height: 70px;
  background: #FFFBF5;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.confidence-value {
  font-size: 20px;
  font-weight: 700;
  color: #3E2C1C;
  line-height: 1;
}

.confidence-label {
  font-size: 10px;
  color: #8B7355;
  margin-top: 2px;
}

.meta-stats {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  min-width: 280px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #FFFDF9;
  border-radius: 8px;
  border: 1px solid #EDE0D0;
}

.meta-icon {
  font-size: 20px;
}

.meta-item > div {
  display: flex;
  flex-direction: column;
}

.meta-value {
  font-size: 16px;
  font-weight: 700;
  color: #3E2C1C;
  line-height: 1.1;
}

.meta-label {
  font-size: 10px;
  color: #8B7355;
}

.param-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.param-card {
  position: relative;
  padding: 18px;
  background: #FFFDF9;
  border-radius: 12px;
  border: 1.5px solid transparent;
  overflow: hidden;
  transition: all 0.25s;
}

.param-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(62, 44, 28, 0.12);
}

.ratio-card {
  border-color: #C8E6C9;
  background: linear-gradient(135deg, #FFFEF8, #F0FFF4);
}

.temp-card {
  border-color: #FFCCBC;
  background: linear-gradient(135deg, #FFFEF8, #FFF5F0);
}

.time-card {
  border-color: #BBDEFB;
  background: linear-gradient(135deg, #FFFEF8, #F5F9FF);
}

.param-icon-bg {
  position: absolute;
  right: -8px;
  top: -8px;
  font-size: 64px;
  opacity: 0.08;
}

.param-label {
  font-size: 12px;
  color: #6F4E37;
  font-weight: 500;
  margin-bottom: 6px;
}

.param-main {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 6px;
}

.param-big-value {
  font-size: 38px;
  font-weight: 700;
  color: #3E2C1C;
  letter-spacing: -1px;
  line-height: 1;
}

.ratio-prefix {
  font-size: 18px;
  color: #8B7355;
  font-weight: 500;
}

.range-sep {
  font-size: 24px;
  color: #B0A090;
  margin: 0 4px;
  font-weight: 500;
}

.unit-suffix {
  font-size: 16px;
  color: #6F4E37;
  margin-left: 4px;
  font-weight: 500;
}

.param-range {
  font-size: 12px;
  color: #6F4E37;
  margin-bottom: 10px;
}

.param-range strong {
  color: #3E2C1C;
}

.param-bar {
  position: relative;
  height: 8px;
  background: #E8D5B7;
  border-radius: 4px;
  margin-bottom: 4px;
  overflow: visible;
}

.param-bar-fill {
  height: 100%;
  border-radius: 4px;
  opacity: 0.7;
  transition: width 0.5s ease;
}

.ratio-fill {
  background: linear-gradient(90deg, #81C784, #2E8B57);
}

.temp-fill {
  background: linear-gradient(90deg, #FFB74D, #E64A19);
}

.time-fill {
  background: linear-gradient(90deg, #64B5F6, #1976D2);
}

.param-bar-marker {
  position: absolute;
  top: -3px;
  transform: translateX(-50%);
  width: 14px;
  height: 14px;
  background: #3E2C1C;
  border: 2px solid #FFFBF5;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.bar-scale {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #A08968;
}

.reasons-section {
  padding: 14px 16px;
  background: linear-gradient(135deg, #FFFBE6, #FFF8E8);
  border-radius: 10px;
  border: 1px solid #F5E6B8;
  margin-bottom: 18px;
}

.reasons-section h4 {
  font-size: 13px;
  color: #8B6914;
  margin: 0 0 10px;
}

.reason-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reason-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #6F4E37;
}

.reason-bullet {
  width: 18px;
  height: 18px;
  background: #D2691E;
  color: #FFFBF5;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  line-height: 1;
  margin-top: 1px;
}

.similar-section {
  margin-bottom: 18px;
}

.similar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.similar-header h4 {
  font-size: 14px;
  color: #3E2C1C;
  margin: 0;
}

.similar-hint {
  font-size: 11px;
  color: #A08968;
}

.similar-table-wrap {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #EDE0D0;
}

.similar-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.similar-table th,
.similar-table td {
  padding: 9px 10px;
  text-align: left;
  border-bottom: 1px solid #F5EDE0;
}

.similar-table th {
  background: #FFF8F0;
  color: #6F4E37;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.similar-table tbody tr:last-child td {
  border-bottom: none;
}

.similar-table tbody tr:hover {
  background: #FFFDF7;
}

.sim-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 11px;
}

.sim-chip.high {
  background: #D4EDDA;
  color: #2E5A2E;
}

.sim-chip.medium {
  background: #FFF3CD;
  color: #856404;
}

.sim-chip.low {
  background: #F8D7DA;
  color: #8B3A3A;
}

.sim-variety {
  font-weight: 500;
  color: #3E2C1C;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-display {
  display: flex;
  align-items: center;
  gap: 4px;
}

.score-stars {
  color: #DAA520;
  font-size: 11px;
}

.score-num {
  font-weight: 600;
  color: #8B6914;
}

.level-tag.small {
  padding: 2px 8px;
  font-size: 11px;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.feedback-btn {
  padding: 9px 22px;
  background: linear-gradient(135deg, #D2691E, #8B4513);
  border: none;
  color: #FFFBF5;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 3px 10px rgba(210, 105, 30, 0.35);
}

.feedback-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(210, 105, 30, 0.45);
}
</style>
