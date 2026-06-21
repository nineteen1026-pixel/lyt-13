import db, {
  WEIGHT_OPTIONS,
  GRIND_OPTIONS,
  generateSkuCode,
} from './db.js'
import { generateAllSeedRecords } from './utils/recommendationAlgo.js'

const SEED_BEANS = [
  { name: '耶加雪菲·科契尔', origin: '埃塞俄比亚', variety: 'Heirloom', process: '水洗', flavorTags: ['花香', '茉莉', '柑橘', '柠檬', '茶感'] },
  { name: '曼特宁·黄金', origin: '印度尼西亚·苏门答腊', variety: 'Typica', process: '湿刨法', flavorTags: ['草本', '泥土', '木质', '黑巧克力', '烟熏'] },
  { name: '瑰夏·翡翠庄园', origin: '巴拿马', variety: 'Geisha', process: '日晒', flavorTags: ['花香', '茉莉', '桃子', '热带水果', '蜂蜜'] },
  { name: '哥伦比亚·慧兰', origin: '哥伦比亚', variety: 'Caturra', process: '水洗', flavorTags: ['焦糖', '红糖', '坚果', '巧克力', '杏子'] },
]

const BEAN_BASE_PRICES = {
  1: 128.00,
  2: 98.00,
  3: 388.00,
  4: 118.00,
}

const WEIGHT_MULTIPLIERS = {
  100: 1.0,
  250: 2.3,
  500: 4.3,
  1000: 8.0,
}

const GRIND_SURCHARGE = {
  bean: 0,
  coarse: 0,
  medium: 0,
  fine: 2,
}

const BEAN_PRESET_STOCK = {
  1: { 100: 10, 250: 35, 500: 15, 1000: 5 },
  2: { 100: 8, 250: 28, 500: 12, 1000: 4 },
  3: { 100: 0, 250: 0, 500: 0, 1000: 0 },
  4: { 100: 5, 250: 20, 500: 10, 1000: 3 },
}

const PRESALE_BEAN_IDS = new Set([3])

function buildSkusForBean(beanId, basePrice, nowStr) {
  const skus = []
  const isPresaleBean = PRESALE_BEAN_IDS.has(beanId)
  const stockMap = BEAN_PRESET_STOCK[beanId] || { 100: 0, 250: 0, 500: 0, 1000: 0 }

  for (const weight of WEIGHT_OPTIONS.map(o => o.value)) {
    for (const grind of GRIND_OPTIONS.map(o => o.value)) {
      const mult = WEIGHT_MULTIPLIERS[weight] || 1
      const surcharge = GRIND_SURCHARGE[grind] || 0
      const price = +(basePrice * mult + surcharge).toFixed(2)
      const presalePrice = +(price * 0.85).toFixed(2)
      const deposit = +(price * 0.30).toFixed(2)

      let status = 'on_sale'
      let stock = stockMap[weight] || 0

      if (isPresaleBean) {
        status = 'presale'
        stock = 0
      } else if (stock === 0) {
        status = 'presale'
      }

      skus.push({
        beanId,
        skuCode: generateSkuCode(weight, grind),
        weight,
        grind,
        stock,
        reservedStock: 0,
        roastReservedStock: 0,
        price,
        presalePrice,
        deposit,
        status,
        updatedAt: nowStr,
      })
    }
  }
  return skus
}

function generateAllSkuSeeds(nowStr) {
  const allSkus = []
  SEED_BEANS.forEach((_, idx) => {
    const beanId = idx + 1
    const basePrice = BEAN_BASE_PRICES[beanId]
    allSkus.push(...buildSkusForBean(beanId, basePrice, nowStr))
  })
  return allSkus
}

const SEED_ROASTS = [
  { beanId: 1, date: '2026-05-20', level: '浅烘焙', temperature: 196, duration: 9.5, notes: '一爆密集期出锅，果香明显' },
  { beanId: 2, date: '2026-05-22', level: '深烘焙', temperature: 225, duration: 14, notes: '二爆初出锅，醇厚感强' },
  { beanId: 3, date: '2026-05-25', level: '浅烘焙', temperature: 193, duration: 8.5, notes: '极浅烘焙保留花果香' },
  { beanId: 4, date: '2026-05-28', level: '中烘焙', temperature: 210, duration: 11, notes: '中烘平衡酸甜' },
]

const SEED_EXTRACTIONS = [
  { roastId: 1, beanId: 1, date: '2026-05-21', method: '手冲 V60', ratio: '1:15', temperature: 92, time: '2:30', notes: '花香柑橘调，酸质明亮' },
  { roastId: 2, beanId: 2, date: '2026-05-23', method: '法压壶', ratio: '1:12', temperature: 95, time: '4:00', notes: '巧克力坚果，醇厚低酸' },
  { roastId: 3, beanId: 3, date: '2026-05-26', method: '手冲 Kalita', ratio: '1:16', temperature: 90, time: '3:00', notes: '茉莉花香，蜜桃甜感' },
  { roastId: 4, beanId: 4, date: '2026-05-29', method: '爱乐压', ratio: '1:14', temperature: 93, time: '1:45', notes: '焦糖红糖，圆润均衡' },
]

const SEED_RATINGS = [
  { beanId: 1, acidity: 9, sweetness: 8, body: 5, aftertaste: 8, balance: 7 },
  { beanId: 2, acidity: 3, sweetness: 5, body: 9, aftertaste: 7, balance: 6 },
  { beanId: 3, acidity: 8, sweetness: 9, body: 4, aftertaste: 9, balance: 8 },
  { beanId: 4, acidity: 6, sweetness: 7, body: 7, aftertaste: 6, balance: 9 },
]

const SEED_CURVES = [
  {
    name: '浅烘花果香曲线',
    beanId: 1,
    description: '适用于耶加雪菲等浅烘花果调豆种，保留明亮酸质与花果香气',
    nodes: [
      { time: 0, temperature: 90, event: '入豆' },
      { time: 2, temperature: 120, event: '' },
      { time: 4.5, temperature: 150, event: '转黄点' },
      { time: 6, temperature: 165, event: '' },
      { time: 7.5, temperature: 180, event: '一爆开始' },
      { time: 9, temperature: 190, event: '一爆密集' },
      { time: 9.5, temperature: 196, event: '出锅' },
    ],
  },
  {
    name: '深烘醇厚曲线',
    beanId: 2,
    description: '适用于曼特宁等深烘醇厚型豆种，发展浓厚body与巧克力调',
    nodes: [
      { time: 0, temperature: 95, event: '入豆' },
      { time: 2.5, temperature: 125, event: '' },
      { time: 5, temperature: 155, event: '转黄点' },
      { time: 7, temperature: 175, event: '' },
      { time: 9, temperature: 190, event: '一爆开始' },
      { time: 11, temperature: 205, event: '一爆结束' },
      { time: 12.5, temperature: 218, event: '二爆开始' },
      { time: 14, temperature: 225, event: '出锅' },
    ],
  },
  {
    name: '极浅保留曲线',
    beanId: 3,
    description: '适用于瑰夏等精品豆种，极浅烘焙最大化保留产地风味',
    nodes: [
      { time: 0, temperature: 88, event: '入豆' },
      { time: 1.5, temperature: 115, event: '' },
      { time: 3.5, temperature: 145, event: '转黄点' },
      { time: 5.5, temperature: 170, event: '' },
      { time: 7, temperature: 180, event: '一爆开始' },
      { time: 8, temperature: 188, event: '一爆密集' },
      { time: 8.5, temperature: 193, event: '出锅' },
    ],
  },
  {
    name: '中烘平衡曲线',
    beanId: null,
    description: '通用中烘曲线，适合大多数水洗豆，追求酸甜平衡与圆润口感',
    nodes: [
      { time: 0, temperature: 92, event: '入豆' },
      { time: 2, temperature: 122, event: '' },
      { time: 4.5, temperature: 152, event: '转黄点' },
      { time: 6.5, temperature: 172, event: '' },
      { time: 8, temperature: 185, event: '一爆开始' },
      { time: 9.5, temperature: 198, event: '一爆密集' },
      { time: 11, temperature: 210, event: '出锅' },
    ],
  },
]

const now = new Date()
const SEED_PROMOTIONS = [
  {
    name: '新客首单立减20',
    type: 'new_customer',
    discount: 20,
    discountType: 'fixed',
    minAmount: 100,
    startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
  {
    name: '满200减30',
    type: 'full_reduction',
    discount: 30,
    discountType: 'fixed',
    minAmount: 200,
    startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
  {
    name: '预售特惠9折',
    type: 'presale',
    discount: 10,
    discountType: 'percentage',
    minAmount: 0,
    startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
]

const SEED_MEMBERS = [
  { name: '张三', phone: '13800138000', points: 5000, level: 'gold' },
  { name: '李四', phone: '13900139000', points: 2000, level: 'silver' },
  { name: '王五', phone: '13700137000', points: 500, level: 'normal' },
]

function generatePointProductSeeds(nowStr) {
  return [
    {
      name: '耶加雪菲 250g 咖啡豆',
      type: 'bean',
      points: 2800,
      stock: 20,
      status: 'active',
      beanId: 1,
      skuId: 5,
      couponTemplateId: null,
      description: '埃塞俄比亚耶加雪菲，水洗处理，花香柑橘调',
      sortOrder: 1,
      createdAt: nowStr,
      updatedAt: nowStr,
    },
    {
      name: '哥伦比亚慧兰 250g 咖啡豆',
      type: 'bean',
      points: 2200,
      stock: 15,
      status: 'active',
      beanId: 4,
      skuId: 41,
      couponTemplateId: null,
      description: '哥伦比亚慧兰产区，水洗处理，焦糖坚果调',
      sortOrder: 2,
      createdAt: nowStr,
      updatedAt: nowStr,
    },
    {
      name: '曼特宁黄金 250g 咖啡豆',
      type: 'bean',
      points: 1800,
      stock: 25,
      status: 'active',
      beanId: 2,
      skuId: 17,
      couponTemplateId: null,
      description: '印尼苏门答腊曼特宁，湿刨法，醇厚草本',
      sortOrder: 3,
      createdAt: nowStr,
      updatedAt: nowStr,
    },
    {
      name: '满200减30优惠券',
      type: 'coupon',
      points: 800,
      stock: 100,
      status: 'active',
      beanId: null,
      skuId: null,
      couponTemplateId: null,
      description: '全场通用，满200元减30元',
      sortOrder: 4,
      createdAt: nowStr,
      updatedAt: nowStr,
    },
    {
      name: '9折优惠券',
      type: 'coupon',
      points: 1500,
      stock: 50,
      status: 'active',
      beanId: null,
      skuId: null,
      couponTemplateId: null,
      description: '全场9折，无门槛使用',
      sortOrder: 5,
      createdAt: nowStr,
      updatedAt: nowStr,
    },
  ]
}

export async function seedDatabase() {
  const beanCount = await db.beans.count()
  const skuCount = await db.beanSkus.count()
  const promotionCount = await db.promotions.count()
  const curveCount = await db.roastCurves.count()
  const paramCount = await db.extractionParams.count()
  const memberCount = await db.members.count()
  const pointProductCount = await db.pointProducts.count()
  const couponTemplateCount = await db.couponTemplates.count()

  const nowStr = new Date().toISOString()

  if (beanCount === 0) {
    await db.beans.bulkAdd(SEED_BEANS.map(b => ({ ...b, createdAt: nowStr })))
    await db.roasts.bulkAdd(SEED_ROASTS.map(r => ({ ...r, createdAt: nowStr })))
    await db.extractions.bulkAdd(SEED_EXTRACTIONS.map(e => ({ ...e, createdAt: nowStr })))
    await db.ratings.bulkAdd(SEED_RATINGS.map(r => ({ ...r, createdAt: nowStr })))
  }

  if (curveCount === 0) {
    await db.roastCurves.bulkAdd(SEED_CURVES.map(c => ({ ...c, createdAt: nowStr })))
  }

  if (skuCount === 0) {
    const allSkus = generateAllSkuSeeds(nowStr)
    await db.beanSkus.bulkAdd(allSkus)
  }

  if (promotionCount === 0) {
    await db.promotions.bulkAdd(SEED_PROMOTIONS.map(p => ({ ...p, createdAt: nowStr })))
  }

  if (paramCount === 0) {
    const seedRecords = generateAllSeedRecords()
    await db.extractionParams.bulkAdd(seedRecords.map(r => ({ ...r, createdAt: nowStr, updatedAt: nowStr })))
  }

  if (couponTemplateCount === 0) {
    const couponTemplates = [
      {
        name: '满200减30',
        type: 'full_reduction',
        discountType: 'fixed',
        discount: 30,
        minAmount: 200,
        scope: 'all',
        scopeValue: '',
        validType: 'days',
        validDays: 30,
        validStart: null,
        validEnd: null,
        totalCount: 200,
        issuedCount: 0,
        status: 'active',
        promotionId: null,
        createdAt: nowStr,
        updatedAt: nowStr,
      },
      {
        name: '9折优惠券',
        type: 'discount',
        discountType: 'percentage',
        discount: 10,
        minAmount: 0,
        scope: 'all',
        scopeValue: '',
        validType: 'days',
        validDays: 15,
        validStart: null,
        validEnd: null,
        totalCount: 100,
        issuedCount: 0,
        status: 'active',
        promotionId: null,
        createdAt: nowStr,
        updatedAt: nowStr,
      },
    ]
    await db.couponTemplates.bulkAdd(couponTemplates)
  }

  if (memberCount === 0) {
    await db.members.bulkAdd(SEED_MEMBERS.map(m => ({ ...m, createdAt: nowStr, updatedAt: nowStr })))
  }

  if (pointProductCount === 0) {
    const templates = await db.couponTemplates.toArray()
    const fullReductionTpl = templates.find(t => t.name === '满200减30')
    const discountTpl = templates.find(t => t.name === '9折优惠券')
    
    const products = generatePointProductSeeds(nowStr)
    products.forEach(p => {
      if (p.type === 'coupon') {
        if (p.name.includes('200减30') && fullReductionTpl) {
          p.couponTemplateId = fullReductionTpl.id
        } else if (p.name.includes('9折') && discountTpl) {
          p.couponTemplateId = discountTpl.id
        }
      }
    })
    await db.pointProducts.bulkAdd(products)
  }
}
