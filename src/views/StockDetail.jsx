// StockDetail.jsx — stock detail view with chart
import React, { useState } from 'react'
import { AnimatedNumber, Sparkline, CandleChart, OrderBook, LivePill, Icon } from '../components'
import { fmt, sgn, SECTOR_LABELS, SECTOR_COLORS } from '../api'
import { LS } from '../store'
import { defaultWatchlist } from '../defaults'

export default function StockDetail({ symbol, stocks, openStock, openPredictionForm }) {
  const [tf, setTf] = useState('1D')
  const [tab, setTab] = useState('chart')
  const [watchlist, setWatchlist] = useState(() => LS.read('ihsg.watchlist', defaultWatchlist()))

  const st = stocks[symbol]
  const inWatch = watchlist.includes(symbol)

  function toggleWatch() {
    const next = inWatch ? watchlist.filter(s => s !== symbol) : [...watchlist, symbol]
    setWatchlist(next)
    LS.write('ihsg.watchlist', next)
  }

  if (!st) return <div className="muted">Saham tidak ditemukan</div>

  const upDir = (st.changePct || 0) >= 0
  const sectorColor = SECTOR_COLORS[st.sector] || '#888'

  return (
    <div className="view-anim col" style={{ gap: 12 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: sectorColor + '22',
            color: sectorColor,
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 14,
            border: '1px solid ' + sectorColor + '44'
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
          <KV label="Bid" value={<><span className="up mono">{fmt.px(st.bid)}</span> <span className="muted" style={{ fontSize: 11 }}>×{fmt.vol(st.bidVol)}</span></>} />
          <KV label="Ask" value={<><span className="down mono">{fmt.px(st.ask)}</span> <span className="muted" style={{ fontSize: 11 }}>×{fmt.vol(st.askVol)}</span></>} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 16 }}>
          <KV label="Open" value={<span className="mono">{fmt.px(st.open)}</span>} />
          <KV label="High" value={<span className="mono up">{fmt.px(st.high)}</span>} />
          <KV label="Low" value={<span className="mono down">{fmt.px(st.low)}</span>} />
          <KV label="Volume" value={<span className="mono">{fmt.vol(st.volume)}</span>} />
          <KV label="Nilai" value={<span className="mono">{fmt.bigIDR(st.value)}</span>} />
          <KV label="Mkt Cap" value={<span className="mono">{fmt.bigIDR(st.mcap)}</span>} />
          <KV label="PER" value={<span className="mono">{(st.per || 0).toFixed(1)}x</span>} />
          <KV label="PBV" value={<span className="mono">{(st.pbv || 0).toFixed(2)}x</span>} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12 }}>
        <div className="panel">
          <div className="panel-head">
            <div className="row" style={{ gap: 10 }}>
              <span className="panel-title">{tab === 'chart' ? 'Chart' : tab === 'tech' ? 'Indikator Teknikal' : 'Fundamental'}</span>
              <div className="seg">
                {['chart', 'tech', 'fund'].map(t => (
                  <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
                    {t === 'chart' ? 'Chart' : t === 'tech' ? 'Teknikal' : 'Fundamental'}
                  </button>
                ))}
              </div>
            </div>
            <div className="seg">
              {['1D', '5D', '1M', '3M', '1Y', 'All'].map(t => (
                <button key={t} className={tf === t ? 'on' : ''} onClick={() => setTf(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="panel-body" style={{ padding: 8 }}>
            {tab === 'chart' && <ChartTab stock={st} />}
            {tab === 'tech' && <TechnicalTab stock={st} />}
            {tab === 'fund' && <FundamentalTab stock={st} />}
          </div>
        </div>

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
              <div className="muted" style={{ fontSize: 11 }}>* Tombol simulasi — tidak terhubung ke broker</div>
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

function ChartTab({ stock }) {
  const bars = (stock.spark || []).map((close, i) => ({
    open: i > 0 ? stock.spark[i - 1] : close,
    high: close * 1.002,
    low: close * 0.998,
    close,
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
        <IndicatorCard title="Volatility" value={(stock.volProfile || 1).toFixed(2)} status={(stock.volProfile || 1) > 1.5 ? 'Tinggi' : 'Sedang'} />
      </div>
      <div className="panel" style={{ background: 'var(--panel-2)' }}>
        <div className="panel-body">
          <div className="h2" style={{ marginBottom: 8 }}>Ringkasan Sinyal</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8 }}>
            <li>Harga {trend === 'Uptrend' ? 'di atas' : 'di bawah'} MA(20) — momentum {trend === 'Uptrend' ? 'positif' : 'negatif'}.</li>
            <li>RSI {(stock.rsi || 50).toFixed(0)} ({rsiLabel}) — {(stock.rsi || 50) > 70 ? 'potensi koreksi' : (stock.rsi || 50) < 30 ? 'potensi rebound' : 'tidak ada signal ekstrem'}.</li>
            <li>Volume hari ini {fmt.vol(stock.volume)} — dalam batas normal.</li>
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
    ['Market Cap', fmt.bigIDR(stock.mcap)],
    ['PER (TTM)', (stock.per || 0).toFixed(2) + 'x'],
    ['PBV', (stock.pbv || 0).toFixed(2) + 'x'],
    ['EPS', 'IDR ' + (stock.eps || 0).toLocaleString('id-ID')],
    ['Dividend Yield', (stock.div || 0).toFixed(2) + '%'],
    ['Beta (3y)', (stock.beta || 1).toFixed(2)],
    ['ROE', (8 + Math.random() * 22).toFixed(1) + '%'],
    ['Net Margin', (5 + Math.random() * 18).toFixed(1) + '%'],
    ['DER', (0.3 + Math.random() * 2).toFixed(2)],
    ['Avg Vol 30D', fmt.vol(stock.volume * 1.1)],
    ['52W High', fmt.px(Math.round(stock.last * 1.25))],
    ['52W Low', fmt.px(Math.round(stock.last * 0.78))],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, padding: 4 }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</div>
          <div className="mono" style={{ fontSize: 14, marginTop: 2 }}>{v}</div>
        </div>
      ))}
    </div>
  )
}

function RelatedStocks({ current, stocks, openStock }) {
  const st = stocks[current]
  if (!st) return null
  const sec = st.sector
  const syms = Object.keys(stocks)
  const related = syms.map(s => stocks[s]).filter(s => s.sector === sec && s.symbol !== current).slice(0, 6)

  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Saham Sesama Sektor</span></div>
      <table className="tbl">
        <thead><tr><th>Simbol</th><th className="num">Last</th><th className="num">Chg %</th><th className="num">Volume</th><th></th></tr></thead>
        <tbody>
          {related.map(st => (
            <tr key={st.symbol} onClick={() => openStock(st.symbol)}>
              <td className="sym-cell">{st.symbol}<small>{(st.name || '').slice(0, 14)}</small></td>
              <td className="num mono"><AnimatedNumber value={st.last} format={fmt.px} /></td>
              <td className="num"><span className={'chg-pill ' + sgn(st.changePct)}>{fmt.pct(st.changePct)}</span></td>
              <td className="num mono">{fmt.vol(st.volume)}</td>
              <td><Sparkline data={st.spark || []} width={50} height={18} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}