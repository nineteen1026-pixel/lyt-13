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

const store = useCoffeeStore()
const showForm = ref(false)
const form = reactive({ name: '', origin: '', variety: '', process: '' })

function resetForm() {
  form.name = ''
  form.origin = ''
  form.variety = ''
  form.process = ''
}

async function submitBean() {
  if (!form.name) return
  await store.addBean({ ...form })
  resetForm()
  showForm.value = false
}

async function handleDelete(id) {
  if (confirm('删除该豆种将同时删除其所有烘焙、萃取和评分记录，确定？')) {
    await store.deleteBean(id)
  }
}
</script>
