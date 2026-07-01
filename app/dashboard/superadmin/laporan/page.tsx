'use client';

import { useEffect, useState } from 'react';
import LoaderPage from '@/components/LoaderPage';

interface Ringkasan {
  mouBaru: number; pksBaru: number; totalBaru: number;
  aktif: number; kedaluwarsaPeriode: number; mitraBaru: number;
}
interface DokumenItem { id: string; jenis: string; judul: string; mitra: string; tanggal: string; status: string }
interface LaporanData { tipe: string; periode: string; ringkasan: Ringkasan; listDokumen: DokumenItem[] }

const BULAN_NAMA = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function LaporanPage() {
  const now = new Date();
  const [tipe, setTipe] = useState<'bulanan' | 'tahunan'>('bulanan');
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (u.role !== 'superadmin') { window.location.href = '/login'; return; }
  }, []);

  const tampilkan = async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const params = new URLSearchParams({ tipe, tahun: String(tahun) });
      if (tipe === 'bulanan') params.set('bulan', String(bulan));
      const res = await fetch(`/api/superadmin/laporan?${params}`);
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal memuat laporan.'); return; }
      setData(d);
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    const params = new URLSearchParams({ tipe, tahun: String(tahun) });
    if (tipe === 'bulanan') params.set('bulan', String(bulan));
    window.location.href = `/api/superadmin/laporan/export?${params}`;
  };

  const ringkasanCards = data ? [
    { label: 'MOU baru', val: data.ringkasan.mouBaru },
    { label: 'PKS baru', val: data.ringkasan.pksBaru },
    { label: 'Total dokumen baru', val: data.ringkasan.totalBaru },
    { label: 'Dokumen aktif', val: data.ringkasan.aktif },
    { label: 'Kedaluwarsa', val: data.ringkasan.kedaluwarsaPeriode },
    { label: 'Mitra baru', val: data.ringkasan.mitraBaru },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <nav style={navStyle}>
        <a href="/dashboard/superadmin" style={backLink}>← Dashboard</a>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Laporan Performa</div>
        <div style={{ width: 80 }}></div>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.25rem' }}>

        {error && <div style={msgBox('#A32D2D', '#FCEBEB')}>{error}</div>}

        <div style={card}>
          <div style={cardTitle}>Pilih Periode Laporan</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <div>
              <label style={label}>Tipe</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['bulanan', 'tahunan'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTipe(t)}
                    style={{
                      ...btnSm,
                      background: tipe === t ? '#0F6E56' : '#fff',
                      color: tipe === t ? '#fff' : '#374151',
                      borderColor: tipe === t ? '#0F6E56' : '#e5e7eb',
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {tipe === 'bulanan' && (
              <div>
                <label style={label}>Bulan</label>
                <select style={input} value={bulan} onChange={e => setBulan(parseInt(e.target.value))}>
                  {BULAN_NAMA.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={label}>Tahun</label>
              <input
                style={{ ...input, width: 90 }}
                type="number"
                value={tahun}
                onChange={e => setTahun(parseInt(e.target.value) || now.getFullYear())}
              />
            </div>

            <button onClick={tampilkan} disabled={loading} style={btnPrimary}>
              {loading ? 'Memuat...' : 'Tampilkan'}
            </button>
          </div>
        </div>

        {data && (
          <>
            <div style={card}>
              <div style={cardTitle}>
                Ringkasan {tipe === 'bulanan' ? `${BULAN_NAMA[bulan - 1]} ${tahun}` : `Tahun ${tahun}`}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, marginBottom: 12 }}>
                {ringkasanCards.map((c, i) => (
                  <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#0F6E56' }}>{c.val}</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{c.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={downloadExcel} style={{ ...btnPrimary, width: '100%', height: 38 }}>
                ⬇ Download Excel (.xlsx)
              </button>
            </div>

            <div style={card}>
              <div style={cardTitle}>Daftar Dokumen ({data.listDokumen.length})</div>
              {data.listDokumen.length === 0 ? (
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Tidak ada dokumen pada periode ini.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={th}>Jenis</th>
                        <th style={th}>Judul</th>
                        <th style={th}>Mitra</th>
                        <th style={th}>Tanggal</th>
                        <th style={th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.listDokumen.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={td}>{d.jenis}</td>
                          <td style={td}>{d.judul}</td>
                          <td style={td}>{d.mitra}</td>
                          <td style={td}>{d.tanggal}</td>
                          <td style={td}>{d.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );


}

const navStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 100 };
const backLink: React.CSSProperties = { fontSize: 12, color: '#6b7280', textDecoration: 'none' };
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #e5e7eb', marginBottom: '1rem' };
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 12 };
const label: React.CSSProperties = { display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 };
const input: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box', height: 36 };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0F6E56', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'sans-serif', whiteSpace: 'nowrap', height: 36 };
const btnSm: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' };
const th: React.CSSProperties = { padding: '8px 6px', fontWeight: 500 };
const td: React.CSSProperties = { padding: '8px 6px' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({
  fontSize: 12, color, background: bg, padding: '8px 12px', borderRadius: 8, marginBottom: 10,
});