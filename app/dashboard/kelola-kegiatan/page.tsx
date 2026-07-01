'use client';

import { useEffect, useState, useCallback } from 'react';

interface FotoItem { fileId: string; nama: string; ukuran: number; thumbnailUrl: string; }
interface DokItem {
  id: string; jenis: string; judul: string; idMitra: string; namaMitra: string;
  status: string; fotoFolderId: string; tglMulai: string; tglSelesai: string;
  divisi: string; divisiLabel: string; foto?: FotoItem[];
}
interface Ringkasan {
  totalKegiatanEplanning: number; totalSlot: number; totalTerisi: number;
  jmlAkanBerlangsung: number; jmlBerlangsung: number; jmlTelahSelesai: number;
}

const TABS = [
  { key:'akan',     label:'Akan Berlangsung', icon:'⏳' },
  { key:'berlang',  label:'Berlangsung',      icon:'🔴' },
  { key:'selesai',  label:'Telah Selesai',    icon:'✓' },
];

function fmt(t: string) {
  if (!t) return '-';
  try { return new Date(t).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }); }
  catch { return t; }
}

export default function KelolaKegiatanPage() {
  const [role, setRole]     = useState('');
  const [ring, setRing]     = useState<Ringkasan | null>(null);
  const [akan, setAkan]     = useState<DokItem[]>([]);
  const [berlang, setBerlang] = useState<DokItem[]>([]);
  const [selesai, setSelesai] = useState<DokItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('akan');
  const [msg, setMsg]       = useState('');
  const [error, setError]   = useState('');

  // Modal hapus foto
  const [hapusTarget, setHapusTarget] = useState<{ dok: DokItem; foto: FotoItem } | null>(null);
  const [alasan, setAlasan] = useState('');
  const [hapusLoading, setHapusLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/kelola-kegiatan')
      .then(r => r.json())
      .then(d => {
        setRing(d.ringkasan || null);
        setAkan(d.akanBerlangsung || []);
        setBerlang(d.berlangsung || []);
        setSelesai(d.telahSelesai || []);
      })
      .catch(() => setError('Gagal memuat data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    load();
  }, [load]);

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

  const handleHapusFoto = async () => {
    if (!hapusTarget) return;
    setHapusLoading(true); setError('');
    try {
      const res = await fetch('/api/kelola-kegiatan', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: hapusTarget.foto.fileId,
          fotoFolderId: hapusTarget.dok.fotoFolderId,
          idDokumen: hapusTarget.dok.id,
          idMitra: hapusTarget.dok.idMitra,
          namaFile: hapusTarget.foto.nama,
          alasan: alasan.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal hapus.'); return; }
      setMsg(d.message);
      // Update lokal
      setBerlang(prev => prev.map(dok => dok.id === hapusTarget.dok.id
        ? { ...dok, foto: (dok.foto||[]).filter(f => f.fileId !== hapusTarget.foto.fileId) }
        : dok));
      setHapusTarget(null); setAlasan('');
    } catch { setError('Terjadi kesalahan.'); }
    finally { setHapusLoading(false); }
  };

  const list = tab === 'akan' ? akan : tab === 'berlang' ? berlang : selesai;

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f5f5', fontFamily:'sans-serif', color:'#6b7280', fontSize:13 }}>
      Memuat kegiatan...
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:'sans-serif' }}>
      <nav style={navStyle}>
        <a href={backUrl} style={backLink}>← Dashboard</a>
        <div style={{ fontWeight:600, fontSize:14 }}>Kelola Kegiatan</div>
        <a href="/dashboard/pengajuan" style={btnOutline}>Pengajuan</a>
      </nav>

      <div style={{ maxWidth:920, margin:'0 auto', padding:'1.25rem' }}>
        {msg   && <div style={msgBox('#085041','#E1F5EE')}>{msg}</div>}
        {error && <div style={msgBox('#A32D2D','#FCEBEB')}>{error}</div>}

        {/* Ringkasan e-planning */}
        {ring && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10, marginBottom:16 }}>
            <div style={statCard}><div style={statNum}>{ring.totalKegiatanEplanning}</div><div style={statLbl}>Kegiatan E-Planning</div></div>
            <div style={statCard}><div style={statNum}>{ring.totalTerisi}/{ring.totalSlot}</div><div style={statLbl}>Slot Terisi</div></div>
            <div style={statCard}><div style={{ ...statNum, color:'#0C447C' }}>{ring.jmlAkanBerlangsung}</div><div style={statLbl}>Akan Berlangsung</div></div>
            <div style={statCard}><div style={{ ...statNum, color:'#065F46' }}>{ring.jmlBerlangsung}</div><div style={statLbl}>Berlangsung</div></div>
            <div style={statCard}><div style={{ ...statNum, color:'#6b7280' }}>{ring.jmlTelahSelesai}</div><div style={statLbl}>Telah Selesai</div></div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          {TABS.map(t => {
            const c = t.key==='akan'?akan.length:t.key==='berlang'?berlang.length:selesai.length;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding:'8px 16px', borderRadius:20, border:'1px solid', fontSize:12, cursor:'pointer', fontFamily:'sans-serif',
                fontWeight: tab===t.key?600:400,
                background: tab===t.key?'#0F6E56':'#fff', color: tab===t.key?'#fff':'#374151',
                borderColor: tab===t.key?'transparent':'#e5e7eb',
              }}>
                {t.icon} {t.label}
                <span style={{ marginLeft:6, fontSize:11, padding:'1px 6px', borderRadius:10, background:tab===t.key?'rgba(255,255,255,.25)':'#f3f4f6', color:tab===t.key?'#fff':'#6b7280' }}>{c}</span>
              </button>
            );
          })}
        </div>

        {list.length === 0 ? (
          <div style={{ ...card, textAlign:'center', padding:'2.5rem', color:'#9ca3af' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
            Tidak ada kegiatan pada kategori ini.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {list.map(dok => (
              <div key={dok.id} style={card}>
                <div style={{ display:'flex', gap:6, marginBottom:6, flexWrap:'wrap', alignItems:'center' }}>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:100, background:dok.jenis==='MOU'?'#E6F1FB':'#FAEEDA', color:dok.jenis==='MOU'?'#0C447C':'#854F0B' }}>{dok.jenis}</span>
                  {dok.divisi && <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:100, background:'#EDE9FE', color:'#5B21B6' }}>🏛 {dok.divisiLabel}</span>}
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'#f3f4f6', color:'#6b7280' }}>{dok.status}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:600 }}>{dok.judul || `Kerja Sama ${dok.jenis}`}</div>
                <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{dok.namaMitra}</div>
                <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>
                  📅 {fmt(dok.tglMulai)} – {fmt(dok.tglSelesai)}
                </div>

                {/* Foto (hanya tab berlangsung) */}
                {tab === 'berlang' && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#374151', marginBottom:6 }}>
                      📸 Foto Mitra ({dok.foto?.length || 0})
                    </div>
                    {(dok.foto?.length || 0) === 0 ? (
                      <div style={{ fontSize:11, color:'#9ca3af', fontStyle:'italic' }}>Belum ada foto diunggah mitra.</div>
                    ) : (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:8 }}>
                        {dok.foto!.map(f => (
                          <div key={f.fileId} style={{ position:'relative', borderRadius:8, overflow:'hidden', border:'1px solid #e5e7eb' }}>
                            <img src={f.thumbnailUrl} alt={f.nama}
                              style={{ width:'100%', height:80, objectFit:'cover', display:'block' }} />
                            <button onClick={() => { setHapusTarget({ dok, foto:f }); setAlasan(''); }}
                              style={{ position:'absolute', top:4, right:4, width:24, height:24, borderRadius:'50%', border:'none', background:'rgba(163,45,45,.92)', color:'#fff', cursor:'pointer', fontSize:12, lineHeight:1 }}
                              title="Hapus foto">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal konfirmasi hapus foto */}
      {hapusTarget && (
        <div style={overlay} onClick={() => !hapusLoading && setHapusTarget(null)}>
          <div style={{ ...modalBox, maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Hapus Foto Mitra?</div>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:12 }}>
              Foto <strong>{hapusTarget.foto.nama}</strong> akan dihapus dan mitra menerima notifikasi.
            </div>
            <img src={hapusTarget.foto.thumbnailUrl} alt="" style={{ width:'100%', height:160, objectFit:'cover', borderRadius:8, marginBottom:12 }} />
            <label style={{ fontSize:11, color:'#6b7280', display:'block', marginBottom:4 }}>Alasan (opsional, ikut di notifikasi mitra)</label>
            <textarea value={alasan} onChange={e => setAlasan(e.target.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, fontFamily:'sans-serif', height:60, resize:'none', boxSizing:'border-box', marginBottom:12 }}
              placeholder="Mis. foto buram / tidak relevan" />
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleHapusFoto} disabled={hapusLoading} style={{ ...btnPrimary, background:'#A32D2D', flex:1 }}>
                {hapusLoading ? 'Menghapus...' : 'Hapus & Beri Tahu Mitra'}
              </button>
              <button onClick={() => setHapusTarget(null)} style={btnSm}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 1.5rem', background:'#fff', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:100 };
const backLink: React.CSSProperties = { fontSize:12, color:'#6b7280', textDecoration:'none' };
const btnOutline: React.CSSProperties = { fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid #e5e7eb', textDecoration:'none', color:'#374151', background:'#fff' };
const card: React.CSSProperties = { background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'1px solid #e5e7eb' };
const statCard: React.CSSProperties = { background:'#fff', borderRadius:12, padding:'0.9rem 1rem', border:'1px solid #e5e7eb', textAlign:'center' };
const statNum: React.CSSProperties = { fontSize:22, fontWeight:700, color:'#0F6E56' };
const statLbl: React.CSSProperties = { fontSize:11, color:'#6b7280', marginTop:2 };
const btnPrimary: React.CSSProperties = { padding:'9px 16px', borderRadius:8, border:'none', background:'#0F6E56', color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'sans-serif' };
const btnSm: React.CSSProperties = { padding:'9px 14px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:12, cursor:'pointer', fontFamily:'sans-serif' };
const overlay: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'1rem' };
const modalBox: React.CSSProperties = { background:'#fff', borderRadius:12, padding:'1.5rem', width:'100%', maxWidth:440, maxHeight:'92vh', overflowY:'auto' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'8px 12px', borderRadius:8, marginBottom:10 });