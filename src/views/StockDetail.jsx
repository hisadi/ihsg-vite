// StockDetail.jsx — stock detail view with chart + profil + berita
import React, { useState, useEffect } from 'react'
import { AnimatedNumber, Sparkline, CandleChart, OrderBook, LivePill, Icon } from '../components'
import { fmt, sgn, SECTOR_LABELS, SECTOR_COLORS } from '../api'
import { LS } from '../store'
import { defaultWatchlist } from '../defaults'

let _orKey = null
async function getORKey() {
  if (_orKey) return _orKey
  try {
    const resp = await fetch(
      'https://pvqbjqjjwwcmzajldlzo.supabase.co/rest/v1/keys?select=value&name=eq.openrouter&limit=1',
      {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cWJqcWpqd3djbXphamxkbHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjk1NzksImV4cCI6MjA5NjY0NTU3OX0.3IeD44BUsjvlvRQU6lcfWysT5nyZxq9eZCNEZ2HN-WA',
          'Accept-Profile': 'apikeys',
        }
      }
    )
    const data = await resp.json()
    _orKey = data?.[0]?.value || ''
  } catch {}
  return _orKey
}

export default function StockDetail({ symbol, stocks, openStock, openPredictionForm, news = [] }) {
  const [tf, setTf] = useState('1D')
  const [tab, setTab] = useState('chart')
  const [watchlist, setWatchlist] = useState(() => LS.read('ihsg.watchlist', defaultWatchlist()))
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const st = stocks[symbol]
  const inWatch = watchlist.includes(symbol)

  // Filter berita terkait saham ini
  const relatedNews = news.filter(n =>
    n.sym === symbol ||
    n.title?.toLowerCase().includes(symbol.toLowerCase()) ||
    n.title?.toLowerCase().includes((st?.name || '').toLowerCase().split(' ')[0])
  ).slice(0, 10)

  function toggleWatch() {
    const next = inWatch ? watchlist.filter(s => s !== symbol) : [...watchlist, symbol]
    setWatchlist(next)
    LS.write('ihsg.watchlist', next)
  }

  async function loadProfile() {
    if (profileLoading) return

    // Cek cache localStorage dulu
    const cacheKey = `profile_${symbol}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) { setProfile(cached); return }

    setProfileLoading(true)
    try {
      const key = await getORKey()
      if (!key) { setProfileLoading(false); return }
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b:free',
          messages: [{
            role: 'user',
            content: `Jelaskan profil perusahaan ${symbol} (${st?.name}) yang terdaftar di Bursa Efek Indonesia dalam Bahasa Indonesia, max 150 kata. Sertakan: bidang usaha utama, produk/layanan, posisi di industri, dan fakta menarik. Jangan sebut data keuangan spesifik yang bisa berubah.`
          }]
        })
      })
      const data = await resp.json()
      const text = data.choices?.[0]?.message?.content || 'Profil tidak tersedia.'
      setProfile(text)
      localStorage.setItem(cacheKey, text) // simpan ke cache
    } catch (e) {
      setProfile('Gagal memuat profil: ' + e.message)
    }
    setProfileLoading(false)
  }

  useEffect(() => {
    if (tab === 'profile') loadProfile()
  }, [tab])

  if (!st) return <div className="muted">Saham tidak ditemukan</div>

  const upDir = (st.changePct || 0) >= 0
  const sectorColor = SECTOR_COLORS[st.sector] || '#888'

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      {/* Header */}
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: sectorColor + '22', color: sectorColor,
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 14, border: '1px solid ' + sectorColor + '44'
          }}>
            {st.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="row" style={{ gap: 8 }}>
              <h2 className="h1">{st.symbol}</h2>
              <span className="tag" style={{ color: sectorColor, borderColor: sectorColor + '44' }}>
                {SECTOR_LABELS[st.sector] || st.sector}
              </span>
              <LivePill />
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{st.name}</div>
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn" onClick={toggleWatch}>{Icon.star(inWatch)} {inWatch ? 'Watching' : 'Watchlist'}</button>
          <button className="btn primary" onClick={() => openPredictionForm(symbol)}>+ Prediksi</button>
        </div>
      </div>

      {/* Price */}
      <div className="row" style={{ gap: 24, alignItems: 'baseline' }}>
        <span className="mono" style={{ fontSize: 42, fontWeight: 700, color: upDir ? 'var(--up)' : 'var(--down)' }}>
          <AnimatedNumber value={st.last} format={fmt.px} />
        </span>
        <div className="col" style={{ gap: 2 }}>
          <span className={'chg-pill ' + sgn(st.changePct)} style={{ fontSize: 14, padding: '3px 10px' }}>
            {upDir ? '▲' : '▼'} {fmt.pct(st.changePct)} ({(st.change || 0) >= 0 ? '+' : ''}{fmt.px(st.change)})
          </span>
          <span className="muted" style={{ fontSize: 11 }}>vs prev close {fmt.px(st.prevClose)}</span>
        </div>
        <div className="row" style={{ gap: 16, marginLeft: 'auto' }}>
          <KV label={<>Bid <EstBadge /></>} value={<><span className="up mono">{fmt.px(st.bid)}</span> <span className="muted" style={{ fontSize: 11 }}>×{fmt.vol(st.bidVol)}</span></>} />
          <KV label={<>Ask <EstBadge /></>} value={<><span className="down mono">{fmt.px(st.ask)}</span> <span className="muted" style={{ fontSize: 11 }}>×{fmt.vol(st.askVol)}</span></>} />
        </div>
      </div>

      {/* Key Stats */}
      <div className="panel">
        <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 16 }}>
          <KV label="Open" value={<span className="mono">{fmt.px(st.open)}</span>} />
          <KV label="High" value={<span className="mono up">{fmt.px(st.high)}</span>} />
          <KV label="Low" value={<span className="mono down">{fmt.px(st.low)}</span>} />
          <KV label="Volume" value={<span className="mono">{fmt.vol(st.volume)}</span>} />
          <KV label="Nilai" value={<span className="mono">{fmt.bigIDR(st.value)}</span>} />
          <KV label={<>Mkt Cap {!st.mcapReal && <EstBadge />}</>} value={<span className="mono">{st.mcap > 0 ? fmt.bigIDR(st.mcap) : 'N/A'}</span>} />
          <KV label="PER" value={<span className="mono">{st.per != null ? st.per.toFixed(1) + 'x' : 'N/A'}</span>} />
          <KV label="PBV" value={<span className="mono">{st.pbv != null ? st.pbv.toFixed(2) + 'x' : 'N/A'}</span>} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12 }}>
        {/* Main Panel */}
        <div className="panel">
          <div className="panel-head">
            <div className="row" style={{ gap: 10 }}>
              <div className="seg">
                {[
                  ['chart', 'Chart'],
                  ['tech', 'Teknikal'],
                  ['fund', 'Fundamental'],
                  ['profile', '🏢 Profil'],
                  ['news', `📰 Berita${relatedNews.length > 0 ? ` (${relatedNews.length})` : ''}`],
                ].map(([t, l]) => (
                  <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{l}</button>
                ))}
              </div>
            </div>
            {tab === 'chart' && (
              <div className="seg">
                {['1D', '5D', '1M', '3M', '1Y'].map(t => (
                  <button key={t} className={tf === t ? 'on' : ''} onClick={() => setTf(t)}>{t}</button>
                ))}
              </div>
            )}
          </div>
          <div className="panel-body" style={{ padding: tab === 'profile' || tab === 'news' ? 0 : 8 }}>
            {tab === 'chart' && <ChartTab stock={st} />}
            {tab === 'tech' && <TechnicalTab stock={st} />}
            {tab === 'fund' && <FundamentalTab stock={st} />}
            {tab === 'profile' && <ProfileTab stock={st} profile={profile} loading={profileLoading} onLoad={loadProfile} onReload={() => { setProfile(null); setTimeout(loadProfile, 100) }} />}
            {tab === 'news' && <NewsTab news={relatedNews} allNews={news} symbol={symbol} />}
          </div>
        </div>

        {/* Right Panel */}
        <div className="col" style={{ gap: 12 }}>
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Order Book</span>
              <span className="muted mono" style={{ fontSize: 11 }}>Spread {(st.ask || 0) - (st.bid || 0)}</span>
            </div>
            <OrderBook stock={st} />
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">Quick Trade</span></div>
            <div className="panel-body col" style={{ gap: 8 }}>
              <div className="row">
                <button className="btn up-btn" style={{ flex: 1 }}>BELI</button>
                <button className="btn down-btn" style={{ flex: 1 }}>JUAL</button>
              </div>
              <div className="muted" style={{ fontSize: 11 }}>* Simulasi — tidak terhubung ke broker</div>
            </div>
          </div>
        </div>
      </div>

      <RelatedStocks current={symbol} stocks={stocks} openStock={openStock} />
    </div>
  )
}

function KV({ label, value }) {
  return (
    <div className="col" style={{ gap: 2 }}>
      <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function EstBadge() {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, color: 'var(--text-3)',
      background: 'var(--panel)', padding: '1px 4px', borderRadius: 3,
      border: '1px solid var(--border)', marginLeft: 3, letterSpacing: 0
    }} title="Data estimasi — tidak ada sumber gratis real-time untuk data ini">EST</span>
  )
}

function ChartTab({ stock }) {
  const bars = (stock.spark || []).map((close, i) => ({
    open: i > 0 ? stock.spark[i - 1] : close,
    high: close * 1.002, low: close * 0.998, close,
    volume: Math.floor(10000 + Math.random() * 50000)
  }))
  return <CandleChart bars={bars} height={340} />
}

function TechnicalTab({ stock }) {
  const rsiLabel = (stock.rsi || 50) > 70 ? 'Overbought' : (stock.rsi || 50) < 30 ? 'Oversold' : 'Netral'
  const trend = (stock.changePct || 0) > 0 ? 'Uptrend' : 'Downtrend'
  return (
    <div className="col" style={{ gap: 14, padding: 8 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <IndicatorCard title="RSI(14)" value={(stock.rsi || 50).toFixed(1)} status={rsiLabel} progress={stock.rsi || 50} />
        <IndicatorCard title="MACD" value={trend} status={(stock.changePct || 0) > 0 ? 'Bullish' : 'Bearish'} />
        <IndicatorCard title="MA Trend" value={trend} status={trend === 'Uptrend' ? 'Bullish' : 'Bearish'} />
        <IndicatorCard title="Foreign (Est.)" value={fmt.bigIDR(stock.foreignNet)} status={(stock.foreignNet || 0) > 0 ? 'Net Buy' : 'Net Sell'} />
      </div>
      <div className="panel" style={{ background: 'var(--panel-2)' }}>
        <div className="panel-body">
          <div className="h2" style={{ marginBottom: 8 }}>Ringkasan Sinyal</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8 }}>
            <li>Harga {trend === 'Uptrend' ? 'di atas' : 'di bawah'} MA(20) — momentum {trend === 'Uptrend' ? 'positif' : 'negatif'}.</li>
            <li>RSI {(stock.rsi || 50).toFixed(0)} ({rsiLabel}) — {(stock.rsi || 50) > 70 ? 'potensi koreksi' : (stock.rsi || 50) < 30 ? 'potensi rebound' : 'tidak ada signal ekstrem'}.</li>
            <li>Asing {(stock.foreignNet || 0) > 0 ? 'net buy' : 'net sell'} {fmt.bigIDR(Math.abs(stock.foreignNet || 0))} hari ini <em style={{ color: 'var(--text-3)' }}>(estimasi — data foreign flow real tidak tersedia gratis)</em>.</li>
            {stock.rsiReal && <li style={{ color: 'var(--up)' }}>✓ RSI dihitung dari data historis real (RSI-14 Wilder's method).</li>}
            {!stock.rsiReal && <li style={{ color: 'var(--text-3)' }}>⚠ RSI masih estimasi — update di halaman Settings untuk data real.</li>}
            <li>Volume hari ini {fmt.vol(stock.volume)}.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function IndicatorCard({ title, value, status, progress }) {
  return (
    <div style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>{status}</div>
      {progress != null && (
        <div className="progress" style={{ marginTop: 8 }}>
          <span style={{ width: progress + '%', background: progress > 70 ? 'var(--down)' : progress < 30 ? 'var(--up)' : 'var(--accent)' }}></span>
        </div>
      )}
    </div>
  )
}

function FundamentalTab({ stock }) {
  const items = [
    ['Market Cap', fmt.bigIDR(stock.mcap), stock.mcapReal],
    ['PER (TTM)', stock.per != null ? stock.per.toFixed(2) + 'x' : 'N/A', stock.perReal],
    ['PBV', stock.pbv != null ? stock.pbv.toFixed(2) + 'x' : 'N/A', stock.pbvReal],
    ['RSI (14)', (stock.rsi || 50).toFixed(0), stock.rsiReal],
    ['Foreign Net', fmt.bigIDR(stock.foreignNet || 0), false],
    ['52W High', stock.week52High ? fmt.px(stock.week52High) : 'N/A', stock.week52High != null],
    ['52W Low', stock.week52Low ? fmt.px(stock.week52Low) : 'N/A', stock.week52Low != null],
    ['Avg Vol 3M', stock.avgVolume3M ? fmt.vol(stock.avgVolume3M) : 'N/A', stock.avgVolume3M != null],
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, padding: 4 }}>
        {items.map(([k, v, isReal]) => (
          <div key={k} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
              {k} {!isReal && <EstBadge />}
            </div>
            <div className="mono" style={{ fontSize: 14, marginTop: 2, color: isReal ? 'var(--text)' : 'var(--text-2)' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
        <strong>EST</strong> = data estimasi/dihitung, bukan data resmi real-time. Market Cap, PER, PBV, 52W High/Low, dan Avg Volume 3M diambil real dari Yahoo Finance kalau tersedia (banyak saham kecil IDX datanya kosong di Yahoo). Foreign Net Flow dan Bid/Ask selalu estimasi karena tidak ada sumber gratis resmi untuk data itu.
      </div>
    </div>
  )
}

function ProfileTab({ stock, profile, loading, onLoad, onReload }) {
  return (
    <div className="col" style={{ gap: 16, padding: 16 }}>
      {/* Company Info */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ background: 'var(--panel-2)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sektor</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{SECTOR_LABELS[stock.sector] || stock.sector}</div>
        </div>
        <div style={{ background: 'var(--panel-2)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
            Market Cap {!stock.mcapReal && <EstBadge />}
          </div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{stock.mcap > 0 ? fmt.bigIDR(stock.mcap) : 'N/A'}</div>
        </div>
        <div style={{ background: 'var(--panel-2)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Kode Saham</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{stock.symbol} <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/ IDX</span></div>
        </div>
      </div>

      {/* AI Profile */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✨ Profil Perusahaan (AI)
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!profile && !loading && (
              <button className="btn sm ghost" style={{ fontSize: 11 }} onClick={onLoad}>Muat Profil</button>
            )}
            {profile && (
              <button className="btn sm ghost" style={{ fontSize: 11 }} onClick={() => {
                localStorage.removeItem(`profile_${stock.symbol}`)
                onReload()
              }}>🔄 Refresh</button>
            )}
          </div>
        </div>
        {loading && (
          <div style={{ color: 'var(--text-2)', fontSize: 13, padding: '16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" style={{ width: 14, height: 14 }}></span>
            AI sedang menyusun profil perusahaan...
          </div>
        )}
        {profile && (
          <div style={{
            background: 'var(--panel-2)', borderRadius: 10, padding: 16,
            fontSize: 13, lineHeight: 1.75, color: 'var(--text-2)',
            border: '1px solid var(--border)', whiteSpace: 'pre-wrap'
          }}>
            {profile}
          </div>
        )}
        {!profile && !loading && (
          <div style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
            Klik "Muat Profil" untuk generate deskripsi perusahaan dengan AI.
          </div>
        )}
      </div>

      {/* Links */}
      <div className="row" style={{ gap: 8 }}>
        <a href={`https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat/?KodeEmiten=${stock.symbol}`}
          target="_blank" rel="noopener noreferrer" className="btn ghost" style={{ fontSize: 12 }}>
          🏢 Profil IDX
        </a>
        <a href={`https://finance.yahoo.com/quote/${stock.symbol}.JK`}
          target="_blank" rel="noopener noreferrer" className="btn ghost" style={{ fontSize: 12 }}>
          📊 Yahoo Finance
        </a>
        <a href={`https://www.kontan.co.id/search/?q=${stock.symbol}`}
          target="_blank" rel="noopener noreferrer" className="btn ghost" style={{ fontSize: 12 }}>
          📰 Kontan
        </a>
      </div>
    </div>
  )
}

function NewsTab({ news, allNews, symbol }) {
  const displayNews = news.length > 0 ? news : allNews.slice(0, 10)
  const isEmpty = news.length === 0

  return (
    <div className="col" style={{ gap: 0 }}>
      {isEmpty && (
        <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-3)', background: 'var(--panel-2)', borderBottom: '1px solid var(--border)' }}>
          Tidak ada berita spesifik untuk {symbol} — menampilkan berita pasar terbaru.
        </div>
      )}
      {displayNews.map(n => {
        const color = n.sentiment === 'positive' ? 'var(--up)' : n.sentiment === 'negative' ? 'var(--down)' : 'var(--accent)'
        return (
          <div key={n.id}
            style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              cursor: n.url ? 'pointer' : 'default', display: 'flex', gap: 12, alignItems: 'flex-start'
            }}
            onClick={() => n.url && window.open(n.url, '_blank', 'noopener,noreferrer')}
            onMouseEnter={e => { if (n.url) e.currentTarget.style.background = 'var(--panel-2)' }}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ width: 4, alignSelf: 'stretch', background: color, borderRadius: 2, flexShrink: 0 }}></div>
            <div className="col" style={{ flex: 1, gap: 4, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                {n.title}
                {n.url && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--text-3)' }}>↗</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 8 }}>
                <span>{n.source}</span>
                <span>·</span>
                <span>{fmt.rel(n.ts)}</span>
                <span className="tag" style={{ color, borderColor: color + '44' }}>{n.tag}</span>
              </div>
            </div>
          </div>
        )
      })}
      {displayNews.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Tidak ada berita tersedia.
        </div>
      )}
    </div>
  )
}

function RelatedStocks({ current, stocks, openStock }) {
  const st = stocks[current]
  if (!st) return null
  const related = Object.values(stocks).filter(s => s.sector === st.sector && s.symbol !== current).slice(0, 6)
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Saham Sesama Sektor — {SECTOR_LABELS[st.sector]}</span></div>
      <table className="tbl">
        <thead><tr><th>Simbol</th><th className="num">Last</th><th className="num">Chg %</th><th className="num">Volume</th><th></th></tr></thead>
        <tbody>
          {related.map(s => (
            <tr key={s.symbol} onClick={() => openStock(s.symbol)} style={{ cursor: 'pointer' }}>
              <td className="sym-cell">{s.symbol}<small>{(s.name || '').slice(0, 14)}</small></td>
              <td className="num mono"><AnimatedNumber value={s.last} format={fmt.px} /></td>
              <td className="num"><span className={'chg-pill ' + sgn(s.changePct)}>{fmt.pct(s.changePct)}</span></td>
              <td className="num mono">{fmt.vol(s.volume)}</td>
              <td><Sparkline data={s.spark || []} width={50} height={18} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
