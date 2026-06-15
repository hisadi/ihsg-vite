// Heatmap.jsx — sectoral treemap-style grid
import React, { useState } from 'react'
import { heatColor, LivePill } from '../components'
import { fmt, sgn, SECTOR_LABELS, SECTOR_COLORS } from '../api'

export default function Heatmap({ stocks, openStock }) {
  const [sortBy, setSortBy] = useState('mcap')
  const [filter, setFilter] = useState('ALL')

  const syms = Object.keys(stocks || {})

  // Group by sector
  const sectorMap = {}
  syms.forEach(s => {
    const st = stocks[s]
    if (!st) return
    const key = st.sector || 'OTHER'
    if (!sectorMap[key]) sectorMap[key] = []
    sectorMap[key].push(st)
  })

  const sectorData = Object.entries(sectorMap).map(([key, list]) => {
    const totalMcap = list.reduce((a, s) => a + (s.mcap || 0), 0)
    const wAvg = list.reduce((a, s) => a + (s.mcap || 0) * (s.changePct || 0), 0) / (totalMcap || 1)
    let sorted = [...list]
    if (sortBy === 'mcap') sorted.sort((a, b) => b.mcap - a.mcap)
    if (sortBy === 'value') sorted.sort((a, b) => b.value - a.value)
    if (sortBy === 'volume') sorted.sort((a, b) => b.volume - a.volume)
    return {
      key,
      label: SECTOR_LABELS[key] || key,
      color: SECTOR_COLORS[key] || '#888',
      list: sorted,
      change: +wAvg.toFixed(2),
      count: list.length,
    }
  }).sort((a, b) => b.change - a.change)

  const visible = filter === 'ALL' ? sectorData : sectorData.filter(s => s.key === filter)

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      <div className="row between">
        <div>
          <h2 className="h1">Heatmap Sektoral</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Ukuran sel berdasar {sortBy === 'mcap' ? 'market cap' : sortBy === 'value' ? 'nilai transaksi' : 'volume'} · Warna = perubahan harga</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="seg">
            <button className={sortBy === 'mcap' ? 'on' : ''} onClick={() => setSortBy('mcap')}>Mkt Cap</button>
            <button className={sortBy === 'value' ? 'on' : ''} onClick={() => setSortBy('value')}>Nilai</button>
            <button className={sortBy === 'volume' ? 'on' : ''} onClick={() => setSortBy('volume')}>Volume</button>
          </div>
          <select className="btn" style={{ paddingRight: 26 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="ALL">Semua sektor</option>
            {Object.keys(SECTOR_LABELS).map(k => <option key={k} value={k}>{SECTOR_LABELS[k]}</option>)}
          </select>
          <LivePill />
        </div>
      </div>

      <div className="grid heatmap" style={{ gridTemplateColumns: filter === 'ALL' ? 'repeat(2, 1fr)' : '1fr' }}>
        {visible.map(sec => (
          <div key={sec.key} className="heat-sector">
            <div className="heat-sector-title">
              <span style={{ color: sec.color }}>● <span style={{ color: 'var(--text)' }}>{sec.label}</span></span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: sec.change >= 0 ? 'var(--up)' : 'var(--down)' }}>
                {sec.change >= 0 ? '+' : ''}{sec.change.toFixed(2)}%
              </span>
            </div>
            <SectorGrid stocks={sec.list} sortBy={sortBy} openStock={openStock} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SectorGrid({ stocks, sortBy, openStock }) {
  const totalWeight = stocks.reduce((a, s) => a + (sortBy === 'mcap' ? s.mcap : sortBy === 'value' ? s.value : s.volume) || 0, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 3 }}>
      {stocks.map(st => {
        const w = sortBy === 'mcap' ? st.mcap : sortBy === 'value' ? st.value : st.volume
        const ratio = totalWeight ? (w || 0) / totalWeight : 0
        const size = Math.min(180, Math.max(46, 60 + ratio * 800))
        return (
          <div key={st.symbol}
            className="heat-cell"
            onClick={() => openStock(st.symbol)}
            style={{
              background: heatColor(st.changePct),
              minHeight: size,
              gridColumn: ratio > 0.18 ? 'span 2' : 'auto',
              gridRow: ratio > 0.25 ? 'span 2' : 'auto',
            }}
          >
            <div className="hc-sym">{st.symbol}</div>
            <div className="hc-chg">{fmt.pct(st.changePct)}</div>
          </div>
        )
      })}
    </div>
  )
}