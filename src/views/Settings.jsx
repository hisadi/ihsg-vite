// Settings.jsx — Upload daftar saham BEI dari Excel IDX
import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const SUPABASE_URL = 'https://pvqbjqjjwwcmzajldlzo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cWJqcWpqd3djbXphamxkbHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjk1NzksImV4cCI6MjA5NjY0NTU3OX0.3IeD44BUsjvlvRQU6lcfWysT5nyZxq9eZCNEZ2HN-WA'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const SECTOR_MAP = {
  'Keuangan': 'FINANCIAL', 'Perbankan': 'FINANCIAL', 'Asuransi': 'FINANCIAL',
  'Barang Konsumsi': 'CONSUMER', 'Consumer': 'CONSUMER', 'Konsumer': 'CONSUMER',
  'Energi': 'ENERGY', 'Pertambangan': 'ENERGY', 'Energy': 'ENERGY',
  'Material': 'BASIC', 'Kimia': 'BASIC', 'Basic': 'BASIC',
  'Industri': 'INDUSTRIAL', 'Industrial': 'INDUSTRIAL',
  'Infrastruktur': 'INFRA', 'Telekomunikasi': 'INFRA', 'Utilitas': 'INFRA',
  'Properti': 'PROPERTY', 'Property': 'PROPERTY',
  'Kesehatan': 'HEALTH', 'Healthcare': 'HEALTH',
  'Teknologi': 'TECH', 'Technology': 'TECH',
  'Transportasi': 'TRANSPORT', 'Transport': 'TRANSPORT',
}

function mapSector(raw) {
  if (!raw) return 'OTHER'
  for (const [key, val] of Object.entries(SECTOR_MAP)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return val
  }
  return 'OTHER'
}

export default function Settings() {
  const [tickers, setTickers] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [msg, setMsg] = useState(null)
  const fileRef = useRef()

  useEffect(() => { loadTickers() }, [])

  async function loadTickers() {
    setLoading(true)
    const { data } = await supabase.from('idx_tickers').select('*').order('sym')
    setTickers(data || [])
    setLoading(false)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setMsg(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Cari header row
        let headerIdx = -1
        let codeCol = -1, nameCol = -1, sectorCol = -1
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const row = rows[i].map(c => String(c).toLowerCase())
          const codeI = row.findIndex(c => c.includes('kode') || c === 'code' || c === 'ticker')
          const nameI = row.findIndex(c => c.includes('nama') || c === 'name')
          const secI = row.findIndex(c => c.includes('sektor') || c.includes('sector') || c.includes('industri'))
          if (codeI >= 0 && nameI >= 0) {
            headerIdx = i; codeCol = codeI; nameCol = nameI; sectorCol = secI
            break
          }
        }

        if (headerIdx < 0) {
          setMsg({ type: 'error', text: 'Format Excel tidak dikenali. Pastikan ada kolom Kode dan Nama.' })
          return
        }

        const parsed = []
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i]
          const sym = String(row[codeCol] || '').trim().toUpperCase()
          const name = String(row[nameCol] || '').trim()
          const sectorRaw = sectorCol >= 0 ? String(row[sectorCol] || '') : ''
          if (sym && sym.length >= 2 && sym.length <= 5 && /^[A-Z]+$/.test(sym)) {
            parsed.push({ sym, name, sector: mapSector(sectorRaw), mcap: 0 })
          }
        }

        setPreview(parsed)
        setMsg({ type: 'info', text: `Ditemukan ${parsed.length} saham. Klik "Simpan ke Database" untuk update.` })
      } catch (err) {
        setMsg({ type: 'error', text: 'Gagal parse Excel: ' + err.message })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function saveToSupabase() {
    if (!preview || preview.length === 0) return
    setUploading(true)
    setMsg(null)

    try {
      // Upsert in batches of 100
      const batchSize = 100
      let saved = 0
      for (let i = 0; i < preview.length; i += batchSize) {
        const batch = preview.slice(i, i + batchSize).map(t => ({
          sym: t.sym,
          name: t.name,
          sector: t.sector,
          mcap: t.mcap,
          updated_at: new Date().toISOString()
        }))
        const { error } = await supabase.from('idx_tickers').upsert(batch, { onConflict: 'sym' })
        if (error) throw error
        saved += batch.length
        setMsg({ type: 'info', text: `Menyimpan... ${saved}/${preview.length}` })
      }
      setMsg({ type: 'success', text: `✅ ${preview.length} saham berhasil disimpan ke database!` })
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      await loadTickers()
    } catch (err) {
      setMsg({ type: 'error', text: '❌ Gagal simpan: ' + err.message })
    }
    setUploading(false)
  }

  async function clearAll() {
    if (!confirm('Hapus semua ticker dari database?')) return
    await supabase.from('idx_tickers').delete().neq('sym', '')
    setTickers([])
    setMsg({ type: 'info', text: 'Database dikosongkan.' })
  }

  return (
    <div className="view-anim col" style={{ gap: 20 }}>
      <div>
        <h2 className="h1">Settings</h2>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Kelola daftar saham BEI dan konfigurasi app.</div>
      </div>

      {/* Upload Panel */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">📊 Update Daftar Saham BEI</span>
        </div>
        <div className="panel-body col" style={{ gap: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Download file Excel dari <a href="https://www.idx.co.id/id/data-pasar/data-saham/daftar-saham" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>idx.co.id → Daftar Saham</a>, lalu upload di sini untuk update daftar saham secara otomatis.
          </div>

          <div style={{
            border: '2px dashed var(--border)', borderRadius: 10, padding: '24px',
            textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s',
          }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)' }}
            onDragLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; handleFile({ target: { files: e.dataTransfer.files } }) }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Klik atau drag & drop file Excel IDX</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Format: .xlsx — dari halaman Daftar Saham IDX</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
          </div>

          {msg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: msg.type === 'error' ? 'rgba(239,68,68,0.1)' : msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'var(--panel)',
              color: msg.type === 'error' ? '#ef4444' : msg.type === 'success' ? '#22c55e' : 'var(--text-2)',
              border: `1px solid ${msg.type === 'error' ? '#fca5a5' : msg.type === 'success' ? '#86efac' : 'var(--border)'}`
            }}>
              {msg.text}
            </div>
          )}

          {preview && preview.length > 0 && (
            <>
              <div style={{ background: 'var(--panel)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>Preview (10 pertama):</div>
                <table className="tbl" style={{ fontSize: 11 }}>
                  <thead><tr><th>Kode</th><th>Nama</th><th>Sektor</th></tr></thead>
                  <tbody>
                    {preview.slice(0, 10).map(t => (
                      <tr key={t.sym}>
                        <td className="sym-cell">{t.sym}</td>
                        <td style={{ color: 'var(--text-2)' }}>{t.name}</td>
                        <td><span className="tag">{t.sector}</span></td>
                      </tr>
                    ))}
                    {preview.length > 10 && <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-3)', padding: 8 }}>... dan {preview.length - 10} lainnya</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" onClick={saveToSupabase} disabled={uploading}>
                  {uploading ? '⏳ Menyimpan...' : `💾 Simpan ${preview.length} Saham ke Database`}
                </button>
                <button className="btn ghost" onClick={() => { setPreview(null); setMsg(null); if (fileRef.current) fileRef.current.value = '' }}>
                  Batal
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Current Tickers */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">📋 Daftar Saham di Database</span>
          <div className="row" style={{ gap: 8 }}>
            <span className="muted" style={{ fontSize: 12 }}>{loading ? '...' : `${tickers.length} saham`}</span>
            {tickers.length > 0 && (
              <button className="btn sm ghost" style={{ color: '#ef4444', borderColor: '#fca5a5', fontSize: 11 }} onClick={clearAll}>
                🗑️ Hapus Semua
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Memuat...</div>
        ) : tickers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            Belum ada data. Upload Excel IDX di atas untuk mulai.
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Kode</th><th>Nama</th><th>Sektor</th><th>Update</th></tr>
              </thead>
              <tbody>
                {tickers.map(t => (
                  <tr key={t.sym}>
                    <td className="sym-cell">{t.sym}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{t.name}</td>
                    <td><span className="tag">{t.sector}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(t.updated_at).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
