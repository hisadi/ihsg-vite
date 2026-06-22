// api/sectors.js — GET /api/sectors → sector performance array
import { STOCKS_META, SECTOR_LABELS, fetchBatchQuotes, buildStockFromQuote } from './_lib/market.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')

  try {
    const quoteMap = await fetchBatchQuotes()

    const sectorMap = {}
    STOCKS_META.forEach(meta => {
      const q = quoteMap[meta.sym + '.JK']
      const st = buildStockFromQuote(meta, q)
      if (!sectorMap[meta.sector]) sectorMap[meta.sector] = []
      sectorMap[meta.sector].push(st)
    })

    const result = Object.entries(sectorMap).map(([key, stocks]) => {
      const totalMcap = stocks.reduce((a, s) => a + (s.mcap || 0), 0)
      const wAvg = stocks.reduce((a, s) => a + (s.mcap || 0) * (s.changePct || 0), 0) / (totalMcap || 1)
      return {
        key,
        label: SECTOR_LABELS[key] || key,
        change: +wAvg.toFixed(2),
        count: stocks.length,
      }
    })

    res.status(200).json(result.sort((a, b) => b.change - a.change))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
