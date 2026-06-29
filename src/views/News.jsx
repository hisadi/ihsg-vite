// News.jsx — News & sentiment view
import React, { useState } from 'react'
import { LivePill } from '../components'
import { fmt } from '../api'

export default function News({ news = [], openStock }) {
  const [filter, setFilter] = useState('all')
  const [symFilter, setSymFilter] = useState('')
  const [tab, setTab] = useState('feed') // feed | emiten

  // Semua saham yang muncul di berita
  const symsInNews = [...new Set(news.filter(n => n.sym).map(n => n.sym))].sort()

  const filtered = news.filter(n => {
    if (filter !== 'all' && n.sentiment !== filter) return false
    if (symFilter && n.sym !== symFilter) return false
    return true
  })

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
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Real-time dari CNBC Indonesia & Detik Finance — klik untuk buka artikel
          </div>
        </div>
        <LivePill />
      </div>

      {/* Sentiment Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="label">Skor Sentimen</div>
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
            <span className="panel-title">Feed Berita</span>
            <div className="seg">
              {[['all', 'Semua'], ['positive', '📈 Bullish'], ['neutral', '➡️ Netral'], ['negative', '📉 Bearish']].map(([k, l]) => (
                <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {symFilter && (
              <button className="btn sm ghost" onClick={() => setSymFilter('')} style={{ fontSize: 11 }}>
                {symFilter} ✕
              </button>
            )}
            <span className="muted" style={{ fontSize: 11 }}>
              {filtered.length} berita {symsInNews.length > 0 && `· ${symsInNews.length} emiten terdeteksi`}
            </span>
          </div>
        </div>

        {/* Emiten chips */}
        {symsInNews.length > 0 && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center' }}>Emiten:</span>
            {symsInNews.map(s => (
              <button key={s}
                onClick={() => setSymFilter(symFilter === s ? '' : s)}
                style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                  background: symFilter === s ? 'var(--accent)' : 'var(--panel-2)',
                  color: symFilter === s ? 'var(--bg)' : 'var(--accent)',
                  border: `1px solid ${symFilter === s ? 'var(--accent)' : 'var(--accent)44'}`,
                  fontWeight: 600
                }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="col" style={{ gap: 0 }}>
          {filtered.map(n => (
            <NewsRow key={n.id} n={n} onOpenStock={() => n.sym && openStock(n.sym)} />
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
              {symFilter ? `Tidak ada berita untuk ${symFilter}` : 'Tidak ada berita pada filter ini'}
            </div>
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

  function handleClick() {
    if (n.url) window.open(n.url, '_blank', 'noopener,noreferrer')
  }

  function handleSymClick(e) {
    e.stopPropagation()
    onOpenStock()
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={e => { if (n.url) e.currentTarget.style.background = 'var(--panel)' }}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      style={{
        display: 'flex', gap: 14, padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        cursor: n.url ? 'pointer' : 'default',
        transition: 'background 0.1s'
      }}
    >
      <div style={{ width: 4, alignSelf: 'stretch', background: color, borderRadius: 2, flexShrink: 0 }}></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45, marginBottom: 5 }}>
          {n.title}
          {n.url && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--text-3)', verticalAlign: 'middle' }}>↗</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>{n.source}</span>
          <span>·</span>
          <span>{fmt.rel(n.ts)}</span>
          <span>·</span>
          <span style={{
            padding: '1px 6px', borderRadius: 3, fontSize: 10,
            background: 'var(--panel-2)', border: '1px solid var(--border)'
          }}>{n.tag}</span>
          {n.sym && (
            <span
              onClick={handleSymClick}
              style={{
                padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                background: 'var(--accent-2)', border: '1px solid var(--accent)44',
                color: 'var(--accent)', cursor: 'pointer'
              }}>
              {n.sym}
            </span>
          )}
        </div>
      </div>
      <span style={{
        fontSize: 10, color, background: bg,
        padding: '3px 8px', borderRadius: 4,
        fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', flexShrink: 0,
        alignSelf: 'flex-start'
      }}>
        {n.sentiment === 'positive' ? 'Bullish' : n.sentiment === 'negative' ? 'Bearish' : 'Netral'}
      </span>
    </div>
  )
}
