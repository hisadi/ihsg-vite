// api/tickers.mjs — GET /api/tickers → list semua saham IDX dari Yahoo Finance
// Fetch dengan crumb+cookie sama seperti market.mjs

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

async function fetchTickersBatch(crumb, cookie, offset, size = 250) {
  const resp = await fetch(
    `https://query1.finance.yahoo.com/v1/finance/screener?formatted=false&region=ID&lang=en-US&crumb=${encodeURIComponent(crumb)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA,
        'Cookie': cookie,
      },
      body: JSON.stringify({
        offset,
        size,
        sortField: 'marketCap',
        sortType: 'DESC',
        quoteType: 'EQUITY',
        query: {
          operator: 'AND',
          operands: [{ operator: 'EQ', operands: ['exchange', 'JKT'] }]
        },
        userId: '',
        userIdType: 'guid'
      }),
      signal: AbortSignal.timeout(15000),
    }
  )
  if (!resp.ok) throw new Error(`Screener failed: ${resp.status}`)
  const data = await resp.json()
  return data?.finance?.result?.[0]?.quotes || []
}

// Simple in-memory cache
let cachedTickers = null
let cacheTime = 0
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 jam

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600')

  // Return cache kalau masih fresh
  if (cachedTickers && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json({ tickers: cachedTickers, total: cachedTickers.length, cached: true })
  }

  try {
    const { crumb, cookie } = await getYahooCrumb()
    if (!crumb) throw new Error('Could not get Yahoo crumb')

    // Fetch semua batch paralel (offset 0, 250, 500, 750)
    const batches = await Promise.allSettled([
      fetchTickersBatch(crumb, cookie, 0, 250),
      fetchTickersBatch(crumb, cookie, 250, 250),
      fetchTickersBatch(crumb, cookie, 500, 250),
      fetchTickersBatch(crumb, cookie, 750, 250),
    ])

    const allQuotes = []
    batches.forEach(b => {
      if (b.status === 'fulfilled') allQuotes.push(...b.value)
    })

    if (allQuotes.length === 0) throw new Error('No tickers returned')

    // Map ke format yang dibutuhkan
    const tickers = allQuotes.map(q => ({
      sym: q.symbol?.replace('.JK', '') || '',
      name: q.longName || q.shortName || '',
      sector: mapSector(q.sector),
      mcap: q.marketCap || 0,
      last: q.regularMarketPrice || 0,
      changePct: q.regularMarketChangePercent || 0,
    })).filter(t => t.sym && t.sym.length >= 2 && t.sym.length <= 4)

    cachedTickers = tickers
    cacheTime = Date.now()

    res.status(200).json({ tickers, total: tickers.length, cached: false })
  } catch (err) {
    // Kalau gagal tapi ada cache lama, return cache lama
    if (cachedTickers) {
      return res.status(200).json({ tickers: cachedTickers, total: cachedTickers.length, cached: true, stale: true })
    }
    res.status(500).json({ error: err.message })
  }
}

function mapSector(sector) {
  const map = {
    'Financial Services': 'FINANCIAL',
    'Consumer Defensive': 'CONSUMER',
    'Consumer Cyclical': 'CONSUMER',
    'Energy': 'ENERGY',
    'Basic Materials': 'BASIC',
    'Industrials': 'INDUSTRIAL',
    'Communication Services': 'INFRA',
    'Real Estate': 'PROPERTY',
    'Healthcare': 'HEALTH',
    'Technology': 'TECH',
    'Utilities': 'INFRA',
  }
  return map[sector] || 'OTHER'
}
