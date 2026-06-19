<template>
  <div class="record-form-section">
    <div class="form-card">
      <div class="form-header">
        <h3>📋 真实萃取历史录入</h3>
        <div class="header-actions">
          <button class="btn-toggle" @click="expanded = !expanded">
            {{ expanded ? '收起 ▲' : '展开 ▼' }}
          </button>
        </div>
      </div>

      <div v-if="!expanded" class="collapsed-hint">
        <p>点击"展开"，录入真实的咖啡萃取历史记录，帮助算法训练</p>
      </div>

      <div v-else class="form-body">
        <div class="section-title">🫘 咖啡豆信息</div>
        <div class="form-row">
          <div class="form-field">
            <label>豆种品种 *</label>
            <select v-model="form.beanVariety">
              <option value="">请选择...</option>
              <option v-for="v in beanVarietiesGrouped" :key="v.name" :value="v.name">
                {{ v.name }} · {{ v.origin }}
              </option>
            </select>
            <span class="hint" v-if="currentVariety">
              大类: {{ currentVariety.type }} | 处理法: {{ currentVariety.process }}
            </span>
          </div>

          <div class="form-field">
            <label>烘焙程度 *</label>
            <div class="chip-selector">
              <button
                v-for="(lvl, idx) in roastLevels"
                :key="lvl"
                type="button"
                :class="['roast-chip', { active: form.roastLevel === lvl }]"
                :style="{ background: roastColor(idx) }"
                @click="form.roastLevel = lvl"
              >
                {{ lvl }}
              </button>
            </div>
          </div>
        </div>

        <div class="section-title">⚙️ 萃取参数 *</div>
        <div class="form-row three-col">
          <div class="form-field">
            <label>粉水比 (1:X) *</label>
            <input type="number" v-model.number="form.ratio" step="0.1" min="10" max="18" placeholder="15.0" />
            <span class="hint">范围 10-18，手冲常用 1:14 ~ 1:17</span>
          </div>
          <div class="form-field">
            <label>水温 (℃) *</label>
            <input type="number" v-model.number="form.temperature" step="1" min="80" max="100" placeholder="92" />
            <span class="hint">范围 80-100℃，浅烘偏高深烘偏低</span>
          </div>
          <div class="form-field">
            <label>萃取时间 (分钟) *</label>
            <input type="number" v-model.number="form.brewTime" step="0.1" min="0.3" max="6" placeholder="2.5" />
            <span class="hint">范围 0.3-6 分钟，意式 0.5-1.2 分</span>
          </div>
        </div>

        <div class="section-title">⭐ 综合评分</div>
        <div class="form-row">
          <div class="form-field overall-score">
            <label>整体综合分 *</label>
            <div class="score-stepper">
              <button type="button" @click="form.overallScore = Math.max(1, (form.overallScore || 4) - 0.5)">−</button>
              <span class="score-display">{{ (form.overallScore || 4).toFixed(1) }}</span>
              <button type="button" @click="form.overallScore = Math.min(5, (form.overallScore || 4) + 0.5)">+</button>
            </div>
            <div class="score-description">
              {{ scoreDescription[(form.overallScore || 4).toFixed(1)] || '请综合评估风味表现' }}
            </div>
          </div>
        </div>

        <div class="section-title">📊 五维体验评分（可选）</div>
        <div class="form-row dimension-grid">
          <div v-for="dim in dimensions" :key="dim.key" class="dim-field">
            <label>{{ dim.label }} (1-10)</label>
            <div class="dim-input">
              <input type="range" v-model.number="form[dim.key]" :min="1" :max="10" step="1" class="dim-range" />
              <span class="dim-value">{{ form[dim.key] }}</span>
            </div>
          </div>
        </div>

        <div class="section-title">📝 补充信息（可选）</div>
        <div class="form-row">
          <div class="form-field">
            <label>样本杯数 / 验证次数</label>
            <input type="number" v-model.number="form.sampleCount" min="1" placeholder="1" />
          </div>
          <div class="form-field grow">
            <label>备注</label>
            <input v-model="form.notes" type="text" placeholder="器具、研磨度、冲煮手法等备注..." />
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-secondary" @click="resetForm">重置</button>
          <button class="btn btn-primary" :disabled="!isValid || submitting" @click="submitRecord">
            {{ submitting ? '保存中...' : '💾 保存历史记录' }}
          </button>
        </div>

        <div v-if="lastSaved" class="saved-hint">
          ✅ 记录已保存：{{ lastSaved.beanVariety }} · {{ lastSaved.roastLevel }} · 1:{{ lastSaved.ratio }}
          <button class="hint-close" @click="lastSaved = null">×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { BEAN_VARIETIES, ROAST_LEVELS, getBeanType, getBeanProcess, getBeanOrigin } from '../utils/recommendationAlgo.js'

const emit = defineEmits(['submit'])

const expanded = ref(false)
const submitting = ref(false)
const lastSaved = ref(null)

const roastLevels = ROAST_LEVELS
const beanVarietiesGrouped = [...BEAN_VARIETIES].sort((a, b) => a.type.localeCompare(b.type))

const form = reactive({
  beanVariety: '',
  roastLevel: '',
  ratio: null,
  temperature: null,
  brewTime: null,
  overallScore: 4,
  acidityScore: 6,
  sweetnessScore: 6,
  bodyScore: 6,
  aftertasteScore: 6,
  balanceScore: 6,
  sampleCount: 1,
  notes: '',
})

const dimensions = [
  { key: 'acidityScore', label: '酸度' },
  { key: 'sweetnessScore', label: '甜度' },
  { key: 'bodyScore', label: '醇厚' },
  { key: 'aftertasteScore', label: '余韵' },
  { key: 'balanceScore', label: '平衡' },
]

const scoreDescription = {
  '5.0': '完美，无任何瑕疵的顶级表现',
  '4.5': '出色，风味层次分明，回味无穷',
  '4.0': '良好，展现出该豆种的典型特征',
  '3.5': '不错，有可圈可点之处',
  '3.0': '尚可，无明显缺点也无亮点',
  '2.5': '一般，略有瑕疵',
  '2.0': '较差，明显瑕疵',
  '1.5': '差，难以入口',
  '1.0': '不可饮用',
}

const currentVariety = computed(() => BEAN_VARIETIES.find(b => b.name === form.beanVariety))

const isValid = computed(() =>
  form.beanVariety &&
  form.roastLevel &&
  typeof form.ratio === 'number' && !isNaN(form.ratio) && form.ratio >= 10 && form.ratio <= 18 &&
  typeof form.temperature === 'number' && !isNaN(form.temperature) && form.temperature >= 80 && form.temperature <= 100 &&
  typeof form.brewTime === 'number' && !isNaN(form.brewTime) && form.brewTime >= 0.3 && form.brewTime <= 6 &&
  typeof form.overallScore === 'number' && form.overallScore >= 1 && form.overallScore <= 5
)

function roastColor(idx) {
  const colors = ['#E8D5B7', '#D2B48C', '#C19A6B', '#A67B5B', '#8B5E3C', '#6F4E37', '#3E2C1C']
  const textColor = idx >= 4 ? '#FFF8F0' : '#3E2C1C'
  return `background:${colors[idx]};color:${textColor};`
}

function resetForm() {
  Object.assign(form, {
    beanVariety: '',
    roastLevel: '',
    ratio: null,
    temperature: null,
    brewTime: null,
    overallScore: 4,
    acidityScore: 6,
    sweetnessScore: 6,
    bodyScore: 6,
    aftertasteScore: 6,
    balanceScore: 6,
    sampleCount: 1,
    notes: '',
  })
  lastSaved.value = null
}

async function submitRecord() {
  if (!isValid.value) return
  submitting.value = true
  try {
    const payload = {
      beanType: getBeanType(form.beanVariety),
      beanVariety: form.beanVariety,
      origin: getBeanOrigin(form.beanVariety),
      process: getBeanProcess(form.beanVariety),
      roastLevel: form.roastLevel,
      ratio: +(form.ratio).toFixed(1),
      temperature: Math.round(form.temperature),
      brewTime: +(form.brewTime).toFixed(1),
      overallScore: +form.overallScore.toFixed(1),
      acidityScore: form.acidityScore,
      sweetnessScore: form.sweetnessScore,
      bodyScore: form.bodyScore,
      aftertasteScore: form.aftertasteScore,
      balanceScore: form.balanceScore,
      sampleCount: form.sampleCount || 1,
      notes: form.notes || '',
    }
    await emit('submit', payload)
    lastSaved.value = {
      beanVariety: payload.beanVariety,
      roastLevel: payload.roastLevel,
      ratio: payload.ratio,
    }
    resetForm()
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.record-form-section {
  margin-top: 20px;
}

.form-card {
  padding: 18px 20px;
  background: linear-gradient(180deg, #F8FFF4, #F0FFE8);
  border-radius: 14px;
  border: 2px solid #A8D4A0;
  box-shadow: 0 4px 14px rgba(80, 150, 80, 0.1);
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-header h3 {
  font-size: 16px;
  color: #2E5A2E;
  margin: 0;
}

.btn-toggle {
  padding: 5px 12px;
  background: transparent;
  border: 1px solid #88B880;
  border-radius: 8px;
  color: #2E5A2E;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-toggle:hover {
  background: #E0F4D8;
}

.collapsed-hint {
  margin-top: 10px;
  padding: 8px 12px;
  background: #F0FFE8;
  border-radius: 8px;
}

.collapsed-hint p {
  margin: 0;
  font-size: 12px;
  color: #5E7E58;
}

.form-body {
  margin-top: 14px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #2E5A2E;
  margin: 16px 0 10px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #B8E0B0;
}

.section-title:first-of-type {
  margin-top: 0;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.form-row.three-col {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.dimension-grid {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field.grow {
  flex: 1;
}

.form-field label {
  font-size: 12px;
  color: #3E5A38;
  font-weight: 500;
}

.form-field input,
.form-field select,
.form-field textarea {
  padding: 8px 10px;
  border: 1.5px solid #C8E0C0;
  border-radius: 8px;
  font-size: 13px;
  background: #FFFCFF;
  color: #2E3E28;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: #68A060;
}

.form-field select {
  cursor: pointer;
}

.hint {
  font-size: 10px;
  color: #6E8E68;
}

.chip-selector {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.roast-chip {
  flex: 1;
  min-width: 62px;
  padding: 7px 8px;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  line-height: 1.2;
}

.roast-chip:hover {
  transform: translateY(-1px);
}

.roast-chip.active {
  border-color: #2E5A2E;
  box-shadow: 0 0 0 2px rgba(104, 160, 96, 0.3);
}

.overall-score {
  align-items: center;
  padding: 10px;
  background: #FFFCFF;
  border: 1px dashed #B8E0B0;
  border-radius: 10px;
}

.score-stepper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0;
}

.score-stepper button {
  width: 36px;
  height: 36px;
  border: none;
  background: linear-gradient(135deg, #68A060, #4E8048);
  color: #fff;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-stepper button:hover {
  transform: scale(1.06);
}

.score-display {
  font-size: 32px;
  font-weight: 700;
  color: #2E5A2E;
  min-width: 60px;
  text-align: center;
}

.score-description {
  font-size: 11px;
  color: #5E7E58;
  font-style: italic;
  text-align: center;
}

.dim-field {
  padding: 8px 10px;
  background: #FFFCFF;
  border-radius: 8px;
  border: 1px solid #D8E8D0;
}

.dim-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dim-range {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 5px;
  border-radius: 3px;
  background: linear-gradient(90deg, #E0F0D8, #88C080);
  outline: none;
}

.dim-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #2E5A2E;
  cursor: pointer;
}

.dim-value {
  font-size: 13px;
  font-weight: 600;
  color: #2E5A2E;
  width: 22px;
  text-align: right;
}

.form-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px dashed #B8E0B0;
}

.btn-secondary {
  padding: 8px 18px;
  background: transparent;
  border: 1.5px solid #88B880;
  color: #3E5A38;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover {
  background: #E8F8E0;
}

.btn-primary {
  padding: 8px 22px;
  background: linear-gradient(135deg, #5A9050, #3E7038);
  border: none;
  color: #fff;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(80, 130, 70, 0.3);
  transition: all 0.15s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 130, 70, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.saved-hint {
  margin-top: 12px;
  padding: 10px 14px;
  background: #D4F0CC;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #2E5A2E;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.hint-close {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #5E7E58;
  cursor: pointer;
  font-size: 14px;
}

.hint-close:hover {
  color: #2E5A2E;
}
</style>
