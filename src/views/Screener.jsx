// Screener.jsx — filter stocks by metric criteria
import React, { useState } from 'react'
import { AnimatedNumber, Sparkline, LivePill } from '../components'
import { fmt, sgn, SECTOR_LABELS, SECTOR_COLORS } from '../api'

export default function Screener({ stocks, openStock }) {
  const [sector, setSector] = useState('ALL')
  const [chgMin, setChgMin] = useState(-99)
  const [chgMax, setChgMax] = useState(99)
  const [perMax, setPerMax] = useState(99)
  const [rsiMin, setRsiMin] = useState(0)
  const [rsiMax, setRsiMax] = useState(100)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('changePct')
  const [sortDir, setSortDir] = useState('desc')
  const [preset, setPreset] = useState('')

  function applyPreset(name) {
    setPreset(name)
    if (name === 'breakout') { setChgMin(2); setChgMax(99); setRsiMin(60); setRsiMax(85); setPerMax(99) }
    else if (name === 'value') { setChgMin(-99); setChgMax(99); setPerMax(12); setRsiMin(0); setRsiMax(100) }
    else if (name === 'oversold') { setChgMin(-99); setChgMax(-1); setRsiMin(0); setRsiMax(35); setPerMax(99) }
    else if (name === 'momentum') { setChgMin(1); setChgMax(99); setRsiMin(55); setRsiMax(80); setPerMax(99) }
    else if (name === 'penny') { setChgMin(2); setChgMax(99) }
    else { setChgMin(-99); setChgMax(99); setPerMax(99); setRsiMin(0); setRsiMax(100) }
  }

  const syms = Object.keys(stocks || {})
  const filtered = syms.map(s => stocks[s]).filter(s => {
    if (!s) return false
    if (sector !== 'ALL' && s.sector !== sector) return false
    if (s.changePct < chgMin || s.changePct > chgMax) return false
    if ((s.per || 99) > perMax) return false
    if ((s.rsi || 50) < rsiMin || (s.rsi || 50) > rsiMax) return false
    if (search && !s.symbol.includes(search.toUpperCase()) && !(s.name || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  filtered.sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? av - bv : bv - av
  })

  function clickSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      <div className="row between">
        <div>
          <h2 className="h1">Screener</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Filter saham berdasar fundamental, teknikal, atau likuiditas · {filtered.length} dari {syms.length} hasil
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="muted" style={{ fontSize: 11 }}>Preset:</span>
          {[['breakout', 'Breakout'], ['momentum', 'Momentum'], ['value', 'Value'], ['oversold', 'Oversold'], ['penny', 'Penny']].map(([k, l]) => (
            <button key={k} className={'btn sm ' + (preset === k ? 'primary' : '')} onClick={() => applyPreset(k)}>{l}</button>
          ))}
          <button className="btn sm ghost" onClick={() => applyPreset('')}>Reset</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          <div className="field">
            <label>Cari simbol/nama</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="BBRI, Unilever..." />
          </div>
          <div className="field">
            <label>Sektor</label>
            <select value={sector} onChange={e => setSector(e.target.value)}>
              <option value="ALL">Semua</option>
              {Object.keys(SECTOR_LABELS).map(k => <option key={k} value={k}>{SECTOR_LABELS[k]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Chg% min</label>
            <input type="number" value={chgMin === -99 ? '' : chgMin} placeholder="-99" onChange={e => setChgMin(+e.target.value || -99)} />
          </div>
          <div className="field">
            <label>Chg% max</label>
            <input type="number" value={chgMax === 99 ? '' : chgMax} placeholder="99" onChange={e => setChgMax(+e.target.value || 99)} />
          </div>
          <div className="field">
            <label>PER max</label>
            <input type="number" value={perMax === 99 ? '' : perMax} placeholder="99" onChange={e => setPerMax(+e.target.value || 99)} />
          </div>
          <div className="field">
            <label>RSI ({rsiMin}–{rsiMax})</label>
            <div className="row" style={{ gap: 4 }}>
              <input type="number" value={rsiMin} onChange={e => setRsiMin(+e.target.value)} style={{ width: '50%' }} />
              <input type="number" value={rsiMax} onChange={e => setRsiMax(+e.target.value)} style={{ width: '50%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Hasil ({filtered.length})</span>
          <LivePill />
        </div>
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <ScreenerTH label="Simbol" k="symbol" onClick={clickSort} sortKey={sortKey} sortDir={sortDir} />
                <th>Sektor</th>
                <ScreenerTH label="Last" k="last" onClick={clickSort} sortKey={sortKey} sortDir={sortDir} className="num" />
                <ScreenerTH label="Chg %" k="changePct" onClick={clickSort} sortKey={sortKey} sortDir={sortDir} className="num" />
                <ScreenerTH label="Volume" k="volume" onClick={clickSort} sortKey={sortKey} sortDir={sortDir} className="num" />
                <ScreenerTH label="Nilai" k="value" onClick={clickSort} sortKey={sortKey} sortDir={sortDir} className="num" />
                <ScreenerTH label="PER" k="per" onClick={clickSort} sortKey={sortKey} sortDir={sortDir} className="num" />
                <ScreenerTH label="RSI" k="rsi" onClick={clickSort} sortKey={sortKey} sortDir={sortDir} className="num" />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(st => (
                <tr key={st.symbol} onClick={() => openStock(st.symbol)}>
                  <td className="sym-cell">{st.symbol}<small>{(st.name || '').slice(0, 16)}</small></td>
                  <td><span className="tag" style={{ color: SECTOR_COLORS[st.sector] || 'var(--text-2)', borderColor: (SECTOR_COLORS[st.sector] || '#888') + '44' }}>{SECTOR_LABELS[st.sector] || st.sector}</span></td>
                  <td className="num"><AnimatedNumber value={st.last} format={fmt.px} /></td>
                  <td className="num"><span className={'chg-pill ' + sgn(st.changePct)}>{fmt.pct(st.changePct)}</span></td>
                  <td className="num mono">{fmt.vol(st.volume)}</td>
                  <td className="num mono">{fmt.bigIDR(st.value)}</td>
                  <td className="num mono">{(st.per || 0).toFixed(1)}</td>
                  <td className="num mono" style={{ color: (st.rsi || 50) > 70 ? 'var(--down)' : (st.rsi || 50) < 30 ? 'var(--up)' : 'var(--text)' }}>{(st.rsi || 50).toFixed(0)}</td>
                  <td><Sparkline data={st.spark || []} width={50} height={18} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>Tidak ada saham yang cocok dengan filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ScreenerTH({ label, k, onClick, sortKey, sortDir, className }) {
  const active = sortKey === k
  return (
    <th className={className} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => onClick(k)}>
      {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}