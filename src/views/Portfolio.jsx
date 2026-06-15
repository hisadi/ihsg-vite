// Portfolio.jsx
import React, { useState } from 'react'
import { AnimatedNumber, LivePill, Icon } from '../components'
import { fmt, sgn } from '../api'
import { LS } from '../store'
import { defaultPortfolio } from '../defaults'

export default function Portfolio({ stocks, openStock }) {
  const [holdings, setHoldings] = useState(() => LS.read('ihsg.portfolio', defaultPortfolio()))
  const [form, setForm] = useState({ sym: '', lots: '', avgPx: '' })

  function add() {
    const sym = form.sym.toUpperCase().trim()
    if (!sym || !form.lots || !form.avgPx) return
    const lots = +form.lots, avgPx = +form.avgPx
    const existing = holdings.find(h => h.sym === sym)
    let next
    if (existing) {
      const totalLots = existing.lots + lots
      const newAvg = ((existing.lots * existing.avgPx) + (lots * avgPx)) / totalLots
      next = holdings.map(h => h.sym === sym ? { sym, lots: totalLots, avgPx: Math.round(newAvg) } : h)
    } else {
      next = [...holdings, { sym, lots, avgPx }]
    }
    setHoldings(next); LS.write('ihsg.portfolio', next)
    setForm({ sym: '', lots: '', avgPx: '' })
  }

  function remove(sym) {
    const next = holdings.filter(h => h.sym !== sym)
    setHoldings(next); LS.write('ihsg.portfolio', next)
  }

  const rows = holdings.map(h => {
    const st = stocks[h.sym]
    if (!st) return null
    const shares = h.lots * 100
    const cost = shares * h.avgPx
    const mkt = shares * st.last
    const pl = mkt - cost
    const plPct = (pl / cost) * 100
    return { ...h, st, shares, cost, mkt, pl, plPct }
  }).filter(Boolean)

  const totalCost = rows.reduce((a, r) => a + r.cost, 0)
  const totalMkt = rows.reduce((a, r) => a + r.mkt, 0)
  const totalPL = totalMkt - totalCost
  const totalPLPct = totalCost ? (totalPL / totalCost) * 100 : 0
  const dayPL = rows.reduce((a, r) => a + ((r.st.change || 0) * r.shares), 0)

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      <div className="row between">
        <div>
          <h2 className="h1">Portfolio</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Cost basis & P&L · update real-time</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="label">Nilai Pasar</div>
          <div className="value mono">{fmt.bigIDR(totalMkt)}</div>
    <div className="sub muted">{rows.length} saham · {rows.reduce((a, r) => a + r.lots, 0)} lot</div>
        </div>
        <div className="stat-card">
          <div className="label">Cost Basis</div>
          <div className="value mono">{fmt.bigIDR(totalCost)}</div>
          <div className="sub muted">Total modal</div>
        </div>
        <div className="stat-card">
          <div className="label">Unrealized P&L</div>
          <div className="value mono" style={{ color: totalPL >= 0 ? 'var(--up)' : 'var(--down)' }}>
            {totalPL >= 0 ? '+' : ''}{fmt.bigIDR(totalPL)}
          </div>
          <div className="sub" style={{ color: totalPL >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.pct(totalPLPct)} sejak entry</div>
        </div>
        <div className="stat-card">
          <div className="label">P&L Hari Ini</div>
          <div className="value mono" style={{ color: dayPL >= 0 ? 'var(--up)' : 'var(--down)' }}>
            <AnimatedNumber value={Math.round(dayPL)} format={v => (v >= 0 ? '+' : '') + fmt.bigIDR(v)} />
          </div>
          <div className="sub muted">Vs penutupan kemarin</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">Tambah Posisi</span></div>
        <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 10 }}>
          <div className="field"><label>Simbol</label><input value={form.sym} onChange={e => setForm({ ...form, sym: e.target.value })} placeholder="BBCA" /></div>
          <div className="field"><label>Lot (1 lot = 100 lbr)</label><input value={form.lots} onChange={e => setForm({ ...form, lots: e.target.value })} placeholder="5" type="number" /></div>
          <div className="field"><label>Harga avg (IDR)</label><input value={form.avgPx} onChange={e => setForm({ ...form, avgPx: e.target.value })} placeholder="10200" type="number" /></div>
          <div className="field"><label>&nbsp;</label><button className="btn primary" onClick={add}>+ Tambah</button></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">Posisi Aktif</span><LivePill /></div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Simbol</th>
              <th className="num">Lot</th>
              <th className="num">Avg Px</th>
              <th className="num">Last</th>
              <th className="num">Cost</th>
              <th className="num">Mkt Value</th>
              <th className="num">P&L</th>
              <th className="num">P&L %</th>
              <th className="num">Alokasi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.sym}>
                <td className="sym-cell" onClick={() => openStock(r.sym)}>{r.sym}<small>{(r.st.name || '').slice(0, 14)}</small></td>
                <td className="num mono">{r.lots}</td>
                <td className="num mono">{fmt.px(r.avgPx)}</td>
                <td className="num"><AnimatedNumber value={r.st.last} format={fmt.px} /></td>
                <td className="num mono">{fmt.bigIDR(r.cost)}</td>
                <td className="num mono"><AnimatedNumber value={Math.round(r.mkt)} format={fmt.bigIDR} /></td>
                <td className={'num mono ' + (r.pl >= 0 ? 'up' : 'down')}>{r.pl >= 0 ? '+' : ''}{fmt.bigIDR(r.pl)}</td>
                <td className="num"><span className={'chg-pill ' + sgn(r.plPct)}>{fmt.pct(r.plPct)}</span></td>
                <td className="num">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <div className="progress" style={{ width: 50 }}>
                      <span style={{ width: ((r.mkt / totalMkt) * 100).toFixed(0) + '%' }}></span>
                    </div>
                    <span className="mono" style={{ fontSize: 11 }}>{((r.mkt / totalMkt) * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td><button className="btn sm ghost" onClick={() => remove(r.sym)}>{Icon.close()}</button></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>Belum ada posisi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
