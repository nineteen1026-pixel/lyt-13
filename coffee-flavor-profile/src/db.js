import Dexie from 'dexie'

const db = new Dexie('CoffeeFlavorProfile')

db.version(1).stores({
  beans: '++id, name, origin, variety, process, createdAt',
  roasts: '++id, beanId, date, level, temperature, duration, notes, createdAt',
  extractions: '++id, roastId, beanId, date, method, ratio, temperature, time, notes, createdAt',
  ratings: '++id, beanId, acidity, sweetness, body, aftertaste, balance, createdAt',
})

export default db
