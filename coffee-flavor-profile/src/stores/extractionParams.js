import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '../db.js'
import {
  computeRecommendation,
  computeScoreBasedAdjustment,
  batchRunRecommendations as batchRunAlgo,
  BEAN_VARIETIES,
  ROAST_LEVELS,
  getBeanType,
  getBeanProcess,
  getBeanOrigin,
} from '../utils/recommendationAlgo.js'
import { getRecommendationService } from '../utils/recommendationService.js'

export const useExtractionParamsStore = defineStore('extractionParams', () => {
  const paramHistory = ref([])
  const feedbacks = ref([])
  const currentRecommendation = ref(null)
  const isComputing = ref(false)
  const lastBatchTest = ref(null)
  const resultCache = ref(new Map())
  const lastComputedTime = ref(0)

  const lastStressTest = ref(null)
  const lastFullValidation = ref(null)
  const lastWeightIteration = ref(null)
  const currentWeights = ref({ typeW: 0.25, varietyW: 0.35, roastW: 0.30, processW: 0.10 })
  const weightHistory = ref([])
  const scoreAdjustments = ref({})
  const scoreAdjustmentCache = ref(new Map())
  const selectedBeanVarietyForRefresh = ref('')
  const selectedRoastLevelForRefresh = ref('')

  const svc = getRecommendationService()

  const totalCombinationsTested = computed(() => {
    const combos = new Set()
    paramHistory.value.forEach(r => combos.add(`${r.beanVariety}|${r.roastLevel}`))
    return combos.size
  })

  const totalRecords = computed(() => paramHistory.value.length)

  const avgOverallScore = computed(() => {
    if (paramHistory.value.length === 0) return 0
    const sum = paramHistory.value.reduce((s, r) => s + r.overallScore, 0)
    return +(sum / paramHistory.value.length).toFixed(2)
  })

  const avgSatisfaction = computed(() => {
    if (feedbacks.value.length === 0) return 0
    const sum = feedbacks.value.reduce((s, f) => s + (f.satisfaction || 0), 0)
    return +(sum / feedbacks.value.length).toFixed(2)
  })

  const uniqueBeanVarieties = computed(() => {
    const fromHistory = new Set(paramHistory.value.map(r => r.beanVariety))
    return Array.from(new Set([...fromHistory, ...BEAN_VARIETIES.map(b => b.name)]))
  })

  const statsByRoastLevel = computed(() => {
    const grouped = {}
    ROAST_LEVELS.forEach(l => { grouped[l] = { count: 0, avgScore: 0, avgRatio: 0, avgTemp: 0, avgTime: 0 } })
    paramHistory.value.forEach(r => {
      const g = grouped[r.roastLevel]
      if (g) {
        g.count++
        g.avgScore += r.overallScore
        g.avgRatio += r.ratio
        g.avgTemp += r.temperature
        g.avgTime += r.brewTime
      }
    })
    ROAST_LEVELS.forEach(l => {
      const g = grouped[l]
      if (g.count > 0) {
        g.avgScore = +(g.avgScore / g.count).toFixed(2)
        g.avgRatio = +(g.avgRatio / g.count).toFixed(1)
        g.avgTemp = Math.round(g.avgTemp / g.count)
        g.avgTime = +(g.avgTime / g.count).toFixed(1)
      }
    })
    return grouped
  })

  const satisfactionTrend = computed(() => {
    if (feedbacks.value.length === 0) return []
    const sorted = [...feedbacks.value].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    const trend = []
    let cumSum = 0
    sorted.forEach((f, idx) => {
      cumSum += f.satisfaction
      trend.push({
        date: new Date(f.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        satisfaction: f.satisfaction,
        rollingAvg: +(cumSum / (idx + 1)).toFixed(2),
      })
    })
    return trend
  })

  function _syncService() {
    svc.updateRecords(paramHistory.value)
    svc.updateFeedbacks(feedbacks.value)
    if (!svc._initialized && paramHistory.value.length > 0) {
      svc.init(paramHistory.value, feedbacks.value, currentWeights.value)
    }
  }

  function _invalidateScoreAdjustment(beanVariety, roastLevel) {
    const key = `${beanVariety}|${roastLevel}`
    scoreAdjustmentCache.value.delete(key)
    delete scoreAdjustments.value[key]
  }

  function getScoreAdjustment(beanVariety, roastLevel) {
    const key = `${beanVariety}|${roastLevel}`
    if (scoreAdjustmentCache.value.has(key)) {
      return scoreAdjustmentCache.value.get(key)
    }
    const adjustment = computeScoreBasedAdjustment(
      paramHistory.value, beanVariety, roastLevel
    )
    scoreAdjustmentCache.value.set(key, adjustment)
    scoreAdjustments.value[key] = adjustment
    return adjustment
  }

  function refreshAllScoreAdjustments() {
    scoreAdjustmentCache.value.clear()
    scoreAdjustments.value = {}
    const combos = new Set()
    paramHistory.value.forEach(r => combos.add(`${r.beanVariety}|${r.roastLevel}`))
    combos.forEach(key => {
      const [bv, rl] = key.split('|')
      const adj = computeScoreBasedAdjustment(paramHistory.value, bv, rl)
      scoreAdjustmentCache.value.set(key, adj)
      scoreAdjustments.value[key] = adj
    })
    return scoreAdjustments.value
  }

  async function loadAll() {
    paramHistory.value = await db.extractionParams.toArray()
    feedbacks.value = await db.recommendationFeedbacks.toArray()
    _syncService()
  }

  function clearCache() {
    resultCache.value.clear()
  }

  async function recommend(beanVariety, roastLevel, forceRefresh = false) {
    selectedBeanVarietyForRefresh.value = beanVariety
    selectedRoastLevelForRefresh.value = roastLevel

    const cacheKey = `${beanVariety}|${roastLevel}`
    const now = Date.now()
    const CACHE_TTL = 5 * 60 * 1000

    if (!forceRefresh && resultCache.value.has(cacheKey)) {
      const cached = resultCache.value.get(cacheKey)
      if (now - cached.time < CACHE_TTL) {
        currentRecommendation.value = cached.data
        return cached.data
      }
    }

    isComputing.value = true
    try {
      await new Promise(r => setTimeout(r, 10))
      const result = computeRecommendation(paramHistory.value, beanVariety, roastLevel, 20, currentWeights.value)
      lastComputedTime.value = Date.now() - now
      currentRecommendation.value = result
      resultCache.value.set(cacheKey, { data: result, time: now })
      return result
    } finally {
      isComputing.value = false
    }
  }

  async function apiRecommend(beanVariety, roastLevel) {
    _syncService()
    return svc.recommend(beanVariety, roastLevel)
  }

  async function addParamRecord(record) {
    const nowStr = new Date().toISOString()
    const data = {
      beanType: record.beanType || getBeanType(record.beanVariety),
      beanVariety: record.beanVariety,
      origin: record.origin || getBeanOrigin(record.beanVariety),
      process: record.process || getBeanProcess(record.beanVariety),
      roastLevel: record.roastLevel,
      ratio: record.ratio,
      temperature: record.temperature,
      brewTime: record.brewTime,
      overallScore: record.overallScore,
      acidityScore: record.acidityScore || 5,
      sweetnessScore: record.sweetnessScore || 5,
      bodyScore: record.bodyScore || 5,
      aftertasteScore: record.aftertasteScore || 5,
      balanceScore: record.balanceScore || 5,
      sampleCount: record.sampleCount || 1,
      createdAt: nowStr,
      updatedAt: nowStr,
    }
    const id = await db.extractionParams.add(data)
    data.id = id
    paramHistory.value.push(data)
    clearCache()
    _syncService()
    return id
  }

  async function submitFeedback(feedback) {
    const nowStr = new Date().toISOString()
    const data = {
      paramRecordId: feedback.paramRecordId || null,
      beanVariety: feedback.beanVariety,
      roastLevel: feedback.roastLevel,
      recommendedRatio: feedback.recommendedRatio,
      recommendedTempMin: feedback.recommendedTempMin,
      recommendedTempMax: feedback.recommendedTempMax,
      recommendedTimeMin: feedback.recommendedTimeMin,
      recommendedTimeMax: feedback.recommendedTimeMax,
      actualUsed: feedback.actualUsed ?? true,
      satisfaction: feedback.satisfaction,
      feedback: feedback.feedback || '',
      createdAt: nowStr,
    }
    const id = await db.recommendationFeedbacks.add(data)
    data.id = id
    feedbacks.value.push(data)

    if (feedback.actualUsed && feedback.satisfaction >= 3.5) {
      await addParamRecord({
        beanVariety: feedback.beanVariety,
        roastLevel: feedback.roastLevel,
        ratio: feedback.recommendedRatio,
        temperature: Math.round((feedback.recommendedTempMin + feedback.recommendedTempMax) / 2),
        brewTime: +((feedback.recommendedTimeMin + feedback.recommendedTimeMax) / 2).toFixed(1),
        overallScore: feedback.satisfaction,
        acidityScore: feedback.acidity || 6,
        sweetnessScore: feedback.sweetness || 6,
        bodyScore: feedback.body || 6,
        aftertasteScore: feedback.aftertaste || 6,
        balanceScore: feedback.balance || 6,
        sampleCount: 1,
      })
    }

    _invalidateScoreAdjustment(feedback.beanVariety, feedback.roastLevel)
    _syncService()

    if (currentRecommendation.value &&
        selectedBeanVarietyForRefresh.value === feedback.beanVariety &&
        selectedRoastLevelForRefresh.value === feedback.roastLevel) {
      await recommend(feedback.beanVariety, feedback.roastLevel, true)
    }

    return id
  }

  async function batchTestCombinations() {
    isComputing.value = true
    try {
      const result = batchRunAlgo(paramHistory.value)
      lastBatchTest.value = result
      return result
    } finally {
      isComputing.value = false
    }
  }

  async function runStressTest(concurrency = 1000) {
    isComputing.value = true
    try {
      _syncService()
      const result = await svc.stressTest(concurrency)
      lastStressTest.value = result
      return result
    } finally {
      isComputing.value = false
    }
  }

  async function runFullValidation() {
    isComputing.value = true
    try {
      _syncService()
      await new Promise(r => setTimeout(r, 10))
      const result = svc.fullBatchValidation()
      lastFullValidation.value = result
      return result
    } finally {
      isComputing.value = false
    }
  }

  function iterateWeights() {
    _syncService()
    const iteration = svc.iterateWeights()
    if (iteration) {
      currentWeights.value = { ...iteration.newWeights }
      lastWeightIteration.value = iteration
      weightHistory.value = svc.weightHistory
      clearCache()
    }
    return iteration
  }

  function getScatterChartData() {
    return paramHistory.value.map(r => ({
      name: `${r.beanVariety} - ${r.roastLevel}`,
      ratio: r.ratio,
      temperature: r.temperature,
      brewTime: r.brewTime,
      score: r.overallScore,
      roastLevel: r.roastLevel,
      value: [r.ratio, r.temperature, r.brewTime, r.overallScore],
    }))
  }

  function getHeatmapData() {
    const xData = ROAST_LEVELS
    const yData = ['粉水比(1:X)', '水温(℃)', '萃取时间(分)']
    const data = []
    ROAST_LEVELS.forEach((level, xi) => {
      const group = paramHistory.value.filter(r => r.roastLevel === level)
      if (group.length === 0) {
        data.push([xi, 0, 15], [xi, 1, 92], [xi, 2, 3])
      } else {
        const avgR = group.reduce((s, r) => s + r.ratio, 0) / group.length
        const avgT = group.reduce((s, r) => s + r.temperature, 0) / group.length
        const avgTm = group.reduce((s, r) => s + r.brewTime, 0) / group.length
        data.push([xi, 0, +avgR.toFixed(1)])
        data.push([xi, 1, Math.round(avgT)])
        data.push([xi, 2, +avgTm.toFixed(1)])
      }
    })
    return { xData, yData, data }
  }

  return {
    paramHistory,
    feedbacks,
    currentRecommendation,
    isComputing,
    lastBatchTest,
    lastComputedTime,
    lastStressTest,
    lastFullValidation,
    lastWeightIteration,
    currentWeights,
    weightHistory,
    scoreAdjustments,
    totalCombinationsTested,
    totalRecords,
    avgOverallScore,
    avgSatisfaction,
    uniqueBeanVarieties,
    statsByRoastLevel,
    satisfactionTrend,
    loadAll,
    clearCache,
    recommend,
    apiRecommend,
    addParamRecord,
    submitFeedback,
    batchTestCombinations,
    runStressTest,
    runFullValidation,
    iterateWeights,
    getScoreAdjustment,
    refreshAllScoreAdjustments,
    getScatterChartData,
    getHeatmapData,
  }
})
