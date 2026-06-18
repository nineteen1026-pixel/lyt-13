<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🧠 风味推荐引擎</h2>
      <div class="mode-switch">
        <button
          :class="['mode-btn', { active: recommendMode === 'personal' }]"
          @click="recommendMode = 'personal'"
        >
          👤 个性化推荐
        </button>
        <button
          :class="['mode-btn', { active: recommendMode === 'similar' }]"
          @click="recommendMode = 'similar'"
        >
          🔍 相似豆种
        </button>
      </div>
    </div>

    <div v-if="!recStore.hasEnoughData" class="empty-state">
      <div class="empty-icon">☕</div>
      <p>请先登记至少 2 款豆种，推荐引擎才能开始工作</p>
    </div>

    <template v-else>
      <div v-if="recommendMode === 'personal'" class="recommend-section">
        <div v-if="!recStore.hasUserPreferences" class="empty-state">
          <div class="empty-icon">📊</div>
          <p>暂无评分数据，先去「评分雷达」为几款豆子评分吧</p>
          <p class="hint-text">评分越多，推荐越精准</p>
        </div>

        <template v-else>
          <div class="user-profile-card">
            <h3>🎯 你的风味偏好画像</h3>
            <div class="profile-content">
              <div class="profile-ratings">
                <div v-for="(dim, idx) in DIMENSIONS" :key="dim" class="profile-dim">
                  <span class="dim-label">{{ dim }}</span>
                  <div class="dim-bar">
                    <div
                      class="dim-fill"
                      :style="{ width: `${(userPreferenceVector[idx] || 5) * 10}%` }"
                    ></div>
                  </div>
                  <span class="dim-value">{{ userPreferenceVector[idx]?.toFixed(1) || '-' }}</span>
                </div>
              </div>
              <div class="profile-tags" v-if="preferredTags.length > 0">
                <h4>偏好风味标签</h4>
                <div class="tag-list">
                  <span v-for="tag in preferredTags" :key="tag" class="preferred-tag">{{ tag }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="recommend-results">
            <h3>✨ 为你推荐</h3>
            <div v-if="personalRecommendations.length === 0" class="empty-state small">
              暂无匹配的豆种，请添加更多评分数据
            </div>
            <div class="bean-recommend-list">
              <div
                v-for="rec in personalRecommendations"
                :key="rec.bean.id"
                class="bean-recommend-card"
                @click="selectBean(rec.bean)"
              >
                <div class="recommend-header">
                  <div>
                    <div class="bean-name">{{ rec.bean.name }}</div>
                    <div class="bean-meta">
                      <span class="tag">{{ rec.bean.origin }}</span>
                      <span class="tag">{{ rec.bean.process }}</span>
                    </div>
                  </div>
                  <div class="similarity-badge">
                    <span class="similarity-value">{{ rec.similarityPercent }}%</span>
                    <span class="similarity-label">匹配度</span>
                  </div>
                </div>
                <div v-if="rec.bean.flavorTags?.length" class="bean-flavor-tags">
                  <span v-for="tag in rec.bean.flavorTags" :key="tag" class="flavor-tag">{{ tag }}</span>
                </div>
                <div class="match-reasons">
                  <span v-if="rec.matchReasons.ratingMatch" class="reason-tag">📊 风味维度匹配</span>
                  <span v-if="rec.matchReasons.tagMatch" class="reason-tag">🏷️ 风味标签匹配</span>
                </div>
                <div v-if="rec.highlights.roast || rec.highlights.extraction" class="brew-highlights">
                  <div v-if="rec.highlights.roast" class="highlight-item">
                    <span class="highlight-icon">🔥</span>
                    <span class="highlight-label">烘焙:</span>
                    <span class="highlight-value level-tag">{{ rec.highlights.roast.level }}</span>
                  </div>
                  <div v-if="rec.highlights.extraction" class="highlight-item">
                    <span class="highlight-icon">☕</span>
                    <span class="highlight-label">冲煮:</span>
                    <span class="highlight-value method-tag">{{ rec.highlights.extraction.method }}</span>
                    <span class="highlight-params">
                      {{ rec.highlights.extraction.ratio }} · {{ rec.highlights.extraction.temperature }}°C · {{ rec.highlights.extraction.time }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-else class="recommend-section">
        <div class="bean-selector">
          <label class="selector-label">选择一款豆种，查找相似风味：</label>
          <select v-model="selectedBeanId" class="bean-select">
            <option value="">请选择豆种</option>
            <option v-for="bean in coffeeStore.beans" :key="bean.id" :value="bean.id">
              {{ bean.name }}
            </option>
          </select>
        </div>

        <div v-if="selectedBeanId && selectedBean" class="selected-bean-info">
          <h4>🔎 目标豆种：{{ selectedBean.name }}</h4>
          <div v-if="selectedBean.flavorTags?.length" class="bean-flavor-tags">
            <span v-for="tag in selectedBean.flavorTags" :key="tag" class="flavor-tag">{{ tag }}</span>
          </div>
        </div>

        <div v-if="selectedBeanId" class="recommend-results">
          <h3>🔗 相似豆种</h3>
          <div v-if="similarRecommendations.length === 0" class="empty-state small">
            暂无足够相似的豆种，请添加更多评分或风味标签
          </div>
          <div class="bean-recommend-list">
            <div
              v-for="rec in similarRecommendations"
              :key="rec.bean.id"
              class="bean-recommend-card"
              @click="selectBean(rec.bean)"
            >
              <div class="recommend-header">
                <div>
                  <div class="bean-name">{{ rec.bean.name }}</div>
                  <div class="bean-meta">
                    <span class="tag">{{ rec.bean.origin }}</span>
                    <span class="tag">{{ rec.bean.process }}</span>
                  </div>
                </div>
                <div class="similarity-badge">
                  <span class="similarity-value">{{ rec.similarityPercent }}%</span>
                  <span class="similarity-label">相似度</span>
                </div>
              </div>
              <div v-if="rec.bean.flavorTags?.length" class="bean-flavor-tags">
                <span v-for="tag in rec.bean.flavorTags" :key="tag" class="flavor-tag">{{ tag }}</span>
              </div>
              <div v-if="rec.highlights.roast || rec.highlights.extraction" class="brew-highlights">
                <div v-if="rec.highlights.roast" class="highlight-item">
                  <span class="highlight-icon">🔥</span>
                  <span class="highlight-label">烘焙:</span>
                  <span class="highlight-value level-tag">{{ rec.highlights.roast.level }}</span>
                </div>
                <div v-if="rec.highlights.extraction" class="highlight-item">
                  <span class="highlight-icon">☕</span>
                  <span class="highlight-label">冲煮:</span>
                  <span class="highlight-value method-tag">{{ rec.highlights.extraction.method }}</span>
                  <span class="highlight-params">
                    {{ rec.highlights.extraction.ratio }} · {{ rec.highlights.extraction.temperature }}°C · {{ rec.highlights.extraction.time }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="detailBean" class="detail-panel">
        <div class="detail-header">
          <h3>📋 {{ detailBean.name }} - 酿造建议</h3>
          <button class="btn btn-danger btn-sm" @click="detailBean = null">关闭</button>
        </div>

        <div class="detail-tabs">
          <button
            :class="['detail-tab', { active: detailTab === 'roast' }]"
            @click="detailTab = 'roast'"
          >
            🔥 烘焙建议
          </button>
          <button
            :class="['detail-tab', { active: detailTab === 'extraction' }]"
            @click="detailTab = 'extraction'"
          >
            ☕ 萃取建议
          </button>
        </div>

        <div v-if="detailTab === 'roast'" class="detail-content">
          <div v-if="roastRecommendations.length > 0" class="recommend-list">
            <div
              v-for="(rec, idx) in roastRecommendations"
              :key="rec.level"
              class="recommend-item"
            >
              <div class="recommend-rank">#{{ idx + 1 }}</div>
              <div class="recommend-main">
                <div class="recommend-title">
                  <span class="level-tag large">{{ rec.level }}</span>
                  <span v-if="idx === 0" class="top-pick-badge">✨ 首推</span>
                  <span class="confidence-badge">{{ rec.confidence }}% 置信度</span>
                </div>
                <div class="recommend-reason">{{ rec.reason }}</div>
                <div class="roast-tips">
                  <span v-if="rec.level.includes('浅')">💡 建议出锅温度 190-198°C，时长 8-10 分钟</span>
                  <span v-else-if="rec.level.includes('中') && !rec.level.includes('深')">💡 建议出锅温度 200-212°C，时长 10-12 分钟</span>
                  <span v-else-if="rec.level.includes('深')">💡 建议出锅温度 215-230°C，时长 12-15 分钟</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="detailTab === 'extraction'" class="detail-content">
          <div class="roast-filter">
            <label>选择烘焙度：</label>
            <select v-model="selectedRoastForExtraction" class="roast-select">
              <option value="">不指定</option>
              <option>极浅烘焙</option>
              <option>浅烘焙</option>
              <option>中浅烘焙</option>
              <option>中烘焙</option>
              <option>中深烘焙</option>
              <option>深烘焙</option>
              <option>极深烘焙</option>
            </select>
          </div>
          <div v-if="extractionRecommendations.length > 0" class="recommend-list">
            <div
              v-for="(rec, idx) in extractionRecommendations"
              :key="rec.method"
              class="recommend-item"
            >
              <div class="recommend-rank">#{{ idx + 1 }}</div>
              <div class="recommend-main">
                <div class="recommend-title">
                  <span class="method-tag large">{{ rec.method }}</span>
                  <span v-if="idx === 0" class="top-pick-badge">✨ 首推</span>
                  <span class="confidence-badge">{{ rec.confidence }}% 置信度</span>
                </div>
                <div class="extraction-params">
                  <div class="param-item">
                    <span class="param-label">粉水比</span>
                    <span class="param-value">{{ rec.ratio }}</span>
                  </div>
                  <div class="param-item">
                    <span class="param-label">水温</span>
                    <span class="param-value">{{ rec.temperature }}°C</span>
                  </div>
                  <div class="param-item">
                    <span class="param-label">时间</span>
                    <span class="param-value">{{ rec.time }}</span>
                  </div>
                </div>
                <div class="recommend-reason">{{ rec.reason }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCoffeeStore } from '../stores/coffee.js'
import { useRecommendationStore } from '../stores/recommendation.js'

const DIMENSIONS = ['酸度', '甜度', '醇厚度', '余韵', '平衡']

const coffeeStore = useCoffeeStore()
const recStore = useRecommendationStore()

const recommendMode = ref('personal')
const selectedBeanId = ref('')
const detailBean = ref(null)
const detailTab = ref('roast')
const selectedRoastForExtraction = ref('')

const userPreferenceVector = computed(() => recStore.getUserPreferenceVector() || [5, 5, 5, 5, 5])
const preferredTags = computed(() => recStore.getUserPreferredFlavorTags())

const personalRecommendations = computed(() => {
  if (!recStore.hasUserPreferences) return []
  const recs = recStore.recommendByUserPreference(5)
  return recs.map(rec => ({
    ...rec,
    highlights: recStore.getBeanRecommendHighlights(rec.bean.id),
  }))
})

const selectedBean = computed(() => {
  if (!selectedBeanId.value) return null
  return coffeeStore.beans.find(b => b.id === Number(selectedBeanId.value))
})

const similarRecommendations = computed(() => {
  if (!selectedBeanId.value) return []
  const recs = recStore.recommendBySimilarBean(Number(selectedBeanId.value), 5)
  return recs.map(rec => ({
    ...rec,
    highlights: recStore.getBeanRecommendHighlights(rec.bean.id),
  }))
})

const roastRecommendations = computed(() => {
  if (!detailBean.value) return []
  return recStore.recommendRoastLevel(detailBean.value.id)
})

const extractionRecommendations = computed(() => {
  if (!detailBean.value) return []
  return recStore.recommendExtractionParams(
    detailBean.value.id,
    selectedRoastForExtraction.value || null
  )
})

function selectBean(bean) {
  detailBean.value = bean
  const roastRecs = recStore.recommendRoastLevel(bean.id)
  selectedRoastForExtraction.value = roastRecs[0]?.level || ''
  detailTab.value = 'roast'
}
</script>

<style scoped>
.mode-switch {
  display: flex;
  gap: 8px;
}
.mode-btn {
  padding: 6px 14px;
  border: 1.5px solid #D2B48C;
  background: #FFF8F0;
  color: #6F4E37;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.mode-btn.active {
  background: #6F4E37;
  color: #FFF8F0;
  border-color: #6F4E37;
}
.recommend-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.empty-state.small {
  padding: 24px;
  font-size: 13px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.hint-text {
  font-size: 12px;
  color: #A08968;
  margin-top: 4px;
}
.user-profile-card {
  background: linear-gradient(135deg, #FFF8F0, #FFEAD0);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #E0D0B8;
}
.user-profile-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 16px;
}
.profile-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
@media (max-width: 640px) {
  .profile-content {
    grid-template-columns: 1fr;
  }
}
.profile-ratings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.profile-dim {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dim-label {
  font-size: 13px;
  color: #6F4E37;
  font-weight: 500;
  width: 56px;
  flex-shrink: 0;
}
.dim-bar {
  flex: 1;
  height: 8px;
  background: #E8D5B7;
  border-radius: 4px;
  overflow: hidden;
}
.dim-fill {
  height: 100%;
  background: linear-gradient(90deg, #C4A882, #6F4E37);
  border-radius: 4px;
  transition: width 0.3s;
}
.dim-value {
  font-size: 13px;
  font-weight: 600;
  color: #3E2C1C;
  width: 32px;
  text-align: right;
}
.profile-tags h4 {
  font-size: 13px;
  font-weight: 600;
  color: #6F4E37;
  margin-bottom: 8px;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.preferred-tag {
  padding: 3px 12px;
  background: #6F4E37;
  color: #FFF8F0;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.recommend-results h3 {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 14px;
}
.bean-selector {
  background: #FFF8F0;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #E0D0B8;
}
.selector-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
  margin-bottom: 8px;
}
.bean-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #D2B48C;
  border-radius: 8px;
  font-size: 14px;
  background: #FFFCF7;
  color: #3E2C1C;
  outline: none;
}
.selected-bean-info {
  background: #FFF0E0;
  border-radius: 10px;
  padding: 12px 16px;
}
.selected-bean-info h4 {
  font-size: 14px;
  font-weight: 600;
  color: #6F4E37;
  margin-bottom: 8px;
}
.bean-recommend-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bean-recommend-card {
  background: #FFFDF9;
  border: 1px solid #EDE0D0;
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.bean-recommend-card:hover {
  box-shadow: 0 4px 12px rgba(62, 44, 28, 0.12);
  border-color: #D2B48C;
  transform: translateY(-1px);
}
.recommend-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.bean-name {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
  margin-bottom: 4px;
}
.bean-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
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
.similarity-badge {
  text-align: center;
  background: linear-gradient(135deg, #6F4E37, #8B6914);
  color: #FFF8F0;
  padding: 6px 12px;
  border-radius: 10px;
  min-width: 64px;
}
.similarity-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}
.similarity-label {
  font-size: 10px;
  opacity: 0.85;
}
.bean-flavor-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.flavor-tag {
  padding: 2px 8px;
  background: linear-gradient(135deg, #FFF0E0, #FFE0C0);
  color: #8B4513;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}
.match-reasons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.reason-tag {
  padding: 2px 8px;
  background: #E8F0E8;
  color: #3E6B3E;
  border-radius: 8px;
  font-size: 11px;
}
.detail-panel {
  margin-top: 20px;
  background: #FFFDF9;
  border: 2px solid #D2B48C;
  border-radius: 14px;
  padding: 20px;
  animation: slideIn 0.3s ease;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.detail-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #3E2C1C;
}
.detail-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.detail-tab {
  padding: 8px 18px;
  border: 1.5px solid #E0D0B8;
  background: #FFF8F0;
  color: #8B7355;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.detail-tab.active {
  background: #6F4E37;
  color: #FFF8F0;
  border-color: #6F4E37;
}
.detail-content {
  min-height: 200px;
}
.roast-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #FFF8F0;
  border-radius: 8px;
}
.roast-filter label {
  font-size: 13px;
  font-weight: 500;
  color: #6F4E37;
}
.roast-select {
  padding: 6px 12px;
  border: 1px solid #D2B48C;
  border-radius: 6px;
  font-size: 13px;
  background: #FFFCF7;
  color: #3E2C1C;
  outline: none;
}
.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.recommend-item {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: #FFF8F0;
  border: 1px solid #EDE0D0;
  border-radius: 10px;
}
.recommend-rank {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #C4A882, #6F4E37);
  color: #FFF8F0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}
.recommend-main {
  flex: 1;
}
.recommend-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.level-tag,
.method-tag {
  padding: 4px 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
}
.level-tag {
  background: #FFE0B2;
  color: #8B4513;
}
.level-tag.large {
  font-size: 15px;
  padding: 5px 18px;
}
.method-tag {
  background: #C8E6C9;
  color: #2E5A2E;
}
.method-tag.large {
  font-size: 15px;
  padding: 5px 18px;
}
.confidence-badge {
  padding: 3px 10px;
  background: #E8F0E8;
  color: #3E6B3E;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.top-pick-badge {
  padding: 3px 10px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #5A3E00;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.recommend-reason {
  font-size: 13px;
  color: #6F4E37;
  margin-bottom: 8px;
}
.roast-tips {
  font-size: 12px;
  color: #A08968;
  font-style: italic;
}
.extraction-params {
  display: flex;
  gap: 20px;
  margin: 10px 0;
  padding: 10px 14px;
  background: #FFFCF7;
  border-radius: 8px;
  border: 1px solid #E8D5B7;
}
.param-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.param-label {
  font-size: 11px;
  color: #8B7355;
}
.param-value {
  font-size: 15px;
  font-weight: 600;
  color: #3E2C1C;
}
.brew-highlights {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #E8D5B7;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.highlight-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
}
.highlight-icon {
  font-size: 13px;
}
.highlight-label {
  color: #8B7355;
  font-weight: 500;
}
.highlight-value {
  padding: 2px 10px;
  font-size: 11px;
}
.highlight-value.level-tag {
  background: #FFE8CC;
  color: #A0522D;
}
.highlight-value.method-tag {
  background: #D4E6D4;
  color: #2E5A2E;
}
.highlight-params {
  color: #6F4E37;
  font-weight: 500;
  margin-left: 4px;
}
</style>
