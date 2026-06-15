// store.js — LocalStorage-backed state (predictions, watchlist, portfolio)
import { defaultPredictions, defaultWatchlist, defaultPortfolio } from './defaults'

const LS = {
  read(key, fallback) {
    try {
      const v = localStorage.getItem(key)
      return v ? JSON.parse(v) : fallback
    } catch { return fallback }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  }
}

export { LS, defaultPredictions, defaultWatchlist, defaultPortfolio }

// Prediction helpers
export const TF_DAYS = { '1D': 1, '3D': 3, '5D': 5, '7D': 7, '10D': 10, '14D': 14 }

export function pnlOf(p, px) {
  const r = ((px - p.entry) / p.entry) * 100
  return p.side === 'BUY' ? r : -r
}

export function rrOf(p) {
  const reward = Math.abs(p.target - p.entry)
  const risk = Math.abs(p.entry - p.stop)
  return risk ? reward / risk : 0
}

export function progressOf(p, px) {
  const range = p.side === 'BUY' ? (p.target - p.entry) : (p.entry - p.target)
  const moved = p.side === 'BUY' ? (px - p.entry) : (p.entry - px)
  return (range ? (moved / range) * 100 : 0)
}

export function evalPrediction(p, currentPx) {
  if (p.resolved) return { status: p.outcome === 'win' ? 'won' : 'lost', currentPx: p.hitPx, pnlPct: pnlOf(p, p.hitPx) }
  const ageMs = Date.now() - p.created
  const expireMs = (TF_DAYS[p.tf] || 5) * 24 * 60 * 60 * 1000
  const expired = ageMs >= expireMs
  const hitTarget = p.side === 'BUY' ? currentPx >= p.target : currentPx <= p.target
  const hitStop = p.side === 'BUY' ? currentPx <= p.stop : currentPx >= p.stop
  if (hitTarget) return { status: 'won_pending', currentPx, pnlPct: pnlOf(p, currentPx) }
  if (hitStop) return { status: 'lost_pending', currentPx, pnlPct: pnlOf(p, currentPx) }
  if (expired) return { status: 'expired', currentPx, pnlPct: pnlOf(p, currentPx) }
  return { status: 'open', currentPx, pnlPct: pnlOf(p, currentPx) }
}
