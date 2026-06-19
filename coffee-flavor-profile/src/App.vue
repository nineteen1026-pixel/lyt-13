<template>
  <div id="coffee-app">
    <header class="app-header">
      <h1>☕ 咖啡豆风味档案 & 订单管理</h1>
      <p class="subtitle">记录每一颗豆子的旅程 — 从产地到杯中，从预售到核销</p>
    </header>

    <div class="module-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <div class="module-content">
      <BeanRegistration v-if="activeTab === 'bean'" />
      <RoastCurve v-if="activeTab === 'curve'" />
      <RoastRecord v-if="activeTab === 'roast'" />
      <ExtractionLog v-if="activeTab === 'extraction'" />
      <RadarChart v-if="activeTab === 'rating'" />
      <CuppingComparison v-if="activeTab === 'cupping'" />
      <FlavorRecommendation v-if="activeTab === 'recommend'" />
      <ExtractionRecommendation v-if="activeTab === 'extractionRec'" />
      <InventoryManagement v-if="activeTab === 'inventory'" />
      <PromotionManagement v-if="activeTab === 'promotion'" />
      <OrderManagement v-if="activeTab === 'order'" />
      <BeanTraceability v-if="activeTab === 'traceability'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BeanRegistration from './components/BeanRegistration.vue'
import RoastRecord from './components/RoastRecord.vue'
import RoastCurve from './components/RoastCurve.vue'
import ExtractionLog from './components/ExtractionLog.vue'
import RadarChart from './components/RadarChart.vue'
import CuppingComparison from './components/CuppingComparison.vue'
import FlavorRecommendation from './components/FlavorRecommendation.vue'
import ExtractionRecommendation from './components/ExtractionRecommendation.vue'
import InventoryManagement from './components/InventoryManagement.vue'
import PromotionManagement from './components/PromotionManagement.vue'
import OrderManagement from './components/OrderManagement.vue'
import BeanTraceability from './components/BeanTraceability.vue'

const activeTab = ref('extractionRec')
const tabs = [
  { key: 'extractionRec', icon: '🎯', label: '萃取参数推荐' },
  { key: 'recommend', icon: '🧠', label: '风味推荐' },
  { key: 'traceability', icon: '📜', label: '溯源档案' },
  { key: 'order', icon: '🛒', label: '订单管理' },
  { key: 'inventory', icon: '📦', label: '库存管理' },
  { key: 'promotion', icon: '🎁', label: '营销活动' },
  { key: 'cupping', icon: '🔍', label: '杯测对比' },
  { key: 'bean', icon: '🫘', label: '豆种登记' },
  { key: 'curve', icon: '📈', label: '烘焙曲线' },
  { key: 'roast', icon: '🔥', label: '烘焙记录' },
  { key: 'extraction', icon: '☕', label: '萃取日志' },
  { key: 'rating', icon: '📊', label: '评分雷达' },
]
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #F5EDE4;
  color: #3E2C1C;
  min-height: 100vh;
}

#coffee-app {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.app-header {
  text-align: center;
  margin-bottom: 28px;
}

.app-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #3E2C1C;
  letter-spacing: 1px;
}

.app-header .subtitle {
  font-size: 14px;
  color: #8B7355;
  margin-top: 6px;
  font-weight: 300;
}

.module-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  flex-shrink: 0;
  padding: 10px 20px;
  border: 2px solid #D2B48C;
  border-radius: 24px;
  background: #FFF8F0;
  color: #6F4E37;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover {
  background: #F0E0D0;
}

.tab-btn.active {
  background: #6F4E37;
  color: #FFF8F0;
  border-color: #6F4E37;
}

.module-content {
  min-height: 400px;
}

.module-card {
  background: #FFFDF9;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(62, 44, 28, 0.08);
  border: 1px solid #EDE0D0;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.module-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #3E2C1C;
}

.btn {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #6F4E37;
  color: #FFF8F0;
}

.btn-primary:hover:not(:disabled) {
  background: #5A3E2B;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: transparent;
  color: #C0392B;
  border: 1px solid #E6B0AA;
}

.btn-danger:hover {
  background: #FDEDEC;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.form-section {
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
}

.form-group input,
.form-group select {
  padding: 8px 12px;
  border: 1px solid #D2B48C;
  border-radius: 8px;
  font-size: 14px;
  background: #FFFCF7;
  color: #3E2C1C;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #6F4E37;
}

.bean-list,
.record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bean-item,
.record-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 16px;
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
  transition: box-shadow 0.2s;
}

.bean-item:hover,
.record-item:hover {
  box-shadow: 0 2px 8px rgba(62, 44, 28, 0.1);
}

.bean-name {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 6px;
}

.bean-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: #F0E0D0;
  color: #6F4E37;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.level-tag {
  background: #E8D5B7;
}

.method-tag {
  background: #D4E6D4;
  color: #3E6B3E;
}

.bean-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #8B7355;
}

.record-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.bean-link {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
}

.record-meta {
  display: flex;
  gap: 14px;
  font-size: 13px;
  color: #8B7355;
  margin-bottom: 4px;
}

.record-notes {
  font-size: 13px;
  color: #6F4E37;
  font-style: italic;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #B0A090;
  font-size: 14px;
}
</style>
