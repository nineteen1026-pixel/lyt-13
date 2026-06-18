<template>
  <div class="feedback-section">
    <div class="feedback-card">
      <div class="feedback-header">
        <h3>✍️ 满意度评分反馈</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="feedback-intro">
        <p>您的反馈将帮助系统持续优化推荐算法，让未来的推荐更加精准！</p>
      </div>

      <div class="feedback-summary">
        <div class="summary-chip">
          <span class="summary-label">豆种</span>
          <span class="summary-value">{{ beanVariety }}</span>
        </div>
        <div class="summary-chip">
          <span class="summary-label">烘焙度</span>
          <span class="summary-value">{{ roastLevel }}</span>
        </div>
        <div class="summary-chip">
          <span class="summary-label">粉水比</span>
          <span class="summary-value ratio">1:{{ recommendation.ratio.toFixed(1) }}</span>
        </div>
        <div class="summary-chip">
          <span class="summary-label">水温</span>
          <span class="summary-value temp">{{ recommendation.temperatureRange[0] }}-{{ recommendation.temperatureRange[1] }}℃</span>
        </div>
        <div class="summary-chip">
          <span class="summary-label">时间</span>
          <span class="summary-value time">{{ recommendation.brewTimeRange[0] }}-{{ recommendation.brewTimeRange[1] }}分</span>
        </div>
      </div>

      <div class="form-group">
        <label class="main-label">⭐ 整体满意度评分</label>
        <div class="star-rating">
          <button
            v-for="i in 5"
            :key="i"
            type="button"
            :class="['star-btn', { active: i <= starRating, hover: i <= hoverStar && hoverStar > 0 }]"
            @click="starRating = i"
            @mouseenter="hoverStar = i"
            @mouseleave="hoverStar = 0"
          >
            <span class="star-icon">{{ i <= starRating || (i <= hoverStar && hoverStar > 0) ? '★' : '☆' }}</span>
            <span class="star-label">{{ labels[i - 1] }}</span>
          </button>
        </div>
        <p class="rating-caption" v-if="starRating > 0">
          <strong>{{ starRating }}.0 分</strong> — {{ captions[starRating - 1] }}
        </p>
      </div>

      <div class="form-group">
        <label class="main-label">💡 您是否实际使用了这些推荐参数？</label>
        <div class="option-group">
          <button
            type="button"
            :class="['option-btn', { active: actualUsed === true }]"
            @click="actualUsed = true"
          >
            ✅ 已使用，效果不错
          </button>
          <button
            type="button"
            :class="['option-btn', { active: actualUsed === false }]"
            @click="actualUsed = false"
          >
            📝 未使用，仅参考
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="main-label">📝 文字反馈 (可选)</label>
        <textarea
          v-model="feedbackText"
          class="feedback-textarea"
          rows="3"
          placeholder="例如：水温稍高了一点，下次可以降低1-2度；或者粉水比非常合适，酸甜平衡很好..."
        ></textarea>
      </div>

      <div class="form-group quick-scores" v-if="actualUsed">
        <label class="main-label">📊 各维度体验评分 (可选)</label>
        <div class="dimension-rows">
          <div v-for="dim in dimensions" :key="dim.key" class="dim-row">
            <span class="dim-name">{{ dim.label }}</span>
            <div class="dim-input-group">
              <input
                type="range"
                v-model.number="dimScores[dim.key]"
                min="1"
                max="10"
                step="1"
                class="dim-slider"
              />
              <span class="dim-value">{{ dimScores[dim.key] }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="actions-row">
        <button class="btn btn-secondary cancel-btn" @click="$emit('close')">
          取消
        </button>
        <button
          class="btn btn-primary submit-btn"
          :disabled="starRating === 0 || submitting"
          @click="submit"
        >
          {{ submitting ? '提交中...' : '📤 提交反馈' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const props = defineProps({
  beanVariety: { type: String, required: true },
  roastLevel: { type: String, required: true },
  recommendation: { type: Object, required: true },
})

const emit = defineEmits(['submit', 'close'])

const starRating = ref(0)
const hoverStar = ref(0)
const actualUsed = ref(true)
const feedbackText = ref('')
const submitting = ref(false)

const dimScores = reactive({
  acidity: 6,
  sweetness: 6,
  body: 6,
  aftertaste: 6,
  balance: 6,
})

const dimensions = [
  { key: 'acidity', label: '酸度表现' },
  { key: 'sweetness', label: '甜度表现' },
  { key: 'body', label: '醇厚度' },
  { key: 'aftertaste', label: '余韵长度' },
  { key: 'balance', label: '整体平衡' },
]

const labels = ['很不满意', '不满意', '一般', '满意', '非常满意']
const captions = [
  '推荐参数与实际效果差距较大，需要大幅调整',
  '推荐参数有一定参考价值，但需要较多调整',
  '参数基本可用，小幅调整后效果尚可',
  '参数合理，按照建议操作可以冲煮出不错的效果',
  '参数非常精准，完美展现了该豆种的风味特点',
]

async function submit() {
  if (starRating.value === 0) return
  submitting.value = true
  try {
    await emit('submit', {
      beanVariety: props.beanVariety,
      roastLevel: props.roastLevel,
      recommendedRatio: props.recommendation.ratio,
      recommendedTempMin: props.recommendation.temperatureRange[0],
      recommendedTempMax: props.recommendation.temperatureRange[1],
      recommendedTimeMin: props.recommendation.brewTimeRange[0],
      recommendedTimeMax: props.recommendation.brewTimeRange[1],
      actualUsed: actualUsed.value,
      satisfaction: starRating.value,
      feedback: feedbackText.value,
      ...dimScores,
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.feedback-section {
  margin-top: 20px;
}

.feedback-card {
  padding: 22px;
  background: linear-gradient(180deg, #FFF8FF, #FFF0F5);
  border-radius: 14px;
  border: 2px solid #E8B4D4;
  box-shadow: 0 4px 16px rgba(180, 100, 150, 0.12);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.feedback-header h3 {
  font-size: 17px;
  color: #6F2D4E;
  margin: 0;
}

.close-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: #F5E6EF;
  color: #8B4513;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.close-btn:hover {
  background: #E8B4D4;
  color: #fff;
}

.feedback-intro {
  padding: 10px 14px;
  background: #FFF0F6;
  border-radius: 8px;
  margin-bottom: 16px;
}

.feedback-intro p {
  font-size: 13px;
  color: #6F2D4E;
  line-height: 1.5;
  margin: 0;
}

.feedback-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
  padding: 12px;
  background: #FFFBFF;
  border: 1px dashed #E8B4D4;
  border-radius: 10px;
}

.summary-chip {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 10px;
  background: #FFF0F6;
  border-radius: 8px;
  min-width: 80px;
}

.summary-label {
  font-size: 10px;
  color: #A06080;
}

.summary-value {
  font-size: 12px;
  font-weight: 600;
  color: #6F2D4E;
}

.summary-value.ratio {
  color: #2E5A2E;
}
.summary-value.temp {
  color: #8B3A3A;
}
.summary-value.time {
  color: #27408B;
}

.form-group {
  margin-bottom: 18px;
}

.main-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #6F2D4E;
  margin-bottom: 10px;
}

.star-rating {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.star-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  border: 2px solid #E8D5E0;
  background: #FFFBFF;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.star-btn:hover {
  border-color: #E8B4D4;
  transform: translateY(-1px);
}

.star-btn.active {
  background: linear-gradient(135deg, #FFE4B5, #FFDAB9);
  border-color: #DAA520;
  box-shadow: 0 2px 8px rgba(218, 165, 32, 0.2);
}

.star-btn.hover:not(.active) {
  background: #FFF8E8;
  border-color: #F0D090;
}

.star-icon {
  font-size: 26px;
  color: #DAA520;
  line-height: 1;
}

.star-btn:not(.active):not(.hover) .star-icon {
  color: #D8C8C0;
}

.star-label {
  font-size: 11px;
  color: #8B6980;
  font-weight: 500;
}

.rating-caption {
  margin-top: 10px;
  font-size: 13px;
  color: #6F4E60;
}

.rating-caption strong {
  color: #6F2D4E;
}

.option-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.option-btn {
  flex: 1;
  min-width: 140px;
  padding: 12px 16px;
  border: 2px solid #E8D5E0;
  background: #FFFBFF;
  border-radius: 10px;
  font-size: 13px;
  color: #6F4E60;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}

.option-btn:hover {
  border-color: #E8B4D4;
}

.option-btn.active {
  background: linear-gradient(135deg, #FCE4F0, #F8D4E4);
  border-color: #D080A8;
  color: #6F2D4E;
}

.feedback-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #E8D5E0;
  border-radius: 8px;
  font-size: 13px;
  color: #3E2C1C;
  background: #FFFBFF;
  resize: vertical;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.feedback-textarea:focus {
  border-color: #D080A8;
}

.quick-scores {
  padding: 14px;
  background: #FFFBFF;
  border-radius: 10px;
  border: 1px solid #F0D8E4;
}

.dimension-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dim-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dim-name {
  width: 80px;
  font-size: 12px;
  color: #6F4E60;
  flex-shrink: 0;
  font-weight: 500;
}

.dim-input-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.dim-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #F8D4E4, #E8B4D4);
  outline: none;
}

.dim-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6F2D4E;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.dim-value {
  width: 24px;
  font-size: 13px;
  font-weight: 600;
  color: #6F2D4E;
  text-align: right;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px dashed #E8B4D4;
}

.btn-secondary {
  padding: 9px 22px;
  background: transparent;
  border: 1.5px solid #C0A0B0;
  color: #6F4E60;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover {
  background: #F5E6EF;
  border-color: #A08090;
}

.submit-btn {
  padding: 9px 26px;
  background: linear-gradient(135deg, #B85080, #8B3060);
  border: none;
  color: #FFFBFF;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(140, 50, 90, 0.3);
  transition: all 0.15s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(140, 50, 90, 0.4);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
