// api/stocks.js — GET /api/stocks → { stocks[], ihsg, timestamp }
import { STOCKS_META, fetchBatchQuotes, buildStockFromQuote, buildIHSG, applyMicroTick } from './_lib/market.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10')

  try {
    const quoteMap = await fetchBatchQuotes()
    const nowMs = Date.now()

    const stocks = STOCKS_META.map(meta => {
      const q = quoteMap[meta.sym + '.JK']
      const base = buildStockFromQuote(meta, q)
      return applyMicroTick(base, nowMs)
    })

    const ihsgQuote = quoteMap['^JKSE']
    const ihsg = buildIHSG(ihsgQuote)

    res.status(200).json({ stocks, ihsg, timestamp: nowMs })
  } catch (err) {
    console.error('stocks handler error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
