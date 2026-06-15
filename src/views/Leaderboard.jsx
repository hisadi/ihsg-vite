// Leaderboard.jsx — ranking by prediction accuracy
import React from 'react'
import { LivePill } from '../components'
import { fmt } from '../api'
import { LS, pnlOf, rrOf } from '../store'
import { defaultPredictions } from '../defaults'

export default function Leaderboard({ stocks, openStock }) {
  const preds = LS.read('ihsg.predictions', defaultPredictions())

  // Group by user
  const byUser = {}
  preds.forEach(p => {
    if (!byUser[p.user]) byUser[p.user] = { user: p.user, ai: p.ai, all: [], resolved: [], wins: [], losses: [] }
    byUser[p.user].all.push(p)
    if (p.resolved) {
      byUser[p.user].resolved.push(p)
      if (p.outcome === 'win') byUser[p.user].wins.push(p)
      else byUser[p.user].losses.push(p)
    }
  })

  const ranked = Object.values(byUser).map(u => {
    const winRate = u.resolved.length ? (u.wins.length / u.resolved.length) * 100 : 0
    const totalPnL = u.resolved.reduce((a, p) => a + pnlOf(p, p.hitPx), 0)
    const avgRR = u.all.reduce((a, p) => a + rrOf(p), 0) / (u.all.length || 1)
    const rets = u.resolved.map(p => pnlOf(p, p.hitPx))
    const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1)
    const variance = rets.reduce((a, r) => a + (r - mean) * (r - mean), 0) / (rets.length || 1)
    const std = Math.sqrt(variance)
    const sharpe = std ? (mean / std) * Math.sqrt(rets.length || 1) : 0
    return { ...u, total: u.all.length, winRate, totalPnL, avgRR, sharpe }
  }).sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate
    return b.totalPnL - a.totalPnL
  })

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      <div className="row between">
        <div>
          <h2 className="h1">Leaderboard Akurasi</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Peringkat analis & AI berdasar performa prediksi objektif
          </div>
        </div>
        <LivePill />
      </div>

      {/* Podium */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {ranked.slice(0, 3).map((u, i) => (
          <div key={u.user} className="stat-card" style={{
            padding: 18,
            background: i === 0 ? 'linear-gradient(145deg, var(--accent-2), var(--panel))' : 'var(--panel)',
            borderColor: i === 0 ? 'var(--accent)' : 'var(--border)'
          }}>
            <div className="row between">
              <span className="tag" style={{
                fontSize: 11, fontWeight: 700,
                color: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--text)' : 'var(--text-2)',
                borderColor: i === 0 ? 'var(--accent)' : 'var(--border-2)'
              }}>RANK #{i + 1}</span>
              {u.ai && <span className="tag" style={{ color: 'var(--blue)', borderColor: 'var(--blue)44' }}>AI</span>}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>{u.user}</div>
            <div className="row" style={{ marginTop: 12, gap: 18 }}>
              <div>
                <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase' }}>Win Rate</div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: u.winRate >= 60 ? 'var(--up)' : u.winRate >= 50 ? 'var(--accent)' : 'var(--down)' }}>{u.winRate.toFixed(0)}%</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase' }}>P&L</div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: u.totalPnL >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.pct(u.totalPnL)}</div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 10, gap: 8, fontSize: 11, color: 'var(--text-2)' }}>
              <span className="up">{u.wins.length}W</span>
              <span>·</span>
              <span className="down">{u.losses.length}L</span>
              <span>·</span>
              <span>{u.total} setup</span>
            </div>
          </div>
        ))}
      </div>

      {/* Full table */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Ranking Lengkap</span>
          <span className="muted" style={{ fontSize: 11 }}>{ranked.length} analis · {preds.length} total prediksi</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Analis</th>
              <th>Tipe</th>
              <th className="num">Win Rate</th>
              <th className="num">W / L</th>
              <th className="num">Total P&L</th>
              <th className="num">Avg R:R</th>
              <th className="num">Sharpe</th>
              <th className="num">Total Setup</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((u, i) => (
              <tr key={u.user}>
                <td className="mono" style={{ fontWeight: 600, color: i < 3 ? 'var(--accent)' : 'var(--text-2)' }}>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{u.user}</td>
                <td>{u.ai ? <span className="tag" style={{ color: 'var(--blue)', borderColor: 'var(--blue)44' }}>AI</span> : <span className="tag">Human</span>}</td>
                <td className="num">
                  <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                    <div className="progress" style={{ width: 60 }}><span style={{ width: u.winRate + '%', background: u.winRate >= 60 ? 'var(--up)' : u.winRate >= 50 ? 'var(--accent)' : 'var(--down)' }}></span></div>
                    <span className="mono" style={{ fontWeight: 600 }}>{u.winRate.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="num mono"><span className="up">{u.wins.length}</span> / <span className="down">{u.losses.length}</span></td>
                <td className={'num mono ' + (u.totalPnL >= 0 ? 'up' : 'down')}>{fmt.pct(u.totalPnL)}</td>
                <td className="num mono">{u.avgRR.toFixed(2)}</td>
                <td className="num mono">{u.sharpe.toFixed(2)}</td>
                <td className="num mono">{u.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AggregateBattle ranked={ranked} />
    </div>
  )
}

function AggregateBattle({ ranked }) {
  const ai = ranked.filter(u => u.ai)
  const hum = ranked.filter(u => !u.ai)
  const agg = (list) => {
    let w = 0, total = 0, pnl = 0
    list.forEach(u => { w += u.wins.length; total += u.resolved.length; pnl += u.totalPnL })
    return { winRate: total ? (w / total) * 100 : 0, total, w, l: total - w, pnl }
  }
  const aiA = agg(ai), humA = agg(hum)

  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">AI vs Human — Pertarungan Agregat</span></div>
      <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 18, alignItems: 'center' }}>
        <BattleSide label="🤖 AI" data={aiA} />
        <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-3)' }}>VS</div>
        <BattleSide label="👤 Human" data={humA} side="right" />
      </div>
    </div>
  )
}

function BattleSide({ label, data, side }) {
  return (
    <div style={{ textAlign: side === 'right' ? 'right' : 'left' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{label}</div>
      <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: data.winRate >= 60 ? 'var(--up)' : data.winRate >= 50 ? 'var(--accent)' : 'var(--down)', margin: '4px 0' }}>{data.winRate.toFixed(1)}%</div>
      <div className="muted" style={{ fontSize: 12 }}>{data.w}W / {data.l}L · P&L {fmt.pct(data.pnl)}</div>
    </div>
  )
}