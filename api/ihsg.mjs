// api/ihsg.js — GET /api/ihsg → { value, change, changePct, spark, timestamp }
import { fetchBatchQuotes, buildIHSG } from './lib/market.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10')

  try {
    const quoteMap = await fetchBatchQuotes()
    const ihsg = buildIHSG(quoteMap['^JKSE'])
    res.status(200).json({ ...ihsg, timestamp: Date.now() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
