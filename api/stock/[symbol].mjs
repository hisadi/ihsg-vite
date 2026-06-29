// api/stock/[symbol].mjs — GET /api/stock/BBCA → detail satu saham (any IDX stock)
import { STOCKS_META, fetchBatchQuotes, buildStockFromQuote, applyMicroTick, SECTOR_LABELS } from '../lib/market.mjs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchSingleQuote(sym) {
  const ticker = sym.toUpperCase() + '.JK'
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
  if (!resp.ok) throw new Error(`Yahoo fetch failed: ${resp.status}`)
  const data = await resp.json()
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error('No data')

  const meta = result.meta
  const last = meta.regularMarketPrice ?? 0
  const prevClose = meta.chartPreviousClose ?? last
  const change = last - prevClose
  const changePct = prevClose ? (change / prevClose) * 100 : 0

  return {
    symbol: sym.toUpperCase(),
    name: meta.longName || meta.shortName || sym.toUpperCase(),
    sector: 'OTHER',
    mcap: 0,
    last: Math.round(last),
    prevClose: Math.round(prevClose),
    open: Math.round(meta.regularMarketOpen ?? last),
    high: Math.round(meta.regularMarketDayHigh ?? last),
    low: Math.round(meta.regularMarketDayLow ?? last),
    change: Math.round(change),
    changePct: +changePct.toFixed(2),
    volume: meta.regularMarketVolume ?? 0,
    value: (meta.regularMarketVolume ?? 0) * last,
    per: 0, pbv: 0,
    rsi: Math.min(80, Math.max(20, Math.round(50 + changePct * 3))),
    foreignNet: 0,
    bid: Math.round(last - 10),
    ask: Math.round(last + 10),
    bidVol: 0, askVol: 0,
    spark: result.indicators?.quote?.[0]?.close?.filter(Boolean).map(v => Math.round(v)) || [last],
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { symbol } = req.query
  if (!symbol) return res.status(400).json({ error: 'Symbol required' })

  const sym = symbol.toUpperCase()

  try {
    // Try from batch first (faster for stocks in STOCKS_META)
    const knownMeta = STOCKS_META.find(m => m.sym === sym)
    if (knownMeta) {
      const quoteMap = await fetchBatchQuotes()
      const q = quoteMap[sym + '.JK']
      const base = buildStockFromQuote(knownMeta, q)
      const stock = applyMicroTick(base, Date.now())
      return res.status(200).json(stock)
    }

    // Fetch unknown stock individually
    const stock = await fetchSingleQuote(sym)
    return res.status(200).json(stock)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
