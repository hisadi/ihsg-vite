// IHSG Realtime Server — Express + Yahoo Finance + SSE real-time stream
import express from 'express'
import axios from 'axios'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = 3001

const STOCKS_META = [
  { sym: 'BBCA.JK', name: 'Bank Central Asia',        sector: 'FINANCIAL' },
  { sym: 'BBRI.JK', name: 'Bank Rakyat Indonesia',     sector: 'FINANCIAL' },
  { sym: 'BMRI.JK', name: 'Bank Mandiri',              sector: 'FINANCIAL' },
  { sym: 'BBNI.JK', name: 'Bank Negara Indonesia',     sector: 'FINANCIAL' },
  { sym: 'BRIS.JK', name: 'Bank Syariah Indonesia',    sector: 'FINANCIAL' },
  { sym: 'BTPS.JK', name: 'Bank BTPN Syariah',         sector: 'FINANCIAL' },
  { sym: 'BBTN.JK', name: 'Bank Tabungan Negara',      sector: 'FINANCIAL' },
  { sym: 'ARTO.JK', name: 'Bank Jago',                 sector: 'FINANCIAL' },
  { sym: 'NISP.JK', name: 'Bank OCBC NISP',            sector: 'FINANCIAL' },
  { sym: 'UNVR.JK', name: 'Unilever Indonesia',        sector: 'CONSUMER' },
  { sym: 'ICBP.JK', name: 'Indofood CBP',              sector: 'CONSUMER' },
  { sym: 'INDF.JK', name: 'Indofood Sukses Makmur',    sector: 'CONSUMER' },
  { sym: 'MYOR.JK', name: 'Mayora Indah',              sector: 'CONSUMER' },
  { sym: 'GGRM.JK', name: 'Gudang Garam',              sector: 'CONSUMER' },
  { sym: 'HMSP.JK', name: 'HM Sampoerna',              sector: 'CONSUMER' },
  { sym: 'SIDO.JK', name: 'Industri Jamu Sido Muncul', sector: 'CONSUMER' },
  { sym: 'KLBF.JK', name: 'Kalbe Farma',              sector: 'CONSUMER' },
  { sym: 'AMRT.JK', name: 'Sumber Alfaria Trijaya',    sector: 'CONSUMER' },
  { sym: 'MAPI.JK', name: 'Mitra Adiperkasa',          sector: 'CONSUMER' },
  { sym: 'ACES.JK', name: 'Ace Hardware Indonesia',    sector: 'CONSUMER' },
  { sym: 'CPIN.JK', name: 'Charoen Pokphand Indonesia',sector: 'CONSUMER' },
  { sym: 'JPFA.JK', name: 'Japfa Comfeed',            sector: 'CONSUMER' },
  { sym: 'PTBA.JK', name: 'Bukit Asam',                sector: 'ENERGY' },
  { sym: 'ADRO.JK', name: 'Adaro Energy',              sector: 'ENERGY' },
  { sym: 'ITMG.JK', name: 'Indo Tambangraya Megah',    sector: 'ENERGY' },
  { sym: 'MEDC.JK', name: 'Medco Energi',              sector: 'ENERGY' },
  { sym: 'INDY.JK', name: 'Indika Energy',             sector: 'ENERGY' },
  { sym: 'AKRA.JK', name: 'AKR Corporindo',            sector: 'ENERGY' },
  { sym: 'HRUM.JK', name: 'Harum Energy',              sector: 'ENERGY' },
  { sym: 'PGAS.JK', name: 'Perusahaan Gas Negara',     sector: 'ENERGY' },
  { sym: 'ANTM.JK', name: 'Aneka Tambang',             sector: 'BASIC' },
  { sym: 'INCO.JK', name: 'Vale Indonesia',              sector: 'BASIC' },
  { sym: 'MDKA.JK', name: 'Merdeka Copper Gold',       sector: 'BASIC' },
  { sym: 'TINS.JK', name: 'Timah',                     sector: 'BASIC' },
  { sym: 'INKP.JK', name: 'Indah Kiat Pulp & Paper',   sector: 'BASIC' },
  { sym: 'TKIM.JK', name: 'Pabrik Kertas Tjiwi Kimia', sector: 'BASIC' },
  { sym: 'SMGR.JK', name: 'Semen Indonesia',           sector: 'BASIC' },
  { sym: 'INTP.JK', name: 'Indocement Tunggal Prakarsa',sector: 'BASIC' },
  { sym: 'BRPT.JK', name: 'Barito Pacific',            sector: 'BASIC' },
  { sym: 'TPIA.JK', name: 'Chandra Asri Pacific',       sector: 'BASIC' },
  { sym: 'ASII.JK', name: 'Astra International',        sector: 'INDUSTRIAL' },
  { sym: 'UNTR.JK', name: 'United Tractors',            sector: 'INDUSTRIAL' },
  { sym: 'IMAS.JK', name: 'Indomobil Sukses',          sector: 'INDUSTRIAL' },
  { sym: 'AUTO.JK', name: 'Astra Otoparts',             sector: 'INDUSTRIAL' },
  { sym: 'TLKM.JK', name: 'Telkom Indonesia',           sector: 'INFRA' },
  { sym: 'EXCL.JK', name: 'XL Axiata',                 sector: 'INFRA' },
  { sym: 'ISAT.JK', name: 'Indosat Ooredoo',           sector: 'INFRA' },
  { sym: 'MTEL.JK', name: 'Dayamitra Telekomunikasi',   sector: 'INFRA' },
  { sym: 'TOWR.JK', name: 'Sarana Menara Nusantara',    sector: 'INFRA' },
  { sym: 'TBIG.JK', name: 'Tower Bersama Infrastructure',sector: 'INFRA' },
  { sym: 'JSMR.JK', name: 'Jasa Marga',                 sector: 'INFRA' },
  { sym: 'WIKA.JK', name: 'Wijaya Karya',               sector: 'INFRA' },
  { sym: 'PTPP.JK', name: 'PP (Persero)',               sector: 'INFRA' },
  { sym: 'BSDE.JK', name: 'Bumi Serpong Damai',         sector: 'PROPERTY' },
  { sym: 'CTRA.JK', name: 'Ciputra Development',        sector: 'PROPERTY' },
  { sym: 'SMRA.JK', name: 'Summarecon Agung',           sector: 'PROPERTY' },
  { sym: 'PWON.JK', name: 'Pakuwon Jati',              sector: 'PROPERTY' },
  { sym: 'LPKR.JK', name: 'Lippo Karawaci',             sector: 'PROPERTY' },
  { sym: 'SILO.JK', name: 'Siloam International Hospitals',sector: 'HEALTH' },
  { sym: 'MIKA.JK', name: 'Mitra Keluarga Karyasehat',  sector: 'HEALTH' },
  { sym: 'HEAL.JK', name: 'Medikaloka Hermina',         sector: 'HEALTH' },
  { sym: 'KAEF.JK', name: 'Kimia Farma',                sector: 'HEALTH' },
  { sym: 'GOTO.JK', name: 'GoTo Gojek Tokopedia',       sector: 'TECH' },
  { sym: 'BUKA.JK', name: 'Bukalapak.com',              sector: 'TECH' },
  { sym: 'EMTK.JK', name: 'Elang Mahkota Teknologi',    sector: 'TECH' },
  { sym: 'MTDL.JK', name: 'Metrodata Electronics',       sector: 'TECH' },
  { sym: 'SMDR.JK', name: 'Samudera Indonesia',         sector: 'TRANSPORT' },
  { sym: 'GIAA.JK', name: 'Garuda Indonesia',            sector: 'TRANSPORT' },
  { sym: 'ASSA.JK', name: 'Adi Sarana Armada',          sector: 'TRANSPORT' },
]

const IHSG_SYM = '^JKSE'
const SECTOR_LABELS = {
  'FINANCIAL':'Keuangan','CONSUMER':'Konsumer','ENERGY':'Energi',
  'BASIC':'Material','INDUSTRIAL':'Industri','INFRA':'Infrastruktur',
  'PROPERTY':'Properti','HEALTH':'Kesehatan','TECH':'Teknologi','TRANSPORT':'Transportasi',
}

// --- Stock state ---
const stockState = {}
const ihsgState = { value: 7300, change: 0, changePct: 0, spark: [] }

function initStockState() {
  STOCKS_META.forEach(m => {
    stockState[m.sym] = {
      ...m,
      last: 1000, prevClose: 1000, open: 1000, high: 1000, low: 1000,
      change: 0, changePct: 0, volume: 0, value: 0, mcap: 1e12,
      per: 15, pbv: 1, eps: 50, div: 2, foreignNet: 0, beta: 1, rsi: 50,
      bid: 1000, ask: 1005, bidVol: 100000, askVol: 100000, spark: [], bars: [],
    }
  })
}
initStockState()

// --- SSE ---
let sseClients = []
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  sseClients.forEach(res => { try { res.write(payload) } catch(e) {} })
}

// --- Yahoo Finance ---
async function fetchYahooQuote(sym) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=5d`
    const resp = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 })
    const result = resp.data?.chart?.result?.[0]
    if (!result) return null
    const meta = result.meta
    const quote = result.indicators?.quote?.[0]
    const closes = (quote?.close || []).filter(v => v != null)
    const prevClose = meta.previousClose || (closes.length >= 2 ? closes[closes.length - 2] : null)
    const last = meta.regularMarketPrice || (closes.length > 0 ? closes[closes.length - 1] : null)
    let change = null, changePct = null
    if (prevClose && last && prevClose > 0) {
      change = last - prevClose
      changePct = (change / prevClose) * 100
    }
    return {
      last: last || 0,
      prevClose: prevClose || last || 0,
      open: meta.regularMarketOpen || (closes.length > 0 ? closes[closes.length - 1] : last),
      high: meta.regularMarketDayHigh || (closes.length > 0 ? Math.max(...closes) : last),
      low: meta.regularMarketDayLow || (closes.length > 0 ? Math.min(...closes.filter(v => v > 0)) : last),
      volume: meta.regularMarketVolume || 0,
      change: change || 0,
      changePct: changePct || 0,
    }
  } catch { return null }
}

async function refreshQuotes() {
  console.log('[' + new Date().toLocaleTimeString('id-ID') + '] Fetching Yahoo Finance quotes...')
  for (const meta of STOCKS_META) {
    const q = await fetchYahooQuote(meta.sym)
    if (q && q.last > 0) {
      Object.assign(stockState[meta.sym], q)
      // Seed price history with close prices for RSI
      const histUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${meta.sym}?interval=1d&range=1mo`
      try {
        const r = await axios.get(histUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 })
        const closes = (r.data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter(v => v != null)
        priceHistory[meta.sym] = closes.slice(-30)
      } catch {}
    }
  }
  const iq = await fetchYahooQuote(IHSG_SYM)
  if (iq && iq.last > 0) {
    ihsgState.value = iq.last
    ihsgState.prevClose = iq.prevClose
    ihsgState.change = iq.change
    ihsgState.changePct = iq.changePct
  }
  console.log('[' + new Date().toLocaleTimeString('id-ID') + '] Done. IHSG=' + ihsgState.value)
}

// --- Real News from Indonesian RSS Feeds ---
const CACHED_NEWS = []
let lastNewsFetch = 0

// Parse Indonesian financial keywords for sentiment
function classifySentiment(title) {
  const t = title.toLowerCase()
  const pos = /\b(naik|mera|_gain|surge|rally|l-profit|rebound|record|boom|beat|kenaikan|menguat|terdongkrak|terangkat|optimis|peluang|beli|akumulasi)\b/i.test(t)
  const neg = /\b(turun|loss|drop|fall|anjlok|t-merosot|turun|risak|decline|miss|tekanan|khawat|rugi|defisit|resesi|denda|sanksi|bermasalah)\b/i.test(t)
  if (pos) return 'positive'
  if (neg) return 'negative'
  return 'neutral'
}

// Extract stock symbol from news title
function extractSymbol(title) {
  const matches = title.match(/\b([A-Z]{4})\b/g)
  if (!matches) return null
  for (const m of matches) {
    if (STOCKS_META.some(s => s.sym.replace('.JK','') === m)) return m
  }
  return null
}

// Simple RSS XML parser
function parseRSS(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const get = (tag) => {
      // Try CDATA first, then plain text
      let m = block.match(new RegExp('<!\\[CDATA\\[(.*?)\\]\\]>', 's'))
      if (!m) m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 's'))
      return m ? m[1].trim() : ''
    }
    const title = get('title')
    const link = get('link')
    const desc = get('description')
    const pubDate = get('pubDate')
    const rawGuid = get('guid')
    const url = link || rawGuid

    if (title && title.length > 15) {
      let ts = Date.now()
      try {
        if (pubDate) ts = new Date(pubDate).getTime()
      } catch {}

      // Classify tag
      const t = title.toLowerCase()
      let tag = 'Market'
      if (/\b(rupiah|dolar|valas|forex)\b/i.test(t)) tag = 'Forex'
      else if (/\b(komoditas|batu bara|emas|nikel|minyak)\b/i.test(t)) tag = 'Komoditas'
      else if (/\b(saham|emiten|idx|bursa|iposcp|listing)\b/i.test(t)) tag = 'Saham'
      else if (/\b(bank|bi|suku bunga|ojk)\b/i.test(t)) tag = 'Perbankan'
      else if (/\b(makro|ekonomi|pemerintah|presiden|tax|pajak)\b/i.test(t)) tag = 'Makro'

      items.push({
        id: url || (Date.now() + Math.random()),
        title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
        tag,
        sym: extractSymbol(title),
        sentiment: classifySentiment(title),
        source: 'CNBC Indonesia',
        ts,
        url,
      })
    }
  }
  return items
}

async function fetchRealNews() {
  const allNews = []
  const rssSources = [
    'https://www.cnbcindonesia.com/market/rss',
    'https://www.cnbcindonesia.com/news/rss',
    'https://finance.detik.com/rss',
  ]

  for (const url of rssSources) {
    try {
      const resp = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        timeout: 8000,
      })
      const items = parseRSS(resp.data)
      const src = url.includes('cnbc') ? 'CNBC Indonesia' : 'Detik Finance'
      items.forEach(item => { item.source = src })
      allNews.push(...items)
    } catch (e) {
      console.log('[' + new Date().toLocaleTimeString('id-ID') + '] RSS failed: ' + url + ' — ' + e.message.slice(0, 50))
    }
  }

  // Add dynamic stock-specific news based on real movers
  const stocks = Object.values(stockState)
  const movers = stocks.filter(s => Math.abs(s.changePct || 0) > 1.0).sort((a,b) => Math.abs(b.changePct) - Math.abs(a.changePct))
  movers.slice(0, 6).forEach((s, i) => {
    const sym = (s.sym || '').replace('.JK', '')
    const dir = s.changePct > 0 ? 'naik' : 'turun'
    const emoji = s.changePct > 0 ? '📈' : '📉'
    allNews.push({
      id: 9000 + i,
      title: `${emoji} ${sym} ${dir} ${Math.abs(s.changePct).toFixed(2)}% ke Rp${Math.round(s.last).toLocaleString('id-ID')} — ${s.changePct > 0 ? 'signal beli' : 'tekanan jual'}`,
      tag: 'Saham',
      sym,
      sentiment: s.changePct > 0 ? 'positive' : 'negative',
      source: 'Real-time Data',
      ts: Date.now() - i * 60000,
      url: '',
    })
  })

  // Deduplicate by title
  const seen = new Set()
  const unique = allNews.filter(n => {
    const key = n.title.slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  unique.sort((a, b) => b.ts - a.ts)
  CACHED_NEWS.length = 0
  CACHED_NEWS.push(...unique.slice(0, 30))
  lastNewsFetch = Date.now()
  console.log('[' + new Date().toLocaleTimeString('id-ID') + '] 📰 News: ' + CACHED_NEWS.length + ' articles from Indonesia RSS')
  return CACHED_NEWS
}

function getFallbackNews() {
  const macroNews = [
    { id: 1001, title: 'IHSG menguat 0.4% di awal sesi, sektor FINANCIAL lift', tag: 'Market', sym: null, sentiment: 'positive', source: 'IDX', ts: Date.now() - 15 * 60000 },
    { id: 1002, title: 'Rupiah ditutup stabil di Rp 15.820/USD jelang RDG BI', tag: 'Forex', sym: null, sentiment: 'neutral', source: 'JISDOR', ts: Date.now() - 30 * 60000 },
    { id: 1003, title: 'Net buy asing Rp 240M, BBRI dan TLKM paling banyak dikoleksi', tag: 'Flow', sym: null, sentiment: 'positive', source: 'RTI', ts: Date.now() - 45 * 60000 },
    { id: 1004, title: 'Harga komoditas nikel naik 2%, ANTM dan INCO diunduh asing', tag: 'Komoditas', sym: null, sentiment: 'positive', source: 'Reuters', ts: Date.now() - 60 * 60000 },
    { id: 1005, title: 'BI pertahan suku bunga 5.75%, IHSG_RESPONS_0.3%', tag: 'Makro', sym: null, sentiment: 'neutral', source: 'BI', ts: Date.now() - 90 * 60000 },
  ]

  // Dynamic stock news based on real price changes
  const stockNews = []
  const stocks = Object.values(stockState)
  const movers = stocks.filter(s => Math.abs(s.changePct || 0) > 0.5)
  movers.slice(0, 8).forEach((s, i) => {
    const sym = s.symbol
    if (s.changePct > 1) {
      stockNews.push({
        id: 5000 + i,
        title: `${sym} naik ${s.changePct.toFixed(2)}% jadi Rp${Math.round(s.last).toLocaleString('id-ID')},${s.changePct > 2 ? ' sinyal bullish' : ' tren positif'}`,
        tag: 'Saham',
        sym,
        sentiment: 'positive',
        source: 'Real-time',
        ts: Date.now() - Math.random() * 60 * 60000,
      })
    } else if (s.changePct < -1) {
      stockNews.push({
        id: 6000 + i,
        title: `${sym} turun ${Math.abs(s.changePct).toFixed(2)}% ke Rp${Math.round(s.last).toLocaleString('id-ID')}, tekanan jual asing`,
        tag: 'Saham',
        sym,
        sentiment: 'negative',
        source: 'Real-time',
        ts: Date.now() - Math.random() * 60 * 60000,
      })
    }
  })

  return [...macroNews, ...stockNews].slice(0, 25)
}

// --- Micro-tick ---
let tickCount = 0

// Track price history for RSI calculation
const priceHistory = {}
STOCKS_META.forEach(m => { priceHistory[m.sym] = [] })

// Sector correlation groups
const SECTOR_BETAS = {
  FINANCIAL: 1.1, CONSUMER: 0.7, ENERGY: 1.3, BASIC: 1.2,
  INDUSTRIAL: 1.0, INFRA: 0.9, PROPERTY: 1.4, HEALTH: 0.8,
  TECH: 1.5, TRANSPORT: 1.2,
}

function microTick() {
  tickCount++
  const allSyms = Object.keys(stockState)
  const N = 12 + Math.floor(Math.random() * 15)
  const picks = new Set()
  while (picks.size < N) picks.add(allSyms[Math.floor(Math.random() * allSyms.length)])

  const movers = []

  // Market-wide sentiment (drifts slowly)
  const marketBias = Math.sin(tickCount * 0.02) * 0.0001 // slow oscillation
  const newsSentiment = (Math.random() - 0.5) * 0.0002 // noise from news events

  picks.forEach(sym => {
    const st = stockState[sym]
    const beta = SECTOR_BETAS[st.sector] || 1.0

    // Price movement: market bias + stock-specific noise + sector correlation
    const marketMove = (marketBias + newsSentiment) * beta
    const stockNoise = (Math.random() - 0.5) * 0.0015 * beta * (0.5 + Math.random())
    const totalDrift = marketMove + stockNoise

    const newPx = Math.max(1, Math.round(st.last * (1 + totalDrift)))

    // Realistic bid/ask spread (tighter for high-volume stocks)
    const baseSpread = st.last * 0.001 // 0.1% base spread
    const spread = Math.max(1, Math.round(baseSpread))
    const bid = newPx - Math.floor(spread / 2)
    const ask = newPx + Math.ceil(spread / 2)

    // Volume simulation — correlates with price movement magnitude
    const priceMovePct = Math.abs(totalDrift * 100)
    const baseVol = st.prevClose > 5000 ? 50000 : st.prevClose > 1000 ? 20000 : 5000
    const volMultiplier = 1 + priceMovePct * 10 // bigger moves = higher volume
    const addV = Math.floor(baseVol * (0.5 + Math.random()) * volMultiplier)

    if (newPx !== st.last) {
      st.last = newPx
      st.change = newPx - st.prevClose
      st.changePct = +((st.change / (st.prevClose || 1)) * 100).toFixed(3)
      st.high = Math.max(st.high, newPx)
      st.low = Math.min(st.low, newPx)
      st.bid = bid
      st.ask = ask

      // Track history for RSI
      priceHistory[sym].push(newPx)
      if (priceHistory[sym].length > 30) priceHistory[sym].shift()

      // RSI calculation (simplified 14-period)
      const hist = priceHistory[sym]
      if (hist.length >= 2) {
        const allGains = [], allLosses = []
        for (let i = 0; i < hist.length - 1; i++) {
          const diff = hist[i + 1] - hist[i]
          if (diff >= 0) allGains.push(diff)
          else allLosses.push(-diff)
        }
        const n = Math.max(allGains.length + allLosses.length, 1)
        const avgGain = allGains.reduce((a, b) => a + b, 0) / n
        const avgLoss = allLosses.reduce((a, b) => a + b, 0) / n
        st.rsi = avgLoss === 0 ? 70 : +((100 - 100 / (1 + avgGain / (avgLoss || 1))).toFixed(1))
      }

      // Foreign net flow simulation (based on price direction + random)
      const foreignBias = st.changePct > 0.5 ? 1 : st.changePct < -0.5 ? -1 : 0
      const foreignVol = Math.floor(addV * (0.1 + Math.random() * 0.3))
      st.foreignNet += foreignBias * foreignVol

      // Add to sparkline
      st.spark.push(newPx)
      if (st.spark.length > 30) st.spark.shift()

      st.volume += addV
      st.value += addV * newPx

      movers.push({
        sym: sym.replace('.JK', ''),
        last: newPx,
        change: st.change,
        changePct: st.changePct,
        volume: st.volume,
        spark: st.spark,
        bid, ask,
        rsi: st.rsi,
      })
    }
  })

  // IHSG: weighted average micro-movement from all stocks
  if (movers.length > 0) {
    const avgChg = movers.reduce((a, m) => a + m.changePct, 0) / movers.length
    ihsgState.value = Math.round(ihsgState.value * (1 + avgChg / 100))
    ihsgState.change = ihsgState.value - ihsgState.prevClose
    ihsgState.changePct = ihsgState.prevClose ? (ihsgState.change / ihsgState.prevClose) * 100 : 0
    ihsgState.spark.push(ihsgState.value)
    if (ihsgState.spark.length > 80) ihsgState.spark.shift()
    broadcast('tick', { timestamp: Date.now(), stocks: movers, ihsg: { ...ihsgState } })
  }
}

// --- REST Endpoints ---
app.get('/api/stocks', (req, res) => {
  const stocks = Object.entries(stockState).map(([sym, st]) => ({
    symbol: sym.replace('.JK', ''), name: st.name, sector: st.sector,
    last: st.last, prevClose: st.prevClose, open: st.open, high: st.high, low: st.low,
    change: st.change, changePct: st.changePct,
    volume: st.volume, value: st.value, mcap: st.mcap,
    per: st.per, pbv: st.pbv, eps: st.eps, div: st.div,
    foreignNet: st.foreignNet, beta: st.beta, rsi: st.rsi,
    bid: st.bid, ask: st.ask, bidVol: st.bidVol, askVol: st.askVol, spark: st.spark,
  }))
  res.json({ stocks, ihsg: ihsgState, timestamp: Date.now() })
})

app.get('/api/stock/:symbol', (req, res) => {
  const meta = STOCKS_META.find(m => m.sym === req.params.symbol.toUpperCase() + '.JK')
  if (!meta) return res.status(404).json({ error: 'Not found' })
  const st = stockState[meta.sym]
  res.json({ ...st, symbol: meta.sym.replace('.JK', ''), name: meta.name })
})

app.get('/api/ihsg', (req, res) => res.json({ ...ihsgState, timestamp: Date.now() }))

app.get('/api/news', (req, res) => {
  // Return cached real news if fresh (< 5 min), else regenerate
  if (CACHED_NEWS.length > 0 && Date.now() - lastNewsFetch < 5 * 60000) {
    res.json({ news: CACHED_NEWS, timestamp: Date.now(), real: true })
  } else {
    res.json({ news: getFallbackNews(), timestamp: Date.now(), real: false })
  }
})

app.get('/api/sectors', (req, res) => {
  const sectorMap = {}
  Object.values(stockState).forEach(st => {
    if (!sectorMap[st.sector]) sectorMap[st.sector] = []
    sectorMap[st.sector].push(st)
  })
  const result = Object.entries(sectorMap).map(([key, stocks]) => {
    const totalMcap = stocks.reduce((a, s) => a + s.mcap, 0)
    const wAvg = stocks.reduce((a, s) => a + s.mcap * (s.changePct || 0), 0) / (totalMcap || 1)
    return { key, label: SECTOR_LABELS[key] || key, change: +wAvg.toFixed(2), count: stocks.length }
  })
  res.json(result.sort((a, b) => b.change - a.change))
})

// --- SSE Stream ---
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  res.write('event: connected\ndata: {"s":1,"ts":' + Date.now() + '}\n\n')
  sseClients.push(res)
  console.log('SSE client connected. Total:', sseClients.length)

  const stocks = Object.entries(stockState).map(([sym, st]) => ({
    symbol: sym.replace('.JK', ''), name: st.name, sector: st.sector,
    last: st.last, prevClose: st.prevClose, open: st.open, high: st.high, low: st.low,
    change: st.change, changePct: st.changePct, volume: st.volume, value: st.value, mcap: st.mcap,
    per: st.per, pbv: st.pbv, eps: st.eps, div: st.div, foreignNet: st.foreignNet, beta: st.beta, rsi: st.rsi,
    bid: st.bid, ask: st.ask, bidVol: st.bidVol, askVol: st.askVol, spark: st.spark,
  }))
  res.write('event: init\ndata: ' + JSON.stringify({ stocks, ihsg: ihsgState }) + '\n\n')

  const hb = setInterval(() => {
    try { res.write('event: heartbeat\ndata: {"ts":' + Date.now() + '}\n\n') } catch(e) {}
  }, 15000)

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res)
    clearInterval(hb)
    console.log('SSE client disconnected. Total:', sseClients.length)
  })
})

// --- Start ---
app.listen(PORT, async () => {
  console.log('\n🚀 IHSG Terminal Backend running on http://localhost:' + PORT)
  await refreshQuotes()

  // Start micro-tick
  setInterval(microTick, 1500)

  // Refresh quotes every 1.5 minutes (faster)
  setInterval(refreshQuotes, 90 * 1000)

  // Fetch real news on startup
  fetchRealNews().catch(console.log)

  // Refresh news every 3 minutes
  setInterval(fetchRealNews, 3 * 60 * 1000)
})
