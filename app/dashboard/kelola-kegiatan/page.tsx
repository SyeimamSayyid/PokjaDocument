'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiClock, FiRadio, FiCheckCircle, FiCamera, FiTrash2,
  FiCalendar, FiInbox, FiX, FiArrowRight,
  FiGrid, FiInbox as FiInboxNav, FiKey, FiFolder, FiActivity,
  FiUsers, FiList, FiArchive, FiShield,
} from 'react-icons/fi';

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

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const DIVISI_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pencegahan:    { label: 'Pencegahan',    color: BLUE_DARK, bg: '#DBEAFE' },
  pemberantasan: { label: 'Pemberantasan', color: '#A32D2D', bg: '#FEE2E2' },
  rehabilitasi:  { label: 'Rehabilitasi',  color: '#5B21B6', bg: '#EDE9FE' },
  pemberdayaan:  { label: 'Pemberdayaan',  color: '#92400E', bg: '#FEF3C7' },
};

function parseDivisi(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

const TABS = [
  { key:'akan',    label:'Akan Berlangsung', Icon: FiClock },
  { key:'berlang', label:'Berlangsung',      Icon: FiRadio },
  { key:'selesai', label:'Telah Selesai',    Icon: FiCheckCircle },
];

function fmt(t: string) {
  if (!t) return '-';
  try { return new Date(t).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }); }
  catch { return t; }
}

export default function KelolaKegiatanPage() {
  const [role, setRole]     = useState('');
  const [level, setLevel]   = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [ring, setRing]     = useState<Ringkasan | null>(null);
  const [akan, setAkan]     = useState<DokItem[]>([]);
  const [berlang, setBerlang] = useState<DokItem[]>([]);
  const [selesai, setSelesai] = useState<DokItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('akan');
  const [msg, setMsg]       = useState('');
  const [error, setError]   = useState('');
  const [mounted, setMounted] = useState(false);

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
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setRole(u.role);
        setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
        setNamaAdmin(u.nama || u.email || 'Admin');
        setMounted(true);
        load();
      })
      .catch(() => { window.location.href = '/login'; });
  }, [load]);

  const sidebarItems: SidebarItem[] = level === 'utama' ? [
    { href: '/dashboard/bnn-utama', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Dokumen & Tata Kelola' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Daftar Admin' },
  ] : [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInboxNav size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiList size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' },
  ];

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

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
      setBerlang(prev => prev.map(dok => dok.id === hapusTarget.dok.id
        ? { ...dok, foto: (dok.foto||[]).filter(f => f.fileId !== hapusTarget.foto.fileId) }
        : dok));
      setHapusTarget(null); setAlasan('');
    } catch { setError('Terjadi kesalahan.'); }
    finally { setHapusLoading(false); }
  };

  const list = tab === 'akan' ? akan : tab === 'berlang' ? berlang : selesai;

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F5F1E8', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat kegiatan...</div>
      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100dvh', fontFamily:FONT, background:'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <GlobalStyle />

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/kelola-kegiatan"
        brandLabel="SI-POKJA HUMKER"
        brandSub={level === 'utama' ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        userName={namaAdmin}
        userTag={level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={level === 'utama' ? '#ABD1C6' : BLUE}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth:980, margin:'0 auto', padding:'1.4rem 1.25rem 0' }}>
        <nav style={navPill} className="fld">
          <div style={{ fontWeight:800, fontSize:14, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
            <FiCalendar size={15} style={{ color: BLUE }} />
            Kelola Kegiatan
          </div>
          <a href="/dashboard/pengajuan" style={navOutlineBtn}>
            Pengajuan <FiArrowRight size={12} />
          </a>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth:980, margin:'0 auto', padding:'1.25rem 1.25rem 3rem' }}>

        <div style={{ marginBottom:20 }} className="fld">
          <div style={eyebrow}>Kegiatan E-Planning</div>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.035em', margin:'12px 0 6px', lineHeight:1.05 }}>
            Pantau Jadwal Kegiatan
          </h1>
          <p style={{ fontSize:13, color:'#64748b', margin:0 }}>Kegiatan yang akan, sedang, dan telah berlangsung, lengkap dengan dokumentasi foto dari mitra.</p>
        </div>

        {msg   && <div style={{ ...msgBox('#0a5c47','#e9f7f1'), marginBottom:14 }} className="fld">{msg}</div>}
        {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), marginBottom:14 }} className="fld">{error}</div>}

        {ring && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }} className="fld">
            <div style={statShell}><div style={statCore}>
              <div style={{ fontSize:26, fontWeight:800, color: BLUE, letterSpacing:'-0.03em' }}>{ring.totalKegiatanEplanning}</div>
              <div style={statLbl}>Kegiatan E-Planning</div>
            </div></div>
            <div style={statShell}><div style={statCore}>
              <div style={{ fontSize:26, fontWeight:800, color: GOLD, letterSpacing:'-0.03em' }}>{ring.totalTerisi}/{ring.totalSlot}</div>
              <div style={statLbl}>Slot Terisi</div>
            </div></div>
            <div style={statShell}><div style={statCore}>
              <div style={{ fontSize:26, fontWeight:800, color: BLUE_DARK, letterSpacing:'-0.03em' }}>{ring.jmlAkanBerlangsung}</div>
              <div style={statLbl}>Akan Berlangsung</div>
            </div></div>
            <div style={statShell}><div style={statCore}>
              <div style={{ fontSize:26, fontWeight:800, color:'#0a5c47', letterSpacing:'-0.03em' }}>{ring.jmlBerlangsung}</div>
              <div style={statLbl}>Berlangsung</div>
            </div></div>
            <div style={statShell}><div style={statCore}>
              <div style={{ fontSize:26, fontWeight:800, color:'#64748b', letterSpacing:'-0.03em' }}>{ring.jmlTelahSelesai}</div>
              <div style={statLbl}>Telah Selesai</div>
            </div></div>
          </div>
        )}

        <div style={{ display:'flex', gap:6, marginBottom:18, flexWrap:'wrap' }} className="fld">
          {TABS.map(t => {
            const c = t.key==='akan'?akan.length:t.key==='berlang'?berlang.length:selesai.length;
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className="btn-hover"
                style={{ ...pillBtn, ...(on ? pillBtnActive : {}), display:'inline-flex', alignItems:'center', gap:7 }}>
                <t.Icon size={13} /> {t.label}
                <span style={{ fontSize:10.5, padding:'1px 8px', borderRadius:100, fontWeight:700, background: on ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: on ? '#fff' : '#64748b' }}>{c}</span>
              </button>
            );
          })}
        </div>

        {list.length === 0 ? (
          <div style={shellStyle} className="fld">
            <div style={{ ...coreStyle, textAlign:'center', padding:'3rem' }}>
              <FiInbox size={32} style={{ color:'#cbd5e1', marginBottom:10 }} />
              <div style={{ fontSize:13.5, color:'#64748b' }}>Tidak ada kegiatan pada kategori ini.</div>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {list.map((dok, i) => (
              <div key={dok.id} style={{ ...shellStyle, animationDelay: mounted ? `${i * 0.02}s` : undefined }} className="fld">
                <div style={{ ...coreStyle, padding:'1.1rem 1.3rem' }}>
                  <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={pill(dok.jenis==='MOU'?BLUE_DARK:'#92400E', dok.jenis==='MOU'?'#DBEAFE':'#FEF3C7')}>{dok.jenis}</span>
                    {parseDivisi(dok.divisi).map(dv => {
                      const info = DIVISI_LABEL[dv] || { label: dv, color:'#64748b', bg:'#f1f5f9' };
                      return <span key={dv} style={pill(info.color, info.bg)}>{info.label}</span>;
                    })}
                    <span style={pill('#64748b', '#f1f5f9')}>{dok.status}</span>
                  </div>
                  <div style={{ fontSize:15, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.02em' }}>{dok.judul || `Kerja Sama ${dok.jenis}`}</div>
                  <div style={{ fontSize:12.5, color:'#64748b', marginTop:3 }}>{dok.namaMitra}</div>
                  <div style={{ fontSize:11.5, color:'#94a3b8', marginTop:6, display:'flex', alignItems:'center', gap:5 }}>
                    <FiCalendar size={11} /> {fmt(dok.tglMulai)} – {fmt(dok.tglSelesai)}
                  </div>

                  {tab === 'berlang' && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(29,78,216,0.06)' }}>
                      <div style={{ fontSize:11.5, fontWeight:700, color:'#334155', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                        <FiCamera size={12} style={{ color: BLUE }} /> Foto Mitra ({dok.foto?.length || 0})
                      </div>
                      {(dok.foto?.length || 0) === 0 ? (
                        <div style={{ fontSize:11.5, color:'#94a3b8', fontStyle:'italic' }}>Belum ada foto diunggah mitra.</div>
                      ) : (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:8 }}>
                          {dok.foto!.map(f => (
                            <div key={f.fileId} style={{ position:'relative', borderRadius:11, overflow:'hidden', border:'1px solid rgba(29,78,216,0.08)' }}>
                              <img src={f.thumbnailUrl} alt={f.nama}
                                style={{ width:'100%', height:80, objectFit:'cover', display:'block' }} />
                              <button onClick={() => { setHapusTarget({ dok, foto:f }); setAlasan(''); }}
                                className="btn-hover"
                                style={{ position:'absolute', top:5, right:5, width:24, height:24, borderRadius:8, border:'none', background:'rgba(163,45,45,0.92)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                                title="Hapus foto">
                                <FiTrash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hapusTarget && (
        <div style={modalOverlay} onClick={() => !hapusLoading && setHapusTarget(null)}>
          <div style={modalBox} className="fld" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div style={{ fontSize:15, fontWeight:800, color:'#0f1f3d' }}>Hapus Foto Mitra?</div>
              <button onClick={() => !hapusLoading && setHapusTarget(null)} style={closeBtn} className="btn-hover"><FiX size={16} /></button>
            </div>
            <div style={{ fontSize:12.5, color:'#64748b', marginBottom:12 }}>
              Foto <strong style={{ color:'#334155' }}>{hapusTarget.foto.nama}</strong> akan dihapus dan mitra menerima notifikasi.
            </div>
            <img src={hapusTarget.foto.thumbnailUrl} alt="" style={{ width:'100%', height:160, objectFit:'cover', borderRadius:12, marginBottom:14 }} />
            <label style={fieldLabel}>Alasan (opsional, ikut di notifikasi mitra)</label>
            <textarea value={alasan} onChange={e => setAlasan(e.target.value)}
              style={{ ...fieldInput, height:64, resize:'none' }}
              placeholder="Mis. foto buram / tidak relevan" />
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button onClick={() => setHapusTarget(null)} disabled={hapusLoading} style={{ ...pillBtn, flex:1, textAlign:'center' }} className="btn-hover">Batal</button>
              <button onClick={handleHapusFoto} disabled={hapusLoading} style={{ ...pillBtn, flex:1, textAlign:'center', background:'#A32D2D', color:'#fff', borderColor:'transparent', fontWeight:700 }} className="btn-hover">
                {hapusLoading ? 'Menghapus...' : 'Hapus & Beri Tahu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      @keyframes fadeUp { from{opacity:0;transform:translateY(12px);filter:blur(3px)} to{opacity:1;transform:none;filter:blur(0)} }
      .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
      .btn-hover:active { transform: scale(0.96); }
      textarea::placeholder { color:#aab4b0; }
      @media (min-width: 901px) {
        .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
      }
    `}</style>
  );
}

const navPill: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.72)', backdropFilter:'blur(12px)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:100, padding:'9px 10px 9px 18px', boxShadow:'0 10px 26px -18px rgba(15,23,42,0.25)' };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#64748b', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:6 };
const navOutlineBtn: React.CSSProperties = { fontSize:12, fontWeight:700, padding:'8px 15px', borderRadius:100, border:'1.5px solid rgba(29,78,216,0.15)', textDecoration:'none', color: BLUE_DARK, background:'#EFF6FF', display:'inline-flex', alignItems:'center', gap:6 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', borderRadius:20, padding:6, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const statShell: React.CSSProperties = { ...shellStyle, borderRadius:18, padding:5 };
const statCore: React.CSSProperties = { ...coreStyle, borderRadius:13, padding:'1rem 1.1rem', textAlign:'center' };
const statLbl: React.CSSProperties = { fontSize:11, color:'#64748b', marginTop:3, fontWeight:600 };
const eyebrow: React.CSSProperties = { display:'inline-block', fontSize:9.5, color: BLUE, textTransform:'uppercase', letterSpacing:'0.14em', fontWeight:700, background:'#DBEAFE', padding:'4px 11px', borderRadius:100 };
const pillBtn: React.CSSProperties = { padding:'8px 15px', borderRadius:100, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', cursor:'pointer', fontFamily:FONT, fontSize:12, fontWeight:600, background:'#fff', color:'#54635e' };
const pillBtnActive: React.CSSProperties = { background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', borderColor:'transparent', fontWeight:700, boxShadow:'0 8px 18px -8px rgba(29,78,216,0.5)' };
const pill = (color: string, bg: string): React.CSSProperties => ({ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:100, background:bg, color, letterSpacing:'0.02em' });
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12.5, color, background:bg, padding:'10px 14px', borderRadius:10 });
const modalOverlay: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 };
const modalBox: React.CSSProperties = { background:'#fff', borderRadius:20, padding:'1.5rem', width:'100%', maxWidth:440, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 30px 60px -20px rgba(15,23,42,0.35)' };
const closeBtn: React.CSSProperties = { width:28, height:28, borderRadius:8, border:'1px solid rgba(29,78,216,0.10)', background:'#fff', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const fieldLabel: React.CSSProperties = { display:'block', fontSize:11, fontWeight:700, color:'#334155', marginBottom:5 };
const fieldInput: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#F5F1E8', fontSize:12.5, fontFamily:FONT, outline:'none', color:'#0f1f3d', boxSizing:'border-box' };