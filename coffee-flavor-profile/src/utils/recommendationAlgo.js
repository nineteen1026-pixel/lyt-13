export const ROAST_LEVELS = ['极浅烘焙', '浅烘焙', '中浅烘焙', '中烘焙', '中深烘焙', '深烘焙', '极深烘焙']
export const ROAST_LEVEL_CODES = { '极浅烘焙': 0, '浅烘焙': 1, '中浅烘焙': 2, '中烘焙': 3, '中深烘焙': 4, '深烘焙': 5, '极深烘焙': 6 }
export const BEAN_TYPES = ['阿拉比卡', '罗布斯塔', '利比里亚', '混合豆']
export const PROCESSES = ['水洗', '日晒', '蜜处理', '湿刨法', '厌氧发酵']

export const BEAN_VARIETIES = [
  { name: '耶加雪菲·科契尔', type: '阿拉比卡', origin: '埃塞俄比亚·耶加雪菲', process: '水洗', flavorProfile: 'highAcid' },
  { name: '耶加雪菲·阿瑞恰', type: '阿拉比卡', origin: '埃塞俄比亚·耶加雪菲', process: '日晒', flavorProfile: 'fruity' },
  { name: '西达摩·古吉', type: '阿拉比卡', origin: '埃塞俄比亚·西达摩', process: '水洗', flavorProfile: 'highAcid' },
  { name: '西达摩·圣塔维尼', type: '阿拉比卡', origin: '埃塞俄比亚·西达摩', process: '日晒', flavorProfile: 'fruity' },
  { name: '瑰夏·翡翠庄园', type: '阿拉比卡', origin: '巴拿马·波奎特', process: '水洗', flavorProfile: 'floral' },
  { name: '瑰夏·哈特曼庄园', type: '阿拉比卡', origin: '巴拿马·沃肯', process: '日晒', flavorProfile: 'floral' },
  { name: '瑰夏·詹森庄园', type: '阿拉比卡', origin: '巴拿马·博克特', process: '蜜处理', flavorProfile: 'floral' },
  { name: '哥伦比亚·慧兰', type: '阿拉比卡', origin: '哥伦比亚·慧兰', process: '水洗', flavorProfile: 'balanced' },
  { name: '哥伦比亚·纳里尼奥', type: '阿拉比卡', origin: '哥伦比亚·纳里尼奥', process: '水洗', flavorProfile: 'balanced' },
  { name: '哥伦比亚·考卡', type: '阿拉比卡', origin: '哥伦比亚·考卡', process: '水洗', flavorProfile: 'caramel' },
  { name: '曼特宁·林东', type: '阿拉比卡', origin: '印度尼西亚·苏门答腊', process: '湿刨法', flavorProfile: 'heavyBody' },
  { name: '曼特宁·黄金', type: '阿拉比卡', origin: '印度尼西亚·苏门答腊', process: '湿刨法', flavorProfile: 'heavyBody' },
  { name: '曼特宁·塔瓦湖', type: '阿拉比卡', origin: '印度尼西亚·苏门答腊', process: '水洗', flavorProfile: 'earthy' },
  { name: '爪哇·艾健庄园', type: '阿拉比卡', origin: '印度尼西亚·爪哇', process: '水洗', flavorProfile: 'classic' },
  { name: '苏拉威西·托拿加', type: '阿拉比卡', origin: '印度尼西亚·苏拉威西', process: '湿刨法', flavorProfile: 'earthy' },
  { name: '肯尼亚·AA Nyeri', type: '阿拉比卡', origin: '肯尼亚·涅里', process: '水洗', flavorProfile: 'highAcid' },
  { name: '肯尼亚·SL28 Kirinyaga', type: '阿拉比卡', origin: '肯尼亚·基里尼亚加', process: '水洗', flavorProfile: 'highAcid' },
  { name: '坦桑尼亚·乞力马扎罗', type: '阿拉比卡', origin: '坦桑尼亚·乞力马扎罗', process: '水洗', flavorProfile: 'balanced' },
  { name: '卢旺达·穆莎莎', type: '阿拉比卡', origin: '卢旺达·南部省', process: '水洗', flavorProfile: 'fruity' },
  { name: '布隆迪·卡扬扎', type: '阿拉比卡', origin: '布隆迪·卡扬扎', process: '水洗', flavorProfile: 'balanced' },
  { name: '危地马拉·安提瓜', type: '阿拉比卡', origin: '危地马拉·安提瓜', process: '水洗', flavorProfile: 'chocolate' },
  { name: '危地马拉·薇薇特南果', type: '阿拉比卡', origin: '危地马拉·薇薇特南果', process: '水洗', flavorProfile: 'chocolate' },
  { name: '哥斯达黎加·拉斯拉哈斯', type: '阿拉比卡', origin: '哥斯达黎加·塔拉珠', process: '蜜处理', flavorProfile: 'caramel' },
  { name: '哥斯达黎加·火石', type: '阿拉比卡', origin: '哥斯达黎加·中央山谷', process: '厌氧发酵', flavorProfile: 'fruity' },
  { name: '萨尔瓦多·帕卡马拉', type: '阿拉比卡', origin: '萨尔瓦多·圣安娜', process: '水洗', flavorProfile: 'caramel' },
  { name: '洪都拉斯·科潘', type: '阿拉比卡', origin: '洪都拉斯·科潘', process: '水洗', flavorProfile: 'chocolate' },
  { name: '尼加拉瓜·稀爪哇', type: '阿拉比卡', origin: '尼加拉瓜·希诺特加', process: '水洗', flavorProfile: 'balanced' },
  { name: '墨西哥·恰帕斯', type: '阿拉比卡', origin: '墨西哥·恰帕斯', process: '水洗', flavorProfile: 'classic' },
  { name: '秘鲁·库斯科', type: '阿拉比卡', origin: '秘鲁·库斯科', process: '水洗', flavorProfile: 'caramel' },
  { name: '玻利维亚·卡拉纳维', type: '阿拉比卡', origin: '玻利维亚·拉巴斯', process: '水洗', flavorProfile: 'chocolate' },
  { name: '巴西·喜拉多', type: '阿拉比卡', origin: '巴西·喜拉多', process: '日晒', flavorProfile: 'caramel' },
  { name: '巴西·摩吉娜', type: '阿拉比卡', origin: '巴西·摩吉娜', process: '日晒', flavorProfile: 'chocolate' },
  { name: '巴西·圣多斯', type: '阿拉比卡', origin: '巴西·圣保罗', process: '日晒', flavorProfile: 'classic' },
  { name: '牙买加·蓝山', type: '阿拉比卡', origin: '牙买加·蓝山', process: '水洗', flavorProfile: 'balanced' },
  { name: '夏威夷·科纳', type: '阿拉比卡', origin: '美国·夏威夷科纳', process: '水洗', flavorProfile: 'balanced' },
  { name: '巴布亚新几内亚·Sigri', type: '阿拉比卡', origin: '巴布亚新几内亚·高地', process: '水洗', flavorProfile: 'fruity' },
  { name: '东帝汶·Maubisse', type: '阿拉比卡', origin: '东帝汶·毛毕斯', process: '水洗', flavorProfile: 'classic' },
  { name: '也门·摩卡玛塔里', type: '阿拉比卡', origin: '也门·萨那', process: '日晒', flavorProfile: 'fruity' },
  { name: '越南·罗布斯塔', type: '罗布斯塔', origin: '越南·中部高地', process: '水洗', flavorProfile: 'robusta' },
  { name: '印度·罗布斯塔', type: '罗布斯塔', origin: '印度·卡纳塔克', process: '水洗', flavorProfile: 'robusta' },
  { name: '印度·季风马拉巴尔', type: '阿拉比卡', origin: '印度·马拉巴尔海岸', process: '水洗', flavorProfile: 'earthy' },
  { name: '乌干达·罗布斯塔', type: '罗布斯塔', origin: '乌干达·埃尔贡山', process: '水洗', flavorProfile: 'robusta' },
  { name: '科纳·利比里亚', type: '利比里亚', origin: '美国·夏威夷', process: '水洗', flavorProfile: 'liberica' },
  { name: '马来西亚·利比里亚', type: '利比里亚', origin: '马来西亚·婆罗洲', process: '日晒', flavorProfile: 'liberica' },
  { name: '意式经典拼配', type: '混合豆', origin: '综合产区', process: '综合', flavorProfile: 'espresso' },
  { name: '意式特浓拼配', type: '混合豆', origin: '综合产区', process: '综合', flavorProfile: 'espresso' },
  { name: '早餐综合拼配', type: '混合豆', origin: '综合产区', process: '综合', flavorProfile: 'classic' },
  { name: '低因咖啡·瑞士水处理', type: '阿拉比卡', origin: '哥伦比亚', process: '水洗', flavorProfile: 'balanced' },
  { name: '卡蒂姆·云南', type: '阿拉比卡', origin: '中国·云南保山', process: '水洗', flavorProfile: 'chocolate' },
  { name: '铁皮卡·云南', type: '阿拉比卡', origin: '中国·云南普洱', process: '日晒', flavorProfile: 'caramel' },
]

const FLAVOR_PROFILE_PARAMS = {
  highAcid: { baseRatio: 16, baseTemp: 90, baseTime: 2.5, roastShift: { temp: -0.8, ratio: 0.4, time: -0.15 } },
  fruity: { baseRatio: 15.5, baseTemp: 91, baseTime: 2.5, roastShift: { temp: -0.7, ratio: 0.3, time: -0.1 } },
  floral: { baseRatio: 16.5, baseTemp: 89, baseTime: 2.3, roastShift: { temp: -0.9, ratio: 0.5, time: -0.2 } },
  balanced: { baseRatio: 15, baseTemp: 92, baseTime: 2.8, roastShift: { temp: -0.5, ratio: 0.2, time: 0 } },
  caramel: { baseRatio: 14.5, baseTemp: 93, baseTime: 3.0, roastShift: { temp: -0.4, ratio: 0.1, time: 0.05 } },
  chocolate: { baseRatio: 14, baseTemp: 94, baseTime: 3.2, roastShift: { temp: -0.3, ratio: 0, time: 0.1 } },
  heavyBody: { baseRatio: 13, baseTemp: 95, baseTime: 3.8, roastShift: { temp: -0.2, ratio: -0.2, time: 0.2 } },
  earthy: { baseRatio: 13.5, baseTemp: 94, baseTime: 3.5, roastShift: { temp: -0.25, ratio: -0.1, time: 0.15 } },
  classic: { baseRatio: 15, baseTemp: 92, baseTime: 3.0, roastShift: { temp: -0.4, ratio: 0.15, time: 0 } },
  robusta: { baseRatio: 12, baseTemp: 96, baseTime: 4.0, roastShift: { temp: -0.1, ratio: -0.4, time: 0.3 } },
  liberica: { baseRatio: 13.5, baseTemp: 94, baseTime: 3.5, roastShift: { temp: -0.3, ratio: -0.1, time: 0.15 } },
  espresso: { baseRatio: 2, baseTemp: 93, baseTime: 0.5, roastShift: { temp: -0.2, ratio: 0, time: 0.02 } },
}

export function getFlavorProfile(varietyName) {
  const v = BEAN_VARIETIES.find(b => b.name === varietyName)
  return v ? v.flavorProfile : 'balanced'
}

export function getBeanType(varietyName) {
  const v = BEAN_VARIETIES.find(b => b.name === varietyName)
  return v ? v.type : '阿拉比卡'
}

export function getBeanOrigin(varietyName) {
  const v = BEAN_VARIETIES.find(b => b.name === varietyName)
  return v ? v.origin : ''
}

export function getBeanProcess(varietyName) {
  const v = BEAN_VARIETIES.find(b => b.name === varietyName)
  return v ? v.process : '水洗'
}

function calcRoastDeviation(roastLevel) {
  const code = ROAST_LEVEL_CODES[roastLevel] ?? 3
  return (code - 3) / 3
}

function calcProcessFactor(process) {
  switch (process) {
    case '日晒': return { ratio: -0.5, temp: 0.8, time: 0.15 }
    case '蜜处理': return { ratio: -0.3, temp: 0.5, time: 0.1 }
    case '湿刨法': return { ratio: -1.0, temp: 1.0, time: 0.3 }
    case '厌氧发酵': return { ratio: -0.2, temp: 0.3, time: 0.2 }
    default: return { ratio: 0, temp: 0, time: 0 }
  }
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function randomNormal(mean, std, seed) {
  const x = Math.sin(seed * 9999) * 10000
  const r1 = (x - Math.floor(x)) || 0.5
  const r2 = (Math.sin(seed * 7777) * 10000 - Math.floor(Math.sin(seed * 7777) * 10000)) || 0.5
  const z = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2)
  return mean + z * std
}

export function generateIdealParams(varietyName, roastLevel, seedBase = 1) {
  const variety = BEAN_VARIETIES.find(b => b.name === varietyName)
  if (!variety) return { ratio: 15, temp: 92, time: 2.8 }

  const profile = FLAVOR_PROFILE_PARAMS[variety.flavorProfile] || FLAVOR_PROFILE_PARAMS.balanced
  const roastDev = calcRoastDeviation(roastLevel)
  const processFactor = calcProcessFactor(variety.process)

  const ratio = clamp(
    profile.baseRatio + roastDev * profile.roastShift.ratio + processFactor.ratio,
    variety.flavorProfile === 'espresso' ? 1.5 : 10,
    variety.flavorProfile === 'espresso' ? 4 : 18
  )
  const temp = clamp(
    profile.baseTemp + roastDev * profile.roastShift.temp + processFactor.temp,
    80, 100
  )
  const time = clamp(
    profile.baseTime + roastDev * profile.roastShift.time + processFactor.time,
    variety.flavorProfile === 'espresso' ? 0.25 : 1.5,
    variety.flavorProfile === 'espresso' ? 1.0 : 6.0
  )

  return { ratio, temp, time }
}

export function generateParamHistoryRecord(varietyName, roastLevel, recordSeed) {
  const variety = BEAN_VARIETIES.find(b => b.name === varietyName)
  if (!variety) return null

  const ideal = generateIdealParams(varietyName, roastLevel, recordSeed)
  const ratio = clamp(+randomNormal(ideal.ratio, 0.8, recordSeed + 1).toFixed(1), 10, 18)
  const temperature = Math.round(clamp(randomNormal(ideal.temp, 1.5, recordSeed + 2), 80, 100))
  const brewTime = clamp(+randomNormal(ideal.time, 0.3, recordSeed + 3).toFixed(1), 1, 6)

  const paramDeviance =
    Math.abs(ratio - ideal.ratio) / 2 +
    Math.abs(temperature - ideal.temp) / 3 +
    Math.abs(brewTime - ideal.time) / 1

  const baseScore = clamp(5 - paramDeviance * 0.7 + randomNormal(0, 0.3, recordSeed + 4), 1.5, 5)
  const overallScore = +baseScore.toFixed(1)
  const sampleCount = Math.floor(randomNormal(15, 6, recordSeed + 5)) + 3

  const acidityScore = Math.round(clamp(
    (variety.flavorProfile === 'highAcid' ? 7.5 : variety.flavorProfile === 'heavyBody' ? 4 : 6) +
    randomNormal(0, 1.2, recordSeed + 10), 1, 10
  ))
  const sweetnessScore = Math.round(clamp(
    (variety.flavorProfile === 'floral' || variety.flavorProfile === 'caramel' ? 7.5 : 6.5) +
    randomNormal(0, 1, recordSeed + 11), 1, 10
  ))
  const bodyScore = Math.round(clamp(
    (variety.flavorProfile === 'heavyBody' || variety.flavorProfile === 'robusta' ? 8.5 : 6) +
    randomNormal(0, 1.1, recordSeed + 12), 1, 10
  ))
  const aftertasteScore = Math.round(clamp(
    6.5 + randomNormal(0, 1.2, recordSeed + 13), 1, 10
  ))
  const balanceScore = Math.round(clamp(
    6.8 + randomNormal(0, 1, recordSeed + 14), 1, 10
  ))

  return {
    beanType: variety.type,
    beanVariety: variety.name,
    origin: variety.origin,
    process: variety.process,
    roastLevel,
    ratio,
    temperature,
    brewTime,
    overallScore,
    acidityScore,
    sweetnessScore,
    bodyScore,
    aftertasteScore,
    balanceScore,
    sampleCount,
  }
}

export function generateAllSeedRecords() {
  const records = []
  let seedCounter = 1

  BEAN_VARIETIES.forEach(variety => {
    const validRoasts = variety.flavorProfile === 'espresso'
      ? ['中烘焙', '中深烘焙', '深烘焙', '极深烘焙']
      : variety.flavorProfile === 'robusta'
      ? ['中深烘焙', '深烘焙', '极深烘焙']
      : variety.flavorProfile === 'floral' || variety.flavorProfile === 'highAcid'
      ? ['极浅烘焙', '浅烘焙', '中浅烘焙', '中烘焙']
      : variety.flavorProfile === 'heavyBody' || variety.flavorProfile === 'earthy'
      ? ['中烘焙', '中深烘焙', '深烘焙', '极深烘焙']
      : ['浅烘焙', '中浅烘焙', '中烘焙', '中深烘焙', '深烘焙']

    validRoasts.forEach(roastLevel => {
      const recordsPerCombo = 3
      for (let i = 0; i < recordsPerCombo; i++) {
        const rec = generateParamHistoryRecord(variety.name, roastLevel, seedCounter++)
        if (rec) records.push(rec)
      }
    })
  })

  return records
}

function calcBeanTypeMatch(typeA, typeB) {
  if (typeA === typeB) return 1
  const pair = [typeA, typeB].sort().join('-')
  const map = {
    '利比里亚-混合豆': 0.2,
    '利比里亚-罗布斯塔': 0.3,
    '利比里亚-阿拉比卡': 0.1,
    '混合豆-罗布斯塔': 0.5,
    '阿拉比卡-混合豆': 0.6,
    '阿拉比卡-罗布斯塔': 0.3,
  }
  return map[pair] || 0.1
}

function calcProcessMatch(procA, procB) {
  if (procA === procB) return 1
  if ((procA === '水洗' && procB === '湿刨法') || (procB === '水洗' && procA === '湿刨法')) return 0.6
  if ((procA === '日晒' && procB === '蜜处理') || (procB === '日晒' && procA === '蜜处理')) return 0.7
  if (procA === '综合' || procB === '综合') return 0.3
  return 0.4
}

function calcRoastMatch(levelA, levelB) {
  const a = ROAST_LEVEL_CODES[levelA] ?? 3
  const b = ROAST_LEVEL_CODES[levelB] ?? 3
  return 1 - Math.abs(a - b) / 6
}

export function calcSimilarity(record, target) {
  const targetType = target.beanType || getBeanType(target.beanVariety)
  const typeMatch = calcBeanTypeMatch(record.beanType, targetType)
  const varietyMatch = record.beanVariety === target.beanVariety ? 1 : 0.3
  const roastMatch = calcRoastMatch(record.roastLevel, target.roastLevel)
  const targetProcess = target.process || getBeanProcess(target.beanVariety)
  const processMatch = calcProcessMatch(record.process, targetProcess)

  return 0.25 * typeMatch + 0.35 * varietyMatch + 0.3 * roastMatch + 0.1 * processMatch
}

function weightedStats(values, weights) {
  if (values.length === 0) return { mean: 0, std: 0 }
  const totalW = weights.reduce((s, w) => s + w, 0) || 1
  const mean = values.reduce((s, v, i) => s + v * weights[i], 0) / totalW
  const variance = values.reduce((s, v, i) => s + weights[i] * (v - mean) ** 2, 0) / totalW
  return { mean, std: Math.sqrt(variance) }
}

const BAYESIAN_PRIOR = {
  '阿拉比卡': { ratio: { mean: 15, std: 2 }, temp: { mean: 92, std: 3 }, time: { mean: 3, std: 0.8 } },
  '罗布斯塔': { ratio: { mean: 12, std: 2 }, temp: { mean: 95, std: 3 }, time: { mean: 4, std: 0.8 } },
  '利比里亚': { ratio: { mean: 13.5, std: 2 }, temp: { mean: 94, std: 3 }, time: { mean: 3.5, std: 0.8 } },
  '混合豆': { ratio: { mean: 14, std: 2 }, temp: { mean: 93, std: 3 }, time: { mean: 3.2, std: 0.8 } },
}

export function computeRecommendation(allRecords, beanVariety, roastLevel, topK = 20) {
  const beanType = getBeanType(beanVariety)
  const process = getBeanProcess(beanVariety)

  const target = { beanVariety, roastLevel, beanType, process }

  const recordsWithSim = allRecords.map(r => ({
    ...r,
    similarity: calcSimilarity(r, target),
  }))

  recordsWithSim.sort((a, b) => {
    const scoreA = a.similarity * a.overallScore
    const scoreB = b.similarity * b.overallScore
    return scoreB - scoreA
  })

  const topRecords = recordsWithSim.slice(0, topK)
  const exactMatches = topRecords.filter(r => r.beanVariety === beanVariety && r.roastLevel === roastLevel)

  const weights = topRecords.map(r => (r.similarity * r.overallScore) ** 2)
  const ratios = topRecords.map(r => r.ratio)
  const temps = topRecords.map(r => r.temperature)
  const times = topRecords.map(r => r.brewTime)

  const similarCount = topRecords.length
  const sparsePenalty = Math.min(1, similarCount / 15)

  let ratioStats = weightedStats(ratios, weights)
  let tempStats = weightedStats(temps, weights)
  let timeStats = weightedStats(times, weights)

  if (similarCount < 10) {
    const prior = BAYESIAN_PRIOR[beanType] || BAYESIAN_PRIOR['阿拉比卡']
    const priorWeight = (10 - similarCount) / 10 * 0.5

    const blendRatio = {
      mean: ratioStats.mean * (1 - priorWeight) + prior.ratio.mean * priorWeight,
      std: ratioStats.std * (1 - priorWeight) + prior.ratio.std * priorWeight,
    }
    const blendTemp = {
      mean: tempStats.mean * (1 - priorWeight) + prior.temp.mean * priorWeight,
      std: tempStats.std * (1 - priorWeight) + prior.temp.std * priorWeight,
    }
    const blendTime = {
      mean: timeStats.mean * (1 - priorWeight) + prior.time.mean * priorWeight,
      std: timeStats.std * (1 - priorWeight) + prior.time.std * priorWeight,
    }
    ratioStats = blendRatio
    tempStats = blendTemp
    timeStats = blendTime
  }

  const recommendRatio = +ratioStats.mean.toFixed(1)
  const ratioMin = +clamp(ratioStats.mean - ratioStats.std, 10, 18).toFixed(1)
  const ratioMax = +clamp(ratioStats.mean + ratioStats.std, 10, 18).toFixed(1)

  const tempMid = Math.round(tempStats.mean)
  const tempMin = Math.round(clamp(tempStats.mean - tempStats.std, 80, 100))
  const tempMax = Math.round(clamp(tempStats.mean + tempStats.std, 80, 100))

  const timeMid = +timeStats.mean.toFixed(1)
  const timeMin = Math.max(1, Math.round(timeStats.mean - timeStats.std))
  const timeMax = Math.max(timeMin + 1, Math.round(timeStats.mean + timeStats.std))

  const simTopK = similarCount > 0 ? topRecords.slice(0, 5).reduce((s, r) => s + r.similarity, 0) / Math.min(5, similarCount) : 0
  const avgScore = similarCount > 0 ? topRecords.reduce((s, r) => s + r.overallScore, 0) / similarCount : 0
  const confidence = Math.round(clamp(
    (simTopK * 0.4 + (avgScore / 5) * 0.4 + sparsePenalty * 0.2) * 100,
    40, 98
  ))

  const reasons = []
  if (exactMatches.length >= 2) {
    reasons.push(`基于 ${exactMatches.length} 条同豆种同烘焙度的历史数据`)
  } else if (exactMatches.length === 1) {
    reasons.push('存在1条完全匹配的历史记录，结合相似组数据')
  } else {
    const sameBean = topRecords.filter(r => r.beanVariety === beanVariety).length
    const sameRoast = topRecords.filter(r => r.roastLevel === roastLevel).length
    if (sameBean > 0) reasons.push(`参考 ${sameBean} 条同豆种不同烘焙度记录`)
    if (sameRoast > 0) reasons.push(`参考 ${sameRoast} 条同烘焙度不同豆种记录`)
    if (reasons.length === 0) reasons.push('基于风味特征与豆种大类的相似组匹配')
  }
  if (avgScore >= 4.2) reasons.push('历史数据评分优异')
  if (confidence >= 80) reasons.push('高置信度推荐')

  return {
    ratio: recommendRatio,
    ratioRange: [Math.min(ratioMin, recommendRatio - 0.3), Math.max(ratioMax, recommendRatio + 0.3)],
    temperature: tempMid,
    temperatureRange: [Math.min(tempMin, tempMid - 1), Math.max(tempMax, tempMid + 1)],
    brewTime: timeMid,
    brewTimeRange: [timeMin, timeMax],
    confidence,
    reasons,
    similarRecords: topRecords.slice(0, 5).map(r => ({
      ...r,
      similarityPercent: Math.round(r.similarity * 100),
    })),
    dataPoints: similarCount,
    exactMatches: exactMatches.length,
    avgHistoricalScore: avgScore > 0 ? +avgScore.toFixed(2) : 0,
  }
}

export function batchRunRecommendations(allRecords) {
  const combos = []
  const testVarieties = BEAN_VARIETIES.slice(0, 25)
  const levels = ROAST_LEVELS

  testVarieties.forEach(v => {
    const count = v.flavorProfile === 'espresso' ? 2 : v.flavorProfile === 'robusta' ? 2 : 3
    for (let i = 0; i < count; i++) {
      combos.push({ variety: v.name, roast: levels[Math.min(6, i + (v.flavorProfile === 'floral' ? 0 : 2))] })
    }
  })

  const results = []
  const start = performance.now()

  for (let i = 0; i < combos.length; i++) {
    const combo = combos[i]
    const rec = computeRecommendation(allRecords, combo.variety, combo.roast)
    results.push({
      ...combo,
      ratio: rec.ratio,
      temp: rec.temperature,
      time: rec.brewTime,
      confidence: rec.confidence,
    })
  }

  const elapsed = performance.now() - start

  const allValid = results.every(r =>
    r.ratio >= 10 && r.ratio <= 18 &&
    r.temp >= 80 && r.temp <= 100 &&
    r.time >= 1 && r.time <= 6 &&
    r.confidence >= 40
  )
  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length

  return {
    totalCombinations: results.length,
    avgConfidence: +avgConfidence.toFixed(1),
    avgResponseTime: +(elapsed / results.length).toFixed(2),
    totalTime: +elapsed.toFixed(2),
    allValid,
    sampleResults: results.slice(0, 5),
  }
}
