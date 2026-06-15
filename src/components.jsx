// components.jsx — shared UI components
import React, { useRef, useEffect, useState, useCallback } from 'react'
import { fmt, sgn, SECTOR_COLORS } from './api'

// Animated number with flash
export function AnimatedNumber({ value, format, className = '' }) {
  const prev = useRef(value)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (prev.current !== value) {
      setFlash(value > prev.current ? 'flash-up' : 'flash-down')
      const t = setTimeout(() => setFlash(null), 700)
      prev.current = value
      return () => clearTimeout(t)
    }
  }, [value])

  return (
    <span className={(className + ' ' + (flash || '')).trim()}>
      {format ? format(value) : value}
    </span>
  )
}

// Sparkline
export function Sparkline({ data = [], width = 80, height = 24, stroke, animated = false }) {
  if (!data || data.length < 2) return <svg width={width} height={height} />

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = (max - min) || 1
  const stepX = width / (data.length - 1)

  const pts = data.map((v, i) => [
    i * stepX,
    height - ((v - min) / range) * height
  ])

  const line = 'M ' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ')
  const area = line + ` L ${width.toFixed(1)} ${height} L 0 ${height} Z`
  const trend = data[data.length - 1] - data[0]
  const color = stroke || (trend >= 0 ? 'var(--up)' : 'var(--down)')

  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path className="area" d={area} fill={color} />
      <path className="line" d={line} stroke={color} fill="none" strokeWidth="1.6" />
    </svg>
  )
}

// Live pill
export function LivePill({ label = 'LIVE' }) {
  return (
    <span className="pill">
      <span className="dot"></span>
      <span>{label}</span>
    </span>
  )
}

// Ticker tape
export function TickerTape({ stocks }) {
  if (!stocks) return null
  const syms = Object.keys(stocks)
  const items = syms
    .map(s => stocks[s])
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.changePct || 0) - Math.abs(a.changePct || 0))
    .slice(0, 40)
  const display = [...items, ...items]

  return (
    <div className="ticker-tape">
      <div className="ticker-track">
        {display.map((st, i) => (
          <span key={i} className="ticker-item">
            <span className="sym">{st.symbol}</span>
            <span className="px mono">{fmt.px(st.last)}</span>
            <span className={`chg-pill ${sgn(st.changePct)}`}>
              {st.changePct >= 0 ? '▲' : '▼'} {fmt.pct(st.changePct)}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

// Heatmap cell color
export function heatColor(pct) {
  const clamp = Math.max(-5, Math.min(5, pct || 0))
  if (clamp >= 0) {
    const t = clamp / 5
    const alpha = (0.18 + t * 0.7).toFixed(3)
    return `rgba(34,197,94,${alpha})`
  } else {
    const t = -clamp / 5
    const alpha = (0.18 + t * 0.7).toFixed(3)
    return `rgba(239,68,68,${alpha})`
  }
}

// Candlestick chart
export function CandleChart({ bars = [], width, height = 300 }) {
  const containerRef = useRef(null)
  const [w, setW] = useState(width || 800)

  useEffect(() => {
    if (width) return
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.floor(e.contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  if (!bars || bars.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 12 }}>
        Loading chart data...
      </div>
    )
  }

  const padL = 8, padR = 58, padT = 8, padB = 24
  const plotW = w - padL - padR
  const plotH = height - padT - padB
  const high = Math.max(...bars.map(b => b.high || b[2]))
  const low = Math.min(...bars.map(b => b.low || b[3]))
  const pad = (high - low) * 0.06
  const yMax = high + pad, yMin = low - pad
  const yRange = (yMax - yMin) || 1
  const yToPx = (y) => padT + (1 - (y - yMin) / yRange) * plotH
  const barW = plotW / bars.length
  const candleW = Math.max(2, barW * 0.65)

  const gridLines = []
  for (let i = 0; i <= 4; i++) {
    const v = yMin + (yRange * i / 4)
    gridLines.push({ y: yToPx(v), label: Math.round(v).toLocaleString('id-ID') })
  }

  return (
    <div ref={containerRef} style={{ width: '100%', overflow: 'hidden' }}>
      <svg width={w} height={height}>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={g.y} y2={g.y} className="grid-line" style={{ stroke: 'var(--border)', strokeDasharray: '2 4' }} />
            <text x={w - padR + 6} y={g.y + 3} style={{ fill: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 10 }}>{g.label}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          const raw = Array.isArray(b)
          const o = raw ? b[1] : (b.open || b.last)
          const h = raw ? b[2] : (b.high || b.last)
          const l = raw ? b[3] : (b.low || b.last)
          const c = raw ? b[4] : b.last
          const up = c >= o
          const color = up ? 'var(--up)' : 'var(--down)'
          const cx = padL + i * barW + barW / 2
          const yH = yToPx(h), yL = yToPx(l)
          const yO = yToPx(o), yC = yToPx(c)
          const yTop = Math.min(yO, yC), yBot = Math.max(yO, yC)
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={yH} y2={yL} stroke={color} strokeWidth="1" />
              <rect x={cx - candleW / 2} y={yTop} width={candleW} height={Math.max(1, yBot - yTop)} fill={color} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Order book
export function OrderBook({ stock }) {
  if (!stock) return null

  const bids = [], asks = []
  let bid = stock.bid || stock.last
  let ask = stock.ask || (stock.last + 5)
  for (let i = 0; i < 8; i++) {
    bids.push({ px: bid - i * 5, vol: Math.floor(50000 + Math.random() * 900000) })
    asks.push({ px: ask + i * 5, vol: Math.floor(50000 + Math.random() * 900000) })
  }
  const maxVol = Math.max(...bids.map(b => b.vol), ...asks.map(a => a.vol))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <div>
        <div style={{ padding: '6px 10px', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)' }}>Bid</div>
        {bids.map((b, i) => (
          <div key={i} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '3px 10px', fontSize: 12, fontFamily: 'var(--mono)' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (b.vol / maxVol * 100) + '%', background: 'var(--up-2)' }} />
            <span style={{ position: 'relative', color: 'var(--up)' }}>{fmt.px(b.px)}</span>
            <span style={{ position: 'relative', color: 'var(--text-2)' }}>{fmt.vol(b.vol)}</span>
          </div>
        ))}
      </div>
      <div>
        <div style={{ padding: '6px 10px', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)' }}>Ask</div>
        {asks.map((a, i) => (
          <div key={i} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '3px 10px', fontSize: 12, fontFamily: 'var(--mono)' }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: (a.vol / maxVol * 100) + '%', background: 'var(--down-2)' }} />
            <span style={{ position: 'relative', color: 'var(--down)' }}>{fmt.px(a.px)}</span>
            <span style={{ position: 'relative', color: 'var(--text-2)' }}>{fmt.vol(a.vol)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Icons
export const Icon = {
  dashboard: () => <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="9" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="12" width="7" height="9" rx="1.2"/><rect x="3" y="16" width="7" height="5" rx="1.2"/></svg>,
  heatmap: () => <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>,
  screener: () => <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 5h18M6 12h12M10 19h4"/></svg>,
  watchlist: () => <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l2.5 5.5L20 9.5l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1z"/></svg>,
  portfolio: () => <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2"/></svg>,
  predict: () => <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 17l6-6 4 4 8-9"/><path d="M14 6h7v7"/></svg>,
  leaderboard: () => <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 21h8M12 17v4M5 4h14v5a5 5 0 01-10 0M19 4a3 3 0 003 3M5 4a3 3 0 01-3 3"/></svg>,
  news: () => <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>,
  search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  close: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18"/></svg>,
  star: (filled) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M12 3l2.5 5.5L20 9.5l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1z"/></svg>,
}

// Toast system
export const ToastCtx = React.createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(s => [...s, { id, ...t }])
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), t.duration || 3500)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <div className="t-head" style={{ color: t.tone === 'up' ? 'var(--up)' : t.tone === 'down' ? 'var(--down)' : 'var(--text)' }}>{t.title}</div>
            {t.body && <div className="t-body">{t.body}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return React.useContext(ToastCtx)
}
