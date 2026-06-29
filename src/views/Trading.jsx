// Trading.jsx — Jurnal Trading dengan multi-TP + winrate tracking
import React, { useState, useEffect } from 'react'
import { AnimatedNumber, LivePill } from '../components'
import { fmt, sgn } from '../api'

const SUPABASE_URL = 'https://pvqbjqjjwwcmzajldlzo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cWJqcWpqd3djbXphamxkbHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjk1NzksImV4cCI6MjA5NjY0NTU3OX0.3IeD44BUsjvlvRQU6lcfWysT5nyZxq9eZCNEZ2HN-WA'

async function sbFetch(path, options = {}) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  })
  if (!resp.ok) throw new Error(`Supabase error: ${resp.status}`)
  const text = await resp.text()
  return text ? JSON.parse(text) : []
}

export default function Trading({ stocks, openStock }) {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('open')
  const [showForm, setShowForm] = useState(false)
  const [editTrade, setEditTrade] = useState(null)

  useEffect(() => { loadTrades() }, [])

  // Auto-check open trades against current prices
  useEffect(() => {
    if (Object.keys(stocks).length === 0) return
    trades.filter(t => t.status === 'open').forEach(t => {
      const st = stocks[t.symbol]
      if (!st) return
      checkAndUpdateTrade(t, st.last)
    })
  }, [stocks])

  async function loadTrades() {
    setLoading(true)
    try {
      const data = await sbFetch('trades?order=created_at.desc')
      setTrades(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function checkAndUpdateTrade(trade, currentPrice) {
    let newStatus = trade.status
    let outcome = trade.outcome

    if (trade.side === 'BUY') {
      if (trade.stop_loss && currentPrice <= trade.stop_loss) {
        newStatus = 'stop_hit'; outcome = 'loss'
      } else if (trade.tp3 && currentPrice >= trade.tp3) {
        newStatus = 'tp3_hit'; outcome = 'win'
      } else if (trade.tp2 && currentPrice >= trade.tp2) {
        newStatus = 'tp2_hit'; outcome = 'win'
      } else if (trade.tp1 && currentPrice >= trade.tp1) {
        newStatus = 'tp1_hit'; outcome = 'win'
      }
    } else {
      if (trade.stop_loss && currentPrice >= trade.stop_loss) {
        newStatus = 'stop_hit'; outcome = 'loss'
      } else if (trade.tp3 && currentPrice <= trade.tp3) {
        newStatus = 'tp3_hit'; outcome = 'win'
      } else if (trade.tp2 && currentPrice <= trade.tp2) {
        newStatus = 'tp2_hit'; outcome = 'win'
      } else if (trade.tp1 && currentPrice <= trade.tp1) {
        newStatus = 'tp1_hit'; outcome = 'win'
      }
    }

    if (newStatus !== trade.status) {
      const pnl = trade.entry > 0 ? ((currentPrice - trade.entry) / trade.entry * 100) * (trade.side === 'BUY' ? 1 : -1) : 0
      try {
        await sbFetch(`trades?id=eq.${trade.id}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({
            status: newStatus, outcome,
            close_price: currentPrice,
            pnl_pct: +pnl.toFixed(2),
            closed_at: new Date().toISOString()
          })
        })
        setTrades(prev => prev.map(t => t.id === trade.id
          ? { ...t, status: newStatus, outcome, close_price: currentPrice, pnl_pct: +pnl.toFixed(2) }
          : t
        ))
      } catch {}
    }
  }

  async function deleteTrade(id) {
    if (!confirm('Hapus trade ini?')) return
    await sbFetch(`trades?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' })
    setTrades(prev => prev.filter(t => t.id !== id))
  }

  async function closeTrade(trade) {
    const st = stocks[trade.symbol]
    const price = st?.last || trade.entry
    const pnl = trade.entry > 0 ? ((price - trade.entry) / trade.entry * 100) * (trade.side === 'BUY' ? 1 : -1) : 0
    const outcome = pnl >= 0 ? 'win' : 'loss'
    await sbFetch(`trades?id=eq.${trade.id}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: JSON.stringify({
        status: 'closed', outcome,
        close_price: price,
        pnl_pct: +pnl.toFixed(2),
        closed_at: new Date().toISOString()
      })
    })
    setTrades(prev => prev.map(t => t.id === trade.id
      ? { ...t, status: 'closed', outcome, close_price: price, pnl_pct: +pnl.toFixed(2) }
      : t
    ))
  }

  const openTrades = trades.filter(t => t.status === 'open')
  const closedTrades = trades.filter(t => t.status !== 'open')
  const wins = closedTrades.filter(t => t.outcome === 'win')
  const losses = closedTrades.filter(t => t.outcome === 'loss')
  const winRate = closedTrades.length ? (wins.length / closedTrades.length * 100) : 0
  const avgPnl = closedTrades.length ? closedTrades.reduce((a, t) => a + (t.pnl_pct || 0), 0) / closedTrades.length : 0
  const totalPnl = closedTrades.reduce((a, t) => a + (t.pnl_pct || 0), 0)

  const filtered = tab === 'open' ? openTrades
    : tab === 'closed' ? closedTrades
    : tab === 'win' ? wins
    : losses

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      <div className="row between">
        <div>
          <h2 className="h1">Jurnal Trading</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Catat entry, multi-TP, stop loss — auto-resolve saat harga tersentuh
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <LivePill />
          <button className="btn primary" onClick={() => { setEditTrade(null); setShowForm(true) }}>
            + Trade Baru
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        <div className="stat-card">
          <div className="label">Win Rate</div>
          <div className="value mono" style={{ color: winRate >= 50 ? 'var(--up)' : 'var(--down)' }}>
            {winRate.toFixed(1)}%
          </div>
          <div className="sub muted">{wins.length}W / {losses.length}L</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Trade</div>
          <div className="value mono">{trades.length}</div>
          <div className="sub muted">{openTrades.length} open</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg P&L</div>
          <div className="value mono" style={{ color: avgPnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
            {avgPnl > 0 ? '+' : ''}{avgPnl.toFixed(2)}%
          </div>
          <div className="sub muted">per trade</div>
        </div>
        <div className="stat-card">
          <div className="label">Total P&L</div>
          <div className="value mono" style={{ color: totalPnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
            {totalPnl > 0 ? '+' : ''}{totalPnl.toFixed(2)}%
          </div>
          <div className="sub muted">kumulatif</div>
        </div>
        <div className="stat-card">
          <div className="label">Win</div>
          <div className="value mono up">{wins.length}</div>
          <div className="sub muted">trades</div>
        </div>
        <div className="stat-card">
          <div className="label">Loss</div>
          <div className="value mono down">{losses.length}</div>
          <div className="sub muted">trades</div>
        </div>
      </div>

      {/* Table */}
      <div className="panel">
        <div className="panel-head">
          <div className="row" style={{ gap: 8 }}>
            <span className="panel-title">Log Trade</span>
            <div className="seg">
              {[['open', `Open (${openTrades.length})`], ['closed', `Closed (${closedTrades.length})`], ['win', `Win (${wins.length})`], ['loss', `Loss (${losses.length})`]].map(([k, l]) => (
                <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Memuat...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Saham</th>
                  <th>Side</th>
                  <th className="num">Entry</th>
                  <th className="num">Harga Skrg</th>
                  <th className="num">TP1</th>
                  <th className="num">TP2</th>
                  <th className="num">TP3</th>
                  <th className="num">Stop</th>
                  <th className="num">P&L</th>
                  <th>Waktu</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const st = stocks[t.symbol]
                  const currentPrice = t.status === 'open' ? (st?.last || t.entry) : (t.close_price || t.entry)
                  const livePnl = t.entry > 0 ? ((currentPrice - t.entry) / t.entry * 100) * (t.side === 'BUY' ? 1 : -1) : 0

                  return (
                    <tr key={t.id}>
                      <td><StatusBadge status={t.status} outcome={t.outcome} /></td>
                      <td className="sym-cell" onClick={() => openStock(t.symbol)} style={{ cursor: 'pointer' }}>
                        {t.symbol}
                      </td>
                      <td>
                        <span className={'chg-pill ' + (t.side === 'BUY' ? 'up' : 'down')}>{t.side}</span>
                      </td>
                      <td className="num mono">{fmt.px(t.entry)}</td>
                      <td className="num mono">
                        {t.status === 'open' && st
                          ? <AnimatedNumber value={st.last} format={fmt.px} />
                          : fmt.px(t.close_price || t.entry)
                        }
                      </td>
                      <td className="num mono up">{t.tp1 ? fmt.px(t.tp1) : '—'}</td>
                      <td className="num mono up">{t.tp2 ? fmt.px(t.tp2) : '—'}</td>
                      <td className="num mono up">{t.tp3 ? fmt.px(t.tp3) : '—'}</td>
                      <td className="num mono down">{t.stop_loss ? fmt.px(t.stop_loss) : '—'}</td>
                      <td className={'num mono ' + (livePnl >= 0 ? 'up' : 'down')}>
                        {livePnl > 0 ? '+' : ''}{livePnl.toFixed(2)}%
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {new Date(t.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </td>
                      <td>
                        <div className="row" style={{ gap: 4 }}>
                          {t.status === 'open' && (
                            <>
                              <button className="btn sm ghost" style={{ fontSize: 10 }}
                                onClick={() => { setEditTrade(t); setShowForm(true) }}>✏️</button>
                              <button className="btn sm ghost" style={{ fontSize: 10, color: 'var(--up)' }}
                                onClick={() => closeTrade(t)}>✓ Close</button>
                            </>
                          )}
                          <button className="btn sm ghost" style={{ fontSize: 10, color: 'var(--down)' }}
                            onClick={() => deleteTrade(t.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan="12" style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                    Belum ada trade.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <TradeForm
          stocks={stocks}
          editTrade={editTrade}
          onClose={() => { setShowForm(false); setEditTrade(null) }}
          onSave={async (trade) => {
            if (editTrade) {
              await sbFetch(`trades?id=eq.${editTrade.id}`, {
                method: 'PATCH', prefer: 'return=minimal',
                body: JSON.stringify(trade)
              })
              setTrades(prev => prev.map(t => t.id === editTrade.id ? { ...t, ...trade } : t))
            } else {
              const data = await sbFetch('trades', { method: 'POST', body: JSON.stringify(trade) })
              setTrades(prev => [data[0], ...prev])
            }
            setShowForm(false); setEditTrade(null)
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status, outcome }) {
  const map = {
    open: { label: 'OPEN', color: 'var(--accent)', bg: 'var(--accent-2)' },
    tp1_hit: { label: 'TP1 ✓', color: 'var(--up)', bg: 'var(--up-2)' },
    tp2_hit: { label: 'TP2 ✓', color: 'var(--up)', bg: 'var(--up-2)' },
    tp3_hit: { label: 'TP3 ✓', color: 'var(--up)', bg: 'var(--up-2)' },
    stop_hit: { label: 'STOP ✗', color: 'var(--down)', bg: 'var(--down-2)' },
    closed: { label: outcome === 'win' ? 'WIN' : outcome === 'loss' ? 'LOSS' : 'CLOSED',
               color: outcome === 'win' ? 'var(--up)' : outcome === 'loss' ? 'var(--down)' : 'var(--text-3)',
               bg: outcome === 'win' ? 'var(--up-2)' : outcome === 'loss' ? 'var(--down-2)' : 'var(--panel)' },
  }
  const s = map[status] || map.open
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      color: s.color, background: s.bg, whiteSpace: 'nowrap'
    }}>{s.label}</span>
  )
}

function TradeForm({ stocks, editTrade, onClose, onSave }) {
  const [sym, setSym] = useState(editTrade?.symbol || '')
  const [side, setSide] = useState(editTrade?.side || 'BUY')
  const [entry, setEntry] = useState(editTrade?.entry || '')
  const [tp1, setTp1] = useState(editTrade?.tp1 || '')
  const [tp2, setTp2] = useState(editTrade?.tp2 || '')
  const [tp3, setTp3] = useState(editTrade?.tp3 || '')
  const [sl, setSl] = useState(editTrade?.stop_loss || '')
  const [lot, setLot] = useState(editTrade?.lot || 1)
  const [notes, setNotes] = useState(editTrade?.notes || '')
  const [saving, setSaving] = useState(false)

  const st = stocks[sym?.toUpperCase()]
  const currentPrice = st?.last || 0

  function autoFill() {
    if (!entry) return
    const e = +entry
    if (side === 'BUY') {
      setTp1(Math.round(e * 1.03))
      setTp2(Math.round(e * 1.06))
      setTp3(Math.round(e * 1.10))
      setSl(Math.round(e * 0.97))
    } else {
      setTp1(Math.round(e * 0.97))
      setTp2(Math.round(e * 0.94))
      setTp3(Math.round(e * 0.90))
      setSl(Math.round(e * 1.03))
    }
  }

  function useCurrentPrice() {
    if (currentPrice) setEntry(currentPrice)
  }

  const rr = entry && tp1 && sl
    ? Math.abs(+tp1 - +entry) / Math.abs(+entry - +sl)
    : 0

  async function handleSave() {
    if (!sym || !entry) return
    setSaving(true)
    await onSave({
      symbol: sym.toUpperCase(),
      side,
      entry: +entry,
      tp1: tp1 ? +tp1 : null,
      tp2: tp2 ? +tp2 : null,
      tp3: tp3 ? +tp3 : null,
      stop_loss: sl ? +sl : null,
      lot: +lot,
      notes,
      status: 'open',
    })
    setSaving(false)
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="panel-head" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="panel-title">{editTrade ? 'Edit Trade' : 'Trade Baru'}</span>
          <button className="btn sm ghost" onClick={onClose}>✕</button>
        </div>
        <div className="panel-body col" style={{ gap: 14 }}>

          {/* Symbol + Side */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label>Simbol</label>
              <input value={sym} onChange={e => setSym(e.target.value.toUpperCase())}
                placeholder="BBCA" list="trade-sym-list" />
              <datalist id="trade-sym-list">
                {Object.keys(stocks).map(s => <option key={s} value={s}>{stocks[s]?.name}</option>)}
              </datalist>
              {st && (
                <div className="muted" style={{ fontSize: 11, marginTop: 4, display: 'flex', gap: 8 }}>
                  <span>Last: {fmt.px(st.last)}</span>
                  <span className={'chg-pill ' + sgn(st.changePct)} style={{ fontSize: 10 }}>{fmt.pct(st.changePct)}</span>
                </div>
              )}
            </div>
            <div className="field">
              <label>Arah</label>
              <div className="seg" style={{ height: 32, padding: 3 }}>
                <button className={side === 'BUY' ? 'on' : ''} onClick={() => setSide('BUY')}
                  style={{ flex: 1, color: side === 'BUY' ? 'var(--up)' : 'var(--text-2)', fontWeight: 600 }}>BELI ▲</button>
                <button className={side === 'SELL' ? 'on' : ''} onClick={() => setSide('SELL')}
                  style={{ flex: 1, color: side === 'SELL' ? 'var(--down)' : 'var(--text-2)', fontWeight: 600 }}>JUAL ▼</button>
              </div>
            </div>
          </div>

          {/* Entry */}
          <div className="field">
            <label>Harga Entry</label>
            <div className="row" style={{ gap: 6 }}>
              <input value={entry} onChange={e => setEntry(e.target.value)} type="number" style={{ flex: 1 }} />
              {currentPrice > 0 && (
                <button className="btn sm ghost" onClick={useCurrentPrice} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  Pakai {fmt.px(currentPrice)}
                </button>
              )}
            </div>
          </div>

          {/* TP1 TP2 TP3 */}
          <div>
            <div className="row between" style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Take Profit</label>
              <button className="btn sm ghost" onClick={autoFill} style={{ fontSize: 11 }}>Auto isi (+3/+6/+10%)</button>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div className="field">
                <label style={{ color: 'var(--up)' }}>TP1</label>
                <input value={tp1} onChange={e => setTp1(e.target.value)} type="number"
                  style={{ borderColor: tp1 ? 'var(--up)' : undefined }} />
                {tp1 && entry && <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
                  {((+tp1 - +entry) / +entry * 100 * (side === 'BUY' ? 1 : -1)).toFixed(1)}%
                </div>}
              </div>
              <div className="field">
                <label style={{ color: 'var(--up)' }}>TP2</label>
                <input value={tp2} onChange={e => setTp2(e.target.value)} type="number"
                  style={{ borderColor: tp2 ? 'var(--up)' : undefined }} />
                {tp2 && entry && <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
                  {((+tp2 - +entry) / +entry * 100 * (side === 'BUY' ? 1 : -1)).toFixed(1)}%
                </div>}
              </div>
              <div className="field">
                <label style={{ color: 'var(--up)' }}>TP3</label>
                <input value={tp3} onChange={e => setTp3(e.target.value)} type="number"
                  style={{ borderColor: tp3 ? 'var(--up)' : undefined }} />
                {tp3 && entry && <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
                  {((+tp3 - +entry) / +entry * 100 * (side === 'BUY' ? 1 : -1)).toFixed(1)}%
                </div>}
              </div>
            </div>
          </div>

          {/* Stop Loss + Lot */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label style={{ color: 'var(--down)' }}>Stop Loss</label>
              <input value={sl} onChange={e => setSl(e.target.value)} type="number"
                style={{ borderColor: sl ? 'var(--down)' : undefined }} />
              {sl && entry && <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
                {((+sl - +entry) / +entry * 100 * (side === 'BUY' ? 1 : -1)).toFixed(1)}%
              </div>}
            </div>
            <div className="field">
              <label>Lot</label>
              <input value={lot} onChange={e => setLot(e.target.value)} type="number" min="1" step="1" />
            </div>
          </div>

          {/* R:R */}
          {rr > 0 && (
            <div style={{ background: 'var(--panel-2)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
              R:R = <strong className="mono" style={{ color: rr >= 2 ? 'var(--up)' : rr >= 1 ? 'var(--accent)' : 'var(--down)' }}>
                {rr.toFixed(2)}
              </strong>
              <span className="muted" style={{ marginLeft: 12 }}>
                {rr >= 3 ? '🔥 Excellent' : rr >= 2 ? '✅ Good' : rr >= 1 ? '⚠️ Minimal' : '❌ Poor'}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="field">
            <label>Catatan / Alasan</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Breakout resistance, RSI oversold, asing net buy..." rows="2" />
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>Batal</button>
            <button className="btn primary" onClick={handleSave} disabled={!sym || !entry || saving}>
              {saving ? 'Menyimpan...' : editTrade ? 'Update' : 'Catat Trade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
