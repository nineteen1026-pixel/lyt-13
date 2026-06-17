<template>
  <div class="module-card">
    <div class="module-header">
      <h2>☕ 萃取日志</h2>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? '取消' : '+ 新增日志' }}
      </button>
    </div>

    <div v-if="showForm" class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <label>选择豆种</label>
          <select v-model="form.beanId" @change="onBeanChange">
            <option value="">请选择</option>
            <option v-for="bean in store.beans" :key="bean.id" :value="bean.id">
              {{ bean.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>关联烘焙</label>
          <select v-model="form.roastId">
            <option value="">请选择</option>
            <option v-for="roast in beanRoasts" :key="roast.id" :value="roast.id">
              {{ roast.date }} - {{ roast.level }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>萃取日期</label>
          <input type="date" v-model="form.date" />
        </div>
        <div class="form-group">
          <label>萃取方式</label>
          <select v-model="form.method">
            <option value="">请选择</option>
            <option>手冲 V60</option>
            <option>手冲 Kalita</option>
            <option>手冲 蛋糕滤杯</option>
            <option>爱乐压</option>
            <option>法压壶</option>
            <option>虹吸壶</option>
            <option>摩卡壶</option>
            <option>意式浓缩</option>
            <option>冷萃</option>
          </select>
        </div>
        <div class="form-group">
          <label>粉水比</label>
          <input v-model="form.ratio" placeholder="1:15" />
        </div>
        <div class="form-group">
          <label>水温 (°C)</label>
          <input type="number" v-model.number="form.temperature" placeholder="92" />
        </div>
        <div class="form-group">
          <label>萃取时间</label>
          <input v-model="form.time" placeholder="2:30" />
        </div>
        <div class="form-group">
          <label>备注</label>
          <input v-model="form.notes" placeholder="花香柑橘调" />
        </div>
      </div>
      <button class="btn btn-primary" @click="submitExtraction" :disabled="!form.beanId || !form.method">确认日志</button>
    </div>

    <div class="record-list">
      <div v-for="ext in sortedExtractions" :key="ext.id" class="record-item">
        <div class="record-info">
          <div class="record-title">
            <span class="bean-link">{{ getBeanName(ext.beanId) }}</span>
            <span class="tag method-tag">{{ ext.method }}</span>
            <span v-if="getRoastInfo(ext.roastId)" class="tag level-tag">
              🔥 {{ getRoastInfo(ext.roastId).date }} · {{ getRoastInfo(ext.roastId).level }}
            </span>
          </div>
          <div class="record-meta">
            <span>萃取 {{ ext.date }}</span>
            <span v-if="ext.ratio">{{ ext.ratio }}</span>
            <span v-if="ext.temperature">{{ ext.temperature }}°C</span>
            <span v-if="ext.time">{{ ext.time }}</span>
          </div>
          <div v-if="ext.notes" class="record-notes">{{ ext.notes }}</div>
        </div>
        <button class="btn btn-danger btn-sm" @click="handleDelete(ext.id)">删除</button>
      </div>
      <div v-if="store.extractions.length === 0" class="empty-state">
        暂无萃取日志，先登记豆种和烘焙记录再添加
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useCoffeeStore } from '../stores/coffee.js'

const store = useCoffeeStore()
const showForm = ref(false)
const form = reactive({
  beanId: '', roastId: '', date: new Date().toISOString().slice(0, 10),
  method: '', ratio: '', temperature: null, time: '', notes: '',
})

const beanRoasts = computed(() => {
  if (!form.beanId) return []
  return store.roasts.filter(r => r.beanId === Number(form.beanId))
})

const sortedExtractions = computed(() =>
  [...store.extractions].sort((a, b) => (a.date > b.date ? -1 : 1))
)

function getBeanName(beanId) {
  const bean = store.beans.find(b => b.id === beanId)
  return bean ? bean.name : '未知豆种'
}

function getRoastInfo(roastId) {
  if (!roastId) return null
  return store.roasts.find(r => r.id === roastId)
}

function onBeanChange() {
  form.roastId = ''
}

function resetForm() {
  form.beanId = ''
  form.roastId = ''
  form.date = new Date().toISOString().slice(0, 10)
  form.method = ''
  form.ratio = ''
  form.temperature = null
  form.time = ''
  form.notes = ''
}

async function submitExtraction() {
  if (!form.beanId || !form.method) return
  await store.addExtraction({
    ...form,
    beanId: Number(form.beanId),
    roastId: form.roastId ? Number(form.roastId) : null,
  })
  resetForm()
  showForm.value = false
}

async function handleDelete(id) {
  await store.deleteExtraction(id)
}
</script>
