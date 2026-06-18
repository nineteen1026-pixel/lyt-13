import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '../db.js'

export const useCoffeeStore = defineStore('coffee', () => {
  const beans = ref([])
  const roasts = ref([])
  const extractions = ref([])
  const ratings = ref([])
  const cuppingComparisons = ref([])
  const roastCurves = ref([])

  const beansWithDetails = computed(() => {
    return beans.value.map(bean => {
      const beanRoasts = roasts.value.filter(r => r.beanId === bean.id)
      const beanRatings = ratings.value.filter(r => r.beanId === bean.id)
      const beanExtractions = extractions.value.filter(e => e.beanId === bean.id)
      return {
        ...bean,
        roastCount: beanRoasts.length,
        extractionCount: beanExtractions.length,
        latestRating: beanRatings.length > 0
          ? beanRatings[beanRatings.length - 1]
          : null,
        avgRating: beanRatings.length > 0
          ? {
              acidity: +(beanRatings.reduce((s, r) => s + r.acidity, 0) / beanRatings.length).toFixed(1),
              sweetness: +(beanRatings.reduce((s, r) => s + r.sweetness, 0) / beanRatings.length).toFixed(1),
              body: +(beanRatings.reduce((s, r) => s + r.body, 0) / beanRatings.length).toFixed(1),
              aftertaste: +(beanRatings.reduce((s, r) => s + r.aftertaste, 0) / beanRatings.length).toFixed(1),
              balance: +(beanRatings.reduce((s, r) => s + r.balance, 0) / beanRatings.length).toFixed(1),
            }
          : null,
      }
    })
  })

  const roastCurvesWithDetails = computed(() => {
    return roastCurves.value.map(curve => {
      const bean = beans.value.find(b => b.id === curve.beanId)
      const curveRoasts = roasts.value.filter(r => r.curveId === curve.id)
      return {
        ...curve,
        beanName: bean ? bean.name : (curve.beanId ? '未知豆种' : '通用曲线'),
        roastCount: curveRoasts.length,
      }
    })
  })

  const cuppingComparisonsWithDetails = computed(() => {
    return cuppingComparisons.value.map(cmp => {
      const cmpBeans = beans.value.filter(b => cmp.beanIds?.includes(b.id))
      const cmpRoasts = roasts.value.filter(r => cmp.roastIds?.includes(r.id))
      const cmpExtractions = extractions.value.filter(e => cmp.extractionIds?.includes(e.id))
      const beanDetails = cmpBeans.map(bean => {
        const beanRoasts = cmpRoasts.filter(r => r.beanId === bean.id)
        const beanExtractions = cmpExtractions.filter(e => e.beanId === bean.id)
        const beanRatings = ratings.value.filter(r => r.beanId === bean.id)
        return {
          ...bean,
          roasts: beanRoasts,
          extractions: beanExtractions,
          avgRating: beanRatings.length > 0
            ? {
                acidity: +(beanRatings.reduce((s, r) => s + r.acidity, 0) / beanRatings.length).toFixed(1),
                sweetness: +(beanRatings.reduce((s, r) => s + r.sweetness, 0) / beanRatings.length).toFixed(1),
                body: +(beanRatings.reduce((s, r) => s + r.body, 0) / beanRatings.length).toFixed(1),
                aftertaste: +(beanRatings.reduce((s, r) => s + r.aftertaste, 0) / beanRatings.length).toFixed(1),
                balance: +(beanRatings.reduce((s, r) => s + r.balance, 0) / beanRatings.length).toFixed(1),
              }
            : null,
        }
      })
      return {
        ...cmp,
        beans: beanDetails,
        roasts: cmpRoasts,
        extractions: cmpExtractions,
      }
    })
  })

  async function loadAll() {
    beans.value = await db.beans.toArray()
    roasts.value = await db.roasts.toArray()
    extractions.value = await db.extractions.toArray()
    ratings.value = await db.ratings.toArray()
    cuppingComparisons.value = await db.cuppingComparisons.toArray()
    roastCurves.value = await db.roastCurves.toArray()
  }

  async function addBean(bean) {
    const data = { ...bean, createdAt: new Date().toISOString() }
    const id = await db.beans.add(data)
    data.id = id
    beans.value.push(data)
    return id
  }

  async function deleteBean(id) {
    await db.beans.delete(id)
    await db.roasts.where('beanId').equals(id).delete()
    await db.extractions.where('beanId').equals(id).delete()
    await db.ratings.where('beanId').equals(id).delete()
    beans.value = beans.value.filter(b => b.id !== id)
    roasts.value = roasts.value.filter(r => r.beanId !== id)
    extractions.value = extractions.value.filter(e => e.beanId !== id)
    ratings.value = ratings.value.filter(r => r.beanId !== id)
  }

  async function addRoast(roast) {
    const data = { ...roast, createdAt: new Date().toISOString() }
    const id = await db.roasts.add(data)
    data.id = id
    roasts.value.push(data)
    return id
  }

  async function deleteRoast(id) {
    await db.roasts.delete(id)
    const roast = roasts.value.find(r => r.id === id)
    if (roast) {
      await db.extractions.where('roastId').equals(id).delete()
      extractions.value = extractions.value.filter(e => e.roastId !== id)
    }
    roasts.value = roasts.value.filter(r => r.id !== id)
  }

  async function addExtraction(extraction) {
    const data = { ...extraction, createdAt: new Date().toISOString() }
    const id = await db.extractions.add(data)
    data.id = id
    extractions.value.push(data)
    return id
  }

  async function deleteExtraction(id) {
    await db.extractions.delete(id)
    extractions.value = extractions.value.filter(e => e.id !== id)
  }

  async function addRating(rating) {
    const data = { ...rating, createdAt: new Date().toISOString() }
    const id = await db.ratings.add(data)
    data.id = id
    ratings.value.push(data)
    return id
  }

  async function deleteRating(id) {
    await db.ratings.delete(id)
    ratings.value = ratings.value.filter(r => r.id !== id)
  }

  async function addCuppingComparison(cmp) {
    const now = new Date().toISOString()
    const data = {
      ...cmp,
      beanIds: cmp.beanIds || [],
      roastIds: cmp.roastIds || [],
      extractionIds: cmp.extractionIds || [],
      notes: cmp.notes || '',
      createdAt: now,
      updatedAt: now,
    }
    const id = await db.cuppingComparisons.add(data)
    data.id = id
    cuppingComparisons.value.push(data)
    return id
  }

  async function updateCuppingComparison(id, updates) {
    const data = { ...updates, updatedAt: new Date().toISOString() }
    await db.cuppingComparisons.update(id, data)
    const idx = cuppingComparisons.value.findIndex(c => c.id === id)
    if (idx >= 0) {
      cuppingComparisons.value[idx] = { ...cuppingComparisons.value[idx], ...data }
    }
  }

  async function deleteCuppingComparison(id) {
    await db.cuppingComparisons.delete(id)
    cuppingComparisons.value = cuppingComparisons.value.filter(c => c.id !== id)
  }

  async function addRoastCurve(curve) {
    const data = { ...curve, nodes: curve.nodes || [], createdAt: new Date().toISOString() }
    const id = await db.roastCurves.add(data)
    data.id = id
    roastCurves.value.push(data)
    return id
  }

  async function updateRoastCurve(id, updates) {
    const data = { ...updates }
    await db.roastCurves.update(id, data)
    const idx = roastCurves.value.findIndex(c => c.id === id)
    if (idx >= 0) {
      roastCurves.value[idx] = { ...roastCurves.value[idx], ...data }
    }
  }

  async function deleteRoastCurve(id) {
    await db.roastCurves.delete(id)
    roastCurves.value = roastCurves.value.filter(c => c.id !== id)
  }

  return {
    beans, roasts, extractions, ratings, cuppingComparisons, roastCurves,
    beansWithDetails, cuppingComparisonsWithDetails, roastCurvesWithDetails,
    loadAll,
    addBean, deleteBean,
    addRoast, deleteRoast,
    addExtraction, deleteExtraction,
    addRating, deleteRating,
    addCuppingComparison, updateCuppingComparison, deleteCuppingComparison,
    addRoastCurve, updateRoastCurve, deleteRoastCurve,
  }
})
