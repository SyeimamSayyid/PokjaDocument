'use client';

import { useEffect, useState } from 'react';

interface PengajuanItem {
  id: string; idMitra: string; namaMitra: string; jenis: string; arah: string;
  perihal: string; tanggal: string; status: string; alasan: string;
  kodeTracking: string; idDokumen: string; dicatatOleh: string;
}

const ARAH_LABEL: Record<string, string> = {
  'BNN_ke_Mitra': 'BNN → Mitra',
  'Mitra_ke_BNN': 'Mitra → BNN',
};

export default function PengajuanPage() {
  const [data, setData] = useState<PengajuanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Form tambah
  const [namaMitra, setNamaMitra] = useState('');
  const [jenis, setJenis] = useState<'MOU' | 'PKS'>('MOU');
  const [arah, setArah] = useState<'BNN_ke_Mitra' | 'Mitra_ke_BNN'>('Mitra_ke_BNN');
  const [perihal, setPerihal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Aksi tolak inline
  const [tolakId, setTolakId] = useState<string | null>(null);
  const [alasanTolak, setAlasanTolak] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Hasil terima (kode akses draft)
  const [hasilTerima, setHasilTerima] = useState<{ idPengajuan: string; idDokumen: string; kodeAkses: string; kodeExpire: string } | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/pengajuan')
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat data pengajuan.'); setLoading(false); });
  };

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMsg(''); setError(''); setHasilTerima(null);
    try {
      const res = await fetch('/api/pengajuan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaMitra, jenis, arah, perihal, dicatatOleh: 'Admin Pokja' }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mencatat pengajuan.'); return; }
      setMsg(`Pengajuan dicatat. Kode tracking untuk mitra: ${d.kodeTracking}`);
      setNamaMitra(''); setPerihal('');
      load();
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTerima = async (id: string) => {
    setProcessingId(id); setMsg(''); setError(''); setHasilTerima(null);
    try {
      const res = await fetch('/api/pengajuan/aksi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'terima' }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal memproses.'); return; }
      setHasilTerima({ idPengajuan: id, idDokumen: d.idDokumen, kodeAkses: d.kodeAkses, kodeExpire: d.kodeExpire });
      setMsg(d.message);
      load();
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleTolak = async (id: string) => {
    if (!alasanTolak.trim()) { setError('Alasan penolakan wajib diisi.'); return; }
    setProcessingId(id); setMsg(''); setError('');
    try {
      const res = await fetch('/api/pengajuan/aksi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'tolak', alasan: alasanTolak }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal memproses.'); return; }
      setMsg(d.message);
      setTolakId(null); setAlasanTolak('');
      load();
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setProcessingId(null);
    }
  };

  const copyText = (text: string) => navigator.clipboard.writeText(text);

  const badgeStyle = (status: string): React.CSSProperties => {
    const s = status.toLowerCase();
    if (s.includes('review')) return { background: '#FAEEDA', color: '#854F0B' };
    if (s === 'diterima')     return { background: '#E1F5EE', color: '#085041' };
    if (s === 'ditolak')      return { background: '#FCEBEB', color: '#A32D2D' };
    return { background: '#f3f4f6', color: '#6b7280' };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <nav style={navStyle}>
        <a href="/dashboard/admin" style={backLink}>← Dashboard</a>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Pengajuan Kerja Sama</div>
        <div style={{ width: 80 }}></div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.25rem' }}>

        {msg && <div style={msgBox('#085041', '#E1F5EE')}>{msg}</div>}
        {error && <div style={msgBox('#A32D2D', '#FCEBEB')}>{error}</div>}

        {hasilTerima && (
          <div style={{ ...card, borderColor: '#9FE1CB', background: '#F0FBF7' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
              Dokumen <strong>{hasilTerima.idDokumen}</strong> dibuat dengan status Draft.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, padding: '10px 14px', background: '#fff', border: '1px solid #9FE1CB', borderRadius: 8, fontSize: 18, fontWeight: 600, letterSpacing: 2, textAlign: 'center', color: '#0F6E56' }}>
                {hasilTerima.kodeAkses}
              </div>
              <button onClick={() => copyText(hasilTerima.kodeAkses)} style={btnSm}>Salin</button>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              Kode ini untuk Mitra login & mengerjakan draft. Berlaku hingga {hasilTerima.kodeExpire}.
              Sampaikan secara manual ke mitra (pengiriman otomatis via email belum aktif).
            </div>
          </div>
        )}

        {/* Form tambah */}
        <div style={card}>
          <div style={cardTitle}>Catat Pengajuan Kerja Sama Baru</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
            Negosiasi awal dilakukan secara manual (luar sistem). Catat di sini untuk mulai tracking statusnya.
          </div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={label}>Nama Mitra / Institusi</label>
                <input style={input} value={namaMitra} onChange={e => setNamaMitra(e.target.value)} placeholder="Contoh: PT Nusantara Digital" required />
              </div>
              <div>
                <label style={label}>Arah Pengajuan</label>
                <select style={input} value={arah} onChange={e => setArah(e.target.value as typeof arah)}>
                  <option value="Mitra_ke_BNN">Mitra → BNN (mitra mengajukan)</option>
                  <option value="BNN_ke_Mitra">BNN → Mitra (BNN mengajukan)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={label}>Jenis Dokumen</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['MOU', 'PKS'] as const).map(j => (
                    <button
                      key={j} type="button" onClick={() => setJenis(j)}
                      style={{
                        ...btnSm, flex: 1, fontWeight: 600,
                        background: jenis === j ? '#0F6E56' : '#fff',
                        color: jenis === j ? '#fff' : '#374151',
                        borderColor: jenis === j ? '#0F6E56' : '#e5e7eb',
                      }}
                    >{j}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={label}>Perihal / Ruang Lingkup</label>
                <input style={input} value={perihal} onChange={e => setPerihal(e.target.value)} placeholder="Contoh: Sosialisasi P4GN di lingkungan kampus" required />
              </div>
            </div>
            <button type="submit" disabled={submitting} style={{ ...btnPrimary, width: '100%', height: 40 }}>
              {submitting ? 'Menyimpan...' : '+ Catat Pengajuan'}
            </button>
          </form>
        </div>

        {/* List */}
        <div style={card}>
          <div style={cardTitle}>Daftar Pengajuan ({data.length})</div>
          {loading ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Memuat...</p>
          ) : data.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Belum ada pengajuan tercatat.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.map(p => (
                <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.namaMitra}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        {p.jenis} · {ARAH_LABEL[p.arah] || p.arah} · {p.tanggal}
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>{p.perihal}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap', ...badgeStyle(p.status) }}>
                      {p.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#9ca3af', flexWrap: 'wrap' }}>
                    <span>Kode tracking: <strong style={{ color: '#374151' }}>{p.kodeTracking}</strong>
                      <button onClick={() => copyText(p.kodeTracking)} style={{ ...btnSmGhost, marginLeft: 6, padding: '1px 6px' }}>salin</button>
                    </span>
                    {p.idDokumen && <span>Dokumen: <strong style={{ color: '#374151' }}>{p.idDokumen}</strong></span>}
                    {p.status === 'Ditolak' && <span>Alasan: {p.alasan}</span>}
                  </div>

                  {p.status === 'Review dalam proses' && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button onClick={() => handleTerima(p.id)} disabled={processingId === p.id} style={{ ...btnSm, background: '#0F6E56', color: '#fff', borderColor: '#0F6E56' }}>
                        {processingId === p.id ? 'Memproses...' : '✓ Terima'}
                      </button>
                      {tolakId === p.id ? (
                        <>
                          <input
                            style={{ ...input, width: 220, padding: '6px 8px' }}
                            placeholder="Alasan penolakan"
                            value={alasanTolak}
                            onChange={e => setAlasanTolak(e.target.value)}
                          />
                          <button onClick={() => handleTolak(p.id)} disabled={processingId === p.id} style={{ ...btnSm, background: '#A32D2D', color: '#fff', borderColor: '#A32D2D' }}>
                            Konfirmasi Tolak
                          </button>
                          <button onClick={() => { setTolakId(null); setAlasanTolak(''); }} style={btnSmGhost}>Batal</button>
                        </>
                      ) : (
                        <button onClick={() => { setTolakId(p.id); setAlasanTolak(''); setError(''); }} style={btnSm}>
                          ✕ Tolak
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const navStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 100 };
const backLink: React.CSSProperties = { fontSize: 12, color: '#6b7280', textDecoration: 'none' };
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #e5e7eb', marginBottom: '1rem' };
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 8 };
const label: React.CSSProperties = { display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 };
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0F6E56', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'sans-serif', whiteSpace: 'nowrap' };
const btnSm: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 11, cursor: 'pointer', fontFamily: 'sans-serif' };
const btnSmGhost: React.CSSProperties = { ...btnSm, background: 'transparent', color: '#9ca3af', border: 'none' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({
  fontSize: 12, color, background: bg, padding: '8px 12px', borderRadius: 8, marginBottom: 10,
});