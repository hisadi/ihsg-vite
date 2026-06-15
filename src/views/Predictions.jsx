// Predictions.jsx — prediction tracking + form + auto-resolve
import React, { useState, useEffect } from 'react'
import { AnimatedNumber, LivePill, Icon, useToast } from '../components'
import { fmt, sgn } from '../api'
import { LS, TF_DAYS, pnlOf, rrOf, progressOf, evalPrediction } from '../store'
import { defaultPredictions } from '../defaults'

export default function Predictions({ stocks, openStock, prefillSym, clearPrefill, openForm, setOpenForm }) {
  const [preds, setPreds] = useState(() => LS.read('ihsg.predictions', defaultPredictions()))
  const [tab, setTab] = useState('open')
  const pushToast = useToast ? useToast() : null

  // Auto-resolve predictions on tick
  useEffect(() => {
    const interval = setInterval(() => {
      setPreds(prev => {
        let changed = false
        const next = prev.map(p => {
          if (p.resolved) return p
          const st = stocks[p.sym]
          if (!st) return p
          const ev = evalPrediction(p, st.last)
          if (ev.status === 'won_pending') {
            changed = true
            pushToast && pushToast({ title: '🎯 Target Tercapai', body: `${p.sym} ${p.side} hit ${fmt.px(p.target)} — WIN.`, tone: 'up' })
            return { ...p, resolved: true, resolvedAt: Date.now(), outcome: 'win', hitPx: st.last }
          }
          if (ev.status === 'lost_pending') {
            changed = true
            pushToast && pushToast({ title: '🛑 Stop Loss Kena', body: `${p.sym} ${p.side} hit stop ${fmt.px(p.stop)} — LOSS.`, tone: 'down' })
            return { ...p, resolved: true, resolvedAt: Date.now(), outcome: 'loss', hitPx: st.last }
          }
          if (ev.status === 'expired') {
            changed = true
            const win = pnlOf(p, st.last) > 0
            pushToast && pushToast({ title: '⏱ Waktu Habis', body: `${p.sym} timeframe ${p.tf} berakhir — ${win ? 'WIN' : 'LOSS'}.`, tone: win ? 'up' : 'down' })
            return { ...p, resolved: true, resolvedAt: Date.now(), outcome: win ? 'win' : 'loss', hitPx: st.last }
          }
          return p
        })
        if (changed) LS.write('ihsg.predictions', next)
        return changed ? next : prev
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [stocks, pushToast])

  function addPrediction(pred) {
    const next = [{ ...pred, id: 'p' + Date.now(), created: Date.now(), resolved: false, user: pred.user || 'Anda' }, ...preds]
    setPreds(next); LS.write('ihsg.predictions', next)
  }

  const resolved = preds.filter(p => p.resolved)
  const wins = resolved.filter(p => p.outcome === 'win')
  const winRate = resolved.length ? (wins.length / resolved.length) * 100 : 0
  const open = preds.filter(p => !p.resolved)

  const filtered = preds.filter(p => {
    if (tab === 'open') return !p.resolved
    if (tab === 'wins') return p.outcome === 'win'
    if (tab === 'losses') return p.outcome === 'loss'
    return true
  }).sort((a, b) => (b.resolvedAt || b.created) - (a.resolvedAt || a.created))

  const syms = Object.keys(stocks || {})

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      <div className="row between">
        <div>
          <h2 className="h1">Catatan Prediksi</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Setiap prediksi dievaluasi objektif: hit target / kena stop / waktu habis.</div>
        </div>
        <button className="btn primary" onClick={() => setOpenForm(true)}>+ Buat Prediksi Baru</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="label">Win Rate</div>
          <div className="value mono" style={{ color: winRate >= 50 ? 'var(--up)' : 'var(--down)' }}>{winRate.toFixed(1)}%</div>
          <div className="sub muted">{wins.length}W / {resolved.length} resolved</div>
        </div>
        <div className="stat-card">
          <div className="label">Posisi Aktif</div>
          <div className="value mono">{open.length}</div>
          <div className="sub muted">menunggu resolusi</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Setup</div>
          <div className="value mono">{preds.length}</div>
          <div className="sub muted">sejak awal</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg R:R</div>
          <div className="value mono">{(preds.reduce((a, p) => a + rrOf(p), 0) / (preds.length || 1)).toFixed(2)}</div>
          <div className="sub muted">per setup</div>
        </div>
        <div className="stat-card">
          <div className="label">Win</div>
          <div className="value mono" style={{ color: 'var(--up)' }}>{wins.length}</div>
          <div className="sub muted">{resolved.length - wins.length} loss</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="row" style={{ gap: 8 }}>
            <span className="panel-title">Log Prediksi</span>
            <div className="seg">
              {[
                ['open', `Aktif (${open.length})`],
                ['wins', `Win (${wins.length})`],
                ['losses', `Loss (${resolved.length - wins.length})`],
                ['all', `Semua (${preds.length})`]
              ].map(([k, l]) => (
                <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          </div>
          <LivePill />
        </div>
        <div style={{ maxHeight: 520, overflow: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Status</th>
                <th>Saham</th>
                <th>Side</th>
                <th className="num">Entry</th>
                <th className="num">Last/Hit</th>
                <th className="num">Target</th>
                <th className="num">Stop</th>
                <th className="num">R:R</th>
                <th>TF</th>
                <th className="num">P&L</th>
                <th>Progress</th>
                <th>Oleh</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const st = stocks[p.sym]
                const px = p.resolved ? p.hitPx : (st?.last || p.entry)
                const pnl = pnlOf(p, px)
                const prog = progressOf(p, px)
                return (
                  <PredictionRow key={p.id} p={p} px={px} pnl={pnl} prog={prog} onClick={() => openStock(p.sym)} />
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="13" style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>Belum ada prediksi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openForm && (
        <PredictionForm
          syms={syms}
          stocks={stocks}
          prefillSym={prefillSym}
          onClose={() => { setOpenForm(false); clearPrefill?.() }}
          onSubmit={(pred) => { addPrediction(pred); setOpenForm(false); clearPrefill?.() }}
        />
      )}
    </div>
  )
}

function PredictionRow({ p, px, pnl, prog, onClick }) {
  const status = p.resolved
    ? { label: 'WIN', color: 'var(--up)', bg: 'var(--up-2)' }
    : p.outcome === 'loss'
    ? { label: 'LOSS', color: 'var(--down)', bg: 'var(--down-2)' }
    : { label: 'OPEN', color: 'var(--accent)', bg: 'var(--accent-2)' }

  return (
    <tr style={{ cursor: 'default' }}>
      <td>
        <span style={{
          display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          color: status.color, background: status.bg
        }}>{status.label}</span>
      </td>
      <td className="sym-cell" onClick={onClick} style={{ cursor: 'pointer' }}>
        {p.sym}
        {p.ai && <span className="tag" style={{ marginLeft: 6, color: 'var(--blue)', borderColor: 'var(--blue)' + '44' }}>AI</span>}
      </td>
      <td>
        <span className={'chg-pill ' + (p.side === 'BUY' ? 'up' : 'down')}>{p.side}</span>
      </td>
      <td className="num mono">{fmt.px(p.entry)}</td>
      <td className="num mono"><AnimatedNumber value={px} format={fmt.px} /></td>
      <td className="num mono up">{fmt.px(p.target)}</td>
      <td className="num mono down">{fmt.px(p.stop)}</td>
      <td className="num mono">{rrOf(p).toFixed(2)}</td>
      <td><span className="tag">{p.tf}</span></td>
      <td className={'num mono ' + (pnl >= 0 ? 'up' : 'down')}>{fmt.pct(pnl)}</td>
      <td style={{ width: 110 }}>
        <div className="progress">
          <span style={{ width: Math.max(0, Math.min(100, prog)) + '%', background: prog >= 0 ? 'var(--up)' : 'var(--down)' }}></span>
        </div>
      </td>
      <td><span style={{ fontSize: 11 }}>{p.user}</span></td>
      <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{fmt.rel(p.resolvedAt || p.created)}</td>
    </tr>
  )
}

function PredictionForm({ syms, stocks, prefillSym, onClose, onSubmit }) {
  const [sym, setSym] = useState(prefillSym || '')
  const [side, setSide] = useState('BUY')
  const [entry, setEntry] = useState('')
  const [target, setTarget] = useState('')
  const [stop, setStop] = useState('')
  const [tf, setTf] = useState('5D')
  const [conf, setConf] = useState(65)
  const [reason, setReason] = useState('')

  const st = stocks[sym]
  const rr = (target && entry && stop) ? Math.abs(+target - +entry) / Math.abs(+entry - +stop) : 0
  const targetPct = (target && entry) ? ((+target - +entry) / +entry * 100) * (side === 'BUY' ? 1 : -1) : 0

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="panel-head" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="panel-title">Catat Prediksi Baru</span>
          <button className="btn sm ghost" onClick={onClose}>{Icon.close()}</button>
        </div>
        <div className="panel-body col" style={{ gap: 14 }}>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div className="field">
              <label>Simbol</label>
              <input value={sym} onChange={e => setSym(e.target.value.toUpperCase())} placeholder="BBCA" list="sym-list" />
              <datalist id="sym-list">
                {syms.map(s => <option key={s} value={s}>{stocks[s]?.name}</option>)}
              </datalist>
              {st && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{st.name} · last {fmt.px(st.last)}</div>}
            </div>
            <div className="field">
              <label>Arah</label>
              <div className="seg" style={{ height: 32, padding: 3 }}>
                <button className={side === 'BUY' ? 'on' : ''} onClick={() => setSide('BUY')} style={{ flex: 1, color: side === 'BUY' ? 'var(--up)' : 'var(--text-2)', fontWeight: 600 }}>BELI ▲</button>
                <button className={side === 'SELL' ? 'on' : ''} onClick={() => setSide('SELL')} style={{ flex: 1, color: side === 'SELL' ? 'var(--down)' : 'var(--text-2)', fontWeight: 600 }}>JUAL ▼</button>
              </div>
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="field">
              <label>Entry</label>
              <input value={entry} onChange={e => setEntry(e.target.value)} type="number" />
            </div>
            <div className="field">
              <label>Target {targetPct ? `(${fmt.pct(targetPct)})` : ''}</label>
              <input value={target} onChange={e => setTarget(e.target.value)} type="number" />
            </div>
            <div className="field">
              <label>Stop Loss</label>
              <input value={stop} onChange={e => setStop(e.target.value)} type="number" />
            </div>
          </div>
          <div className="row between">
            <button className="btn sm" onClick={() => {
              if (!entry) return
              const e = +entry
              if (side === 'BUY') { setTarget(Math.round(e * 1.05)); setStop(Math.round(e * 0.97)) }
              else { setTarget(Math.round(e * 0.95)); setStop(Math.round(e * 1.03)) }
            }}>Auto +5% / -3%</button>
            <span className="muted" style={{ fontSize: 11 }}>R:R = <strong className="mono" style={{ color: rr >= 2 ? 'var(--up)' : rr >= 1 ? 'var(--accent)' : 'var(--down)' }}>{rr.toFixed(2)}</strong></span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label>Timeframe</label>
              <select value={tf} onChange={e => setTf(e.target.value)}>
                {Object.keys(TF_DAYS).map(t => <option key={t} value={t}>{t} ({TF_DAYS[t]} hari)</option>)}
              </select>
            </div>
            <div className="field">
              <label>Confidence {conf}%</label>
              <input type="range" min="10" max="95" step="1" value={conf} onChange={e => setConf(e.target.value)} style={{ height: 28 }} />
            </div>
          </div>
          <div className="field">
            <label>Alasan / Tesis (wajib)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Breakout daily, MA20 turning up, foreign net buy 3 hari beruntun..." rows="3" />
          </div>
          <div style={{ background: 'var(--panel-2)', padding: 10, borderRadius: 6, fontSize: 11, color: 'var(--text-2)' }}>
            💡 Prediksi ini akan otomatis diresolusi WIN/LOSS saat target/stop tertembus, atau dievaluasi berdasarkan harga saat timeframe habis. Tidak bisa diedit pasca-resolusi.
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>Batal</button>
            <button className="btn primary" onClick={() => {
              if (!sym || !entry || !target || !stop || !reason) return
              onSubmit({ sym: sym.toUpperCase(), side, entry: +entry, target: +target, stop: +stop, tf, conf: +conf, reason, ai: false })
            }} disabled={!sym || !entry || !target || !stop || !reason}>Catat Prediksi</button>
          </div>
        </div>
      </div>
    </div>
  )
}