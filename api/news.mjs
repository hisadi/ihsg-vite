// api/news.mjs — GET /api/news → { news[], timestamp }
import { STOCKS_META } from './lib/market.mjs'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Build lookup: sym (tanpa .JK) dan keyword nama perusahaan
const TICKER_LOOKUP = STOCKS_META.map(m => ({
  sym: m.sym.replace('.JK', ''),
  name: m.name,
  keywords: [
    m.sym.replace('.JK', ''),
    ...m.name.split(' ').filter(w => w.length >= 4 && !['tbk.','tbk','pt','dan','dan','the'].includes(w.toLowerCase()))
  ]
}))

function classifySentiment(title) {
  const pos = /\b(naik|gain|surge|rally|rebound|record|boom|kenaikan|menguat|terdongkrak|optimis|beli|akumulasi|profit|laba|dividen|ekspansi|positif)\b/i.test(title)
  const neg = /\b(turun|loss|drop|fall|anjlok|merosot|decline|tekanan|rugi|defisit|resesi|denda|sanksi|bermasalah|negatif|koreksi|jual|delisting)\b/i.test(title)
  if (pos && !neg) return 'positive'
  if (neg && !pos) return 'negative'
  return 'neutral'
}

function extractSymbol(title) {
  const titleUpper = title.toUpperCase()
  const titleLower = title.toLowerCase()

  // Cari kode 4 huruf kapital dulu
  const codeMatches = title.match(/\b([A-Z]{4})\b/g) || []
  for (const m of codeMatches) {
    if (TICKER_LOOKUP.some(t => t.sym === m)) return m
  }

  // Cari berdasarkan nama perusahaan
  for (const ticker of TICKER_LOOKUP) {
    for (const kw of ticker.keywords) {
      if (kw.length >= 5 && titleLower.includes(kw.toLowerCase())) {
        return ticker.sym
      }
    }
  }

  return null
}

function parseRSS(xml, source) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const getTag = (tag) => {
      // Try CDATA
      const cdataMatch = block.match(new RegExp('<' + tag + '[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/' + tag + '>', 'i'))
      if (cdataMatch) return cdataMatch[1].trim()
      // Plain text
      const plainMatch = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'))
      return plainMatch ? plainMatch[1].replace(/<[^>]+>/g, '').trim() : ''
    }

    const title = getTag('title')
    const link = getTag('link') || getTag('guid')
    const pubDate = getTag('pubDate')

    if (!title || title.length < 15) continue

    let ts = Date.now()
    try { if (pubDate) ts = new Date(pubDate).getTime() } catch {}
    if (isNaN(ts)) ts = Date.now()

    const t = title.toLowerCase()
    let tag = 'Market'
    if (/rupiah|dolar|valas|forex|kurs/.test(t)) tag = 'Forex'
    else if (/komoditas|batu bara|emas|nikel|minyak|timah|tembaga/.test(t)) tag = 'Komoditas'
    else if (/saham|emiten|idx|bursa|ipo|listing|right issue/.test(t)) tag = 'Saham'
    else if (/bank|suku bunga|ojk|lps|bi rate|kredit/.test(t)) tag = 'Perbankan'
    else if (/ekonomi|pemerintah|presiden|pajak|apbn|inflasi|gdp|pertumbuhan/.test(t)) tag = 'Makro'
    else if (/laba|rugi|pendapatan|kinerja|laporan keuangan|semester|kuartal/.test(t)) tag = 'Kinerja'

    const sym = extractSymbol(title)

    items.push({
      id: link || `${source}-${ts}-${Math.random()}`,
      title,
      tag,
      sym,
      sentiment: classifySentiment(title),
      source,
      ts,
      url: link || '',
    })
  }
  return items
}

function getFallback() {
  return [
    { id: 1001, title: 'IHSG bergerak positif di awal sesi, sektor keuangan memimpin', tag: 'Market', sym: null, sentiment: 'positive', source: 'IDX', ts: Date.now() - 15*60000, url: '' },
    { id: 1002, title: 'Rupiah stabil di kisaran Rp 15.800/USD jelang keputusan BI', tag: 'Forex', sym: null, sentiment: 'neutral', source: 'BI', ts: Date.now() - 30*60000, url: '' },
    { id: 1003, title: 'Asing net buy Rp 312 miliar, BBRI dan Telkom paling diminati', tag: 'Market', sym: 'BBRI', sentiment: 'positive', source: 'RTI', ts: Date.now() - 45*60000, url: '' },
    { id: 1004, title: 'Harga nikel menguat, Aneka Tambang dan Vale mendapat sentimen positif', tag: 'Komoditas', sym: 'ANTM', sentiment: 'positive', source: 'Reuters', ts: Date.now() - 60*60000, url: '' },
    { id: 1005, title: 'BI pertahankan suku bunga 5.75%, pasar merespons terbatas', tag: 'Makro', sym: null, sentiment: 'neutral', source: 'Bank Indonesia', ts: Date.now() - 90*60000, url: '' },
  ]
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=300')

  const allNews = []
  const rssSources = [
    { url: 'https://www.cnbcindonesia.com/market/rss', source: 'CNBC Indonesia' },
    { url: 'https://www.cnbcindonesia.com/news/rss', source: 'CNBC Indonesia' },
    { url: 'https://finance.detik.com/rss', source: 'Detik Finance' },
    { url: 'https://www.cnbcindonesia.com/investment/rss', source: 'CNBC Indonesia' },
  ]

  await Promise.allSettled(rssSources.map(async ({ url, source }) => {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(8000),
      })
      if (!resp.ok) return
      const xml = await resp.text()
      allNews.push(...parseRSS(xml, source))
    } catch {}
  }))

  // Deduplicate by title
  const seen = new Set()
  const unique = allNews.filter(n => {
    const key = n.title.slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((a, b) => b.ts - a.ts)

  const news = unique.length > 0 ? unique.slice(0, 50) : getFallback()
  res.status(200).json({ news, timestamp: Date.now(), real: unique.length > 0 })
}
