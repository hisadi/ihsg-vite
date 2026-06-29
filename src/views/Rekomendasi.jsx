// Rekomendasi.jsx — Rekomendasi trading otomatis + AI explanation + auto-track winrate
import React, { useState, useEffect, useRef } from 'react'
import { AnimatedNumber, Sparkline, LivePill } from '../components'
import { fmt, sgn, SECTOR_LABELS } from '../api'

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

// ─── SIGNAL ENGINE ────────────────────────────────────────────────────────────
function generateRekomendasi(st) {
  if (!st || !st.last || st.last <= 0) return null

  const scores = []
  const reasons = []
  const last = st.last
  const changePct = st.changePct || 0
  const rsi = st.rsi || 50
  const foreignNet = st.foreignNet || 0
  const volume = st.volume || 0

  // 1. RSI
  if (rsi <= 25) { scores.push(4); reasons.push(`RSI sangat oversold (${rsi}) — potensi rebound kuat`) }
  else if (rsi <= 35) { scores.push(3); reasons.push(`RSI oversold (${rsi}) — tekanan jual berkurang`) }
  else if (rsi <= 45) { scores.push(1); reasons.push(`RSI rendah (${rsi}) — masih ada ruang naik`) }
  else if (rsi >= 75) { scores.push(-4); reasons.push(`RSI overbought (${rsi}) — potensi koreksi`) }
  else if (rsi >= 65) { scores.push(-2); reasons.push(`RSI tinggi (${rsi}) — hati-hati`) }

  // 2. Price momentum
  if (changePct <= -7) { scores.push(3); reasons.push(`Koreksi dalam ${fmt.pct(changePct)} — potensi technical rebound`) }
  else if (changePct <= -4) { scores.push(2); reasons.push(`Koreksi ${fmt.pct(changePct)} — support area`) }
  else if (changePct <= -2) { scores.push(1); reasons.push(`Turun moderat ${fmt.pct(changePct)}`) }
  else if (changePct >= 7) { scores.push(-3); reasons.push(`Sudah naik tajam ${fmt.pct(changePct)} — risiko overbought`) }
  else if (changePct >= 4) { scores.push(-1); reasons.push(`Sudah naik ${fmt.pct(changePct)}`) }
  else if (changePct >= 1) { scores.push(1); reasons.push(`Momentum positif ${fmt.pct(changePct)}`) }

  // 3. Foreign flow
  if (foreignNet > 0) {
    const ratio = foreignNet / (st.mcap || 1e12)
    if (ratio > 0.0005) { scores.push(3); reasons.push(`Foreign net buy besar — akumulasi asing`) }
    else if (ratio > 0.0002) { scores.push(2); reasons.push(`Foreign net buy — asing masuk`) }
    else { scores.push(1); reasons.push(`Foreign net buy minor`) }
  } else if (foreignNet < 0) {
    const ratio = Math.abs(foreignNet) / (st.mcap || 1e12)
    if (ratio > 0.0005) { scores.push(-3); reasons.push(`Foreign net sell besar — distribusi asing`) }
    else if (ratio > 0.0002) { scores.push(-2); reasons.push(`Foreign net sell — asing keluar`) }
    else { scores.push(-1); reasons.push(`Foreign net sell minor`) }
  }

  // 4. Volume
  if (volume > 100_000_000) { scores.push(2); reasons.push(`Volume sangat tinggi — ${fmt.vol(volume)} lot`) }
  else if (volume > 50_000_000) { scores.push(1); reasons.push(`Volume tinggi — ${fmt.vol(volume)} lot`) }

  // 5. Kombinasi
  if (rsi < 40 && changePct < -2 && foreignNet > 0) {
    scores.push(2)
    reasons.push(`Kombinasi ideal: oversold + turun + asing beli`)
  }

  const total = scores.reduce((a, b) => a + b, 0)

  // Hanya generate rekomendasi untuk sinyal positif yang cukup kuat
  if (total < 3) return null

  // Hitung level berdasarkan volatilitas saham
  const volatility = Math.abs(changePct) / 100
  const atr = Math.max(last * 0.02, last * volatility * 2) // ATR estimasi

  const entry = last
  const tp1 = Math.round(entry + atr * 1.0)
  const tp2 = Math.round(entry + atr * 2.0)
  const tp3 = Math.round(entry + atr * 3.5)
  const sl = Math.round(entry - atr * 0.8)

  const rr1 = (tp1 - entry) / (entry - sl)
  const confidence = Math.min(95, 40 + total * 8)

  return {
    symbol: st.symbol,
    name: st.name,
    sector: st.sector,
    last, changePct, rsi, foreignNet, volume,
    mcap: st.mcap,
    spark: st.spark,
    score: total,
    confidence,
    reasons,
    entry, tp1, tp2, tp3, sl,
    rr: +rr1.toFixed(2),
    side: 'BUY',
  }
}

// ─── AI EXPLANATION ───────────────────────────────────────────────────────────
const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
]

let _orKey = null
async function getORKey() {
  if (_orKey) return _orKey
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/keys?select=value&name=eq.openrouter&limit=1`,
      { headers: { 'apikey': SUPABASE_KEY, 'Accept-Profile': 'apikeys' } }
    )
    const data = await resp.json()
    _orKey = data?.[0]?.value || ''
  } catch {}
  return _orKey
}

async function getAIExplanation(rek) {
  const key = await getORKey()
  if (!key) throw new Error('API key tidak ditemukan')

  const prompt = `Analisis rekomendasi trading saham ${rek.symbol} (${rek.name}) di BEI:

Data teknikal:
- Harga saat ini: Rp ${fmt.px(rek.last)}
- Perubahan hari ini: ${fmt.pct(rek.changePct)}
- RSI: ${rek.rsi}
- Foreign net flow: ${fmt.bigIDR(rek.foreignNet)}
- Volume: ${fmt.vol(rek.volume)} lot
- Sektor: ${SECTOR_LABELS[rek.sector] || rek.sector}

Rekomendasi algoritma:
- Entry: Rp ${fmt.px(rek.entry)}
- TP1: Rp ${fmt.px(rek.tp1)} | TP2: Rp ${fmt.px(rek.tp2)} | TP3: Rp ${fmt.px(rek.tp3)}
- Stop Loss: Rp ${fmt.px(rek.sl)}
- R:R Ratio: ${rek.rr}x
- Confidence: ${rek.confidence}%

Alasan sinyal: ${rek.reasons.join(', ')}

Berikan analisis singkat (max 120 kata) dalam Bahasa Indonesia:
1. Validasi sinyal — apakah setup ini masuk akal?
2. Risiko utama yang perlu diwaspadai
3. Tips eksekusi (timing, manajemen posisi)`

  for (const model of MODELS) {
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })
      })
      if (resp.status === 429) continue
      const data = await resp.json()
      const text = data.choices?.[0]?.message?.content
      if (text) return text
    } catch {}
  }
  throw new Error('Semua model gagal')
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Rekomendasi({ stocks, openStock }) {
  const [reks, setReks] = useState([])
  const [selected, setSelected] = useState(null)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followed, setFollowed] = useState({}) // id → true
  const [winStats, setWinStats] = useState({ total: 0, win: 0, loss: 0, winRate: 0 })
  const [filterSector, setFilterSector] = useState('ALL')
  const [sortBy, setSortBy] = useState('confidence')

  // Generate rekomendasi dari data saham
  useEffect(() => {
    const all = Object.values(stocks || {})
    if (all.length === 0) return
    const generated = all
      .map(generateRekomendasi)
      .filter(Boolean)
      .sort((a, b) => b.confidence - a.confidence)
    setReks(generated)
  }, [stocks])

  // Load winrate dari Supabase
  useEffect(() => {
    loadWinStats()
  }, [])

  async function loadWinStats() {
    try {
      const data = await sbFetch('trades?select=outcome,notes&notes=like.%5BREK%5D%25')
      const closed = data.filter(t => t.outcome)
      const wins = closed.filter(t => t.outcome === 'win')
      setWinStats({
        total: data.length,
        win: wins.length,
        loss: closed.length - wins.length,
        winRate: closed.length ? (wins.length / closed.length * 100) : 0
      })
    } catch {}
  }

  async function handleAI(rek) {
    setSelected(rek)
    setAiText('')
    setAiLoading(true)
    try {
      const text = await getAIExplanation(rek)
      setAiText(text)
    } catch (e) {
      setAiText(`❌ ${e.message}`)
    }
    setAiLoading(false)
  }

  async function handleIkuti(rek) {
    setFollowing(true)
    try {
      const data = await sbFetch('trades', {
        method: 'POST',
        body: JSON.stringify({
          symbol: rek.symbol,
          side: rek.side,
          entry: rek.entry,
          tp1: rek.tp1,
          tp2: rek.tp2,
          tp3: rek.tp3,
          stop_loss: rek.sl,
          lot: 1,
          status: 'open',
          notes: `[REK] Confidence ${rek.confidence}% | Score ${rek.score} | ${rek.reasons[0]}`,
        })
      })
      setFollowed(prev => ({ ...prev, [rek.symbol]: true }))
      await loadWinStats()
      alert(`✅ Rekomendasi ${rek.symbol} berhasil dimasukkan ke jurnal Trading!`)
    } catch (e) {
      alert('Gagal: ' + e.message)
    }
    setFollowing(false)
  }

  const sectors = [...new Set(reks.map(r => r.sector))].filter(Boolean)
  const filtered = reks
    .filter(r => filterSector === 'ALL' || r.sector === filterSector)
    .sort((a, b) => sortBy === 'confidence' ? b.confidence - a.confidence
      : sortBy === 'score' ? b.score - a.score
      : sortBy === 'rr' ? b.rr - a.rr
      : b.changePct - a.changePct)

  const sel = selected ? reks.find(r => r.symbol === selected.symbol) || selected : null

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      {/* Header */}
      <div className="row between">
        <div>
          <h2 className="h1">Rekomendasi Trading</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Algoritma teknikal scan {Object.keys(stocks).length} saham → rekomendasikan entry/TP/SL otomatis
          </div>
        </div>
        <LivePill />
      </div>

      {/* Winrate Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        <div className="stat-card">
          <div className="label">Rekomendasi Aktif</div>
          <div className="value mono">{filtered.length}</div>
          <div className="sub muted">dari {Object.keys(stocks).length} saham</div>
        </div>
        <div className="stat-card">
          <div className="label">Winrate Rekomendasi</div>
          <div className="value mono" style={{ color: winStats.winRate >= 50 ? 'var(--up)' : winStats.winRate > 0 ? 'var(--down)' : 'var(--text-3)' }}>
            {winStats.total > 0 ? `${winStats.winRate.toFixed(1)}%` : '—'}
          </div>
          <div className="sub muted">{winStats.win}W / {winStats.loss}L</div>
        </div>
        <div className="stat-card">
          <div className="label">Diikuti</div>
          <div className="value mono">{winStats.total}</div>
          <div className="sub muted">total trade dari REK</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg Confidence</div>
          <div className="value mono">
            {filtered.length > 0 ? Math.round(filtered.reduce((a, r) => a + r.confidence, 0) / filtered.length) : 0}%
          </div>
          <div className="sub muted">sinyal saat ini</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg R:R</div>
          <div className="value mono">
            {filtered.length > 0 ? (filtered.reduce((a, r) => a + r.rr, 0) / filtered.length).toFixed(2) : 0}x
          </div>
          <div className="sub muted">risk reward</div>
        </div>
      </div>

      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        {/* List */}
        <div className="panel" style={{ flex: 1, minWidth: 0 }}>
          <div className="panel-head">
            <span className="panel-title">Daftar Rekomendasi</span>
            <div className="row" style={{ gap: 8 }}>
              <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
                style={{ fontSize: 11, padding: '3px 8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }}>
                <option value="ALL">Semua Sektor</option>
                {sectors.map(s => <option key={s} value={s}>{SECTOR_LABELS[s] || s}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ fontSize: 11, padding: '3px 8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }}>
                <option value="confidence">Confidence ↓</option>
                <option value="score">Score ↓</option>
                <option value="rr">R:R ↓</option>
              </select>
            </div>
          </div>

          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Saham</th>
                  <th className="num">Harga</th>
                  <th className="num">Chg%</th>
                  <th className="num">RSI</th>
                  <th className="num">Entry</th>
                  <th className="num">TP1</th>
                  <th className="num">SL</th>
                  <th className="num">R:R</th>
                  <th className="num">Conf</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.symbol}
                    style={{ cursor: 'pointer', background: sel?.symbol === r.symbol ? 'var(--panel)' : undefined }}
                    onClick={() => { setSelected(r); setAiText('') }}>
                    <td className="sym-cell" onClick={e => { e.stopPropagation(); openStock(r.symbol) }}>
                      {r.symbol}
                      <span className="muted" style={{ fontSize: 10, marginLeft: 6 }}>{r.name?.slice(0, 14)}</span>
                    </td>
                    <td className="num mono"><AnimatedNumber value={r.last} format={fmt.px} /></td>
                    <td className="num"><span className={'chg-pill ' + sgn(r.changePct)}>{fmt.pct(r.changePct)}</span></td>
                    <td className="num mono" style={{ color: r.rsi <= 35 ? 'var(--up)' : r.rsi >= 65 ? 'var(--down)' : 'var(--text)' }}>
                      {r.rsi}
                    </td>
                    <td className="num mono">{fmt.px(r.entry)}</td>
                    <td className="num mono up">{fmt.px(r.tp1)}</td>
                    <td className="num mono down">{fmt.px(r.sl)}</td>
                    <td className="num mono" style={{ color: r.rr >= 2 ? 'var(--up)' : r.rr >= 1 ? 'var(--accent)' : 'var(--down)' }}>
                      {r.rr}x
                    </td>
                    <td className="num">
                      <ConfBadge conf={r.confidence} />
                    </td>
                    <td>
                      <button className="btn sm ghost" style={{ fontSize: 10 }}
                        onClick={e => { e.stopPropagation(); setSelected(r); setAiText('') }}>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="10" style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                    {Object.keys(stocks).length === 0 ? 'Memuat data saham...' : 'Tidak ada rekomendasi saat ini.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {sel && (
          <div className="panel" style={{ width: 360, flexShrink: 0 }}>
            <div className="panel-head">
              <span className="panel-title">{sel.symbol}</span>
              <button className="btn sm ghost" onClick={() => { setSelected(null); setAiText('') }}>✕</button>
            </div>
            <div className="panel-body col" style={{ gap: 12 }}>

              {/* Confidence */}
              <div style={{ background: 'var(--up-2)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>CONFIDENCE SCORE</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--up)' }}>{sel.confidence}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                  Skor teknikal: +{sel.score} | BUY Signal
                </div>
              </div>

              {/* Levels */}
              <div style={{ background: 'var(--panel-2)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Level Trading
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <LevelItem label="Entry" value={fmt.px(sel.entry)} color="var(--accent)" />
                  <LevelItem label="Stop Loss" value={fmt.px(sel.sl)} color="var(--down)"
                    sub={`-${((sel.entry - sel.sl) / sel.entry * 100).toFixed(1)}%`} />
                  <LevelItem label="TP1" value={fmt.px(sel.tp1)} color="var(--up)"
                    sub={`+${((sel.tp1 - sel.entry) / sel.entry * 100).toFixed(1)}%`} />
                  <LevelItem label="TP2" value={fmt.px(sel.tp2)} color="var(--up)"
                    sub={`+${((sel.tp2 - sel.entry) / sel.entry * 100).toFixed(1)}%`} />
                  <LevelItem label="TP3" value={fmt.px(sel.tp3)} color="var(--up)"
                    sub={`+${((sel.tp3 - sel.entry) / sel.entry * 100).toFixed(1)}%`} />
                  <LevelItem label="R:R Ratio" value={`${sel.rr}x`}
                    color={sel.rr >= 2 ? 'var(--up)' : sel.rr >= 1 ? 'var(--accent)' : 'var(--down)'}
                    sub={sel.rr >= 3 ? '🔥 Excellent' : sel.rr >= 2 ? '✅ Good' : '⚠️ Minimal'} />
                </div>
              </div>

              {/* Alasan */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Alasan Sinyal
                </div>
                <div className="col" style={{ gap: 4 }}>
                  {sel.reasons.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, display: 'flex', gap: 6 }}>
                      <span style={{ color: 'var(--up)', flexShrink: 0 }}>✓</span>
                      <span style={{ color: 'var(--text-2)' }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sparkline */}
              {sel.spark?.length > 0 && (
                <Sparkline data={sel.spark} color="var(--up)" height={50} />
              )}

              {/* Action Buttons */}
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" style={{ flex: 1 }}
                  onClick={() => handleIkuti(sel)}
                  disabled={following || followed[sel.symbol]}>
                  {followed[sel.symbol] ? '✓ Diikuti' : following ? 'Menyimpan...' : '📈 Ikuti Rekomendasi'}
                </button>
                <button className="btn ghost" onClick={() => handleAI(sel)} disabled={aiLoading}>
                  {aiLoading ? '...' : '✨ AI'}
                </button>
              </div>

              {/* AI Explanation */}
              {aiLoading && (
                <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 12, height: 12 }}></span>
                  AI sedang menganalisis...
                </div>
              )}
              {aiText && (
                <div style={{
                  background: 'var(--panel-2)', borderRadius: 8, padding: '10px 12px',
                  fontSize: 12, lineHeight: 1.7, color: 'var(--text-2)',
                  border: '1px solid var(--border)', whiteSpace: 'pre-wrap',
                  maxHeight: 200, overflowY: 'auto'
                }}>
                  {aiText}
                </div>
              )}

              <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5 }}>
                ⚠️ Rekomendasi ini bersifat indikatif berdasarkan analisis teknikal. Bukan saran investasi. Selalu lakukan riset mandiri.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ConfBadge({ conf }) {
  const color = conf >= 80 ? 'var(--up)' : conf >= 65 ? 'var(--accent)' : 'var(--text-2)'
  const bg = conf >= 80 ? 'var(--up-2)' : conf >= 65 ? 'var(--accent-2)' : 'var(--panel)'
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
      fontSize: 10, fontWeight: 700, color, background: bg, whiteSpace: 'nowrap'
    }}>{conf}%</span>
  )
}

function LevelItem({ label, value, color, sub }) {
  return (
    <div style={{ background: 'var(--panel)', borderRadius: 6, padding: '8px 10px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: color || 'var(--text)', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}
