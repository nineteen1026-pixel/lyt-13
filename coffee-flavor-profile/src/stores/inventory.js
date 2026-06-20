import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db, { getWeightLabel, getGrindLabel, buildSkuName } from '../db.js'

export const useInventoryStore = defineStore('inventory', () => {
  const inventoryList = ref([])

  const inventoryWithBeans = computed(() => {
    return inventoryList.value.map(sku => {
      const bean = window.__coffeeBeans?.find(b => b.id === sku.beanId)
      const roastReserved = sku.roastReservedStock || 0
      return {
        ...sku,
        beanName: bean?.name || '未知豆种',
        beanOrigin: bean?.origin || '',
        skuName: buildSkuName(bean?.name || '未知豆种', sku.weight, sku.grind),
        weightLabel: getWeightLabel(sku.weight),
        grindLabel: getGrindLabel(sku.grind),
        roastReservedStock: roastReserved,
        availableStock: sku.stock - sku.reservedStock,
        sellableStock: sku.stock - sku.reservedStock,
        nonRoastReservedStock: sku.reservedStock - roastReserved,
      }
    })
  })

  const inventoryGroupedByBean = computed(() => {
    const groups = {}
    for (const sku of inventoryWithBeans.value) {
      if (!groups[sku.beanId]) {
        groups[sku.beanId] = {
          beanId: sku.beanId,
          beanName: sku.beanName,
          beanOrigin: sku.beanOrigin,
          skus: [],
          totalStock: 0,
          totalReserved: 0,
          totalAvailable: 0,
          minPrice: Infinity,
          maxPrice: 0,
          status: 'off_shelf',
        }
      }
      groups[sku.beanId].skus.push(sku)
      groups[sku.beanId].totalStock += sku.stock
      groups[sku.beanId].totalReserved += sku.reservedStock
      groups[sku.beanId].totalAvailable += (sku.stock - sku.reservedStock)
      if (sku.price < groups[sku.beanId].minPrice) groups[sku.beanId].minPrice = sku.price
      if (sku.price > groups[sku.beanId].maxPrice) groups[sku.beanId].maxPrice = sku.price
      if (sku.status === 'presale' && groups[sku.beanId].status === 'off_shelf') {
        groups[sku.beanId].status = 'presale'
      }
      if (sku.status === 'on_sale') {
        groups[sku.beanId].status = 'on_sale'
      }
    }
    for (const key in groups) {
      if (groups[key].minPrice === Infinity) {
        groups[key].minPrice = 0
      }
    }
    return Object.values(groups)
  })

  async function loadAll() {
    inventoryList.value = await db.beanSkus.toArray()
  }

  async function getByBeanId(beanId) {
    return await db.beanSkus.where('beanId').equals(beanId).toArray()
  }

  async function getBySkuId(skuId) {
    return await db.beanSkus.get(skuId)
  }

  async function getOnSaleByBeanId(beanId) {
    const all = await getByBeanId(beanId)
    return all.filter(s => s.status === 'on_sale' || s.status === 'presale')
  }

  async function updateInventory(skuId, data) {
    const updateData = { ...data, updatedAt: new Date().toISOString() }
    await db.beanSkus.update(skuId, updateData)
    const idx = inventoryList.value.findIndex(i => i.id === skuId)
    if (idx !== -1) {
      inventoryList.value[idx] = { ...inventoryList.value[idx], ...updateData }
    }
  }

  async function reserveStock(skuId, quantity) {
    const sku = await getBySkuId(skuId)
    if (!sku) throw new Error('SKU库存记录不存在')
    const available = sku.stock - sku.reservedStock
    if (available < quantity) throw new Error('可用库存不足')

    const newReserved = sku.reservedStock + quantity
    await updateInventory(sku.id, { reservedStock: newReserved })
    return true
  }

  async function releaseStock(skuId, quantity) {
    const sku = await getBySkuId(skuId)
    if (!sku) throw new Error('SKU库存记录不存在')
    const newReserved = Math.max(0, sku.reservedStock - quantity)
    await updateInventory(sku.id, { reservedStock: newReserved })
    return true
  }

  async function deductStock(skuId, quantity) {
    const sku = await getBySkuId(skuId)
    if (!sku) throw new Error('SKU库存记录不存在')
    if (sku.stock < quantity) throw new Error('库存不足')

    const newStock = sku.stock - quantity
    const newReserved = Math.max(0, sku.reservedStock - quantity)
    await updateInventory(sku.id, { stock: newStock, reservedStock: newReserved })
    return true
  }

  async function reserveRoastStock(skuId, quantity) {
    const sku = await getBySkuId(skuId)
    if (!sku) throw new Error('SKU库存记录不存在')
    const roastReserved = sku.roastReservedStock || 0
    const availableForRoast = sku.reservedStock - roastReserved
    if (availableForRoast < quantity) throw new Error('可用于烘焙排产的库存不足')

    const newRoastReserved = roastReserved + quantity
    await updateInventory(sku.id, { roastReservedStock: newRoastReserved })
    return true
  }

  async function releaseRoastStock(skuId, quantity) {
    const sku = await getBySkuId(skuId)
    if (!sku) throw new Error('SKU库存记录不存在')
    const roastReserved = sku.roastReservedStock || 0
    const newRoastReserved = Math.max(0, roastReserved - quantity)
    await updateInventory(sku.id, { roastReservedStock: newRoastReserved })
    return true
  }

  async function addInventory(inv) {
    const data = { ...inv, updatedAt: new Date().toISOString() }
    const id = await db.beanSkus.add(data)
    data.id = id
    inventoryList.value.push(data)
    return id
  }

  async function bulkAddSkus(skus) {
    const nowStr = new Date().toISOString()
    const data = skus.map(s => ({ ...s, updatedAt: nowStr }))
    const ids = await db.beanSkus.bulkAdd(data, { allKeys: true })
    const result = data.map((d, i) => ({ ...d, id: ids[i] }))
    inventoryList.value.push(...result)
    return ids
  }

  async function deleteSku(skuId) {
    await db.beanSkus.delete(skuId)
    inventoryList.value = inventoryList.value.filter(s => s.id !== skuId)
  }

  async function deleteSkusByBeanId(beanId) {
    await db.beanSkus.where('beanId').equals(beanId).delete()
    inventoryList.value = inventoryList.value.filter(s => s.beanId !== beanId)
  }

  function getBeanInventorySummary(beanId) {
    return inventoryGroupedByBean.value.find(g => g.beanId === beanId) || null
  }

  function setBeanReference(beans) {
    window.__coffeeBeans = beans
  }

  return {
    inventoryList,
    inventoryWithBeans,
    inventoryGroupedByBean,
    loadAll,
    getByBeanId,
    getBySkuId,
    getOnSaleByBeanId,
    updateInventory,
    reserveStock,
    releaseStock,
    deductStock,
    reserveRoastStock,
    releaseRoastStock,
    addInventory,
    bulkAddSkus,
    deleteSku,
    deleteSkusByBeanId,
    getBeanInventorySummary,
    setBeanReference,
  }
})
