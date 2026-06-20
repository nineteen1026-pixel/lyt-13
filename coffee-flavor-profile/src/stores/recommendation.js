import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useCoffeeStore } from './coffee.js'
import { useInventoryStore } from './inventory.js'

const DIM_KEYS = ['acidity', 'sweetness', 'body', 'aftertaste', 'balance']

const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  PRESALE: 'presale',
  OUT_OF_STOCK: 'out_of_stock',
  OFF_SHELF: 'off_shelf',
}

const ROAST_LEVELS = ['极浅烘焙', '浅烘焙', '中浅烘焙', '中烘焙', '中深烘焙', '深烘焙', '极深烘焙']

const FLAVOR_ROAST_MAP = {
  '花香': { level: '浅烘焙', weight: 3 },
  '茉莉': { level: '极浅烘焙', weight: 3 },
  '玫瑰': { level: '浅烘焙', weight: 3 },
  '柑橘': { level: '浅烘焙', weight: 3 },
  '柠檬': { level: '极浅烘焙', weight: 2 },
  '莓果': { level: '浅烘焙', weight: 3 },
  '蓝莓': { level: '浅烘焙', weight: 3 },
  '草莓': { level: '浅烘焙', weight: 3 },
  '核果': { level: '中浅烘焙', weight: 3 },
  '桃子': { level: '浅烘焙', weight: 3 },
  '杏子': { level: '中浅烘焙', weight: 3 },
  '热带水果': { level: '浅烘焙', weight: 3 },
  '芒果': { level: '中浅烘焙', weight: 2 },
  '菠萝': { level: '浅烘焙', weight: 2 },
  '焦糖': { level: '中烘焙', weight: 3 },
  '红糖': { level: '中烘焙', weight: 3 },
  '蜂蜜': { level: '中浅烘焙', weight: 3 },
  '巧克力': { level: '中深烘焙', weight: 3 },
  '黑巧克力': { level: '深烘焙', weight: 3 },
  '坚果': { level: '中烘焙', weight: 3 },
  '杏仁': { level: '中烘焙', weight: 2 },
  '榛子': { level: '中深烘焙', weight: 2 },
  '香料': { level: '中深烘焙', weight: 2 },
  '肉桂': { level: '中深烘焙', weight: 2 },
  '丁香': { level: '深烘焙', weight: 2 },
  '草本': { level: '中烘焙', weight: 2 },
  '茶感': { level: '中浅烘焙', weight: 2 },
  '酒香': { level: '中烘焙', weight: 2 },
  '发酵': { level: '中浅烘焙', weight: 2 },
  '烟熏': { level: '深烘焙', weight: 3 },
  '木质': { level: '中深烘焙', weight: 2 },
  '泥土': { level: '深烘焙', weight: 2 },
}

const METHOD_PARAMS = {
  '手冲 V60': { ratio: '1:15', tempRange: [88, 94], timeRange: ['2:00', '3:00'] },
  '手冲 Kalita': { ratio: '1:16', tempRange: [88, 93], timeRange: ['2:30', '3:30'] },
  '手冲 蛋糕滤杯': { ratio: '1:15', tempRange: [88, 93], timeRange: ['2:30', '3:30'] },
  '爱乐压': { ratio: '1:14', tempRange: [85, 93], timeRange: ['1:30', '2:00'] },
  '法压壶': { ratio: '1:12', tempRange: [92, 96], timeRange: ['3:30', '5:00'] },
  '虹吸壶': { ratio: '1:14', tempRange: [90, 94], timeRange: ['1:00', '1:30'] },
  '摩卡壶': { ratio: '1:10', tempRange: [90, 95], timeRange: ['2:00', '3:00'] },
  '意式浓缩': { ratio: '1:2', tempRange: [90, 94], timeRange: ['0:25', '0:35'] },
  '冷萃': { ratio: '1:12', tempRange: [4, 10], timeRange: ['12:00', '18:00'] },
}

export const useRecommendationStore = defineStore('recommendation', () => {
  const coffeeStore = useCoffeeStore()
  const invStore = useInventoryStore()

  function getBeanInventory(beanId) {
    return invStore.inventoryList.find(i => i.beanId === beanId) || null
  }

  function getStockStatus(beanId) {
    const inv = getBeanInventory(beanId)
    if (!inv) return STOCK_STATUS.OUT_OF_STOCK
    if (inv.status === 'off_shelf') return STOCK_STATUS.OFF_SHELF
    const available = inv.stock - inv.reservedStock
    if (available > 0) return STOCK_STATUS.IN_STOCK
    if (inv.status === 'presale') return STOCK_STATUS.PRESALE
    return STOCK_STATUS.OUT_OF_STOCK
  }

  function getStockPriority(status) {
    switch (status) {
      case STOCK_STATUS.IN_STOCK: return 3
      case STOCK_STATUS.PRESALE: return 2
      case STOCK_STATUS.OUT_OF_STOCK: return 1
      case STOCK_STATUS.OFF_SHELF: return 0
      default: return 1
    }
  }

  function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0
    let dotProduct = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < vecA.length; i++) {
      const a = vecA[i] || 0
      const b = vecB[i] || 0
      dotProduct += a * b
      normA += a * a
      normB += b * b
    }
    if (normA === 0 || normB === 0) return 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  function jaccardSimilarity(setA, setB) {
    if (!setA || !setB || setA.length === 0 || setB.length === 0) return 0
    const a = new Set(setA)
    const b = new Set(setB)
    let intersection = 0
    a.forEach(item => { if (b.has(item)) intersection++ })
    const union = new Set([...a, ...b]).size
    return intersection / union
  }

  function getBeanVector(beanId) {
    const ratings = coffeeStore.ratings.filter(r => r.beanId === beanId)
    if (ratings.length === 0) return null
    return DIM_KEYS.map(key =>
      +(ratings.reduce((s, r) => s + (r[key] || 0), 0) / ratings.length).toFixed(2)
    )
  }

  function getBeanFlavorTags(beanId) {
    const bean = coffeeStore.beans.find(b => b.id === beanId)
    return bean ? (bean.flavorTags || []) : []
  }

  function calculateBeanSimilarity(beanAId, beanBId) {
    const vecA = getBeanVector(beanAId)
    const vecB = getBeanVector(beanBId)
    let flavorSim = 0
    let ratingSim = 0

    const tagsA = getBeanFlavorTags(beanAId)
    const tagsB = getBeanFlavorTags(beanBId)
    flavorSim = jaccardSimilarity(tagsA, tagsB)

    if (vecA && vecB) {
      ratingSim = cosineSimilarity(vecA, vecB)
    }

    const hasRatings = vecA && vecB
    const hasTags = tagsA.length > 0 && tagsB.length > 0

    if (hasRatings && hasTags) {
      return ratingSim * 0.6 + flavorSim * 0.4
    } else if (hasRatings) {
      return ratingSim
    } else if (hasTags) {
      return flavorSim
    }
    return 0
  }

  function getUserPreferenceVector() {
    const allRatings = coffeeStore.ratings
    if (allRatings.length === 0) return null

    const recentRatings = allRatings.slice(-20)
    return DIM_KEYS.map(key =>
      +(recentRatings.reduce((s, r) => s + (r[key] || 0), 0) / recentRatings.length).toFixed(2)
    )
  }

  function getUserPreferredFlavorTags() {
    const tagScores = new Map()

    coffeeStore.ratings.forEach(rating => {
      const tags = getBeanFlavorTags(rating.beanId)
      const overallScore = DIM_KEYS.reduce((s, k) => s + (rating[k] || 0), 0) / DIM_KEYS.length
      tags.forEach(tag => {
        const current = tagScores.get(tag) || 0
        tagScores.set(tag, current + overallScore)
      })
    })

    return Array.from(tagScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag)
  }

  function recommendBySimilarBean(beanId, topN = 5) {
    const targetBean = coffeeStore.beans.find(b => b.id === beanId)
    if (!targetBean) return []

    const results = []
    coffeeStore.beans.forEach(bean => {
      if (bean.id === beanId) return
      const similarity = calculateBeanSimilarity(beanId, bean.id)
      if (similarity > 0) {
        const stockStatus = getStockStatus(bean.id)
        const inventory = getBeanInventory(bean.id)
        const stockPriority = getStockPriority(stockStatus)
        results.push({
          bean,
          similarity: +similarity.toFixed(3),
          similarityPercent: Math.round(similarity * 100),
          stockStatus,
          stockPriority,
          inventory: inventory ? {
            stock: inventory.stock,
            reservedStock: inventory.reservedStock,
            availableStock: inventory.stock - inventory.reservedStock,
            price: inventory.price,
            presalePrice: inventory.presalePrice,
            deposit: inventory.deposit,
            status: inventory.status,
          } : null,
        })
      }
    })

    return results
      .sort((a, b) => {
        if (b.stockPriority !== a.stockPriority) {
          return b.stockPriority - a.stockPriority
        }
        return b.similarity - a.similarity
      })
      .slice(0, topN)
  }

  function getRatedBeanIds() {
    const ratedIds = new Set()
    coffeeStore.ratings.forEach(r => ratedIds.add(r.beanId))
    return ratedIds
  }

  function recommendByUserPreference(topN = 5, excludeRated = true) {
    const userVector = getUserPreferenceVector()
    const preferredTags = getUserPreferredFlavorTags()

    if (!userVector && preferredTags.length === 0) return []

    const results = []
    const ratedIds = excludeRated ? getRatedBeanIds() : new Set()

    coffeeStore.beans.forEach(bean => {
      if (excludeRated && ratedIds.has(bean.id)) return

      let score = 0
      let hasRatingScore = false
      let hasTagScore = false

      const beanVec = getBeanVector(bean.id)
      if (userVector && beanVec) {
        score += cosineSimilarity(userVector, beanVec) * 0.6
        hasRatingScore = true
      }

      const beanTags = getBeanFlavorTags(bean.id)
      if (preferredTags.length > 0 && beanTags.length > 0) {
        score += jaccardSimilarity(preferredTags, beanTags) * 0.4
        hasTagScore = true
      }

      if (hasRatingScore || hasTagScore) {
        const stockStatus = getStockStatus(bean.id)
        const inventory = getBeanInventory(bean.id)
        const stockPriority = getStockPriority(stockStatus)
        results.push({
          bean,
          similarity: +score.toFixed(3),
          similarityPercent: Math.round(score * 100),
          matchReasons: {
            ratingMatch: hasRatingScore,
            tagMatch: hasTagScore,
          },
          stockStatus,
          stockPriority,
          inventory: inventory ? {
            stock: inventory.stock,
            reservedStock: inventory.reservedStock,
            availableStock: inventory.stock - inventory.reservedStock,
            price: inventory.price,
            presalePrice: inventory.presalePrice,
            deposit: inventory.deposit,
            status: inventory.status,
          } : null,
        })
      }
    })

    return results
      .sort((a, b) => {
        if (b.stockPriority !== a.stockPriority) {
          return b.stockPriority - a.stockPriority
        }
        return b.similarity - a.similarity
      })
      .slice(0, topN)
  }

  function getBeanRecommendHighlights(beanId) {
    const roastRecs = recommendRoastLevel(beanId)
    const topRoast = roastRecs[0]
    const extractionRecs = recommendExtractionParams(beanId, topRoast?.level)
    const topExtraction = extractionRecs[0]

    return {
      roast: topRoast ? {
        level: topRoast.level,
        reason: topRoast.reason,
        confidence: topRoast.confidence,
      } : null,
      extraction: topExtraction ? {
        method: topExtraction.method,
        ratio: topExtraction.ratio,
        temperature: topExtraction.temperature,
        time: topExtraction.time,
        reason: topExtraction.reason,
        confidence: topExtraction.confidence,
      } : null,
    }
  }

  function recommendRoastLevel(beanId) {
    const tags = getBeanFlavorTags(beanId)
    const beanVec = getBeanVector(beanId)

    const levelScores = new Map(ROAST_LEVELS.map(l => [l, 0]))

    tags.forEach(tag => {
      const mapping = FLAVOR_ROAST_MAP[tag]
      if (mapping) {
        const current = levelScores.get(mapping.level) || 0
        levelScores.set(mapping.level, current + mapping.weight)
      }
    })

    if (beanVec) {
      const [acidity, sweetness, body] = beanVec
      if (acidity >= 7) {
        levelScores.set('极浅烘焙', (levelScores.get('极浅烘焙') || 0) + 2)
        levelScores.set('浅烘焙', (levelScores.get('浅烘焙') || 0) + 2)
      } else if (acidity >= 5) {
        levelScores.set('中浅烘焙', (levelScores.get('中浅烘焙') || 0) + 2)
      }

      if (body >= 8) {
        levelScores.set('深烘焙', (levelScores.get('深烘焙') || 0) + 3)
        levelScores.set('中深烘焙', (levelScores.get('中深烘焙') || 0) + 2)
      } else if (body >= 6) {
        levelScores.set('中烘焙', (levelScores.get('中烘焙') || 0) + 2)
      }

      if (sweetness >= 7) {
        levelScores.set('中浅烘焙', (levelScores.get('中浅烘焙') || 0) + 2)
        levelScores.set('中烘焙', (levelScores.get('中烘焙') || 0) + 2)
      }
    }

    const sorted = Array.from(levelScores.entries()).sort((a, b) => b[1] - a[1])
    const topLevels = sorted.filter(s => s[1] > 0).slice(0, 3)

    if (topLevels.length === 0) {
      return [
        { level: '中浅烘焙', confidence: 60, reason: '通用平衡型推荐' },
        { level: '中烘焙', confidence: 50, reason: '安全不出错的选择' },
      ]
    }

    const maxScore = topLevels[0][1]
    return topLevels.map(([level, score]) => ({
      level,
      confidence: Math.min(95, Math.round((score / maxScore) * 100)),
      reason: generateRoastReason(level, tags, beanVec),
    }))
  }

  function generateRoastReason(level, tags, beanVec) {
    const reasons = []
    const relevantTags = tags.filter(t => {
      const m = FLAVOR_ROAST_MAP[t]
      return m && m.level === level
    }).slice(0, 3)

    if (relevantTags.length > 0) {
      reasons.push(`突出 ${relevantTags.join('、')} 风味`)
    }

    if (beanVec) {
      const [acidity, sweetness, body] = beanVec
      if ((level === '极浅烘焙' || level === '浅烘焙') && acidity >= 7) {
        reasons.push('保留明亮酸质')
      }
      if ((level === '深烘焙' || level === '中深烘焙') && body >= 7) {
        reasons.push('增强醇厚口感')
      }
      if ((level === '中烘焙' || level === '中浅烘焙') && sweetness >= 7) {
        reasons.push('展现甜感层次')
      }
    }

    return reasons.length > 0 ? reasons.join('，') : '基于风味特征平衡推荐'
  }

  function recommendExtractionParams(beanId, roastLevel) {
    const tags = getBeanFlavorTags(beanId)
    const beanVec = getBeanVector(beanId)

    const methodScores = new Map()

    Object.keys(METHOD_PARAMS).forEach(method => {
      methodScores.set(method, 0)
    })

    tags.forEach(tag => {
      const lightTags = ['花香', '茉莉', '玫瑰', '柑橘', '柠檬', '莓果', '蓝莓']
      const mediumTags = ['核果', '桃子', '杏子', '焦糖', '红糖', '蜂蜜', '茶感']
      const darkTags = ['巧克力', '黑巧克力', '坚果', '榛子', '烟熏', '泥土']

      if (lightTags.includes(tag)) {
        methodScores.set('手冲 V60', (methodScores.get('手冲 V60') || 0) + 2)
        methodScores.set('手冲 Kalita', (methodScores.get('手冲 Kalita') || 0) + 1)
      }
      if (mediumTags.includes(tag)) {
        methodScores.set('手冲 Kalita', (methodScores.get('手冲 Kalita') || 0) + 2)
        methodScores.set('爱乐压', (methodScores.get('爱乐压') || 0) + 2)
      }
      if (darkTags.includes(tag)) {
        methodScores.set('法压壶', (methodScores.get('法压壶') || 0) + 2)
        methodScores.set('意式浓缩', (methodScores.get('意式浓缩') || 0) + 2)
        methodScores.set('摩卡壶', (methodScores.get('摩卡壶') || 0) + 1)
      }
    })

    if (beanVec) {
      const [acidity, sweetness, body] = beanVec
      if (acidity >= 7) {
        methodScores.set('手冲 V60', (methodScores.get('手冲 V60') || 0) + 3)
        methodScores.set('冷萃', (methodScores.get('冷萃') || 0) + 1)
      }
      if (body >= 8) {
        methodScores.set('法压壶', (methodScores.get('法压壶') || 0) + 3)
        methodScores.set('意式浓缩', (methodScores.get('意式浓缩') || 0) + 3)
      }
      if (sweetness >= 7 && acidity >= 6) {
        methodScores.set('手冲 Kalita', (methodScores.get('手冲 Kalita') || 0) + 2)
      }
    }

    if (roastLevel) {
      if (roastLevel.includes('浅') || roastLevel.includes('极浅')) {
        methodScores.set('手冲 V60', (methodScores.get('手冲 V60') || 0) + 2)
      } else if (roastLevel.includes('深') || roastLevel.includes('极深')) {
        methodScores.set('法压壶', (methodScores.get('法压壶') || 0) + 2)
        methodScores.set('意式浓缩', (methodScores.get('意式浓缩') || 0) + 2)
      } else {
        methodScores.set('爱乐压', (methodScores.get('爱乐压') || 0) + 2)
      }
    }

    const sortedMethods = Array.from(methodScores.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(m => m[1] > 0)
      .slice(0, 3)

    if (sortedMethods.length === 0) {
      return [
        {
          method: '手冲 V60',
          ratio: '1:15',
          temperature: 92,
          time: '2:30',
          confidence: 70,
          reason: '通用手冲推荐方案',
        },
      ]
    }

    const maxScore = sortedMethods[0][1]
    return sortedMethods.map(([method, score]) => {
      const params = METHOD_PARAMS[method]
      const [minTemp, maxTemp] = params.tempRange
      const [minTime, maxTime] = params.timeRange

      let recTemp = Math.round((minTemp + maxTemp) / 2)
      let recTime = minTime

      if (beanVec) {
        const [acidity] = beanVec
        if (acidity >= 7) {
          recTemp = minTemp
          recTime = minTime
        } else if (beanVec[2] >= 7) {
          recTemp = maxTemp
          recTime = maxTime
        }
      }

      return {
        method,
        ratio: params.ratio,
        temperature: recTemp,
        time: recTime,
        confidence: Math.min(95, Math.round((score / maxScore) * 100)),
        reason: generateExtractionReason(method, tags, beanVec, roastLevel),
      }
    })
  }

  function generateExtractionReason(method, tags, beanVec, roastLevel) {
    const reasons = []
    if (method.includes('手冲')) {
      reasons.push('清晰展现风味层次')
    } else if (method === '法压壶') {
      reasons.push('保留醇厚油脂感')
    } else if (method === '爱乐压') {
      reasons.push('快速稳定，甜感突出')
    } else if (method === '意式浓缩') {
      reasons.push('浓郁强烈，口感饱满')
    } else if (method === '冷萃') {
      reasons.push('低酸顺滑，夏日推荐')
    }
    if (roastLevel) {
      reasons.push(`适配${roastLevel}`)
    }
    return reasons.join('，')
  }

  const hasUserPreferences = computed(() => {
    return coffeeStore.ratings.length > 0
  })

  const hasEnoughData = computed(() => {
    return coffeeStore.beans.length >= 2
  })

  return {
    cosineSimilarity,
    jaccardSimilarity,
    getBeanVector,
    getBeanFlavorTags,
    calculateBeanSimilarity,
    getUserPreferenceVector,
    getUserPreferredFlavorTags,
    getRatedBeanIds,
    recommendBySimilarBean,
    recommendByUserPreference,
    recommendRoastLevel,
    recommendExtractionParams,
    getBeanRecommendHighlights,
    getBeanInventory,
    getStockStatus,
    getStockPriority,
    STOCK_STATUS,
    hasUserPreferences,
    hasEnoughData,
  }
})
