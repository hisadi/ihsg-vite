// api/_lib/market.js — shared data & fetch logic for all serverless functions

export const STOCKS_META = [
  { sym: 'BBCA', name: 'Bank Central Asia',           sector: 'FINANCIAL', mcap: 8.5e14 },
  { sym: 'BBRI', name: 'Bank Rakyat Indonesia',       sector: 'FINANCIAL', mcap: 6.2e14 },
  { sym: 'BMRI', name: 'Bank Mandiri',                sector: 'FINANCIAL', mcap: 5.1e14 },
  { sym: 'BBNI', name: 'Bank Negara Indonesia',       sector: 'FINANCIAL', mcap: 2.1e14 },
  { sym: 'BRIS', name: 'Bank Syariah Indonesia',      sector: 'FINANCIAL', mcap: 1.1e14 },
  { sym: 'BTPS', name: 'Bank BTPN Syariah',           sector: 'FINANCIAL', mcap: 4e13 },
  { sym: 'BBTN', name: 'Bank Tabungan Negara',        sector: 'FINANCIAL', mcap: 3e13 },
  { sym: 'ARTO', name: 'Bank Jago',                   sector: 'FINANCIAL', mcap: 6e13 },
  { sym: 'NISP', name: 'Bank OCBC NISP',              sector: 'FINANCIAL', mcap: 2.5e13 },
  { sym: 'UNVR', name: 'Unilever Indonesia',          sector: 'CONSUMER',  mcap: 1.7e14 },
  { sym: 'ICBP', name: 'Indofood CBP',                sector: 'CONSUMER',  mcap: 1.2e14 },
  { sym: 'INDF', name: 'Indofood Sukses Makmur',      sector: 'CONSUMER',  mcap: 8e13 },
  { sym: 'MYOR', name: 'Mayora Indah',                sector: 'CONSUMER',  mcap: 7e13 },
  { sym: 'GGRM', name: 'Gudang Garam',                sector: 'CONSUMER',  mcap: 5e13 },
  { sym: 'HMSP', name: 'HM Sampoerna',                sector: 'CONSUMER',  mcap: 1e14 },
  { sym: 'SIDO', name: 'Industri Jamu Sido Muncul',   sector: 'CONSUMER',  mcap: 2e13 },
  { sym: 'KLBF', name: 'Kalbe Farma',                 sector: 'CONSUMER',  mcap: 7e13 },
  { sym: 'AMRT', name: 'Sumber Alfaria Trijaya',      sector: 'CONSUMER',  mcap: 9e13 },
  { sym: 'MAPI', name: 'Mitra Adiperkasa',            sector: 'CONSUMER',  mcap: 3e13 },
  { sym: 'ACES', name: 'Ace Hardware Indonesia',      sector: 'CONSUMER',  mcap: 2e13 },
  { sym: 'CPIN', name: 'Charoen Pokphand Indonesia',  sector: 'CONSUMER',  mcap: 9e13 },
  { sym: 'JPFA', name: 'Japfa Comfeed',               sector: 'CONSUMER',  mcap: 2e13 },
  { sym: 'PTBA', name: 'Bukit Asam',                  sector: 'ENERGY',    mcap: 5e13 },
  { sym: 'ADRO', name: 'Adaro Energy',                sector: 'ENERGY',    mcap: 8e13 },
  { sym: 'ITMG', name: 'Indo Tambangraya Megah',      sector: 'ENERGY',    mcap: 3e13 },
  { sym: 'MEDC', name: 'Medco Energi',                sector: 'ENERGY',    mcap: 2.5e13 },
  { sym: 'INDY', name: 'Indika Energy',               sector: 'ENERGY',    mcap: 1.5e13 },
  { sym: 'AKRA', name: 'AKR Corporindo',              sector: 'ENERGY',    mcap: 3e13 },
  { sym: 'HRUM', name: 'Harum Energy',                sector: 'ENERGY',    mcap: 1e13 },
  { sym: 'PGAS', name: 'Perusahaan Gas Negara',       sector: 'ENERGY',    mcap: 6e13 },
  { sym: 'ANTM', name: 'Aneka Tambang',               sector: 'BASIC',     mcap: 4e13 },
  { sym: 'INCO', name: 'Vale Indonesia',              sector: 'BASIC',     mcap: 3e13 },
  { sym: 'MDKA', name: 'Merdeka Copper Gold',         sector: 'BASIC',     mcap: 5e13 },
  { sym: 'TINS', name: 'Timah',                       sector: 'BASIC',     mcap: 1e13 },
  { sym: 'INKP', name: 'Indah Kiat Pulp & Paper',     sector: 'BASIC',     mcap: 4e13 },
  { sym: 'TKIM', name: 'Pabrik Kertas Tjiwi Kimia',   sector: 'BASIC',     mcap: 2e13 },
  { sym: 'SMGR', name: 'Semen Indonesia',             sector: 'BASIC',     mcap: 3e13 },
  { sym: 'INTP', name: 'Indocement Tunggal Prakarsa', sector: 'BASIC',     mcap: 2e13 },
  { sym: 'BRPT', name: 'Barito Pacific',              sector: 'BASIC',     mcap: 4e13 },
  { sym: 'TPIA', name: 'Chandra Asri Pacific',        sector: 'BASIC',     mcap: 5e13 },
  { sym: 'ASII', name: 'Astra International',         sector: 'INDUSTRIAL', mcap: 2e14 },
  { sym: 'UNTR', name: 'United Tractors',             sector: 'INDUSTRIAL', mcap: 1e14 },
  { sym: 'IMAS', name: 'Indomobil Sukses',            sector: 'INDUSTRIAL', mcap: 2e13 },
  { sym: 'AUTO', name: 'Astra Otoparts',              sector: 'INDUSTRIAL', mcap: 1.5e13 },
  { sym: 'TLKM', name: 'Telkom Indonesia',            sector: 'INFRA',     mcap: 3e14 },
  { sym: 'EXCL', name: 'XL Axiata',                   sector: 'INFRA',     mcap: 3e13 },
  { sym: 'ISAT', name: 'Indosat Ooredoo',             sector: 'INFRA',     mcap: 5e13 },
  { sym: 'MTEL', name: 'Dayamitra Telekomunikasi',    sector: 'INFRA',     mcap: 4e13 },
  { sym: 'TOWR', name: 'Sarana Menara Nusantara',     sector: 'INFRA',     mcap: 3e13 },
  { sym: 'TBIG', name: 'Tower Bersama Infrastructure', sector: 'INFRA',    mcap: 2e13 },
  { sym: 'JSMR', name: 'Jasa Marga',                  sector: 'INFRA',     mcap: 3e13 },
  { sym: 'WIKA', name: 'Wijaya Karya',                sector: 'INFRA',     mcap: 1e13 },
  { sym: 'PTPP', name: 'PP (Persero)',                sector: 'INFRA',     mcap: 8e12 },
  { sym: 'BSDE', name: 'Bumi Serpong Damai',          sector: 'PROPERTY',  mcap: 3e13 },
  { sym: 'CTRA', name: 'Ciputra Development',         sector: 'PROPERTY',  mcap: 2.5e13 },
  { sym: 'SMRA', name: 'Summarecon Agung',            sector: 'PROPERTY',  mcap: 1e13 },
  { sym: 'PWON', name: 'Pakuwon Jati',               sector: 'PROPERTY',  mcap: 1.5e13 },
  { sym: 'LPKR', name: 'Lippo Karawaci',              sector: 'PROPERTY',  mcap: 8e12 },
  { sym: 'SILO', name: 'Siloam International Hospitals', sector: 'HEALTH', mcap: 3e13 },
  { sym: 'MIKA', name: 'Mitra Keluarga Karyasehat',   sector: 'HEALTH',    mcap: 2.5e13 },
  { sym: 'HEAL', name: 'Medikaloka Hermina',          sector: 'HEALTH',    mcap: 2e13 },
  { sym: 'KAEF', name: 'Kimia Farma',                 sector: 'HEALTH',    mcap: 1e13 },
  { sym: 'GOTO', name: 'GoTo Gojek Tokopedia',        sector: 'TECH',      mcap: 9e13 },
  { sym: 'BUKA', name: 'Bukalapak.com',               sector: 'TECH',      mcap: 2e13 },
  { sym: 'EMTK', name: 'Elang Mahkota Teknologi',     sector: 'TECH',      mcap: 4e13 },
  { sym: 'MTDL', name: 'Metrodata Electronics',       sector: 'TECH',      mcap: 1e13 },
  { sym: 'SMDR', name: 'Samudera Indonesia',          sector: 'TRANSPORT', mcap: 1e13 },
  { sym: 'GIAA', name: 'Garuda Indonesia',            sector: 'TRANSPORT', mcap: 8e12 },
  { sym: 'ASSA', name: 'Adi Sarana Armada',           sector: 'TRANSPORT', mcap: 5e12 },
]

export const SECTOR_LABELS = {
  FINANCIAL: 'Keuangan', CONSUMER: 'Konsumer', ENERGY: 'Energi',
  BASIC: 'Material', INDUSTRIAL: 'Industri', INFRA: 'Infrastruktur',
  PROPERTY: 'Properti', HEALTH: 'Kesehatan', TECH: 'Teknologi', TRANSPORT: 'Transportasi',
}

export const SECTOR_BETAS = {
  FINANCIAL: 1.1, CONSUMER: 0.7, ENERGY: 1.3, BASIC: 1.2,
  INDUSTRIAL: 1.0, INFRA: 0.9, PROPERTY: 1.4, HEALTH: 0.8,
  TECH: 1.5, TRANSPORT: 1.2,
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Fetch crumb + cookie from Yahoo Finance (required for v7 API)
async function getYahooCrumb() {
  const r1 = await fetch('https://finance.yahoo.com/quote/BBCA.JK/', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    signal: AbortSignal.timeout(10000),
  })
  const cookie = r1.headers.get('set-cookie') || ''
  const html = await r1.text()
  const crumbMatch = html.match(/"crumb":"([^"]+)"/)
  const crumb = crumbMatch ? crumbMatch[1].replace(/\\u002F/g, '/') : null
  return { crumb, cookie }
}

export async function fetchBatchQuotes() {
  const symbols = [...STOCKS_META.map(m => m.sym + '.JK'), '^JKSE'].join(',')
  
  const { crumb, cookie } = await getYahooCrumb()
  if (!crumb) throw new Error('Could not get Yahoo crumb')

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume`
  
  const resp = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Cookie': cookie,
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!resp.ok) throw new Error(`Yahoo batch fetch failed: ${resp.status}`)
  const data = await resp.json()
  const results = data?.quoteResponse?.result || []
  const map = {}
  results.forEach(q => { map[q.symbol] = q })
  return map
}

export function buildStockFromQuote(meta, q) {
  const last = q?.regularMarketPrice ?? 1000
  const prevClose = q?.regularMarketPreviousClose ?? last
  const change = q?.regularMarketChange ?? 0
  const changePct = q?.regularMarketChangePercent ?? 0

  return {
    symbol: meta.sym,
    name: meta.name,
    sector: meta.sector,
    mcap: meta.mcap,
    last,
    prevClose,
    open: q?.regularMarketOpen ?? last,
    high: q?.regularMarketDayHigh ?? last,
    low: q?.regularMarketDayLow ?? last,
    change,
    changePct,
    volume: q?.regularMarketVolume ?? 0,
    value: (q?.regularMarketVolume ?? 0) * last,
    // Estimated/derived fields
    per: +(15 + (changePct * 0.5)).toFixed(1),
    pbv: +(1.5 + (changePct * 0.02)).toFixed(2),
    rsi: calcRSI(changePct),
    foreignNet: Math.round(changePct * meta.mcap * 0.0002),
    bid: last - 10,
    ask: last + 10,
    bidVol: Math.round(500000 + Math.random() * 1000000),
    askVol: Math.round(500000 + Math.random() * 1000000),
    spark: buildSpark(last, changePct),
  }
}

export function buildIHSG(q) {
  const value = q?.regularMarketPrice ?? 7300
  const changePct = q?.regularMarketChangePercent ?? 0
  return {
    value,
    prevClose: q?.regularMarketPreviousClose ?? value,
    change: q?.regularMarketChange ?? 0,
    changePct,
    spark: buildSpark(value, changePct, 30),
  }
}

// Deterministic micro-movement based on time seed — looks "live" without extra API calls
export function applyMicroTick(stock, nowMs) {
  const seed = Math.floor(nowMs / 1500) // changes every 1.5 sec
  const hash = simpleHash(stock.symbol + seed)
  const beta = SECTOR_BETAS[stock.sector] || 1.0
  const nudge = ((hash % 201) - 100) / 10000 * beta // ±1% max
  const newLast = Math.round(stock.last * (1 + nudge))
  const newChangePct = +((newLast - stock.prevClose) / stock.prevClose * 100).toFixed(2)
  const spark = [...(stock.spark || []).slice(-29), newLast]
  return { ...stock, last: newLast, changePct: newChangePct, change: +(newLast - stock.prevClose).toFixed(0), spark }
}

// --- helpers ---
function simpleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function calcRSI(changePct) {
  // Simplified RSI estimate from daily change direction
  const base = 50
  return Math.min(80, Math.max(20, Math.round(base + changePct * 3)))
}

function buildSpark(last, changePct, points = 20) {
  const arr = []
  let v = last * (1 - changePct / 100)
  const step = changePct / 100 / points
  for (let i = 0; i < points; i++) {
    v = v * (1 + step + (Math.random() - 0.5) * 0.002)
    arr.push(+v.toFixed(0))
  }
  return arr
}
