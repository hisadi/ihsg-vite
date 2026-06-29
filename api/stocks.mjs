// api/stocks.mjs — GET /api/stocks → { stocks[], ihsg, timestamp }
// Pakai daftar ticker dinamis dari Yahoo Finance screener

import { STOCKS_META, buildStockFromQuote, buildIHSG, SECTOR_BETAS } from './lib/market.mjs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function getYahooCrumb() {
  const r = await fetch('https://finance.yahoo.com/quote/BBCA.JK/', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    signal: AbortSignal.timeout(10000),
  })
  const cookie = r.headers.get('set-cookie') || ''
  const html = await r.text()
  const crumbMatch = html.match(/"crumb":"([^"]+)"/)
  const crumb = crumbMatch ? crumbMatch[1].replace(/\\u002F/g, '/') : null
  return { crumb, cookie }
}

// Fetch batch quote dari Yahoo
async function fetchBatch(symbols, crumb, cookie) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}&crumb=${encodeURIComponent(crumb)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume`
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Cookie': cookie },
    signal: AbortSignal.timeout(15000),
  })
  if (!resp.ok) throw new Error(`Yahoo batch failed: ${resp.status}`)
  const data = await resp.json()
  const results = data?.quoteResponse?.result || []
  const map = {}
  results.forEach(q => { map[q.symbol] = q })
  return map
}

// Cache ticker list & quotes
let cachedTickers = null
let cachedTickersTime = 0
const TICKER_TTL = 6 * 60 * 60 * 1000 // 6 jam

async function getDynamicTickers(crumb, cookie) {
  // Return cache kalau masih fresh
  if (cachedTickers && Date.now() - cachedTickersTime < TICKER_TTL) {
    return cachedTickers
  }

  // Fetch semua saham IDX via screener
  const batches = await Promise.allSettled([0, 250, 500, 750].map(offset =>
    fetch(
      `https://query1.finance.yahoo.com/v1/finance/screener?formatted=false&region=ID&lang=en-US&crumb=${encodeURIComponent(crumb)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Cookie': cookie },
        body: JSON.stringify({
          offset, size: 250, sortField: 'marketCap', sortType: 'DESC',
          quoteType: 'EQUITY',
          query: { operator: 'AND', operands: [{ operator: 'EQ', operands: ['exchange', 'JKT'] }] },
          userId: '', userIdType: 'guid'
        }),
        signal: AbortSignal.timeout(15000),
      }
    ).then(r => r.json()).then(d => d?.finance?.result?.[0]?.quotes || [])
  ))

  const allQuotes = []
  batches.forEach(b => { if (b.status === 'fulfilled') allQuotes.push(...b.value) })

  if (allQuotes.length > 0) {
    cachedTickers = allQuotes
    cachedTickersTime = Date.now()
    return allQuotes
  }

  return null // fallback ke STOCKS_META
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10')

  try {
    const { crumb, cookie } = await getYahooCrumb()
    if (!crumb) throw new Error('Could not get Yahoo crumb')

    const nowMs = Date.now()

    // Coba dynamic ticker list dulu
    const dynamicQuotes = await getDynamicTickers(crumb, cookie)

    if (dynamicQuotes && dynamicQuotes.length > 0) {
      // Pakai data langsung dari screener (sudah ada price-nya)
      const stocks = dynamicQuotes
        .filter(q => q.symbol?.endsWith('.JK'))
        .map(q => {
          const sym = q.symbol.replace('.JK', '')
          const knownMeta = STOCKS_META.find(m => m.sym === sym)
          const last = Math.round(q.regularMarketPrice || 0)
          const prevClose = Math.round(q.regularMarketPreviousClose || last)
          const changePct = q.regularMarketChangePercent || 0
          const sector = knownMeta?.sector || mapSector(q.sector)

          const base = {
            symbol: sym,
            name: q.longName || q.shortName || sym,
            sector,
            mcap: knownMeta?.mcap || (q.marketCap || 0),
            last,
            prevClose,
            open: Math.round(q.regularMarketOpen || last),
            high: Math.round(q.regularMarketDayHigh || last),
            low: Math.round(q.regularMarketDayLow || last),
            change: Math.round(q.regularMarketChange || 0),
            changePct: +changePct.toFixed(2),
            volume: q.regularMarketVolume || 0,
            value: (q.regularMarketVolume || 0) * last,
            per: +(15 + changePct * 0.5).toFixed(1),
            pbv: +(1.5 + changePct * 0.02).toFixed(2),
            rsi: Math.min(80, Math.max(20, Math.round(50 + changePct * 3))),
            foreignNet: knownMeta ? Math.round(changePct * (knownMeta.mcap || 1e12) * 0.0002) : 0,
            bid: last - 10,
            ask: last + 10,
            bidVol: Math.round(500000 + Math.random() * 500000),
            askVol: Math.round(500000 + Math.random() * 500000),
            spark: buildSpark(last, changePct),
          }
          return applyMicroTick(base, nowMs)
        })
        .filter(s => s.last > 0)

      // Fetch IHSG separately
      const ihsgMap = await fetchBatch(['^JKSE'], crumb, cookie)
      const ihsg = buildIHSG(ihsgMap['^JKSE'])

      return res.status(200).json({ stocks, ihsg, timestamp: nowMs, total: stocks.length })
    }

    // Fallback ke 70 saham STOCKS_META
    const symbols = [...STOCKS_META.map(m => m.sym + '.JK'), '^JKSE']
    const quoteMap = await fetchBatch(symbols, crumb, cookie)
    const stocks = STOCKS_META.map(meta => {
      const base = buildStockFromQuote(meta, quoteMap[meta.sym + '.JK'])
      return applyMicroTick(base, nowMs)
    })
    const ihsg = buildIHSG(quoteMap['^JKSE'])

    res.status(200).json({ stocks, ihsg, timestamp: nowMs, total: stocks.length })
  } catch (err) {
    console.error('stocks handler error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

function mapSector(sector) {
  const map = {
    'Financial Services': 'FINANCIAL', 'Consumer Defensive': 'CONSUMER',
    'Consumer Cyclical': 'CONSUMER', 'Energy': 'ENERGY', 'Basic Materials': 'BASIC',
    'Industrials': 'INDUSTRIAL', 'Communication Services': 'INFRA',
    'Real Estate': 'PROPERTY', 'Healthcare': 'HEALTH', 'Technology': 'TECH',
  }
  return map[sector] || 'OTHER'
}

function buildSpark(last, changePct, points = 20) {
  const arr = []
  let v = last * (1 - changePct / 100)
  const step = changePct / 100 / points
  for (let i = 0; i < points; i++) {
    v = v * (1 + step + (Math.random() - 0.5) * 0.002)
    arr.push(+v.toFixed(0))
  }
  return arr
}
