<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🫘 豆种登记</h2>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? '取消' : '+ 新增豆种' }}
      </button>
    </div>

    <div v-if="showForm" class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <label>豆种名称</label>
          <input v-model="form.name" placeholder="例：耶加雪菲·科契尔" />
        </div>
        <div class="form-group">
          <label>产地</label>
          <input v-model="form.origin" placeholder="例：埃塞俄比亚" />
        </div>
        <div class="form-group">
          <label>品种</label>
          <input v-model="form.variety" placeholder="例：Heirloom" />
        </div>
        <div class="form-group">
          <label>处理法</label>
          <select v-model="form.process">
            <option value="">请选择</option>
            <option>水洗</option>
            <option>日晒</option>
            <option>蜜处理</option>
            <option>湿刨法</option>
            <option>厌氧发酵</option>
            <option>二氧化碳浸渍</option>
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-top: 16px;">
        <label>风味标签</label>
        <div class="flavor-tag-list">
          <span
            v-for="tag in ALL_FLAVOR_TAGS"
            :key="tag"
            :class="['flavor-tag-select', { active: form.flavorTags.includes(tag) }]"
            @click="toggleFlavorTag(tag)"
          >
            {{ tag }}
          </span>
        </div>
        <p class="flavor-hint">点击标签选择，再次点击取消（可多选）</p>
      </div>
      <button class="btn btn-primary" @click="submitBean" :disabled="!form.name">确认登记</button>
    </div>

    <div class="bean-list">
      <div v-for="bean in store.beansWithDetails" :key="bean.id" class="bean-item">
        <div class="bean-info">
          <div class="bean-name">{{ bean.name }}</div>
          <div class="bean-meta">
            <span class="tag">{{ bean.origin }}</span>
            <span class="tag">{{ bean.variety }}</span>
            <span class="tag">{{ bean.process }}</span>
          </div>
          <div v-if="bean.flavorTags && bean.flavorTags.length > 0" class="bean-meta">
            <span v-for="tag in bean.flavorTags" :key="tag" class="tag flavor-tag">{{ tag }}</span>
          </div>
          <div class="bean-stats">
            <span>烘焙 {{ bean.roastCount }} 次</span>
            <span>萃取 {{ bean.extractionCount }} 次</span>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" @click="handleDelete(bean.id)">删除</button>
      </div>
      <div v-if="store.beans.length === 0" class="empty-state">
        暂无豆种，点击上方按钮登记第一颗咖啡豆吧
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useCoffeeStore } from '../stores/coffee.js'

const ALL_FLAVOR_TAGS = [
  '花香', '茉莉', '玫瑰', '柑橘', '柠檬', '莓果', '蓝莓', '草莓',
  '核果', '桃子', '杏子', '热带水果', '芒果', '菠萝',
  '焦糖', '红糖', '蜂蜜', '巧克力', '黑巧克力', '坚果', '杏仁', '榛子',
  '香料', '肉桂', '丁香', '草本', '茶感',
  '酒香', '发酵', '烟熏', '木质', '泥土'
]

const store = useCoffeeStore()
const showForm = ref(false)
const form = reactive({ name: '', origin: '', variety: '', process: '', flavorTags: [] })

function toggleFlavorTag(tag) {
  const idx = form.flavorTags.indexOf(tag)
  if (idx >= 0) {
    form.flavorTags.splice(idx, 1)
  } else {
    form.flavorTags.push(tag)
  }
}

function resetForm() {
  form.name = ''
  form.origin = ''
  form.variety = ''
  form.process = ''
  form.flavorTags = []
}

async function submitBean() {
  if (!form.name) return
  await store.addBean({ ...form, flavorTags: [...form.flavorTags] })
  resetForm()
  showForm.value = false
}

async function handleDelete(id) {
  if (confirm('删除该豆种将同时删除其所有烘焙、萃取和评分记录，确定？')) {
    await store.deleteBean(id)
  }
}
</script>

<style scoped>
.flavor-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.flavor-tag-select {
  display: inline-block;
  padding: 4px 14px;
  background: #FFF8F0;
  color: #8B7355;
  border: 1.5px solid #E0D0B8;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.flavor-tag-select:hover {
  background: #F5E8D8;
  border-color: #D2B48C;
}
.flavor-tag-select.active {
  background: #6F4E37;
  color: #FFF8F0;
  border-color: #6F4E37;
}
.flavor-hint {
  font-size: 12px;
  color: #A08968;
  margin-top: 8px;
}
.flavor-tag {
  background: linear-gradient(135deg, #FFF0E0, #FFE0C0);
  color: #8B4513;
}
</style>
