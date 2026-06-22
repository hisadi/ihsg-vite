// api/stock/[symbol].js — GET /api/stock/BBCA → detail satu saham
import { STOCKS_META, fetchBatchQuotes, buildStockFromQuote, applyMicroTick } from '../lib/market.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { symbol } = req.query
  const meta = STOCKS_META.find(m => m.sym === symbol?.toUpperCase())
  if (!meta) return res.status(404).json({ error: 'Symbol not found' })

  try {
    const quoteMap = await fetchBatchQuotes()
    const q = quoteMap[meta.sym + '.JK']
    const base = buildStockFromQuote(meta, q)
    const stock = applyMicroTick(base, Date.now())
    res.status(200).json(stock)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
