// Signals.jsx — Sinyal beli/jual otomatis + AI analysis
import React, { useState } from 'react'
import { AnimatedNumber, Sparkline, LivePill } from '../components'
import { fmt, sgn, SECTOR_LABELS } from '../api'

// ─── SIGNAL ENGINE ────────────────────────────────────────────────────────────
function generateSignal(st) {
  if (!st) return null
  const scores = []
  const reasons = []

  // 1. RSI
  if (st.rsi <= 30) { scores.push(3); reasons.push(`RSI oversold (${st.rsi})`) }
  else if (st.rsi <= 40) { scores.push(2); reasons.push(`RSI rendah (${st.rsi})`) }
  else if (st.rsi >= 70) { scores.push(-3); reasons.push(`RSI overbought (${st.rsi})`) }
  else if (st.rsi >= 60) { scores.push(-1); reasons.push(`RSI tinggi (${st.rsi})`) }

  // 2. Price change momentum
  if (st.changePct <= -5) { scores.push(2); reasons.push(`Koreksi dalam (${fmt.pct(st.changePct)})`) }
  else if (st.changePct <= -3) { scores.push(1); reasons.push(`Koreksi wajar (${fmt.pct(st.changePct)})`) }
  else if (st.changePct >= 5) { scores.push(-2); reasons.push(`Kenaikan tajam (${fmt.pct(st.changePct)})`) }
  else if (st.changePct >= 3) { scores.push(-1); reasons.push(`Sudah naik (${fmt.pct(st.changePct)})`) }

  // 3. Foreign flow
  if (st.foreignNet > 0) {
    const ratio = st.foreignNet / (st.mcap || 1e12)
    if (ratio > 0.0003) { scores.push(1); reasons.push(`Estimasi foreign net buy signifikan (bukan data resmi)`) }
    else { scores.push(0.5); reasons.push(`Estimasi foreign net buy (bukan data resmi)`) }
  } else if (st.foreignNet < 0) {
    const ratio = Math.abs(st.foreignNet) / (st.mcap || 1e12)
    if (ratio > 0.0003) { scores.push(-1); reasons.push(`Estimasi foreign net sell signifikan (bukan data resmi)`) }
    else { scores.push(-0.5); reasons.push(`Estimasi foreign net sell (bukan data resmi)`) }
  }

  // 4. Volume (relative — high volume = conviction)
  if (st.volume > 50_000_000) { scores.push(1); reasons.push(`Volume tinggi (${fmt.vol(st.volume)})`) }

  // 5. Price vs prev close
  const pct = st.changePct
  if (pct < 0 && st.rsi < 45) { scores.push(1); reasons.push('Harga turun + RSI rendah = potensi rebound') }
  if (pct > 0 && st.rsi > 55 && st.foreignNet > 0) { scores.push(1); reasons.push('Momentum positif + estimasi asing beli') }

  const total = scores.reduce((a, b) => a + b, 0)

  let signal, strength, color, bgColor, emoji
  if (total >= 4) { signal = 'STRONG BUY'; strength = 'strong'; color = '#22c55e'; bgColor = 'rgba(34,197,94,0.12)'; emoji = '🟢🟢' }
  else if (total >= 2) { signal = 'BUY'; strength = 'buy'; color = '#4ade80'; bgColor = 'rgba(74,222,128,0.1)'; emoji = '🟢' }
  else if (total >= -1) { signal = 'HOLD'; strength = 'hold'; color = '#f59e0b'; bgColor = 'rgba(245,158,11,0.1)'; emoji = '🟡' }
  else if (total >= -3) { signal = 'SELL'; strength = 'sell'; color = '#f87171'; bgColor = 'rgba(248,113,113,0.1)'; emoji = '🔴' }
  else { signal = 'STRONG SELL'; strength = 'strong-sell'; color = '#ef4444'; bgColor = 'rgba(239,68,68,0.12)'; emoji = '🔴🔴' }

  // Auto-suggested entry/target/stop
  const last = st.last
  const suggestedEntry = last
  const suggestedTarget = total > 0
    ? Math.round(last * (1 + Math.min(0.08, Math.abs(total) * 0.015)))
    : Math.round(last * (1 - Math.min(0.08, Math.abs(total) * 0.015)))
  const suggestedStop = total > 0
    ? Math.round(last * 0.97)
    : Math.round(last * 1.03)

  return {
    signal, strength, color, bgColor, emoji,
    score: total, reasons,
    suggestedEntry, suggestedTarget, suggestedStop,
    rr: Math.abs(suggestedTarget - suggestedEntry) / Math.abs(suggestedEntry - suggestedStop)
  }
}

// ─── AI ANALYSIS ──────────────────────────────────────────────────────────────
async function askAI(stock, signal, question) {
  const OR_KEY_STORAGE = 'or_key'
  let orKey = localStorage.getItem(OR_KEY_STORAGE) || ''

  if (!orKey) {
    orKey = prompt('Masukkan OpenRouter API Key (untuk AI analysis):')
    if (orKey) localStorage.setItem(OR_KEY_STORAGE, orKey)
  }
  if (!orKey) throw new Error('API key tidak ada')

  const prompt = question || `Analisis saham ${stock.symbol} (${stock.name}) saat ini:
- Harga: Rp ${fmt.px(stock.last)} (${fmt.pct(stock.changePct)} hari ini)
- RSI: ${stock.rsi}
- Volume: ${fmt.vol(stock.volume)}
- Foreign Net (ESTIMASI dari pergerakan harga, BUKAN data resmi KSEI/IDX — jangan terlalu yakin soal angka ini): ${fmt.bigIDR(stock.foreignNet)}
- Sektor: ${SECTOR_LABELS[stock.sector] || stock.sector}
- Sinyal teknikal: ${signal.signal} (skor ${signal.score})
- Alasan sinyal: ${signal.reasons.join(', ')}

Berikan analisis singkat (max 150 kata) dalam Bahasa Indonesia:
1. Apakah sinyal ini valid secara fundamental/teknikal?
2. Risiko utama yang perlu diperhatikan
3. Rekomendasi tindakan konkret`

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${orKey}` },
    body: JSON.stringify({
      model: 'google/gemma-4-31b-it:free',
      messages: [{ role: 'user', content: prompt }],
    })
  })
  if (!resp.ok) throw new Error(`AI error: ${resp.status}`)
  const data = await resp.json()
  return data.choices?.[0]?.message?.content || 'Tidak ada respons AI.'
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Signals({ stocks, openStock, openPredictionForm }) {
  const [filterSignal, setFilterSignal] = useState('all')
  const [filterSector, setFilterSector] = useState('ALL')
  const [sortBy, setSortBy] = useState('score')
  const [selectedStock, setSelectedStock] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [customQ, setCustomQ] = useState('')

  const allStocks = Object.values(stocks || {})
  const signals = allStocks.map(st => ({ ...st, sig: generateSignal(st) }))
    .filter(st => {
      if (filterSignal !== 'all' && st.sig?.strength !== filterSignal) return false
      if (filterSector !== 'ALL' && st.sector !== filterSector) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.sig?.score || 0) - (a.sig?.score || 0)
      if (sortBy === 'score-asc') return (a.sig?.score || 0) - (b.sig?.score || 0)
      if (sortBy === 'rsi') return (a.sig?.rsi || a.rsi || 0) - (b.sig?.rsi || b.rsi || 0)
      if (sortBy === 'change') return b.changePct - a.changePct
      return 0
    })

  const counts = {
    'strong': signals.filter(s => s.sig?.strength === 'strong').length,
    'buy': signals.filter(s => s.sig?.strength === 'buy').length,
    'hold': signals.filter(s => s.sig?.strength === 'hold').length,
    'sell': signals.filter(s => s.sig?.strength === 'sell').length,
    'strong-sell': signals.filter(s => s.sig?.strength === 'strong-sell').length,
  }

  const sectors = [...new Set(allStocks.map(s => s.sector))].filter(Boolean)

  async function analyzeWithAI(stock, question) {
    const sig = generateSignal(stock)
    setAiLoading(true)
    setAiResponse('')
    try {
      const result = await askAI(stock, sig, question)
      setAiResponse(result)
    } catch (e) {
      setAiResponse(`❌ Error: ${e.message}`)
    }
    setAiLoading(false)
  }

  const selected = selectedStock ? stocks[selectedStock] : null
  const selectedSig = selected ? generateSignal(selected) : null

  return (
    <div className="view-anim col" style={{ gap: 16 }}>
      {/* Header */}
      <div className="row between">
        <div>
          <h2 className="h1">Sinyal & Rekomendasi</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Analisis teknikal otomatis + AI. Bukan saran investasi — selalu lakukan riset mandiri.
          </div>
        </div>
        <LivePill />
      </div>

      {/* Signal Summary */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {[
          { key: 'strong', label: 'Strong Buy', color: '#22c55e', emoji: '🟢🟢' },
          { key: 'buy', label: 'Buy', color: '#4ade80', emoji: '🟢' },
          { key: 'hold', label: 'Hold', color: '#f59e0b', emoji: '🟡' },
          { key: 'sell', label: 'Sell', color: '#f87171', emoji: '🔴' },
          { key: 'strong-sell', label: 'Strong Sell', color: '#ef4444', emoji: '🔴🔴' },
        ].map(({ key, label, color, emoji }) => (
          <div key={key} className="stat-card" style={{
            cursor: 'pointer', border: filterSignal === key ? `1.5px solid ${color}` : undefined,
            background: filterSignal === key ? `${color}15` : undefined
          }} onClick={() => setFilterSignal(filterSignal === key ? 'all' : key)}>
            <div className="label">{emoji} {label}</div>
            <div className="value mono" style={{ color }}>{counts[key]}</div>
            <div className="sub muted">saham</div>
          </div>
        ))}
      </div>

      <div className="row" style={{ gap: 12 }}>
        {/* Signal List */}
        <div className="panel" style={{ flex: 1, minWidth: 0 }}>
          <div className="panel-head">
            <span className="panel-title">Daftar Sinyal</span>
            <div className="row" style={{ gap: 8 }}>
              <select className="seg-select" value={filterSector} onChange={e => setFilterSector(e.target.value)}
                style={{ fontSize: 11, padding: '3px 8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }}>
                <option value="ALL">Semua Sektor</option>
                {sectors.map(s => <option key={s} value={s}>{SECTOR_LABELS[s] || s}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ fontSize: 11, padding: '3px 8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }}>
                <option value="score">Skor ↓</option>
                <option value="score-asc">Skor ↑</option>
                <option value="rsi">RSI terendah</option>
                <option value="change">% Change</option>
              </select>
            </div>
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Sinyal</th>
                  <th>Saham</th>
                  <th className="num">Harga</th>
                  <th className="num">Chg%</th>
                  <th className="num">RSI</th>
                  <th className="num">Volume</th>
                  <th>Alasan Utama</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {signals.map(st => {
                  const sig = st.sig
                  if (!sig) return null
                  return (
                    <tr key={st.symbol}
                      style={{ cursor: 'pointer', background: selectedStock === st.symbol ? 'var(--panel)' : undefined }}
                      onClick={() => { setSelectedStock(st.symbol); setAiResponse('') }}>
                      <td>
                        <span style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                          color: sig.color, background: sig.bgColor, whiteSpace: 'nowrap'
                        }}>{sig.emoji} {sig.signal}</span>
                      </td>
                      <td className="sym-cell" onClick={e => { e.stopPropagation(); openStock(st.symbol) }}>
                        {st.symbol}
                        <span className="muted" style={{ fontSize: 10, marginLeft: 6 }}>{st.name.slice(0, 18)}</span>
                      </td>
                      <td className="num mono"><AnimatedNumber value={st.last} format={fmt.px} /></td>
                      <td className={'num mono ' + sgn(st.changePct)}>{fmt.pct(st.changePct)}</td>
                      <td className="num mono" style={{
                        color: st.rsi <= 30 ? '#22c55e' : st.rsi >= 70 ? '#ef4444' : 'var(--text)'
                      }}>{st.rsi}</td>
                      <td className="num mono">{fmt.vol(st.volume)}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-2)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sig.reasons[0]}
                      </td>
                      <td>
                        <button className="btn sm ghost" style={{ fontSize: 10 }}
                          onClick={e => { e.stopPropagation(); setSelectedStock(st.symbol); setAiResponse('') }}>
                          Detail
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {signals.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                    Tidak ada saham dengan sinyal ini.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selected && selectedSig && (
          <div className="panel" style={{ width: 340, flexShrink: 0 }}>
            <div className="panel-head">
              <span className="panel-title">{selected.symbol} — {selected.name}</span>
              <button className="btn sm ghost" onClick={() => { setSelectedStock(null); setAiResponse('') }}>✕</button>
            </div>
            <div className="panel-body col" style={{ gap: 12 }}>

              {/* Signal Badge */}
              <div style={{
                padding: '10px 14px', borderRadius: 8, background: selectedSig.bgColor,
                border: `1px solid ${selectedSig.color}44`, textAlign: 'center'
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{selectedSig.emoji}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: selectedSig.color }}>{selectedSig.signal}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>Skor teknikal: {selectedSig.score > 0 ? '+' : ''}{selectedSig.score}</div>
              </div>

              {/* Key Metrics */}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: 'var(--panel)', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 700 }}>HARGA</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{fmt.px(selected.last)}</div>
                  <div className={'mono ' + sgn(selected.changePct)} style={{ fontSize: 11 }}>{fmt.pct(selected.changePct)}</div>
                </div>
                <div style={{ background: 'var(--panel)', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 700 }}>RSI</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: selected.rsi <= 30 ? '#22c55e' : selected.rsi >= 70 ? '#ef4444' : 'var(--text)' }}>{selected.rsi}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{selected.rsi <= 30 ? 'Oversold' : selected.rsi >= 70 ? 'Overbought' : 'Netral'}</div>
                </div>
                <div style={{ background: 'var(--panel)', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 700 }}>VOLUME</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{fmt.vol(selected.volume)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>lot</div>
                </div>
                <div style={{ background: 'var(--panel)', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 700 }}>ASING <span style={{ fontSize: 8, color: 'var(--text-3)', fontWeight: 400 }}>(estimasi)</span></div>
                  <div className={'mono ' + sgn(selected.foreignNet)} style={{ fontSize: 14, fontWeight: 700 }}>
                    {fmt.bigIDR(selected.foreignNet)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>net flow</div>
                </div>
              </div>

              {/* Alasan Sinyal */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Alasan Sinyal</div>
                <div className="col" style={{ gap: 4 }}>
                  {selectedSig.reasons.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <span style={{ color: selectedSig.color, flexShrink: 0 }}>•</span>
                      <span style={{ color: 'var(--text-2)' }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested levels */}
              <div style={{ background: 'var(--panel)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Level Saran</div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>ENTRY</div>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{fmt.px(selectedSig.suggestedEntry)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#22c55e' }}>TARGET</div>
                    <div className="mono up" style={{ fontSize: 13, fontWeight: 700 }}>{fmt.px(selectedSig.suggestedTarget)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#ef4444' }}>STOP</div>
                    <div className="mono down" style={{ fontSize: 13, fontWeight: 700 }}>{fmt.px(selectedSig.suggestedStop)}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: 'var(--text-2)' }}>
                  R:R = <strong className="mono">{selectedSig.rr.toFixed(2)}</strong>
                </div>
              </div>

              {/* Sparkline */}
              {selected.spark?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Chart Hari Ini</div>
                  <Sparkline data={selected.spark} color={selected.changePct >= 0 ? 'var(--up)' : 'var(--down)'} height={60} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" style={{ flex: 1 }}
                  onClick={() => openPredictionForm(selected.symbol)}>
                  📝 Buat Prediksi
                </button>
                <button className="btn ghost" onClick={() => openStock(selected.symbol)}>
                  Detail →
                </button>
              </div>

              {/* AI Analysis */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>✨ Tanya AI</div>
                <div className="col" style={{ gap: 8 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <input
                      value={customQ}
                      onChange={e => setCustomQ(e.target.value)}
                      placeholder="Tanya apapun tentang saham ini..."
                      style={{
                        flex: 1, padding: '7px 10px', fontSize: 12,
                        background: 'var(--panel)', border: '1px solid var(--border)',
                        borderRadius: 6, color: 'var(--text)', outline: 'none'
                      }}
                      onKeyDown={e => { if (e.key === 'Enter' && customQ.trim()) { analyzeWithAI(selected, customQ); setCustomQ('') } }}
                    />
                    <button className="btn primary sm"
                      onClick={() => { analyzeWithAI(selected, customQ || null); setCustomQ('') }}
                      disabled={aiLoading}>
                      {aiLoading ? '...' : 'Kirim'}
                    </button>
                  </div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {['Analisis teknikal', 'Risiko investasi', 'Kapan beli?', 'Fundamental singkat'].map(q => (
                      <button key={q} className="btn sm ghost" style={{ fontSize: 10 }}
                        onClick={() => analyzeWithAI(selected, q + ` untuk saham ${selected.symbol}`)}>
                        {q}
                      </button>
                    ))}
                  </div>
                  {aiLoading && (
                    <div style={{ fontSize: 12, color: 'var(--text-2)', padding: '8px 0' }}>
                      <span className="spinner" style={{ width: 12, height: 12, marginRight: 8 }}></span>
                      AI sedang menganalisis...
                    </div>
                  )}
                  {aiResponse && (
                    <div style={{
                      background: 'var(--panel)', borderRadius: 8, padding: '10px 12px',
                      fontSize: 12, lineHeight: 1.6, color: 'var(--text-2)',
                      border: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {aiResponse}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '8px 0' }}>
        ⚠️ Sinyal ini bersifat indikatif berdasarkan data teknikal terbatas. Bukan merupakan saran investasi. Selalu lakukan analisis mandiri sebelum mengambil keputusan investasi.
      </div>
    </div>
  )
}
