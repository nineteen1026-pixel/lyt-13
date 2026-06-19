<template>
  <div class="history-entry-section">
    <div class="entry-card">
      <div class="entry-header">
        <h3>📝 录入真实萃取记录</h3>
        <button class="toggle-btn" @click="expanded = !expanded">
          {{ expanded ? '收起 ▲' : '展开 ▼' }}
        </button>
      </div>

      <div v-if="expanded" class="entry-body">
        <div class="form-row">
          <div class="form-field">
            <label>🫘 豆种品种 <span class="req">*</span></label>
            <select v-model="form.beanVariety" class="field-select">
              <option value="">请选择豆种...</option>
              <optgroup v-for="group in varietyGroups" :key="group.label" :label="group.label">
                <option v-for="v in group.items" :key="v.name" :value="v.name">{{ v.name }}</option>
              </optgroup>
            </select>
          </div>
          <div class="form-field">
            <label>🔥 烘焙程度 <span class="req">*</span></label>
            <div class="roast-chips">
              <button
                v-for="level in roastLevels"
                :key="level"
                :class="['roast-chip', { active: form.roastLevel === level }]"
                :style="roastChipStyle(level)"
                @click="form.roastLevel = level"
                type="button"
              >{{ level }}</button>
            </div>
          </div>
        </div>

        <div class="form-row three-col">
          <div class="form-field">
            <label>💧 粉水比 (1:X) <span class="req">*</span></label>
            <div class="input-with-hint">
              <input type="number" v-model.number="form.ratio" min="10" max="18" step="0.1" class="field-input" />
              <span class="hint">10-18</span>
            </div>
          </div>
          <div class="form-field">
            <label>🌡️ 水温 (℃) <span class="req">*</span></label>
            <div class="input-with-hint">
              <input type="number" v-model.number="form.temperature" min="80" max="100" step="1" class="field-input" />
              <span class="hint">80-100</span>
            </div>
          </div>
          <div class="form-field">
            <label>⏱️ 萃取时间 (分钟) <span class="req">*</span></label>
            <div class="input-with-hint">
              <input type="number" v-model.number="form.brewTime" min="1" max="6" step="0.1" class="field-input" />
              <span class="hint">1-6</span>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field flex-1">
            <label>⭐ 综合评分 <span class="req">*</span></label>
            <div class="score-slider">
              <input type="range" v-model.number="form.overallScore" min="1" max="5" step="0.5" class="slider" />
              <span class="score-display">{{ form.overallScore.toFixed(1) }} 分</span>
            </div>
          </div>
        </div>

        <div class="form-row five-col">
          <div class="form-field" v-for="dim in dimensions" :key="dim.key">
            <label>{{ dim.icon }} {{ dim.label }}</label>
            <div class="dim-score">
              <input type="range" v-model.number="form[dim.key]" min="1" max="10" step="1" class="slider-sm" />
              <span class="dim-val">{{ form[dim.key] }}</span>
            </div>
          </div>
        </div>

        <div class="form-row" v-if="autoHint">
          <div class="auto-hint">
            <span class="hint-icon">💡</span>
            <span>{{ autoHint }}</span>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-ghost" @click="resetForm" type="button">重置</button>
          <button
            class="btn btn-primary"
            :disabled="!canSubmit || submitting"
            @click="submit"
            type="button"
          >
            {{ submitting ? '保存中...' : '✅ 录入记录' }}
          </button>
        </div>

        <div v-if="recentlyAdded.length > 0" class="recent-entries">
          <h4>📌 最近录入</h4>
          <div class="recent-list">
            <div v-for="(entry, i) in recentlyAdded" :key="i" class="recent-item">
              <span class="ri-variety">{{ entry.beanVariety }}</span>
              <span class="ri-roast">{{ entry.roastLevel }}</span>
              <span class="ri-param">1:{{ entry.ratio }} / {{ entry.temperature }}℃ / {{ entry.brewTime }}分</span>
              <span class="ri-score">{{ entry.overallScore.toFixed(1) }}⭐</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { BEAN_VARIETIES, ROAST_LEVELS, ROAST_LEVEL_CODES, getBeanType, generateIdealParams } from '../utils/recommendationAlgo.js'

const emit = defineEmits(['submit'])

const roastLevels = ROAST_LEVELS
const expanded = ref(false)
const submitting = ref(false)
const recentlyAdded = ref([])

const form = reactive({
  beanVariety: '',
  roastLevel: '',
  ratio: 15.0,
  temperature: 92,
  brewTime: 3.0,
  overallScore: 4.0,
  acidityScore: 6,
  sweetnessScore: 6,
  bodyScore: 6,
  aftertasteScore: 6,
  balanceScore: 6,
})

const dimensions = [
  { key: 'acidityScore', icon: '🍋', label: '酸度' },
  { key: 'sweetnessScore', icon: '🍯', label: '甜度' },
  { key: 'bodyScore', icon: '🪨', label: '醇厚' },
  { key: 'aftertasteScore', icon: '🌊', label: '余韵' },
  { key: 'balanceScore', icon: '⚖️', label: '平衡' },
]

const varietyGroups = computed(() => {
  const groups = {}
  BEAN_VARIETIES.forEach(v => {
    if (!groups[v.type]) groups[v.type] = { label: v.type, items: [] }
    groups[v.type].items.push(v)
  })
  return Object.values(groups)
})

const canSubmit = computed(() =>
  form.beanVariety && form.roastLevel &&
  form.ratio >= 10 && form.ratio <= 18 &&
  form.temperature >= 80 && form.temperature <= 100 &&
  form.brewTime >= 1 && form.brewTime <= 6 &&
  form.overallScore >= 1
)

const autoHint = computed(() => {
  if (!form.beanVariety || !form.roastLevel) return ''
  const ideal = generateIdealParams(form.beanVariety, form.roastLevel)
  const parts = []
  if (Math.abs(form.ratio - ideal.ratio) > 2) parts.push(`此组合常见粉水比约 1:${ideal.ratio.toFixed(1)}`)
  if (Math.abs(form.temperature - ideal.temp) > 3) parts.push(`建议水温约 ${ideal.temp}℃`)
  if (Math.abs(form.brewTime - ideal.time) > 1) parts.push(`建议萃取约 ${ideal.time.toFixed(1)} 分钟`)
  return parts.length > 0 ? parts.join('；') + '，当前值偏差较大' : ''
})

function roastChipStyle(level) {
  const code = ROAST_LEVEL_CODES[level] ?? 3
  const lightness = 85 - code * 10
  return {
    background: `hsl(25, ${40 + code * 5}%, ${lightness}%)`,
    borderColor: `hsl(25, ${40 + code * 5}%, ${lightness - 15}%)`,
  }
}

function resetForm() {
  form.beanVariety = ''
  form.roastLevel = ''
  form.ratio = 15.0
  form.temperature = 92
  form.brewTime = 3.0
  form.overallScore = 4.0
  form.acidityScore = 6
  form.sweetnessScore = 6
  form.bodyScore = 6
  form.aftertasteScore = 6
  form.balanceScore = 6
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const data = {
      beanVariety: form.beanVariety,
      roastLevel: form.roastLevel,
      ratio: form.ratio,
      temperature: form.temperature,
      brewTime: form.brewTime,
      overallScore: form.overallScore,
      acidityScore: form.acidityScore,
      sweetnessScore: form.sweetnessScore,
      bodyScore: form.bodyScore,
      aftertasteScore: form.aftertasteScore,
      balanceScore: form.balanceScore,
      sampleCount: 1,
    }
    await emit('submit', data)
    recentlyAdded.value.unshift({ ...data })
    if (recentlyAdded.value.length > 5) recentlyAdded.value.pop()
    form.beanVariety = ''
    form.roastLevel = ''
    form.ratio = 15.0
    form.temperature = 92
    form.brewTime = 3.0
    form.overallScore = 4.0
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.history-entry-section {
  margin-top: 16px;
}

.entry-card {
  background: linear-gradient(180deg, #F5FFF5, #F0FFF0);
  border: 1.5px solid #B8E0C8;
  border-radius: 12px;
  padding: 16px;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.entry-header h3 {
  font-size: 15px;
  color: #2E5A2E;
  margin: 0;
}

.toggle-btn {
  padding: 4px 12px;
  border: 1px solid #B8E0C8;
  background: #F0FFF0;
  border-radius: 8px;
  font-size: 12px;
  color: #2E8B57;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn:hover {
  background: #D4EDDA;
}

.entry-body {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.form-row.three-col .form-field {
  flex: 1;
  min-width: 120px;
}

.form-row.five-col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field.flex-1 {
  flex: 1;
}

.form-field label {
  font-size: 12px;
  font-weight: 600;
  color: #3E5A3E;
}

.req {
  color: #CD5C5C;
}

.field-select {
  padding: 8px 10px;
  border: 1.5px solid #C8E0C8;
  border-radius: 8px;
  font-size: 13px;
  color: #2E5A2E;
  background: #FAFFFA;
  outline: none;
  transition: border-color 0.15s;
}

.field-select:focus {
  border-color: #2E8B57;
}

.field-input {
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid #C8E0C8;
  border-radius: 8px;
  font-size: 13px;
  color: #2E5A2E;
  background: #FAFFFA;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.field-input:focus {
  border-color: #2E8B57;
}

.input-with-hint {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hint {
  font-size: 11px;
  color: #8BAF8B;
  flex-shrink: 0;
}

.roast-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.roast-chip {
  padding: 5px 10px;
  border: 2px solid transparent;
  border-radius: 14px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  color: #3E2C1C;
}

.roast-chip:hover {
  transform: translateY(-1px);
}

.roast-chip.active {
  border-color: #2E8B57;
  box-shadow: 0 2px 6px rgba(46, 139, 87, 0.25);
  font-weight: 600;
}

.score-slider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #CD5C5C, #DAA520, #2E8B57);
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2E5A2E;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

.score-display {
  font-size: 16px;
  font-weight: 700;
  color: #2E5A2E;
  min-width: 50px;
}

.dim-score {
  display: flex;
  align-items: center;
  gap: 6px;
}

.slider-sm {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 5px;
  border-radius: 3px;
  background: #C8E0C8;
  outline: none;
}

.slider-sm::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #2E8B57;
  cursor: pointer;
}

.dim-val {
  font-size: 12px;
  font-weight: 600;
  color: #2E5A2E;
  min-width: 18px;
  text-align: right;
}

.auto-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #FFF8E1;
  border: 1px solid #FFE082;
  border-radius: 8px;
  font-size: 12px;
  color: #8B6914;
}

.hint-icon {
  flex-shrink: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px dashed #C8E0C8;
}

.btn-ghost {
  padding: 7px 16px;
  background: transparent;
  border: 1px solid #C8E0C8;
  color: #6F8B6F;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}

.btn-ghost:hover {
  background: #E8F5E8;
}

.btn-primary {
  padding: 7px 20px;
  background: linear-gradient(135deg, #2E8B57, #3CB371);
  border: none;
  color: #fff;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(46, 139, 87, 0.3);
  transition: all 0.15s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 139, 87, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recent-entries {
  margin-top: 10px;
  padding: 10px;
  background: #FAFFFA;
  border: 1px solid #D4E6D4;
  border-radius: 8px;
}

.recent-entries h4 {
  font-size: 12px;
  color: #3E5A3E;
  margin: 0 0 6px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  padding: 4px 8px;
  background: #F0FFF0;
  border-radius: 6px;
}

.ri-variety {
  font-weight: 600;
  color: #2E5A2E;
}

.ri-roast {
  color: #6F4E37;
}

.ri-param {
  color: #5A7A5A;
}

.ri-score {
  color: #DAA520;
  font-weight: 600;
}
</style>
