// src/api.js — polling-based, drop-in replacement for SSE version
// connectStream() has same signature so useStream.js doesn't need changes

const BASE = import.meta.env.DEV ? '' : ''   // empty = same-origin (works on Vercel + dev proxy)

// --- REST ---
export async function fetchStocks() {
  const res = await fetch(`${BASE}/api/stocks`)
  if (!res.ok) throw new Error(`fetchStocks ${res.status}`)
  return res.json()
}

export async function fetchStock(symbol) {
  const res = await fetch(`${BASE}/api/stock/${symbol}`)
  if (!res.ok) throw new Error(`fetchStock ${res.status}`)
  return res.json()
}

export async function fetchIHSG() {
  const res = await fetch(`${BASE}/api/ihsg`)
  if (!res.ok) throw new Error(`fetchIHSG ${res.status}`)
  return res.json()
}

export async function fetchNews() {
  const res = await fetch(`${BASE}/api/news`)
  if (!res.ok) throw new Error(`fetchNews ${res.status}`)
  return res.json()
}

export async function fetchSectors() {
  const res = await fetch(`${BASE}/api/sectors`)
  if (!res.ok) throw new Error(`fetchSectors ${res.status}`)
  return res.json()
}

// --- Polling stream (replaces SSE, same callback signature) ---
// onTick(data)  — called every intervalMs with { stocks, ihsg }
// onInit(data)  — called once on first successful fetch
// onConnected() — called when first data arrives
export function connectStream(onTick, onInit, onConnected, intervalMs = 3000) {
  let timer = null
  let initialized = false
  let running = true

  async function poll() {
    if (!running) return
    try {
      const data = await fetchStocks()

      if (!initialized) {
        initialized = true
        onInit && onInit(data)
        onConnected && onConnected()
      } else {
        // Emit as tick: same shape useStream.js expects
        onTick && onTick({
          stocks: data.stocks,
          ihsg: data.ihsg,
          timestamp: data.timestamp,
        })
      }
    } catch (e) {
      console.warn('[poll] fetch failed:', e.message)
    }
    if (running) timer = setTimeout(poll, intervalMs)
  }

  poll()

  // Cleanup function — returned so useEffect can call it
  return () => {
    running = false
    if (timer) clearTimeout(timer)
  }
}

// --- Format helpers (unchanged) ---
export const fmt = {
  px: (n) => n == null ? '—' : n.toLocaleString('id-ID'),
  pct: (n) => (n > 0 ? '+' : '') + n.toFixed(2) + '%',
  bigIDR(n) {
    if (n == null) return '—'
    const abs = Math.abs(n)
    if (abs >= 1e12) return (n / 1e12).toFixed(2) + ' T'
    if (abs >= 1e9)  return (n / 1e9).toFixed(2) + ' M'
    if (abs >= 1e6)  return (n / 1e6).toFixed(2) + ' Jt'
    return n.toLocaleString('id-ID')
  },
  vol(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return String(n)
  },
  rel(ts) {
    const diff = Date.now() - ts
    const s = Math.floor(diff / 1000)
    if (s < 60) return s + ' dtk lalu'
    const m = Math.floor(s / 60)
    if (m < 60) return m + ' mnt lalu'
    const h = Math.floor(m / 60)
    if (h < 24) return h + ' jam lalu'
    return Math.floor(h / 24) + ' hari lalu'
  }
}

export function sgn(n) { return n > 0 ? 'up' : n < 0 ? 'down' : 'flat' }

export const SECTOR_LABELS = {
  'FINANCIAL': 'Keuangan', 'CONSUMER': 'Konsumer', 'ENERGY': 'Energi',
  'BASIC': 'Material', 'INDUSTRIAL': 'Industri', 'INFRA': 'Infrastruktur',
  'PROPERTY': 'Properti', 'HEALTH': 'Kesehatan', 'TECH': 'Teknologi', 'TRANSPORT': 'Transportasi',
}

export const SECTOR_COLORS = {
  'FINANCIAL': '#3b82f6', 'CONSUMER': '#a855f7', 'ENERGY': '#f59e0b',
  'BASIC': '#ec4899', 'INDUSTRIAL': '#06b6d4', 'INFRA': '#10b981',
  'PROPERTY': '#f97316', 'HEALTH': '#84cc16', 'TECH': '#8b5cf6', 'TRANSPORT': '#14b8a6',
}
