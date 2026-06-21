import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db, { WEIGHT_OPTIONS, GRIND_OPTIONS, generateSkuCode, getWeightLabel, getGrindLabel, buildSkuName } from '../db.js'

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

  const traceabilityArchives = computed(() => {
    return beans.value.map(bean => {
      const beanRoasts = roasts.value.filter(r => r.beanId === bean.id)
      const beanExtractions = extractions.value.filter(e => e.beanId === bean.id)
      const beanRatings = ratings.value.filter(r => r.beanId === bean.id)
      const beanCurves = roastCurves.value.filter(c => c.beanId === bean.id)

      const roastChain = beanRoasts.map(roast => {
        const curve = roastCurves.value.find(c => c.id === roast.curveId)
        const roastExtractions = beanExtractions.filter(e => e.roastId === roast.id)
        return {
          ...roast,
          curve: curve || null,
          extractions: roastExtractions,
        }
      })

      const unlinkedExtractions = beanExtractions.filter(e => !e.roastId || !beanRoasts.find(r => r.id === e.roastId))

      const avgRating = beanRatings.length > 0
        ? {
            acidity: +(beanRatings.reduce((s, r) => s + r.acidity, 0) / beanRatings.length).toFixed(1),
            sweetness: +(beanRatings.reduce((s, r) => s + r.sweetness, 0) / beanRatings.length).toFixed(1),
            body: +(beanRatings.reduce((s, r) => s + r.body, 0) / beanRatings.length).toFixed(1),
            aftertaste: +(beanRatings.reduce((s, r) => s + r.aftertaste, 0) / beanRatings.length).toFixed(1),
            balance: +(beanRatings.reduce((s, r) => s + r.balance, 0) / beanRatings.length).toFixed(1),
          }
        : null

      return {
        bean,
        curves: beanCurves,
        roastChain,
        unlinkedExtractions,
        avgRating,
        totalRoasts: beanRoasts.length,
        totalExtractions: beanExtractions.length,
      }
    })
  })

  function getBeanTraceability(beanId) {
    return traceabilityArchives.value.find(a => a.bean.id === beanId) || null
  }

  function buildQRUrl(beanId) {
    const base = window.location.origin + window.location.pathname
    return `${base}#/traceability/${beanId}`
  }

  function buildQRPayload(beanId, snapshotOverride = null) {
    const archive = snapshotOverride || getBeanTraceability(beanId)
    if (!archive) return null
    const cleanArchive = JSON.parse(JSON.stringify(archive))
    if (!cleanArchive.v) cleanArchive.v = 1
    if (!cleanArchive.deepLinkUrl) {
      cleanArchive.deepLinkUrl = buildQRUrl(beanId)
    }
    return JSON.stringify(cleanArchive)
  }

  function parseQRPayload(text) {
    if (!text) return null
    try {
      const obj = JSON.parse(text)
      if (obj && (obj.bean || obj.v)) return obj
    } catch (e) {}
    return null
  }

  function _b64EncodeUnicode(str) {
    const utf8 = unescape(encodeURIComponent(str))
    return btoa(utf8)
  }

  function _b64DecodeUnicode(str) {
    try {
      const utf8 = atob(str)
      return decodeURIComponent(escape(utf8))
    } catch (e) {
      return null
    }
  }

  function buildQRViewUrl(beanId, snapshotOverride = null) {
    const jsonStr = buildQRPayload(beanId, snapshotOverride)
    if (!jsonStr) return null
    const base = window.location.origin + window.location.pathname
    try {
      const b64 = _b64EncodeUnicode(jsonStr)
      return `${base}#/view/${b64}`
    } catch (e) {
      return buildQRUrl(beanId)
    }
  }

  function parseViewHash(hashPart) {
    if (!hashPart) return null
    const jsonStr = _b64DecodeUnicode(hashPart)
    if (!jsonStr) return null
    return parseQRPayload(jsonStr)
  }

  const MAX_QR_BYTES = 600

  function chunkQRPayload(jsonStr) {
    if (!jsonStr) return []
    try {
      const encoded = _b64EncodeUnicode(jsonStr)
      if (encoded.length <= MAX_QR_BYTES) {
        return [{ index: 0, total: 1, data: encoded, isChunked: false }]
      }
      const chunkSize = MAX_QR_BYTES - 60
      const chunks = []
      let i = 0
      let idx = 0
      while (i < encoded.length) {
        chunks.push(encoded.slice(i, i + chunkSize))
        i += chunkSize
        idx++
      }
      const total = chunks.length
      return chunks.map((c, i) => ({
        index: i,
        total,
        data: c,
        isChunked: true,
        header: `QRC:${i + 1}/${total}:`,
      }))
    } catch (e) {
      return []
    }
  }

  function getChunkQRText(chunk) {
    const base = window.location.origin + window.location.pathname
    if (!chunk.isChunked) {
      return `${base}#/view/${chunk.data}`
    }
    const chunkPayload = `${chunk.header}${chunk.data}`
    return `${base}#/chunk/${encodeURIComponent(chunkPayload)}`
  }

  function tryParseChunkText(text, chunkStore) {
    if (!text) return null
    if (text.startsWith('#/view/')) text = text.slice(7)
    if (text.startsWith('#/chunk/')) text = decodeURIComponent(text.slice(8))
    const chunkMatch = text.match(/^QRC:(\d+)\/(\d+):([\s\S]*)$/)
    if (chunkMatch) {
      const idx = parseInt(chunkMatch[1], 10) - 1
      const total = parseInt(chunkMatch[2], 10)
      const data = chunkMatch[3].trim()
      chunkStore[idx] = data
      try { localStorage.setItem('qr-chunks-last-total', String(total)) } catch (e) {}
      try { localStorage.setItem('qr-chunks-data', JSON.stringify(chunkStore)) } catch (e) {}
      const got = Object.keys(chunkStore).length
      if (got === total) {
        let full = ''
        for (let i = 0; i < total; i++) full += chunkStore[i] || ''
        try {
          localStorage.removeItem('qr-chunks-data')
          localStorage.removeItem('qr-chunks-last-total')
        } catch (e) {}
        const jsonStr = _b64DecodeUnicode(full)
        return parseQRPayload(jsonStr)
      }
      return { __chunkProgress: { got, total } }
    }
    const decoded = _b64DecodeUnicode(text.trim())
    if (decoded) {
      const obj = parseQRPayload(decoded)
      if (obj) return obj
    }
    return parseQRPayload(text)
  }

  function loadStoredChunks() {
    try {
      const data = localStorage.getItem('qr-chunks-data')
      if (data) return JSON.parse(data)
    } catch (e) {}
    return {}
  }

  function clearStoredChunks() {
    try {
      localStorage.removeItem('qr-chunks-data')
      localStorage.removeItem('qr-chunks-last-total')
    } catch (e) {}
  }

  async function uploadToJsonbin(jsonStr) {
    try {
      const apiKey = localStorage.getItem('jsonbin-api-key')
      if (!apiKey) {
        throw new Error('请先在设置中配置 JSONbin.io API Key')
      }
      const beanName = JSON.parse(jsonStr)?.bean?.name || 'traceability'
      const res = await fetch('https://api.jsonbin.io/v3/b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': apiKey,
          'X-Bin-Name': `coffee-traceability-${beanName}-${Date.now()}`,
          'X-Access-Key': '',
        },
        body: jsonStr,
      })
      if (!res.ok) throw new Error(`上传失败: ${res.status}`)
      const data = await res.json()
      const binId = data.metadata?.id
      if (!binId) throw new Error('返回数据格式错误')
      const base = window.location.origin + window.location.pathname
      return `${base}#/bin/${binId}`
    } catch (e) {
      throw e
    }
  }

  async function fetchFromJsonbin(binId) {
    try {
      const apiKey = localStorage.getItem('jsonbin-api-key')
      if (!apiKey) {
        throw new Error('请先在设置中配置 JSONbin.io API Key')
      }
      const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: {
          'X-Master-Key': apiKey,
        },
      })
      if (!res.ok) throw new Error(`获取失败: ${res.status}`)
      const data = await res.json()
      return parseQRPayload(JSON.stringify(data.record))
    } catch (e) {
      throw e
    }
  }

  function buildStandaloneHtml(archive) {
    if (!archive) return ''
    const a = archive
    const bean = a.bean || {}
    const curves = a.curves || []
    const roasts = a.roastChain || []
    const unlinked = a.unlinkedExtractions || []
    const rating = a.avgRating
    const ratingLabels = { acidity: '酸质', sweetness: '甜感', body: '醇厚度', aftertaste: '余韵', balance: '平衡度' }
    const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

    let html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(bean.name || '豆种溯源档案')}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FFFDF9;color:#3E2C1C;padding:20px;max-width:720px;margin:0 auto}
h1{font-size:22px;margin-bottom:4px}h2{font-size:16px;margin:18px 0 10px;color:#6F4E37}.meta{color:#8B7355;font-size:13px;margin-bottom:14px}
.tag{display:inline-block;padding:2px 10px;background:#F0E0D0;border-radius:12px;font-size:12px;margin:0 4px 4px 0}
.flavor-tag{background:linear-gradient(135deg,#FFF0E0,#FFE0C0);color:#8B4513}
.timeline{position:relative;padding-left:8px}.step{display:flex;gap:12px;padding-bottom:18px;position:relative}
.step-icon{flex-shrink:0;width:38px;height:38px;border-radius:50%;background:#FFF8F0;border:2px solid #EDE0D0;display:flex;align-items:center;justify-content:center;font-size:18px;z-index:1}
.step-origin .step-icon{border-color:#6F4E37;background:#F5EDE4}.step-curve .step-icon{border-color:#D4A574;background:#FFF5EB}
.step-roast .step-icon{border-color:#C0392B;background:#FEF0EE}.step-ext .step-icon{border-color:#8B6914;background:#FFFDE7}
.step-rating .step-icon{border-color:#3E6B3E;background:#F0F7F0}
.step::after{content:'';position:absolute;left:18px;top:38px;bottom:0;width:2px;background:linear-gradient(#D2B48C,#EDE0D0)}
.step:last-child::after{display:none}.step-content{flex:1;min-width:0}
.step-label{font-size:14px;font-weight:600;margin-bottom:8px}.card{background:#FFF8F0;border:1px solid #EDE0D0;border-radius:10px;padding:10px 12px;margin-bottom:6px}
.card-title{font-size:13px;font-weight:600;margin-bottom:2px}.card-desc{font-size:12px;color:#8B7355;font-style:italic;margin-bottom:2px}
.card-meta{font-size:12px;color:#A08968}.card-notes{font-size:12px;color:#6F4E37;font-style:italic;margin-top:2px}
.detail{background:#FFF8F0;border:1px solid #EDE0D0;border-radius:10px;padding:10px 14px}.detail-row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
.detail-key{color:#8B7355}.detail-val{font-weight:600}
.nested{margin-top:8px;padding-top:8px;border-top:1px dashed #E0D0B8}.nested-item{background:#FFFCF7;border:1px solid #F0E0D0;border-radius:8px;padding:6px 10px;margin-top:4px;font-size:12px}
.nested-method{font-weight:500;color:#6F4E37}.nested-meta{color:#8B7355;margin-left:6px}.nested-notes{color:#6F4E37;font-style:italic;margin-top:2px}
.rating-bars{background:#FFF8F0;border:1px solid #EDE0D0;border-radius:10px;padding:10px 14px}
.rbar{display:flex;align-items:center;gap:8px;padding:3px 0}.rbar-label{width:52px;font-size:12px;color:#6F4E37;font-weight:500}
.rbar-track{flex:1;height:8px;background:#F0E0D0;border-radius:4px;overflow:hidden}.rbar-fill{height:100%;background:linear-gradient(90deg,#D2B48C,#6F4E37);border-radius:4px}
.rbar-val{width:26px;text-align:right;font-size:13px;font-weight:600}
</style></head><body>
<h1>${escapeHtml(bean.name || '未知豆种')}</h1>
<div class="meta">
<span class="tag">${escapeHtml(bean.origin || '-')}</span>
<span class="tag">${escapeHtml(bean.variety || '-')}</span>
<span class="tag">${escapeHtml(bean.process || '-')}</span>
</div>`
    if (bean.flavorTags && bean.flavorTags.length) {
      html += `<div class="meta">`
      for (const t of bean.flavorTags) html += `<span class="tag flavor-tag">${escapeHtml(t)}</span>`
      html += `</div>`
    }
    html += `<div class="timeline">
<div class="step step-origin"><div class="step-icon">🌍</div><div class="step-content"><div class="step-label">产地信息</div>
<div class="detail">
<div class="detail-row"><span class="detail-key">产地</span><span class="detail-val">${escapeHtml(bean.origin || '-')}</span></div>
<div class="detail-row"><span class="detail-key">品种</span><span class="detail-val">${escapeHtml(bean.variety || '-')}</span></div>
<div class="detail-row"><span class="detail-key">处理法</span><span class="detail-val">${escapeHtml(bean.process || '-')}</span></div>
</div></div></div>`
    if (curves.length) {
      html += `<div class="step step-curve"><div class="step-icon">📈</div><div class="step-content"><div class="step-label">烘焙曲线 (${curves.length})</div>`
      for (const c of curves) {
        html += `<div class="card">
<div class="card-title">${escapeHtml(c.name || '未命名曲线')}</div>
${c.description ? `<div class="card-desc">${escapeHtml(c.description)}</div>` : ''}
<div class="card-meta">${c.nodes?.length || 0} 个温度节点</div>
</div>`
      }
      html += `</div></div>`
    }
    if (roasts.length) {
      html += `<div class="step step-roast"><div class="step-icon">🔥</div><div class="step-content"><div class="step-label">烘焙记录 (${a.totalRoasts || roasts.length})</div>`
      for (const r of roasts) {
        html += `<div class="card">
<div class="card-title">${escapeHtml(r.date || '-')} · ${escapeHtml(r.level || '')}${r.curve?.name ? ' · 📈 ' + escapeHtml(r.curve.name) : ''}</div>
<div class="card-meta">${r.temperature || '-'}°C · ${r.duration || '-'} min</div>
${r.notes ? `<div class="card-notes">${escapeHtml(r.notes)}</div>` : ''}`
        if (r.extractions?.length) {
          html += `<div class="nested"><div style="font-size:12px;font-weight:500;color:#6F4E37;margin-bottom:4px">☕ 关联萃取 (${r.extractions.length})</div>`
          for (const e of r.extractions) {
            html += `<div class="nested-item">
<span class="nested-method">${escapeHtml(e.method || '-')}</span>
<span class="nested-meta">${escapeHtml(e.ratio || '')} · ${escapeHtml(e.temperature || '')}°C · ${escapeHtml(e.time || '')}</span>
${e.notes ? `<div class="nested-notes">${escapeHtml(e.notes)}</div>` : ''}
</div>`
          }
          html += `</div>`
        }
        html += `</div>`
      }
      html += `</div></div>`
    }
    if (unlinked.length) {
      html += `<div class="step step-ext"><div class="step-icon">☕</div><div class="step-content"><div class="step-label">独立萃取记录 (${unlinked.length})</div>`
      for (const e of unlinked) {
        html += `<div class="card">
<div class="card-title">${escapeHtml(e.date || '-')} · ${escapeHtml(e.method || '-')}</div>
<div class="card-meta">${escapeHtml(e.ratio || '')} · ${escapeHtml(e.temperature || '')}°C · ${escapeHtml(e.time || '')}</div>
${e.notes ? `<div class="card-notes">${escapeHtml(e.notes)}</div>` : ''}
</div>`
      }
      html += `</div></div>`
    }
    if (rating) {
      html += `<div class="step step-rating"><div class="step-icon">📊</div><div class="step-content"><div class="step-label">风味评分</div>
<div class="rating-bars">`
      for (const key of ['acidity', 'sweetness', 'body', 'aftertaste', 'balance']) {
        const v = rating[key] || 0
        html += `<div class="rbar">
<span class="rbar-label">${ratingLabels[key]}</span>
<div class="rbar-track"><div class="rbar-fill" style="width:${(v / 10 * 100).toFixed(0)}%"></div></div>
<span class="rbar-val">${v}</span>
</div>`
      }
      html += `</div></div></div>`
    }
    html += `</div></body></html>`
    return html
  }

  async function loadAll() {
    beans.value = await db.beans.toArray()
    roasts.value = await db.roasts.toArray()
    extractions.value = await db.extractions.toArray()
    ratings.value = await db.ratings.toArray()
    cuppingComparisons.value = await db.cuppingComparisons.toArray()
    roastCurves.value = await db.roastCurves.toArray()
  }

  async function addBean(bean, basePrice = 100) {
    const data = { ...bean, createdAt: new Date().toISOString() }
    const id = await db.beans.add(data)
    data.id = id
    beans.value.push(data)
    await ensureBeanSkus(id, basePrice)

    const { useInventoryStore } = await import('./inventory.js')
    const inventoryStore = useInventoryStore()
    await inventoryStore.loadAll()

    return id
  }

  async function deleteBean(id) {
    await db.beans.delete(id)
    await db.roasts.where('beanId').equals(id).delete()
    await db.extractions.where('beanId').equals(id).delete()
    await db.ratings.where('beanId').equals(id).delete()
    await db.beanSkus.where('beanId').equals(id).delete()
    await db.roastCurves.where('beanId').equals(id).delete()
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

  const WEIGHT_OPTIONS_REF = WEIGHT_OPTIONS
  const GRIND_OPTIONS_REF = GRIND_OPTIONS

  function generateDefaultSkusForBean(beanId, basePrice = 100) {
    const skus = []
    for (const weightOpt of WEIGHT_OPTIONS) {
      const weightRatio = { 100: 1.0, 250: 2.3, 500: 4.3, 1000: 8.0 }[weightOpt.value] || 1
      for (const grindOpt of GRIND_OPTIONS) {
        const grindSurcharge = { bean: 0, coarse: 0, medium: 0, fine: 2 }[grindOpt.value] || 0
        const price = +(basePrice * weightRatio + grindSurcharge).toFixed(2)
        skus.push({
          beanId,
          weight: weightOpt.value,
          grind: grindOpt.value,
          skuCode: generateSkuCode(weightOpt.value, grindOpt.value),
          stock: 0,
          reservedStock: 0,
          roastReservedStock: 0,
          price,
          presalePrice: +(price * 0.85).toFixed(2),
          deposit: +(price * 0.3).toFixed(2),
          status: 'off_shelf',
        })
      }
    }
    return skus
  }

  async function ensureBeanSkus(beanId, basePrice = 100) {
    const existing = await db.beanSkus.where('beanId').equals(beanId).toArray()
    if (existing.length > 0) return existing

    const defaultSkus = generateDefaultSkusForBean(beanId, basePrice)
    const nowStr = new Date().toISOString()
    const data = defaultSkus.map(s => ({ ...s, updatedAt: nowStr }))
    const ids = await db.beanSkus.bulkAdd(data, { allKeys: true })
    return data.map((d, i) => ({ ...d, id: ids[i] }))
  }

  async function ensureAllBeanSkus(defaultBasePrice = 100) {
    const allBeans = beans.value.length > 0 ? beans.value : await db.beans.toArray()
    const results = []
    for (const bean of allBeans) {
      const created = await ensureBeanSkus(bean.id, defaultBasePrice)
      results.push({ beanId: bean.id, skuCount: created.length })
    }
    return results
  }

  function getWeightLabelFn(weight) { return getWeightLabel(weight) }
  function getGrindLabelFn(grind) { return getGrindLabel(grind) }
  function buildSkuNameFn(beanName, weight, grind) { return buildSkuName(beanName, weight, grind) }

  return {
    beans, roasts, extractions, ratings, cuppingComparisons, roastCurves,
    beansWithDetails, cuppingComparisonsWithDetails, roastCurvesWithDetails,
    traceabilityArchives,
    WEIGHT_OPTIONS: WEIGHT_OPTIONS_REF,
    GRIND_OPTIONS: GRIND_OPTIONS_REF,
    loadAll,
    addBean, deleteBean,
    addRoast, deleteRoast,
    addExtraction, deleteExtraction,
    addRating, deleteRating,
    addCuppingComparison, updateCuppingComparison, deleteCuppingComparison,
    addRoastCurve, updateRoastCurve, deleteRoastCurve,
    getBeanTraceability, buildQRPayload, buildQRUrl, parseQRPayload,
    buildQRViewUrl, parseViewHash, chunkQRPayload, getChunkQRText, tryParseChunkText, buildStandaloneHtml,
    loadStoredChunks, clearStoredChunks, uploadToJsonbin, fetchFromJsonbin,
    generateDefaultSkusForBean, ensureBeanSkus, ensureAllBeanSkus,
    getWeightLabel: getWeightLabelFn, getGrindLabel: getGrindLabelFn, buildSkuName: buildSkuNameFn,
  }
})
