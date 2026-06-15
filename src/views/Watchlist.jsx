// Watchlist.jsx
import React, { useState } from 'react'
import { AnimatedNumber, Sparkline, Icon } from '../components'
import { fmt, sgn } from '../api'
import { LS } from '../store'
import { defaultWatchlist } from '../defaults'

export default function Watchlist({ stocks, openStock, openPredictionForm }) {
  const [list, setList] = useState(() => LS.read('ihsg.watchlist', defaultWatchlist()))
  const [input, setInput] = useState('')

  function remove(sym) {
    const next = list.filter(s => s !== sym)
    setList(next); LS.write('ihsg.watchlist', next)
  }
  function add() {
    const sym = input.toUpperCase().trim()
    if (!sym || list.includes(sym)) { setInput(''); return }
    const next = [...list, sym]
    setList(next); LS.write('ihsg.watchlist', next)
    setInput('')
  }

  const syms = Object.keys(stocks || {})
  const rows = list.map(s => stocks[s]).filter(Boolean)

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      <div className="row between">
        <div>
          <h2 className="h1">Watchlist</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{list.length} saham �� update real-time · tersimpan otomatis</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <input
            className="field"
            style={{ height: 28, padding: '0 10px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', outline: 'none', fontSize: 12, width: 160 }}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Tambah simbol (e.g. BBCA)"
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button className="btn primary sm" onClick={add}>+ Tambah</button>
        </div>
      </div>

      <div className="panel">
        <table className="tbl">
          <thead>
            <tr>
              <th>Simbol</th>
              <th className="num">Last</th>
              <th className="num">Chg</th>
              <th className="num">Chg %</th>
              <th className="num">High</th>
              <th className="num">Low</th>
              <th className="num">Volume</th>
              <th className="num">Nilai</th>
              <th>30bar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(st => (
              <tr key={st.symbol}>
                <td className="sym-cell" onClick={() => openStock(st.symbol)}>
                  {st.symbol}<small>{(st.name || '').slice(0, 16)}</small>
                </td>
                <td className="num"><AnimatedNumber value={st.last} format={fmt.px} /></td>
                <td className={'num mono ' + ((st.change || 0) >= 0 ? 'up' : 'down')}>
                  {(st.change || 0) >= 0 ? '+' : ''}{fmt.px(st.change)}
                </td>
                <td className="num"><span className={'chg-pill ' + sgn(st.changePct)}>{fmt.pct(st.changePct)}</span></td>
                <td className="num mono up">{fmt.px(st.high)}</td>
                <td className="num mono down">{fmt.px(st.low)}</td>
                <td className="num mono">{fmt.vol(st.volume)}</td>
                <td className="num mono">{fmt.bigIDR(st.value)}</td>
                <td><Sparkline data={st.spark || []} width={70} height={20} /></td>
                <td>
                  <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn sm" onClick={() => openPredictionForm(st.symbol)}>+ Prediksi</button>
                    <button className="btn sm ghost" onClick={() => remove(st.symbol)}>{Icon.close()}</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>
                Belum ada saham di watchlist. Tambahkan simbol di atas.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}