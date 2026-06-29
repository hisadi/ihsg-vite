// News.jsx — News & sentiment view
import React, { useState } from 'react'
import { LivePill } from '../components'
import { fmt } from '../api'

export default function News({ news = [], openStock }) {
  const [filter, setFilter] = useState('all')

  const filtered = news.filter(n => filter === 'all' || n.sentiment === filter)
  const counts = {
    positive: news.filter(n => n.sentiment === 'positive').length,
    neutral: news.filter(n => n.sentiment === 'neutral').length,
    negative: news.filter(n => n.sentiment === 'negative').length,
  }
  const total = news.length
  const sentScore = total ? ((counts.positive - counts.negative) / total) * 100 : 0

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      <div className="row between">
        <div>
          <h2 className="h1">Berita & Sentimen Pasar</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Headline real-time + skor sentimen otomatis per saham</div>
        </div>
        <LivePill />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="label">Skor Sentimen Pasar</div>
          <div className="value mono" style={{ color: sentScore > 0 ? 'var(--up)' : sentScore < 0 ? 'var(--down)' : 'var(--text)' }}>
            {sentScore > 0 ? '+' : ''}{sentScore.toFixed(0)}
          </div>
          <div className="sub muted">{sentScore > 30 ? 'Sangat Bullish' : sentScore > 10 ? 'Bullish' : sentScore > -10 ? 'Netral' : sentScore > -30 ? 'Bearish' : 'Sangat Bearish'}</div>
        </div>
        <SentimentCard label="Positif" count={counts.positive} total={total} color="var(--up)" />
        <SentimentCard label="Netral" count={counts.neutral} total={total} color="var(--accent)" />
        <SentimentCard label="Negatif" count={counts.negative} total={total} color="var(--down)" />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="row" style={{ gap: 10 }}>
            <span className="panel-title">Feed</span>
            <div className="seg">
              {[['all', 'Semua'], ['positive', 'Positif'], ['neutral', 'Netral'], ['negative', 'Negatif']].map(([k, l]) => (
                <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
          </div>
          <span className="muted" style={{ fontSize: 11 }}>Sumber: CNBC Indonesia, Detik Finance</span>
        </div>
        <div className="col" style={{ gap: 0 }}>
          {filtered.map(n => (
            <NewsRow key={n.id} n={n} onOpenStock={() => n.sym && openStock(n.sym)} />
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Tidak ada berita pada filter ini</div>
          )}
        </div>
      </div>
    </div>
  )
}

function SentimentCard({ label, count, total, color }) {
  const pct = total ? (count / total) * 100 : 0
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value mono">{count}<span className="muted" style={{ fontSize: 13, marginLeft: 6 }}>({pct.toFixed(0)}%)</span></div>
      <div className="progress" style={{ marginTop: 2 }}><span style={{ width: pct + '%', background: color }}></span></div>
    </div>
  )
}

function NewsRow({ n, onOpenStock }) {
  const color = n.sentiment === 'positive' ? 'var(--up)' : n.sentiment === 'negative' ? 'var(--down)' : 'var(--accent)'
  const bg = n.sentiment === 'positive' ? 'var(--up-2)' : n.sentiment === 'negative' ? 'var(--down-2)' : 'var(--accent-2)'

  function handleClick(e) {
    // Klik judul → buka artikel
    if (n.url) {
      window.open(n.url, '_blank', 'noopener,noreferrer')
    }
  }

  function handleSymClick(e) {
    e.stopPropagation()
    onOpenStock()
  }

  return (
    <div className="row" style={{ gap: 14, padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: n.url ? 'pointer' : 'default' }}
      onClick={handleClick}
      onMouseEnter={e => { if (n.url) e.currentTarget.style.background = 'var(--panel)' }}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ width: 6, alignSelf: 'stretch', background: color, borderRadius: 3, flexShrink: 0 }}></div>
      <div className="col" style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
          {n.title}
          {n.url && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-3)' }}>↗</span>}
        </div>
        <div className="row" style={{ gap: 8, fontSize: 11, color: 'var(--text-3)', flexWrap: 'wrap' }}>
          <span>{n.source}</span>
          <span>·</span>
          <span>{fmt.rel(n.ts)}</span>
          <span>·</span>
          <span className="tag" style={{ borderColor: color + '44', color }}>{n.tag}</span>
          {n.sym && (
            <span className="tag" style={{ cursor: 'pointer', color: 'var(--accent)', borderColor: 'var(--accent)44' }}
              onClick={handleSymClick}>
              {n.sym}
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 10, color, background: bg, padding: '3px 8px', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
        {n.sentiment === 'positive' ? 'Bullish' : n.sentiment === 'negative' ? 'Bearish' : 'Netral'}
      </span>
    </div>
  )
}
