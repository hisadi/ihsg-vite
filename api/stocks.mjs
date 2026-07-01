// api/stocks.mjs — GET /api/stocks → { stocks[], ihsg, timestamp }
import { STOCKS_META, fetchBatchQuotes, buildStockFromQuote, buildIHSG, applyMicroTick } from './lib/market.mjs'
import { getRealRSI } from './lib/rsi.mjs'

const SUPABASE_URL = 'https://pvqbjqjjwwcmzajldlzo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cWJqcWpqd3djbXphamxkbHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjk1NzksImV4cCI6MjA5NjY0NTU3OX0.3IeD44BUsjvlvRQU6lcfWysT5nyZxq9eZCNEZ2HN-WA'

let cachedMeta = null
let cacheTime = 0
const CACHE_TTL = 6 * 60 * 60 * 1000

async function getTickerMeta() {
  if (cachedMeta && Date.now() - cacheTime < CACHE_TTL) return cachedMeta
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/idx_tickers?select=sym,name,sector,mcap&order=sym`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) throw new Error(`Supabase error: ${resp.status}`)
    const data = await resp.json()
    if (data && data.length > 0) {
      cachedMeta = data
      cacheTime = Date.now()
      return cachedMeta
    }
  } catch (e) {
    console.warn('Supabase ticker fetch failed:', e.message)
  }
  return null
}

// Ambil RSI real dari Supabase (hasil update batch, bukan hitung on-the-fly)
async function getStoredRSI() {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/stock_rsi?select=sym,rsi,updated_at`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      signal: AbortSignal.timeout(6000),
    })
    if (!resp.ok) return {}
    const data = await resp.json()
    const map = {}
    const now = Date.now()
    data.forEach(r => {
      // Hanya pakai RSI yang update-nya < 24 jam, biar tidak basi
      const age = now - new Date(r.updated_at).getTime()
      if (age < 24 * 60 * 60 * 1000) {
        map[r.sym] = r.rsi
      }
    })
    return map
  } catch {
    return {}
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10')

  try {
    const nowMs = Date.now()
    const dynamicMeta = await getTickerMeta()
    const metaList = dynamicMeta || STOCKS_META

    const BATCH_SIZE = 300
    const allSymbols = metaList.map(m => m.sym + '.JK')
    allSymbols.push('^JKSE')

    const batches = []
    for (let i = 0; i < allSymbols.length; i += BATCH_SIZE) {
      batches.push(allSymbols.slice(i, i + BATCH_SIZE))
    }

    const [quoteResults, storedRSI] = await Promise.all([
      Promise.allSettled(batches.map(batch => fetchBatchQuotes(batch))),
      getStoredRSI(),
    ])

    const quoteMap = {}
    quoteResults.forEach(r => {
      if (r.status === 'fulfilled') Object.assign(quoteMap, r.value)
    })

    const stocks = metaList.map(meta => {
      const q = quoteMap[meta.sym + '.JK']
      const base = buildStockFromQuote(meta, q)

      // Override RSI dengan data real dari Supabase kalau ada
      if (storedRSI[meta.sym] != null) {
        base.rsi = storedRSI[meta.sym]
        base.rsiReal = true
      }

      return applyMicroTick(base, nowMs)
    }).filter(s => s.last > 0)

    const ihsg = buildIHSG(quoteMap['^JKSE'])
    const rsiCoverage = Object.keys(storedRSI).length

    res.status(200).json({ stocks, ihsg, timestamp: nowMs, total: stocks.length, rsiCoverage })
  } catch (err) {
    console.error('stocks handler error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
