// api.js — all API calls and SSE stream management
import axios from 'axios'

const BASE = 'http://localhost:3001'

// --- REST ---
export async function fetchStocks() {
  const res = await axios.get(`${BASE}/api/stocks`)
  return res.data
}

export async function fetchStock(symbol) {
  const res = await axios.get(`${BASE}/api/stock/${symbol}`)
  return res.data
}

export async function fetchIHSG() {
  const res = await axios.get(`${BASE}/api/ihsg`)
  return res.data
}

export async function fetchNews() {
  const res = await axios.get(`${BASE}/api/news`)
  return res.data
}

export async function fetchSectors() {
  const res = await axios.get(`${BASE}/api/sectors`)
  return res.data
}

// --- SSE Stream ---
let sseConnection = null
let reconnectTimeout = null
let eventSource = null

export function connectStream(onTick, onInit, onConnected) {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }

  function connect() {
    eventSource = new EventSource(`${BASE}/stream`)

    eventSource.addEventListener('connected', (e) => {
      const data = JSON.parse(e.data)
      onConnected && onConnected(data)
    })

    eventSource.addEventListener('init', (e) => {
      const data = JSON.parse(e.data)
      onInit && onInit(data)
    })

    eventSource.addEventListener('tick', (e) => {
      const data = JSON.parse(e.data)
      onTick && onTick(data)
    })

    eventSource.addEventListener('heartbeat', () => {
      // silently ignore
    })

    eventSource.onerror = () => {
      eventSource.close()
      eventSource = null
      // Reconnect after 3 seconds
      reconnectTimeout = setTimeout(connect, 3000)
    }
  }

  connect()

  return () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }
}

// Format helpers
export const fmt = {
  px: (n) => n == null ? '—' : n.toLocaleString('id-ID'),
  pct: (n) => (n > 0 ? '+' : '') + n.toFixed(2) + '%',
  bigIDR(n) {
    if (n == null) return '—'
    const abs = Math.abs(n)
    if (abs >= 1e12) return (n/1e12).toFixed(2) + ' T'
    if (abs >= 1e9)  return (n/1e9).toFixed(2) + ' M'
    if (abs >= 1e6)  return (n/1e6).toFixed(2) + ' Jt'
    return n.toLocaleString('id-ID')
  },
  vol(n) {
    if (n >= 1e9) return (n/1e9).toFixed(2) + 'B'
    if (n >= 1e6) return (n/1e6).toFixed(2) + 'M'
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'K'
    return String(n)
  },
  rel(ts) {
    const diff = Date.now() - ts
    const s = Math.floor(diff/1000)
    if (s < 60) return s + ' dtk lalu'
    const m = Math.floor(s/60)
    if (m < 60) return m + ' mnt lalu'
    const h = Math.floor(m/60)
    if (h < 24) return h + ' jam lalu'
    return Math.floor(h/24) + ' hari lalu'
  }
}

export function sgn(n) { return n > 0 ? 'up' : n < 0 ? 'down' : 'flat' }

export const SECTOR_LABELS = {
  'FINANCIAL': 'Keuangan',
  'CONSUMER': 'Konsumer',
  'ENERGY': 'Energi',
  'BASIC': 'Material',
  'INDUSTRIAL': 'Industri',
  'INFRA': 'Infrastruktur',
  'PROPERTY': 'Properti',
  'HEALTH': 'Kesehatan',
  'TECH': 'Teknologi',
  'TRANSPORT': 'Transportasi',
}

export const SECTOR_COLORS = {
  'FINANCIAL': '#3b82f6',
  'CONSUMER': '#a855f7',
  'ENERGY': '#f59e0b',
  'BASIC': '#ec4899',
  'INDUSTRIAL': '#06b6d4',
  'INFRA': '#10b981',
  'PROPERTY': '#f97316',
  'HEALTH': '#84cc16',
  'TECH': '#8b5cf6',
  'TRANSPORT': '#14b8a6',
}