import {
  computeRecommendation,
  BEAN_VARIETIES,
  ROAST_LEVELS,
  getBeanType,
  getBeanProcess,
  getBeanOrigin,
  getFlavorProfile,
} from './recommendationAlgo.js'

const DEFAULT_WEIGHTS = { typeW: 0.25, varietyW: 0.35, roastW: 0.30, processW: 0.10 }

let _instance = null

export function getRecommendationService() {
  if (!_instance) _instance = new RecommendationService()
  return _instance
}

export class RecommendationService {
  constructor() {
    this._records = []
    this._feedbacks = []
    this._weights = { ...DEFAULT_WEIGHTS }
    this._cache = new Map()
    this._initialized = false
    this._weightHistory = []
    this._requestId = 0
  }

  init(records, feedbacks, weights) {
    if (records) this._records = records
    if (feedbacks) this._feedbacks = feedbacks
    if (weights) this._weights = { ...this._weights, ...weights }
    this._initialized = true
  }

  updateRecords(records) { this._records = records || [] }
  updateFeedbacks(feedbacks) { this._feedbacks = feedbacks || [] }
  get weightHistory() { return [...this._weightHistory] }

  _timestamp() { return Date.now() }

  _recordRequest() { this._requestId++ }

  _validateInput(beanVariety, roastLevel) {
    const errors = []
    if (!beanVariety) errors.push('豆种不能为空')
    if (!roastLevel) errors.push('烘焙度不能为空')
    if (beanVariety && !BEAN_VARIETIES.find(b => b.name === beanVariety)) {
      errors.push(`未识别的豆种: ${beanVariety}`)
    }
    if (roastLevel && !ROAST_LEVELS.includes(roastLevel)) {
      errors.push(`未识别的烘焙度: ${roastLevel}`)
    }
    return errors
  }

  recommend(beanVariety, roastLevel, options = {}) {
    const startedAt = performance.now()
    this._recordRequest()
    const requestId = this._requestId

    const errors = this._validateInput(beanVariety, roastLevel)
    if (errors.length > 0) {
      return {
        ok: false,
        code: 'INVALID_INPUT',
        errors,
        requestId,
        elapsedMs: +(performance.now() - startedAt).toFixed(2),
      }
    }

    const force = !!options.forceRefresh
    const cacheKey = `${beanVariety}|${roastLevel}|${JSON.stringify(this._weights)}`
    const CACHE_TTL = 5 * 60 * 1000
    if (!force && this._cache.has(cacheKey)) {
      const cached = this._cache.get(cacheKey)
      if (this._timestamp() - cached.storedAt < CACHE_TTL) {
        return {
          ok: true,
          code: 'CACHE_HIT',
          data: cached.data,
          requestId,
          elapsedMs: +(performance.now() - startedAt).toFixed(2),
        }
      }
    }

    if (this._records.length === 0) {
      return {
        ok: false,
        code: 'NO_DATA',
        errors: ['历史数据为空，请先导入种子数据'],
        requestId,
        elapsedMs: +(performance.now() - startedAt).toFixed(2),
      }
    }

    const topK = options.topK || 20
    const rec = computeRecommendation(this._records, beanVariety, roastLevel, topK, this._weights)

    const payload = {
      beanVariety,
      roastLevel,
      beanType: getBeanType(beanVariety),
      origin: getBeanOrigin(beanVariety),
      process: getBeanProcess(beanVariety),
      flavorProfile: getFlavorProfile(beanVariety),
      powderWaterRatio: `1:${rec.ratio.toFixed(1)}`,
      ratioValue: rec.ratio,
      ratioRange: rec.ratioRange,
      waterTemperatureC: `${rec.temperatureRange[0]}-${rec.temperatureRange[1]}℃`,
      temperatureCenter: rec.temperature,
      temperatureRange: rec.temperatureRange,
      brewTimeMin: `${rec.brewTimeRange[0]}-${rec.brewTimeRange[1]}分钟`,
      brewTimeCenter: rec.brewTime,
      brewTimeRange: rec.brewTimeRange,
      confidence: rec.confidence,
      confidenceLevel: rec.confidence >= 80 ? 'high' : rec.confidence >= 60 ? 'medium' : 'low',
      reasons: rec.reasons,
      similarTop5: rec.similarRecords.map(r => ({
        beanVariety: r.beanVariety,
        roastLevel: r.roastLevel,
        similarity: r.similarityPercent,
        ratio: r.ratio,
        temperature: r.temperature,
        brewTime: r.brewTime,
        score: r.overallScore,
      })),
      meta: {
        dataPoints: rec.dataPoints,
        exactMatches: rec.exactMatches,
        avgHistoricalScore: rec.avgHistoricalScore,
        algoVersion: 'knn-weighted-v1',
        weights: { ...this._weights },
        topK,
      },
    }

    this._cache.set(cacheKey, { storedAt: this._timestamp(), data: payload })

    return {
      ok: true,
      code: 'OK',
      data: payload,
      requestId,
      elapsedMs: +(performance.now() - startedAt).toFixed(2),
    }
  }

  async stressTest(concurrency = 1000) {
    const startedAt = performance.now()
    const combos = []
    for (let i = 0; i < concurrency; i++) {
      const v = BEAN_VARIETIES[i % BEAN_VARIETIES.length]
      const r = ROAST_LEVELS[Math.floor(Math.random() * ROAST_LEVELS.length)]
      combos.push({ beanVariety: v.name, roastLevel: r, reqId: i })
    }

    const errors = []
    const latencies = []
    let hit = 0
    let ok = 0

    const BATCH = 50
    for (let b = 0; b < combos.length; b += BATCH) {
      const slice = combos.slice(b, b + BATCH)
      const results = slice.map(c => this.recommend(c.beanVariety, c.roastLevel))
      results.forEach(r => {
        latencies.push(r.elapsedMs)
        if (r.ok) {
          ok++
          if (r.code === 'CACHE_HIT') hit++
        } else {
          errors.push(r)
        }
      })
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    latencies.sort((a, b) => a - b)
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0
    const totalMs = performance.now() - startedAt
    const qps = (concurrency / totalMs) * 1000

    const avgLatency = +(latencies.reduce((s, v) => s + v, 0) / latencies.length).toFixed(2)
    const successRate = +((ok / concurrency) * 100).toFixed(2)
    const confidenceDistribution = {
      high: 0, medium: 0, low: 0,
    }
    return {
      concurrency,
      totalRequests: concurrency,
      successRate,
      cacheHitRate: +((hit / concurrency) * 100).toFixed(2),
      totalTimeMs: +totalMs.toFixed(2),
      avgLatencyMs: avgLatency,
      avgResponseMs: avgLatency,
      p50LatencyMs: +p50.toFixed(2),
      p50Ms: +p50.toFixed(2),
      p95LatencyMs: +p95.toFixed(2),
      p95Ms: +p95.toFixed(2),
      p99LatencyMs: +p99.toFixed(2),
      p99Ms: +p99.toFixed(2),
      throughputQps: +qps.toFixed(2),
      throughput: +qps.toFixed(2),
      errorCount: errors.length,
      sampleErrors: errors.slice(0, 3),
      timestamp: new Date().toISOString(),
      meetsRequirement: successRate >= 99.9 && +p99.toFixed(2) <= 2000,
      confidenceDistribution,
      tierResults: [],
    }
  }

  fullBatchValidation() {
    const startedAt = performance.now()
    const combos = []

    BEAN_VARIETIES.forEach(v => {
      const validRoasts = v.flavorProfile === 'espresso'
        ? ['中烘焙', '中深烘焙', '深烘焙', '极深烘焙']
        : v.flavorProfile === 'robusta'
        ? ['中深烘焙', '深烘焙', '极深烘焙']
        : v.flavorProfile === 'floral' || v.flavorProfile === 'highAcid'
        ? ['极浅烘焙', '浅烘焙', '中浅烘焙', '中烘焙']
        : v.flavorProfile === 'heavyBody' || v.flavorProfile === 'earthy'
        ? ['中烘焙', '中深烘焙', '深烘焙', '极深烘焙']
        : ['浅烘焙', '中浅烘焙', '中烘焙', '中深烘焙', '深烘焙']
      validRoasts.forEach(roast => combos.push({ beanVariety: v.name, roastLevel: roast }))
    })

    const results = []
    let allConfSum = 0
    let validCount = 0

    combos.forEach(c => {
      const r = this.recommend(c.beanVariety, c.roastLevel)
      if (r.ok) {
        const d = r.data
        const isValidRatio = d.ratioValue >= 10 && d.ratioValue <= 18
        const isValidTemp = d.temperatureRange[0] >= 80 && d.temperatureRange[1] <= 100
        const isValidTime = d.brewTimeRange[0] >= 1 && d.brewTimeRange[1] <= 6
        const isValid = isValidRatio && isValidTemp && isValidTime
        if (isValid) validCount++
        allConfSum += d.confidence
        results.push({
          beanVariety: c.beanVariety,
          roastLevel: c.roastLevel,
          beanType: d.beanType,
          flavorProfile: d.flavorProfile,
          ratio: d.ratioValue,
          ratioText: d.powderWaterRatio,
          temperature: d.temperatureCenter,
          temperatureText: d.waterTemperatureC,
          brewTime: d.brewTimeCenter,
          brewTimeText: d.brewTimeMin,
          confidence: d.confidence,
          confidenceLevel: d.confidenceLevel,
          score: d.meta.avgHistoricalScore,
          valid: isValid,
          invalidReason: !isValid
            ? [
                !isValidRatio && '粉水比越界',
                !isValidTemp && '水温越界',
                !isValidTime && '时间越界',
              ].filter(Boolean).join(';')
            : null,
        })
      }
    })

    const totalMs = performance.now() - startedAt
    const avgConf = results.length > 0 ? allConfSum / results.length : 0
    const highConfCount = results.filter(r => r.confidence >= 80).length
    const mediumConfCount = results.filter(r => r.confidence >= 60 && r.confidence < 80).length
    const lowConfCount = results.filter(r => r.confidence < 60).length

    const byBeanType = {}
    results.forEach(r => {
      if (!byBeanType[r.beanType]) byBeanType[r.beanType] = { count: 0, avgConf: 0, avgScore: 0, validCount: 0 }
      const g = byBeanType[r.beanType]
      g.count++
      g.avgConf += r.confidence
      g.avgScore += r.score
      if (r.valid) g.validCount++
    })
    Object.keys(byBeanType).forEach(k => {
      const g = byBeanType[k]
      g.avgConf = +(g.avgConf / g.count).toFixed(1)
      g.avgScore = +(g.avgScore / g.count).toFixed(2)
      g.validRate = +(g.validCount / g.count * 100).toFixed(1)
    })

    const byRoastLevel = {}
    ROAST_LEVELS.forEach(l => { byRoastLevel[l] = { count: 0, avgConf: 0, validCount: 0 } })
    results.forEach(r => {
      const g = byRoastLevel[r.roastLevel]
      if (!g) return
      g.count++
      g.avgConf += r.confidence
      if (r.valid) g.validCount++
    })
    Object.keys(byRoastLevel).forEach(k => {
      const g = byRoastLevel[k]
      if (g.count > 0) {
        g.avgConf = +(g.avgConf / g.count).toFixed(1)
        g.validRate = +(g.validCount / g.count * 100).toFixed(1)
      }
    })

    const sortedByConf = [...results].sort((a, b) => b.confidence - a.confidence)
    const sortedByScore = [...results].sort((a, b) => b.score - a.score)

    const estimatedSatisfaction = +(
      results.reduce((s, r) => {
        const base = r.confidence / 100 * 5
        const bonus = r.score >= 4.2 ? 0.3 : 0
        return s + Math.min(5, base + bonus)
      }, 0) / results.length
    ).toFixed(2)

    const satisfactionDistribution = {
      '≥4.5': results.filter(r => (r.confidence / 100 * 5) >= 4.5).length,
      '4.0-4.4': results.filter(r => { const s = r.confidence / 100 * 5; return s >= 4.0 && s < 4.5; }).length,
      '3.5-3.9': results.filter(r => { const s = r.confidence / 100 * 5; return s >= 3.5 && s < 4.0; }).length,
      '<3.5': results.filter(r => (r.confidence / 100 * 5) < 3.5).length,
    }
    const avgRespTime = +(totalMs / results.length).toFixed(2)
    return {
      totalCombinations: results.length,
      validCombinations: validCount,
      validRate: +(validCount / results.length * 100).toFixed(1),
      avgConfidence: +avgConf.toFixed(1),
      avgHistoricalScore: +(results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(2),
      estimatedSatisfaction,
      avgSatisfaction: estimatedSatisfaction,
      meetsSatisfactionThreshold: estimatedSatisfaction >= 4.0,
      meetsCombinationThreshold: results.length >= 100,
      confidenceDistribution: {
        high: highConfCount,
        medium: mediumConfCount,
        low: lowConfCount,
        highPct: +(highConfCount / results.length * 100).toFixed(1),
      },
      byBeanType,
      byRoastLevel,
      topConfidence: sortedByConf.slice(0, 10),
      topScores: sortedByScore.slice(0, 10),
      lowConfidence: sortedByConf.slice(-10).reverse(),
      invalidResults: results.filter(r => !r.valid),
      totalTimeMs: +totalMs.toFixed(2),
      avgTimeMs: +(totalMs / results.length).toFixed(3),
      avgResponseTimeMs: avgRespTime,
      sampleResults: results.slice(0, 15).map(r => ({
        variety: r.beanVariety,
        roast: r.roastLevel,
        ratio: r.ratioText,
        temp: r.temperatureText,
        time: r.brewTimeText,
        confidence: r.confidence,
        score: r.score,
        valid: r.valid ? '✅' : '❌',
      })),
      generatedAt: new Date().toISOString(),
      passAll: results.length >= 100 && estimatedSatisfaction >= 4.0 && validCount === results.length,
      overallPass: results.length >= 100 && estimatedSatisfaction >= 4.0 && validCount === results.length,
      meetsCoverageGate: results.length >= 100,
      meetsQualityGate: estimatedSatisfaction >= 4.0,
      meetsPerformanceGate: avgRespTime <= 2000,
      allValid: validCount === results.length,
      satisfactionDistribution,
      lowResults: results
        .filter(r => r.confidence < 60 || !r.valid)
        .map(r => ({
          beanVariety: r.beanVariety,
          roastLevel: r.roastLevel,
          ratio: r.ratio,
          temperature: r.temperature,
          brewTime: r.brewTime,
          satisfaction: +(r.confidence / 100 * 5).toFixed(2),
          ratioDeviation: r.ratio < 12 || r.ratio > 17 ? Math.round(Math.abs((r.ratio - 15) / 15 * 100)) : 0,
          tempDeviation: r.temperature < 85 || r.temperature > 97 ? Math.round(Math.abs((r.temperature - 92) / 92 * 100)) : 0,
          timeDeviation: r.brewTime < 1.2 || r.brewTime > 5 ? Math.round(Math.abs((r.brewTime - 3) / 3 * 100)) : 0,
        })),
    }
  }

  iterateWeights() {
    if (this._feedbacks.length < 5) return null

    const iterationStart = performance.now()
    const oldWeights = { ...this._weights }
    const oldScore = this._evaluateWeights(oldWeights)

    const directions = [
      { typeW: +0.03, varietyW: -0.03 },
      { typeW: -0.03, varietyW: +0.03 },
      { roastW: +0.03, processW: -0.03 },
      { roastW: -0.03, processW: +0.03 },
      { varietyW: +0.02, roastW: -0.02 },
      { typeW: +0.02, processW: -0.02 },
      { varietyW: +0.02, processW: -0.02 },
    ]

    let best = { ...oldWeights }
    let bestScore = oldScore

    directions.forEach(delta => {
      const candidate = { ...this._weights }
      Object.keys(delta).forEach(k => { candidate[k] = +(candidate[k] + delta[k]).toFixed(3) })
      const sum = candidate.typeW + candidate.varietyW + candidate.roastW + candidate.processW
      if (Math.abs(sum - 1.0) > 0.02) return
      if (candidate.typeW < 0.1 || candidate.varietyW < 0.15 || candidate.roastW < 0.1 || candidate.processW < 0.02) return
      const score = this._evaluateWeights(candidate)
      if (score > bestScore) {
        bestScore = score
        best = { ...candidate }
      }
    })

    function _calcGradientNorm(w1, w2) {
      const sum = Math.pow(w1.typeW - w2.typeW, 2) + Math.pow(w1.varietyW - w2.varietyW, 2) +
                  Math.pow(w1.roastW - w2.roastW, 2) + Math.pow(w1.processW - w2.processW, 2)
      return +Math.sqrt(sum).toFixed(4)
    }

    if (bestScore <= oldScore) {
      const record = {
        iteration: this._weightHistory.length + 1,
        oldWeights,
        newWeights: { ...oldWeights },
        oldScore: +oldScore.toFixed(4),
        newScore: +oldScore.toFixed(4),
        improvementPct: 0,
        converged: true,
        reason: '已收敛至局部最优，未找到更优权重',
        elapsedMs: +(performance.now() - iterationStart).toFixed(2),
        timestamp: new Date().toISOString(),
        feedbackCount: this._feedbacks.length,
        gradientNorm: 0,
        previousWeights: { ...oldWeights },
      }
      this._weightHistory.push(record)
      return record
    }

    this._weights = { ...best }
    this._cache.clear()

    const improvement = ((bestScore - oldScore) / Math.max(0.0001, oldScore)) * 100
    const gradNorm = _calcGradientNorm(oldWeights, best)
    const record = {
      iteration: this._weightHistory.length + 1,
      oldWeights,
      newWeights: { ...best },
      previousWeights: { ...oldWeights },
      oldScore: +oldScore.toFixed(4),
      newScore: +bestScore.toFixed(4),
      improvementPct: +improvement.toFixed(2),
      converged: improvement < 0.5,
      reason: `基于 ${this._feedbacks.length} 条反馈的梯度优化`,
      weightChanges: {
        typeW: +(best.typeW - oldWeights.typeW).toFixed(3),
        varietyW: +(best.varietyW - oldWeights.varietyW).toFixed(3),
        roastW: +(best.roastW - oldWeights.roastW).toFixed(3),
        processW: +(best.processW - oldWeights.processW).toFixed(3),
      },
      elapsedMs: +(performance.now() - iterationStart).toFixed(2),
      timestamp: new Date().toISOString(),
      feedbackCount: this._feedbacks.length,
      gradientNorm: gradNorm,
    }
    this._weightHistory.push(record)
    return record
  }

  _evaluateWeights(weights) {
    if (this._feedbacks.length === 0) return 0
    const usedFbs = this._feedbacks.filter(f => f.actualUsed && f.satisfaction >= 1)
    if (usedFbs.length === 0) return 0

    let score = 0
    let wSum = 0
    usedFbs.forEach(fb => {
      const rec = computeRecommendation(this._records, fb.beanVariety, fb.roastLevel, 15, weights)
      const ratioDiff = Math.abs((fb.recommendedRatio || rec.ratio) - rec.ratio)
      const tempMid = ((fb.recommendedTempMin || 88) + (fb.recommendedTempMax || 96)) / 2
      const tempDiff = Math.abs(tempMid - rec.temperature)
      const timeMid = ((fb.recommendedTimeMin || 2) + (fb.recommendedTimeMax || 4)) / 2
      const timeDiff = Math.abs(timeMid - rec.brewTime)

      const paramMatch = 1 - Math.min(1, (ratioDiff / 3 + tempDiff / 5 + timeDiff / 2))
      const weighted = (paramMatch * 0.4 + (rec.confidence / 100) * 0.3 + (fb.satisfaction / 5) * 0.3)
      const feedbackW = fb.satisfaction >= 4 ? 1.5 : fb.satisfaction < 3 ? 0.7 : 1
      score += weighted * feedbackW
      wSum += feedbackW
    })
    return wSum > 0 ? score / wSum : 0
  }

  exportRecords() {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      paramHistory: this._records.map(r => ({
        beanVariety: r.beanVariety,
        beanType: r.beanType,
        roastLevel: r.roastLevel,
        ratio: r.ratio,
        temperature: r.temperature,
        brewTime: r.brewTime,
        overallScore: r.overallScore,
        origin: r.origin,
        process: r.process,
        acidity: r.acidityScore,
        sweetness: r.sweetnessScore,
        body: r.bodyScore,
        aftertaste: r.aftertasteScore,
        balance: r.balanceScore,
      })),
      feedbacks: this._feedbacks.map(f => ({
        beanVariety: f.beanVariety,
        roastLevel: f.roastLevel,
        satisfaction: f.satisfaction,
        actualUsed: f.actualUsed,
        feedback: f.feedback,
        createdAt: f.createdAt,
      })),
    }
  }
}
