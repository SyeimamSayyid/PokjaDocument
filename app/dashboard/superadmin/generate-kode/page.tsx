'use client';

import { useEffect, useState } from 'react';
import LoaderPage from '@/components/LoaderPage';

interface MitraOption { id: string; nama: string; singkatan: string }
interface HasilKode {
  tipeKode: 'status' | 'dokumen';
  kode?: string; kodeAkses?: string; idDokumen?: string;
  kodeExpire: string; berlaku: string;
  tglBerlaku?: string; tglBerakhir?: string; durasi?: number;
  message: string;
}

const DURASI_OPTS = [5, 6, 7, 8, 9, 10];

export default function GenerateKodePage() {
  const [role, setRole] = useState('');
  const [mitraList, setMitraList]   = useState<MitraOption[]>([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [hasil, setHasil]           = useState<HasilKode | null>(null);
  const [copied, setCopied]         = useState(false);
  const [tipeKode, setTipeKode]     = useState<'status' | 'dokumen'>('status');

  // Form bersama
  const [idMitra, setIdMitra] = useState('');
  const [jenis, setJenis]     = useState<'MOU' | 'PKS'>('MOU');

  // Form dokumen
  const [judul, setJudul]       = useState('');
  const [durasi, setDurasi]     = useState(5);

  // Form tambah mitra baru
  const [showAdd, setShowAdd]   = useState(false);
  const [mNama, setMNama]       = useState('');
  const [mEmail, setMEmail]     = useState('');
  const [addingMitra, setAddingMitra] = useState(false);

  const loadMitra = (selectLast = false) => {
    fetch('/api/superadmin/mitra')
      .then(r => r.json())
      .then(d => {
        const list: MitraOption[] = d.data || [];
        setMitraList(list);
        setLoading(false);

        // Baca URL params untuk pre-select mitra
        const params = new URLSearchParams(window.location.search);
        const namaMitraParam = params.get('namaMitra');

        if (namaMitraParam) {
          // Cari mitra yang namanya cocok
          const cocok = list.find(m =>
            m.nama.toLowerCase() === namaMitraParam.toLowerCase()
          );
          if (cocok) {
            setIdMitra(cocok.id);
          } else if (list.length > 0) {
            setIdMitra(list[0].id);
          }
        } else if (list.length > 0) {
          setIdMitra(selectLast ? list[list.length - 1].id : list[0].id);
        }
      })
      .catch(() => { setError('Gagal memuat mitra.'); setLoading(false); });
  };

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);

    // Baca URL params dari redirect pengajuan
    const params = new URLSearchParams(window.location.search);
    const namaMitraParam = params.get('namaMitra');
    const jenisParam     = params.get('jenis') as 'MOU' | 'PKS' | null;
    const templateParam  = params.get('template'); // 'bnn' atau 'mitra'

    if (jenisParam && ['MOU','PKS'].includes(jenisParam)) {
      setJenis(jenisParam);
    }

    // Set ke tipe dokumen otomatis jika dari pengajuan
    if (params.get('dari') === 'pengajuan') {
      setTipeKode('dokumen');
    }

    loadMitra();
  }, []);

  const handleAddMitra = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMitra(true); setError('');
    try {
      const res = await fetch('/api/superadmin/mitra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaInstitusi: mNama, emailPIC: mEmail }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }
      setMNama(''); setMEmail(''); setShowAdd(false);
      loadMitra(true);
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setAddingMitra(false); }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(''); setHasil(null); setCopied(false);

    const mitra = mitraList.find(m => m.id === idMitra);
    if (!mitra) { setError('Pilih mitra terlebih dahulu.'); setSubmitting(false); return; }
    if (tipeKode === 'dokumen' && !judul.trim()) {
      setError('Judul dokumen wajib diisi.'); setSubmitting(false); return;
    }

    try {
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipeKode, idMitra: mitra.id, namaMitra: mitra.nama, jenis,
          judul: tipeKode === 'dokumen' ? judul : undefined,
          durasiTahun: tipeKode === 'dokumen' ? durasi : undefined,
          dibuatOleh: 'Superadmin',
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }
      setHasil(d);
      if (tipeKode === 'dokumen') setJudul('');
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setSubmitting(false); }
  };

  const kodeDisplay = hasil?.kode || hasil?.kodeAkses || '';
  const copyKode = () => {
    navigator.clipboard.writeText(kodeDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <nav style={navStyle}>
        <a href={role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin'} style={backLink}>← Dashboard</a>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Generate Kode</div>
        <div style={{ width: 80 }}></div>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.25rem' }}>

        {error && <div style={msgBox('#A32D2D', '#FCEBEB')}>{error}</div>}

        <div style={card}>
          <div style={cardTitle}>Generate Kode Akses</div>

          {/* Pilih tipe kode */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Tipe Kode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setTipeKode('status'); setHasil(null); setError(''); }}
                style={{
                  ...tipeBtn,
                  background: tipeKode === 'status' ? '#0F6E56' : '#fff',
                  color: tipeKode === 'status' ? '#fff' : '#374151',
                  borderColor: tipeKode === 'status' ? '#0F6E56' : '#e5e7eb',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>🔍</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Kode Status</div>
                <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>Berlaku 1 bulan</div>
                <div style={{ fontSize: 10, opacity: .7, marginTop: 2, lineHeight: 1.4 }}>
                  Untuk mitra cek status pengajuan kerja sama
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setTipeKode('dokumen'); setHasil(null); setError(''); }}
                style={{
                  ...tipeBtn,
                  background: tipeKode === 'dokumen' ? '#0F6E56' : '#fff',
                  color: tipeKode === 'dokumen' ? '#fff' : '#374151',
                  borderColor: tipeKode === 'dokumen' ? '#0F6E56' : '#e5e7eb',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>📄</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Kode Dokumen</div>
                <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>Min. 5 tahun</div>
                <div style={{ fontSize: 10, opacity: .7, marginTop: 2, lineHeight: 1.4 }}>
                  Untuk akses & edit draft MOU/PKS
                </div>
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Memuat mitra...</p>
          ) : (
            <form onSubmit={handleGenerate}>

              {/* Pilih mitra */}
              <div style={{ marginBottom: 10 }}>
                <label style={label}>Mitra</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select style={{ ...input, flex: 1 }} value={idMitra} onChange={e => setIdMitra(e.target.value)}>
                    {mitraList.length === 0 && <option value="">Belum ada mitra</option>}
                    {mitraList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowAdd(s => !s)} style={btnSm}>
                    {showAdd ? 'Tutup' : '+ Baru'}
                  </button>
                </div>
              </div>

              {/* Form tambah mitra inline */}
              {showAdd && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '.75rem', marginBottom: 10, border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Tambah Mitra Baru</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                    <input style={input} placeholder="Nama institusi" value={mNama} onChange={e => setMNama(e.target.value)} required />
                    <input style={input} type="email" placeholder="Email PIC" value={mEmail} onChange={e => setMEmail(e.target.value)} required />
                  </div>
                  <button type="button" onClick={handleAddMitra} disabled={addingMitra} style={btnPrimary}>
                    {addingMitra ? 'Menyimpan...' : 'Simpan Mitra'}
                  </button>
                </div>
              )}

              {/* Pilih jenis */}
              <div style={{ marginBottom: 10 }}>
                <label style={label}>Jenis Dokumen</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['MOU', 'PKS'] as const).map(j => (
                    <button
                      key={j} type="button" onClick={() => setJenis(j)}
                      style={{ ...btnSm, flex: 1, fontWeight: 600, fontSize: 13, padding: '10px',
                        background: jenis === j ? '#185FA5' : '#fff',
                        color: jenis === j ? '#fff' : '#374151',
                        borderColor: jenis === j ? '#185FA5' : '#e5e7eb',
                      }}
                    >{j}</button>
                  ))}
                </div>
              </div>

              {/* Field khusus kode dokumen */}
              {tipeKode === 'dokumen' && (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <label style={label}>Judul Dokumen ✱</label>
                    <input style={input} value={judul} onChange={e => setJudul(e.target.value)}
                      placeholder="Contoh: Kerja sama sosialisasi P4GN" required />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={label}>Durasi Berlaku</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {DURASI_OPTS.map(d => (
                        <button
                          key={d} type="button" onClick={() => setDurasi(d)}
                          style={{ ...btnSm, minWidth: 60, fontWeight: durasi === d ? 600 : 400,
                            background: durasi === d ? '#0F6E56' : '#fff',
                            color: durasi === d ? '#fff' : '#374151',
                            borderColor: durasi === d ? '#0F6E56' : '#e5e7eb',
                          }}
                        >{d} th</button>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>Minimal 5 tahun</div>
                  </div>
                </>
              )}

              {/* Info durasi kode status */}
              {tipeKode === 'status' && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '.75rem', marginBottom: 14, fontSize: 12, color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  <strong style={{ color: '#374151' }}>Kode Status</strong> — berlaku selama <strong style={{ color: '#0F6E56' }}>1 bulan</strong> sejak dibuat.
                  Mitra menggunakan kode ini untuk memantau status pengajuan kerja sama di halaman publik.
                </div>
              )}

              <button type="submit" disabled={submitting || mitraList.length === 0} style={{ ...btnPrimary, width: '100%', height: 40 }}>
                {submitting ? 'Membuat kode...' : `Generate Kode ${tipeKode === 'status' ? 'Status' : 'Dokumen'}`}
              </button>
            </form>
          )}
        </div>

        {/* Hasil */}
        {hasil && (
          <div style={{ ...card, borderColor: '#9FE1CB', background: '#F0FBF7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{hasil.tipeKode === 'status' ? '🔍' : '📄'}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {hasil.tipeKode === 'status' ? 'Kode Status Kerja Sama' : `Kode Dokumen ${hasil.idDokumen}`}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{hasil.message}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, padding: '10px 14px', background: '#fff', border: '1px solid #9FE1CB', borderRadius: 8, fontSize: 20, fontWeight: 600, letterSpacing: 3, textAlign: 'center', color: '#0F6E56' }}>
                {kodeDisplay}
              </div>
              <button onClick={copyKode} style={btnSm}>{copied ? '✓ Tersalin' : 'Salin'}</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#6b7280' }}>
              <div>⏱ Berlaku: <strong style={{ color: '#374151' }}>{hasil.berlaku}</strong></div>
              <div>📅 Expire: <strong style={{ color: '#374151' }}>{hasil.kodeExpire}</strong></div>
              {hasil.tipeKode === 'dokumen' && (
                <>
                  <div>📄 Dokumen berlaku: <strong style={{ color: '#374151' }}>{hasil.tglBerlaku}</strong> s.d. <strong style={{ color: '#374151' }}>{hasil.tglBerakhir}</strong></div>
                  <div style={{ marginTop: 4, padding: '6px 10px', background: '#E1F5EE', borderRadius: 6, color: '#085041', fontSize: 11 }}>
                    Kode ini untuk mitra login & mengerjakan draft. Sampaikan ke mitra secara langsung atau via email.
                  </div>
                </>
              )}
              {hasil.tipeKode === 'status' && (
                <div style={{ marginTop: 4, padding: '6px 10px', background: '#E6F1FB', borderRadius: 6, color: '#0C447C', fontSize: 11 }}>
                  Mitra masukkan kode ini di halaman <strong>/cek-pengajuan</strong> untuk memantau status kerja sama.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 1.5rem', background:'#fff', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:100 };
const backLink: React.CSSProperties = { fontSize:12, color:'#6b7280', textDecoration:'none' };
const card: React.CSSProperties = { background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'1px solid #e5e7eb', marginBottom:'1rem' };
const cardTitle: React.CSSProperties = { fontSize:13, fontWeight:600, marginBottom:12 };
const label: React.CSSProperties = { display:'block', fontSize:11, color:'#6b7280', marginBottom:4 };
const input: React.CSSProperties = { width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, fontFamily:'sans-serif', boxSizing:'border-box' };
const tipeBtn: React.CSSProperties = { padding:'12px 8px', borderRadius:10, border:'1px solid #e5e7eb', cursor:'pointer', textAlign:'center', fontFamily:'sans-serif', transition:'all .15s' };
const btnPrimary: React.CSSProperties = { padding:'8px 16px', borderRadius:8, border:'none', background:'#0F6E56', color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'sans-serif', whiteSpace:'nowrap' };
const btnSm: React.CSSProperties = { padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:12, cursor:'pointer', fontFamily:'sans-serif' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'8px 12px', borderRadius:8, marginBottom:10 });