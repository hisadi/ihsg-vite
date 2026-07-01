// api/lib/rsi.mjs — Hitung RSI-14 akurat dari data historis Yahoo Finance
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Cache RSI per simbol (6 jam)
let rsiCache = {}
let rsiCacheTime = 0
const RSI_CACHE_TTL = 6 * 60 * 60 * 1000

// Hitung RSI-14 dari array closes (chronological order)
function calcRSI14(closes) {
  if (!closes || closes.length < 15) return null

  const gains = []
  const losses = []
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    gains.push(diff > 0 ? diff : 0)
    losses.push(diff < 0 ? -diff : 0)
  }

  // Wilder's smoothing method (standar RSI)
  const period = 14
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  const rsi = 100 - (100 / (1 + rs))
  return Math.round(rsi)
}

// Fetch historis 1 bulan untuk satu simbol
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

// Fetch RSI untuk banyak simbol sekaligus, dengan concurrency limit
async function fetchRSIBatch(symbols, concurrency = 30) {
  const results = {}
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const closes = await fetchHistoricalCloses(sym)
        const rsi = closes ? calcRSI14(closes) : null
        return { sym, rsi }
      })
    )
    batchResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value.rsi !== null) {
        results[r.value.sym] = r.value.rsi
      }
    })
  }
  return results
}

// Ambil RSI real untuk daftar simbol, pakai cache 6 jam
// Hanya update saham yang belum ada di cache atau cache expired
export async function getRealRSI(symbols) {
  const now = Date.now()
  const cacheExpired = now - rsiCacheTime > RSI_CACHE_TTL

  if (cacheExpired) {
    rsiCache = {}
  }

  // Cari simbol yang belum ada di cache
  const missingSymbols = symbols.filter(s => !(s in rsiCache))

  if (missingSymbols.length > 0) {
    // Batasi jumlah fetch per invocation supaya tidak timeout
    // Prioritaskan yang paling sering diakses dulu (misal 300 pertama)
    const toFetch = missingSymbols.slice(0, 300)
    const newRSI = await fetchRSIBatch(toFetch)
    Object.assign(rsiCache, newRSI)
    rsiCacheTime = now
  }

  return { ...rsiCache }
}

export { calcRSI14 }
