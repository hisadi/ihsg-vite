// App.jsx — Main application with routing and layout
import React, { useState, useEffect } from 'react'
import { useStream } from './hooks/useStream'
import { ToastProvider, TickerTape, Icon, LivePill } from './components'
import Dashboard from './views/Dashboard'
import Heatmap from './views/Heatmap'
import Screener from './views/Screener'
import News from './views/News'
import Watchlist from './views/Watchlist'
import Portfolio from './views/Portfolio'
import Predictions from './views/Predictions'
import Leaderboard from './views/Leaderboard'
import Settings from './views/Settings'
import Trading from './views/Trading'
import Signals from './views/Signals'
import StockDetail from './views/StockDetail'
import { LS } from './store'
import { defaultWatchlist } from './defaults'

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',   icon: Icon.dashboard,   section: 'MARKET' },
  { id: 'heatmap',     label: 'Heatmap',     icon: Icon.heatmap,     section: 'MARKET' },
  { id: 'screener',    label: 'Screener',    icon: Icon.screener,    section: 'MARKET' },
  { id: 'news',        label: 'Berita',      icon: Icon.news,        section: 'MARKET' },
  { id: 'watchlist',   label: 'Watchlist',   icon: Icon.watchlist,   section: 'ANDA' },
  { id: 'portfolio',   label: 'Portfolio',  icon: Icon.portfolio,   section: 'ANDA' },
  { id: 'predictions', label: 'Prediksi',    icon: Icon.predict,     section: 'OBJEKTIVITAS' },
  { id: 'signals',     label: 'Sinyal',      icon: Icon.predict,     section: 'ANALISIS' },
  { id: 'trading',     label: 'Trading',     icon: Icon.portfolio,   section: 'ANALISIS' },
  { id: 'leaderboard', label: 'Leaderboard', icon: Icon.leaderboard, section: 'OBJEKTIVITAS' },
  { id: 'settings', label: 'Settings', icon: Icon.screener, section: 'LAINNYA' },
]

function App() {
  const [route, setRoute] = useState(() => {
    const h = window.location.hash.replace('#', '')
    return h && NAV.find(n => n.id === h) ? h : 'dashboard'
  })
  const [activeStock, setActiveStock] = useState(null)
  const [prefillSym, setPrefillSym] = useState(null)
  const [openForm, setOpenForm] = useState(false)
  const [clock, setClock] = useState(new Date())
  const [theme, setTheme] = useState('dark')
  const [density, setDensity] = useState('comfy')
  const [showTicker, setShowTicker] = useState(true)

  const { stocks, ihsg, sectors, news, loading, connected, tick, stats } = useStream()

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    window.location.hash = route + (route === 'stock' && activeStock ? '/' + activeStock : '')
  }, [route, activeStock])

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light')
    document.body.classList.remove('density-compact', 'density-comfy', 'density-spacious')
    document.body.classList.add('density-' + density)
  }, [theme, density])

  function openStock(sym) { setActiveStock(sym); setRoute('stock') }
  function openPredictionForm(sym) { setPrefillSym(sym); setOpenForm(true); setRoute('predictions') }
  function go(id) { setRoute(id); setActiveStock(null) }

  // Session badge logic
  const hour = clock.getHours()
  const min = clock.getMinutes()
  const isWeekday = clock.getDay() >= 1 && clock.getDay() <= 5
  let sessionLabel = 'OFF MARKET', sessionClass = 'closed'
  if (isWeekday) {
    if (hour < 9) { sessionLabel = 'PRE-OPENING'; sessionClass = 'pre' }
    else if (hour < 12 || (hour === 12 && min === 0)) { sessionLabel = 'SESI I'; sessionClass = '' }
    else if (hour < 13 || (hour === 13 && min < 30)) { sessionLabel = 'ISTIRAHAT'; sessionClass = 'pre' }
    else if (hour < 15 || (hour === 15 && min === 0)) { sessionLabel = 'SESI II'; sessionClass = '' }
    else { sessionLabel = 'CLOSED'; sessionClass = 'closed' }
  }

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
        <span>Menghubungi server data...</span>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="app">
        {showTicker && (
          <div className="ticker-area">
            <TickerTape stocks={stocks} />
          </div>
        )}

        <div className="topbar">
          <div className="brand">
            <div className="brand-mark"></div>
            <span>IHSG TERMINAL</span>
          </div>
          <span className={'session-badge ' + sessionClass}>
            <span className="pulse-dot"></span> {sessionLabel}
          </span>
          <GlobalSearch stocks={stocks} onSelect={openStock} />
          <div className="grow"></div>
          {connected && <LivePill label="REALTIME" />}
          <span className="clock mono">{clock.toLocaleTimeString('id-ID')}</span>
          <span className="muted" style={{ fontSize: 11 }}>
            {clock.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <aside className="sidebar">
          {[...new Set(NAV.map(n => n.section))].map(sec => (
            <div key={sec}>
              <div className="nav-section">{sec}</div>
              {NAV.filter(n => n.section === sec).map(n => (
                <div key={n.id} className={'nav-item ' + (route === n.id ? 'active' : '')} onClick={() => go(n.id)}>
                  <div className="nav-bar"></div>
                  <n.icon />
                  <span className="label">{n.label}</span>
                  {n.id === 'predictions' && (
                    <span className="nav-count">
                      {LS.read('ihsg.predictions', []).filter(p => !p.resolved).length}
                    </span>
                  )}
                  {n.id === 'watchlist' && (
                    <span className="nav-count">
                      {LS.read('ihsg.watchlist', defaultWatchlist()).length}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div className="row" style={{ gap: 6, fontSize: 11, color: 'var(--text-2)' }}>
              <span className="pulse-dot"></span>
              <span>Stream aktif · {Object.keys(stocks).length} saham</span>
            </div>
            <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
              Update 1.5s · Yahoo Finance + SSE
            </div>
          </div>
        </aside>

        <main className="main">
          {route === 'dashboard'   && <Dashboard stocks={stocks} ihsg={ihsg} stats={stats} sectors={sectors} openStock={openStock} onNav={go} />}
          {route === 'heatmap'     && <Heatmap stocks={stocks} openStock={openStock} />}
          {route === 'screener'    && <Screener stocks={stocks} openStock={openStock} />}
          {route === 'news'        && <News news={news} openStock={openStock} />}
          {route === 'watchlist'   && <Watchlist stocks={stocks} openStock={openStock} openPredictionForm={openPredictionForm} />}
          {route === 'portfolio'   && <Portfolio stocks={stocks} openStock={openStock} />}
          {route === 'predictions' && (
            <Predictions stocks={stocks} openStock={openStock} prefillSym={prefillSym}
              clearPrefill={() => setPrefillSym(null)} openForm={openForm} setOpenForm={setOpenForm} />
          )}
          {route === 'signals'     && <Signals stocks={stocks} openStock={openStock} openPredictionForm={openPredictionForm} />}
          {route === 'trading'     && <Trading stocks={stocks} openStock={openStock} />}
          {route === 'leaderboard' && <Leaderboard stocks={stocks} openStock={openStock} />}
          {route === 'settings' && <Settings />}
          {route === 'stock' && activeStock && (
            <StockDetail symbol={activeStock} stocks={stocks} openStock={openStock} openPredictionForm={openPredictionForm} news={news} />
          )}
        </main>
      </div>
    </ToastProvider>
  )
}

// Global search
function GlobalSearch({ stocks, onSelect }) {
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const [searching, setSearching] = useState(false)
  const [extraResult, setExtraResult] = useState(null)
  const syms = Object.keys(stocks || {})
  const results = q
    ? syms.filter(s => {
        const st = stocks[s]
        return s.includes(q.toUpperCase()) || st.name.toLowerCase().includes(q.toLowerCase())
      }).slice(0, 8)
    : []

  async function searchIDX(sym) {
    if (!sym || sym.length < 2) return
    if (stocks[sym.toUpperCase()]) return
    setSearching(true); setExtraResult(null)
    try {
      const res = await fetch(`/api/stock/${sym.toUpperCase()}`)
      if (res.ok) setExtraResult(await res.json())
    } catch {}
    setSearching(false)
  }

  function pick(s) { onSelect(s); setQ(''); setFocused(false); setExtraResult(null) }

  return (
    <div className="search">
      <span className="ico">{Icon.search()}</span>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setExtraResult(null) }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Cari saham BEI (BBCA, GOTO, ...)"
        onKeyDown={e => { if (e.key === 'Enter' && q.length >= 2 && results.length === 0) searchIDX(q) }}
      />
      {searching
        ? <span className="muted" style={{ fontSize: 10 }}>...</span>
        : results.length === 0 && q.length >= 2
          ? <button className="btn sm ghost" style={{ fontSize: 10, padding: '2px 8px' }}
              onMouseDown={() => searchIDX(q)}>Cari BEI</button>
          : <span className="kbd">/</span>
      }
      {focused && (results.length > 0 || extraResult) && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 32,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: 4, zIndex: 50,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          {extraResult && (
            <div onMouseDown={() => pick(extraResult.symbol)}
              style={{
                padding: '6px 8px', borderRadius: 4, cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12,
                borderBottom: results.length > 0 ? '1px solid var(--border)' : undefined
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--panel)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <strong>{extraResult.symbol}</strong>
                <span className="muted" style={{ marginLeft: 8, fontSize: 11 }}>{extraResult.name}</span>
                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', background: 'var(--accent-2)', padding: '1px 6px', borderRadius: 3 }}>BEI</span>
              </div>
              <span className={`chg-pill ${extraResult.changePct >= 0 ? 'up' : 'down'}`}>
                {extraResult.changePct >= 0 ? '+' : ''}{extraResult.changePct.toFixed(2)}%
              </span>
            </div>
          )}
          {results.map(s => {
            const st = stocks[s]
            return (
              <div key={s} onMouseDown={() => pick(s)}
                style={{
                  padding: '6px 8px', borderRadius: 4, cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--panel)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <strong>{s}</strong>
                  <span className="muted" style={{ marginLeft: 8, fontSize: 11 }}>{st.name}</span>
                </div>
                <span className={`chg-pill ${st.changePct >= 0 ? 'up' : 'down'}`}>
                  {st.changePct >= 0 ? '+' : ''}{st.changePct.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default App