// api/update-rsi.mjs — POST /api/update-rsi → update RSI batch ke Supabase
// Dipanggil berkali-kali dari frontend (per batch) sampai semua saham ter-update
import { calcRSI14 } from './lib/rsi.mjs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SUPABASE_URL = 'https://pvqbjqjjwwcmzajldlzo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cWJqcWpqd3djbXphamxkbHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjk1NzksImV4cCI6MjA5NjY0NTU3OX0.3IeD44BUsjvlvRQU6lcfWysT5nyZxq9eZCNEZ2HN-WA'

async function fetchHistoricalCloses(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.JK?interval=1d&range=1mo`
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close
    if (!closes) return null
    return closes.filter(c => c != null)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbols } = req.body || {}
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: 'symbols array required' })
  }

  // Batasi max 50 simbol per call supaya tidak timeout
  const batch = symbols.slice(0, 50)

  try {
    const results = await Promise.allSettled(
      batch.map(async (sym) => {
        const closes = await fetchHistoricalCloses(sym)
        const rsi = closes ? calcRSI14(closes) : null
        return { sym, rsi }
      })
    )

    const validResults = results
      .filter(r => r.status === 'fulfilled' && r.value.rsi !== null)
      .map(r => ({
        sym: r.value.sym,
        rsi: r.value.rsi,
        updated_at: new Date().toISOString(),
      }))

    if (validResults.length > 0) {
      const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/stock_rsi?on_conflict=sym`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(validResults),
      })
      if (!upsertResp.ok) {
        const errText = await upsertResp.text()
        throw new Error(`Supabase upsert failed: ${upsertResp.status} ${errText}`)
      }
    }

    res.status(200).json({
      processed: batch.length,
      updated: validResults.length,
      failed: batch.length - validResults.length,
    })
  } catch (err) {
    console.error('update-rsi error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
