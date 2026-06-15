// Dashboard.jsx — IHSG overview + market movers + top stats
import React from 'react'
import { AnimatedNumber, Sparkline, LivePill } from '../components'
import { fmt, sgn, SECTOR_LABELS, SECTOR_COLORS } from '../api'

export default function Dashboard({ stocks, ihsg, stats, sectors, openStock, onNav }) {
  const syms = Object.keys(stocks || {})
  const allStocks = syms.map(s => stocks[s]).filter(Boolean)

  const topGainers = [...allStocks].sort((a, b) => b.changePct - a.changePct).slice(0, 8)
  const topLosers = [...allStocks].sort((a, b) => a.changePct - b.changePct).slice(0, 8)
  const mostActive = [...allStocks].sort((a, b) => b.value - a.value).slice(0, 8)
  const foreignFlow = [...allStocks].sort((a, b) => Math.abs(b.foreignNet || 0) - Math.abs(a.foreignNet || 0)).slice(0, 8)

  // Sector performance
  const sectorPerf = sectors || []

  const breadthTotal = stats.up + stats.down + stats.flat
  const breadthPct = breadthTotal ? (stats.up / breadthTotal) * 100 : 0

  return (
    <div className="view-anim col" style={{ gap: 14 }}>
      {/* Top hero row */}
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr' }}>
        {/* IHSG Big card */}
        <div className="stat-card" style={{ paddingBottom: 0, position: 'relative' }}>
          <div className="row between">
            <div className="row" style={{ gap: 8 }}>
              <span className="tag">INDEX</span>
              <span style={{ fontWeight: 600 }}>IHSG · Composite</span>
            </div>
            <LivePill />
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 12, marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 36, fontWeight: 700, color: ihsg.changePct >= 0 ? 'var(--up)' : 'var(--down)' }}>
              <AnimatedNumber value={ihsg.value} format={v => v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
            </span>
            <span className={'chg-pill ' + sgn(ihsg.changePct)} style={{ fontSize: 13, padding: '2px 8px' }}>
              {ihsg.changePct >= 0 ? '▲' : '▼'} {fmt.pct(ihsg.changePct)} ({ihsg.change >= 0 ? '+' : ''}{ihsg.change.toFixed(2)})
            </span>
          </div>
          <div className="muted" style={{ fontSize: 11 }}>vs. penutupan kemarin · Real-time</div>
          <div style={{ marginTop: 6, marginLeft: -10, marginRight: -10, marginBottom: -6 }}>
            <Sparkline data={ihsg.spark || []} width={400} height={62} />
          </div>
        </div>

        <StatTile label="Nilai Transaksi" value={fmt.bigIDR(stats.valueTotal)} suffix="IDR" />
        <StatTile label="Volume" value={fmt.vol(stats.volumeTotal)} suffix="lot" />
        <div className="stat-card">
          <div className="label">Breadth (Naik / Turun)</div>
          <div className="value" style={{ fontSize: 16 }}>
            <span className="up">{stats.up}</span> <span className="muted" style={{ fontSize: 13 }}>/</span> <span className="down">{stats.down}</span> <span className="muted" style={{ fontSize: 13 }}>· {stats.flat} flat</span>
          </div>
          <div className="progress" style={{ marginTop: 2 }}>
            <span style={{ width: breadthPct + '%', background: 'linear-gradient(90deg, var(--up), var(--down))' }}></span>
          </div>
          <div className="sub muted">{breadthPct.toFixed(0)}% saham naik dari {breadthTotal} ticker</div>
        </div>
      </div>

      {/* Sectors strip */}
      {sectorPerf.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Performa Sektor</span>
            <span className="muted" style={{ fontSize: 11 }}>Weighted by market cap · Real-time</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 0 }}>
            {sectorPerf.map(s => (
              <div key={s.key} style={{ padding: '12px 10px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }}
                onClick={() => onNav('heatmap')}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label || SECTOR_LABELS[s.key]}</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: s.change >= 0 ? 'var(--up)' : 'var(--down)' }}>
                  {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
                </div>
                <div style={{ height: 3, background: 'var(--panel-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: Math.min(100, Math.abs(s.change) * 20) + '%',
                    background: s.change >= 0 ? 'var(--up)' : 'var(--down)',
                    transition: 'width 600ms cubic-bezier(.2,.8,.2,1)'
                  }}></div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.count} emiten</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movers tables */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <MoverTable title="Top Gainers" rows={topGainers} openStock={openStock} mode="gain" />
        <MoverTable title="Top Losers" rows={topLosers} openStock={openStock} mode="loss" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <MoverTable title="Most Active (Nilai)" rows={mostActive} openStock={openStock} mode="value" />
        <ForeignFlowPanel rows={foreignFlow} openStock={openStock} />
      </div>

      {/* Note about real data */}
      <div className="panel" style={{ borderStyle: 'dashed', borderColor: 'var(--border-2)' }}>
        <div className="panel-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--accent-2)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 700 }}>✓</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text)' }}>Data Real-time:</strong> Aplikasi ini menggunakan Yahoo Finance API untuk data saham Indonesia (suffix .JK). Data di-refresh setiap 3 menit dari sumber, dengan micro-tick simulasi setiap 1.5 detik untuk pengalaman real-time yang smooth. Semua harga, volume, dan perubahan adaktual dari bursa.
          </div>
        </div>
      </div>
    </div>
  )
}

function StatTile({ label, value, suffix }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}<span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>{suffix}</span></div>
      <div className="sub muted">Sesi berjalan · {new Date().toLocaleDateString('id-ID')}</div>
    </div>
  )
}

function MoverTable({ title, rows, openStock, mode }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{title}</span>
        <LivePill />
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 110 }}>Saham</th>
            <th className="num">Last</th>
            <th className="num">Chg %</th>
            <th className="num">{mode === 'value' ? 'Nilai' : 'Vol'}</th>
            <th style={{ width: 60 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(st => (
            <tr key={st.symbol} onClick={() => openStock(st.symbol)}>
              <td className="sym-cell">{st.symbol}<small>{st.name.slice(0, 12)}</small></td>
              <td className="num"><AnimatedNumber value={st.last} format={fmt.px} /></td>
              <td className="num"><span className={'chg-pill ' + sgn(st.changePct)}>{fmt.pct(st.changePct)}</span></td>
              <td className="num mono">{mode === 'value' ? fmt.bigIDR(st.value) : fmt.vol(st.volume)}</td>
              <td><Sparkline data={st.spark || []} width={50} height={18} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ForeignFlowPanel({ rows, openStock }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Foreign Flow Tertinggi</span>
        <span className="muted" style={{ fontSize: 11 }}>Net beli/jual asing hari ini</span>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 100 }}>Saham</th>
            <th className="num">Last</th>
            <th className="num">Foreign Net</th>
            <th className="num">Chg %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(st => (
            <tr key={st.symbol} onClick={() => openStock(st.symbol)}>
              <td className="sym-cell">{st.symbol}</td>
              <td className="num"><AnimatedNumber value={st.last} format={fmt.px} /></td>
              <td className={'num ' + ((st.foreignNet || 0) >= 0 ? 'up' : 'down')}>
                {(st.foreignNet || 0) >= 0 ? '+' : ''}{fmt.bigIDR(st.foreignNet || 0)}
              </td>
              <td className="num"><span className={'chg-pill ' + sgn(st.changePct)}>{fmt.pct(st.changePct)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
