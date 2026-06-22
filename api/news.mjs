// api/news.js — GET /api/news → { news[], timestamp }
import { STOCKS_META } from './_lib/market.mjs'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function classifySentiment(title) {
  const pos = /\b(naik|gain|surge|rally|rebound|record|boom|kenaikan|menguat|terdongkrak|optimis|beli|akumulasi)\b/i.test(title)
  const neg = /\b(turun|loss|drop|fall|anjlok|merosot|decline|tekanan|khawat|rugi|defisit|resesi|denda|sanksi|bermasalah)\b/i.test(title)
  if (pos) return 'positive'
  if (neg) return 'negative'
  return 'neutral'
}

function extractSymbol(title) {
  const matches = title.match(/\b([A-Z]{4})\b/g)
  if (!matches) return null
  for (const m of matches) {
    if (STOCKS_META.some(s => s.sym === m)) return m
  }
  return null
}

function parseRSS(xml, source) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const get = (tag) => {
      let m = block.match(/<!\[CDATA\[(.*?)\]\]>/s)
      if (!m) m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 's'))
      return m ? m[1].trim() : ''
    }
    const title = get('title').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    const link = get('link')
    const pubDate = get('pubDate')
    const rawGuid = get('guid')
    const url = link || rawGuid

    if (title && title.length > 15) {
      let ts = Date.now()
      try { if (pubDate) ts = new Date(pubDate).getTime() } catch {}

      const t = title.toLowerCase()
      let tag = 'Market'
      if (/\b(rupiah|dolar|valas|forex)\b/i.test(t)) tag = 'Forex'
      else if (/\b(komoditas|batu bara|emas|nikel|minyak)\b/i.test(t)) tag = 'Komoditas'
      else if (/\b(saham|emiten|idx|bursa|ipo|listing)\b/i.test(t)) tag = 'Saham'
      else if (/\b(bank|bi|suku bunga|ojk)\b/i.test(t)) tag = 'Perbankan'
      else if (/\b(makro|ekonomi|pemerintah|presiden|pajak|tax)\b/i.test(t)) tag = 'Makro'

      items.push({
        id: url || (Date.now() + Math.random()),
        title,
        tag,
        sym: extractSymbol(title),
        sentiment: classifySentiment(title),
        source,
        ts,
        url,
      })
    }
  }
  return items
}

function getFallback() {
  return [
    { id: 1001, title: 'IHSG bergerak positif di awal sesi, sektor keuangan memimpin', tag: 'Market', sym: null, sentiment: 'positive', source: 'IDX', ts: Date.now() - 15 * 60000, url: '' },
    { id: 1002, title: 'Rupiah stabil di kisaran Rp 15.800/USD jelang keputusan BI', tag: 'Forex', sym: null, sentiment: 'neutral', source: 'JISDOR', ts: Date.now() - 30 * 60000, url: '' },
    { id: 1003, title: 'Asing net buy Rp 312 miliar, BBRI dan TLKM paling diminati', tag: 'Market', sym: 'BBRI', sentiment: 'positive', source: 'RTI', ts: Date.now() - 45 * 60000, url: '' },
    { id: 1004, title: 'Harga nikel menguat, ANTM dan INCO mendapat sentimen positif', tag: 'Komoditas', sym: 'ANTM', sentiment: 'positive', source: 'Reuters', ts: Date.now() - 60 * 60000, url: '' },
    { id: 1005, title: 'BI pertahankan suku bunga 5.75%, pasar merespons terbatas', tag: 'Makro', sym: null, sentiment: 'neutral', source: 'Bank Indonesia', ts: Date.now() - 90 * 60000, url: '' },
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

  // Deduplicate + sort
  const seen = new Set()
  const unique = allNews.filter(n => {
    const key = n.title.slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((a, b) => b.ts - a.ts)

  const news = unique.length > 0 ? unique.slice(0, 30) : getFallback()
  res.status(200).json({ news, timestamp: Date.now(), real: unique.length > 0 })
}
