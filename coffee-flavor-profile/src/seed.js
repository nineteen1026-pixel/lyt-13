import db from './db.js'

const SEED_BEANS = [
  { name: '耶加雪菲·科契尔', origin: '埃塞俄比亚', variety: 'Heirloom', process: '水洗' },
  { name: '曼特宁·黄金', origin: '印度尼西亚·苏门答腊', variety: 'Typica', process: '湿刨法' },
  { name: '瑰夏·翡翠庄园', origin: '巴拿马', variety: 'Geisha', process: '日晒' },
  { name: '哥伦比亚·慧兰', origin: '哥伦比亚', variety: 'Caturra', process: '水洗' },
]

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

export async function seedDatabase() {
  const beanCount = await db.beans.count()
  if (beanCount > 0) return

  await db.beans.bulkAdd(SEED_BEANS.map(b => ({ ...b, createdAt: new Date().toISOString() })))
  await db.roasts.bulkAdd(SEED_ROASTS.map(r => ({ ...r, createdAt: new Date().toISOString() })))
  await db.extractions.bulkAdd(SEED_EXTRACTIONS.map(e => ({ ...e, createdAt: new Date().toISOString() })))
  await db.ratings.bulkAdd(SEED_RATINGS.map(r => ({ ...r, createdAt: new Date().toISOString() })))
}
