<template>
  <div class="module-card">
    <div class="module-header">
      <h2>🔥 烘焙记录</h2>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? '取消' : '+ 新增记录' }}
      </button>
    </div>

    <div v-if="showForm" class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <label>选择豆种</label>
          <select v-model="form.beanId">
            <option value="">请选择</option>
            <option v-for="bean in store.beans" :key="bean.id" :value="bean.id">
              {{ bean.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>烘焙日期</label>
          <input type="date" v-model="form.date" />
        </div>
        <div class="form-group">
          <label>烘焙程度</label>
          <select v-model="form.level">
            <option value="">请选择</option>
            <option>极浅烘焙</option>
            <option>浅烘焙</option>
            <option>中浅烘焙</option>
            <option>中烘焙</option>
            <option>中深烘焙</option>
            <option>深烘焙</option>
            <option>极深烘焙</option>
          </select>
        </div>
        <div class="form-group">
          <label>出锅温度 (°C)</label>
          <input type="number" v-model.number="form.temperature" placeholder="196" />
        </div>
        <div class="form-group">
          <label>烘焙时长 (分钟)</label>
          <input type="number" v-model.number="form.duration" step="0.5" placeholder="10" />
        </div>
        <div class="form-group">
          <label>备注</label>
          <input v-model="form.notes" placeholder="一爆密集期出锅" />
        </div>
      </div>
      <button class="btn btn-primary" @click="submitRoast" :disabled="!form.beanId || !form.level">确认记录</button>
    </div>

    <div class="record-list">
      <div v-for="roast in sortedRoasts" :key="roast.id" class="record-item">
        <div class="record-info">
          <div class="record-title">
            <span class="bean-link">{{ getBeanName(roast.beanId) }}</span>
            <span class="tag level-tag">{{ roast.level }}</span>
          </div>
          <div class="record-meta">
            <span>{{ roast.date }}</span>
            <span>{{ roast.temperature }}°C</span>
            <span>{{ roast.duration }}min</span>
          </div>
          <div v-if="roast.notes" class="record-notes">{{ roast.notes }}</div>
        </div>
        <button class="btn btn-danger btn-sm" @click="handleDelete(roast.id)">删除</button>
      </div>
      <div v-if="store.roasts.length === 0" class="empty-state">
        暂无烘焙记录，先登记豆种再添加烘焙数据
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useCoffeeStore } from '../stores/coffee.js'

const store = useCoffeeStore()
const showForm = ref(false)
const form = reactive({ beanId: '', date: new Date().toISOString().slice(0, 10), level: '', temperature: null, duration: null, notes: '' })

const sortedRoasts = computed(() =>
  [...store.roasts].sort((a, b) => (a.date > b.date ? -1 : 1))
)

function getBeanName(beanId) {
  const bean = store.beans.find(b => b.id === beanId)
  return bean ? bean.name : '未知豆种'
}

function resetForm() {
  form.beanId = ''
  form.date = new Date().toISOString().slice(0, 10)
  form.level = ''
  form.temperature = null
  form.duration = null
  form.notes = ''
}

async function submitRoast() {
  if (!form.beanId || !form.level) return
  await store.addRoast({ ...form, beanId: Number(form.beanId) })
  resetForm()
  showForm.value = false
}

async function handleDelete(id) {
  await store.deleteRoast(id)
}
</script>
