<template>
  <div class="input-section">
    <div class="form-section">
      <div class="input-header">
        <h3>🔧 选择萃取条件</h3>
        <span class="input-hint">请选择豆种和烘焙程度，系统将智能分析推荐最佳参数</span>
      </div>
      <div class="form-grid">
        <div class="form-group variety-group">
          <label>🫘 咖啡豆品种 *</label>
          <div class="select-wrapper">
            <select v-model="localBeanVariety" @change="handleBeanChange">
              <option value="">请选择豆种...</option>
              <optgroup v-for="group in groupedVarieties" :key="group.type" :label="group.label">
                <option v-for="bean in group.items" :key="bean.name" :value="bean.name">
                  {{ bean.name }}
                </option>
              </optgroup>
            </select>
            <span v-if="localBeanVariety" class="bean-detail">
              {{ getBeanInfo(localBeanVariety) }}
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>🔥 烘焙程度 *</label>
          <div class="roast-selector">
            <button
              v-for="level in roastLevels"
              :key="level"
              type="button"
              :class="['roast-chip', { active: localRoastLevel === level }]"
              :style="roastChipStyle(level)"
              @click="localRoastLevel = level"
            >
              <span class="roast-dot"></span>
              {{ level }}
            </button>
          </div>
        </div>
      </div>

      <div class="action-row">
        <div class="quick-combos">
          <span class="quick-label">💡 快速选择：</span>
          <button
            v-for="combo in quickCombos"
            :key="combo.name"
            type="button"
            class="quick-btn"
            @click="applyQuickCombo(combo)"
          >
            {{ combo.name }}
          </button>
        </div>
        <button
          class="btn btn-primary recommend-btn"
          :disabled="!canSubmit || isComputing"
          @click="submit"
        >
          <span v-if="isComputing" class="loading-spinner"></span>
          {{ isComputing ? '分析中...' : '🎯 智能推荐' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BEAN_VARIETIES, ROAST_LEVEL_CODES } from '../utils/recommendationAlgo.js'

const props = defineProps({
  beanVarieties: { type: Array, default: () => [] },
  roastLevels: { type: Array, required: true },
  isComputing: { type: Boolean, default: false },
})

const emit = defineEmits(['recommend'])

const localBeanVariety = ref('')
const localRoastLevel = ref('')

const groupedVarieties = computed(() => {
  const groups = [
    { type: '阿拉比卡', label: '🌰 阿拉比卡 (精品豆)', items: [] },
    { type: '罗布斯塔', label: '☕ 罗布斯塔 (浓郁型)', items: [] },
    { type: '利比里亚', label: '🍂 利比里亚 (稀有)', items: [] },
    { type: '混合豆', label: '🎨 混合豆 / 拼配', items: [] },
  ]
  BEAN_VARIETIES.forEach(b => {
    const g = groups.find(g => g.type === b.type)
    if (g) g.items.push(b)
  })
  return groups.filter(g => g.items.length > 0)
})

const canSubmit = computed(() => localBeanVariety.value && localRoastLevel.value)

const quickCombos = [
  { name: '耶加雪菲·浅烘', variety: '耶加雪菲·科契尔', roast: '浅烘焙' },
  { name: '瑰夏·极浅', variety: '瑰夏·翡翠庄园', roast: '极浅烘焙' },
  { name: '曼特宁·深烘', variety: '曼特宁·黄金', roast: '深烘焙' },
  { name: '意式·中深烘', variety: '意式经典拼配', roast: '中深烘焙' },
  { name: '哥伦比亚·中烘', variety: '哥伦比亚·慧兰', roast: '中烘焙' },
]

function applyQuickCombo(combo) {
  localBeanVariety.value = combo.variety
  localRoastLevel.value = combo.roast
}

function getBeanInfo(name) {
  const b = BEAN_VARIETIES.find(x => x.name === name)
  if (!b) return ''
  return `${b.origin} · ${b.process}`
}

function handleBeanChange() {
  const b = BEAN_VARIETIES.find(x => x.name === localBeanVariety.value)
  if (!b || localRoastLevel.value) return
  const recommended = {
    espresso: '中深烘焙',
    robusta: '深烘焙',
    highAcid: '浅烘焙',
    floral: '极浅烘焙',
    fruity: '浅烘焙',
    heavyBody: '中深烘焙',
    earthy: '深烘焙',
  }
  if (recommended[b.flavorProfile]) {
    localRoastLevel.value = recommended[b.flavorProfile]
  }
}

function roastChipStyle(level) {
  const code = ROAST_LEVEL_CODES[level] ?? 3
  const lightness = 70 - code * 9
  const saturation = 25 + code * 3
  const color = `hsl(28, ${saturation}%, ${lightness}%)`
  const border = `hsl(28, ${saturation}%, ${lightness - 15}%)`
  return {
    '--chip-bg': color,
    '--chip-border': border,
    '--chip-color': code >= 4 ? '#FFF8F0' : '#3E2C1C',
  }
}

function submit() {
  if (!canSubmit.value || props.isComputing) return
  emit('recommend', {
    beanVariety: localBeanVariety.value,
    roastLevel: localRoastLevel.value,
  })
}
</script>

<style scoped>
.input-section {
  margin-bottom: 20px;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}

.input-header h3 {
  font-size: 15px;
  color: #3E2C1C;
  margin: 0;
}

.input-hint {
  font-size: 12px;
  color: #8B7355;
}

.variety-group {
  grid-column: 1 / -1;
}

.select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group select {
  width: 100%;
  font-size: 14px;
}

.bean-detail {
  font-size: 12px;
  color: #6F4E37;
  padding: 4px 10px;
  background: #FFF5E6;
  border-radius: 6px;
  width: fit-content;
}

.roast-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px;
}

.roast-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 2px solid var(--chip-border, #D2B48C);
  border-radius: 20px;
  background: var(--chip-bg, #FFF8F0);
  color: var(--chip-color, #3E2C1C);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.85;
}

.roast-chip:hover {
  opacity: 1;
  transform: translateY(-1px);
}

.roast-chip.active {
  opacity: 1;
  box-shadow: 0 3px 12px rgba(62, 44, 28, 0.2);
  transform: translateY(-1px);
}

.roast-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--chip-border, #6F4E37);
  box-shadow: inset 0 -1px 2px rgba(0, 0, 0, 0.3);
}

.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed #E0D0B8;
  gap: 12px;
  flex-wrap: wrap;
}

.quick-combos {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.quick-label {
  font-size: 12px;
  color: #8B7355;
  margin-right: 2px;
}

.quick-btn {
  padding: 4px 10px;
  border: 1px solid #D2B48C;
  background: #FFFCF7;
  border-radius: 12px;
  font-size: 12px;
  color: #6F4E37;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-btn:hover {
  background: #FFF5E6;
  border-color: #B8860B;
  color: #3E2C1C;
}

.recommend-btn {
  padding: 10px 26px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #6F4E37, #8B4513);
  border: none;
  color: #FFF8F0;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(111, 78, 55, 0.35);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
  justify-content: center;
}

.recommend-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(111, 78, 55, 0.45);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 248, 240, 0.3);
  border-top-color: #FFF8F0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
