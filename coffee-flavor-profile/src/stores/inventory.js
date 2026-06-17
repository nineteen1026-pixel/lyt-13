import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '../db.js'

export const useInventoryStore = defineStore('inventory', () => {
  const inventoryList = ref([])

  const inventoryWithBeans = computed(() => {
    return inventoryList.value.map(inv => {
      const bean = window.__coffeeBeans?.find(b => b.id === inv.beanId)
      return {
        ...inv,
        beanName: bean?.name || '未知豆种',
        beanOrigin: bean?.origin || '',
        availableStock: inv.stock - inv.reservedStock,
      }
    })
  })

  async function loadAll() {
    inventoryList.value = await db.inventory.toArray()
  }

  async function getByBeanId(beanId) {
    return await db.inventory.where('beanId').equals(beanId).first()
  }

  async function updateInventory(id, data) {
    const updateData = { ...data, updatedAt: new Date().toISOString() }
    await db.inventory.update(id, updateData)
    const idx = inventoryList.value.findIndex(i => i.id === id)
    if (idx !== -1) {
      inventoryList.value[idx] = { ...inventoryList.value[idx], ...updateData }
    }
  }

  async function reserveStock(beanId, quantity) {
    const inv = await getByBeanId(beanId)
    if (!inv) throw new Error('库存记录不存在')
    const available = inv.stock - inv.reservedStock
    if (available < quantity) throw new Error('可用库存不足')

    const newReserved = inv.reservedStock + quantity
    await updateInventory(inv.id, { reservedStock: newReserved })
    return true
  }

  async function releaseStock(beanId, quantity) {
    const inv = await getByBeanId(beanId)
    if (!inv) throw new Error('库存记录不存在')
    const newReserved = Math.max(0, inv.reservedStock - quantity)
    await updateInventory(inv.id, { reservedStock: newReserved })
    return true
  }

  async function deductStock(beanId, quantity) {
    const inv = await getByBeanId(beanId)
    if (!inv) throw new Error('库存记录不存在')
    if (inv.stock < quantity) throw new Error('库存不足')

    const newStock = inv.stock - quantity
    const newReserved = Math.max(0, inv.reservedStock - quantity)
    await updateInventory(inv.id, { stock: newStock, reservedStock: newReserved })
    return true
  }

  async function addInventory(inv) {
    const data = { ...inv, updatedAt: new Date().toISOString() }
    const id = await db.inventory.add(data)
    data.id = id
    inventoryList.value.push(data)
    return id
  }

  async function setBeanReference(beans) {
    window.__coffeeBeans = beans
  }

  return {
    inventoryList,
    inventoryWithBeans,
    loadAll,
    getByBeanId,
    updateInventory,
    reserveStock,
    releaseStock,
    deductStock,
    addInventory,
    setBeanReference,
  }
})
