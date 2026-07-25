'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiCalendar, FiInbox, FiKey, FiFolder, FiActivity, FiFileText,
  FiUsers, FiList as FiListSidebar, FiArchive, FiShield, FiMessageCircle, FiMessageSquare, FiDroplet,
} from 'react-icons/fi';
import {
  ArrowLeft, FileText, Search, Building, Tag, CheckCircle, AlertCircle,
  Check, X, Save, Calendar, MapPin, List, Info,
  RefreshCw, ExternalLink, Loader2, Zap, Shuffle,
  Sparkles, Edit3, Bell,
} from 'lucide-react';

interface DokSelesai {
  id: string; jenis: string; judul: string; namaMitra: string;
  status: string; docsId: string; tglBerlaku: string; tglBerakhir: string;
  fotoFolderId: string;
  tglKegiatanMulai?: string; tglKegiatanSelesai?: string;
  publikasi?: { statusPublikasi: string; tanggalKegiatan: string; tempatKegiatan: string; narasiKustom?: string } | null;
}

interface PasalData { nomor: number; judul: string; poin: string[]; }

const STATUS_TETAP = 'aktif';

const TOPIK_MAP: { kata: string[]; frase: string }[] = [
  { kata: ['sosialisasi','penyuluhan','edukasi','komunikasi','kie'], frase: 'sosialisasi dan edukasi pencegahan narkotika' },
  { kata: ['pelatihan','training','workshop','bimtek'], frase: 'pelatihan peningkatan kapasitas' },
  { kata: ['pengujian','tes urine','deteksi','uji narkoba'], frase: 'pengujian dan deteksi narkotika' },
  { kata: ['penggiat','relawan','kader','satgas','p4gn'], frase: 'pembentukan dan pembinaan penggiat P4GN' },
  { kata: ['kampanye','promosi','gerakan'], frase: 'kampanye anti narkoba' },
  { kata: ['kuliah','seminar','diskusi','forum','talkshow'], frase: 'seminar dan diskusi publik' },
  { kata: ['rehabilitasi','pemulihan','konseling'], frase: 'program rehabilitasi' },
];

const GAYA_NARASI = [
  (p: { jenis:string; namaMitra:string; waktuTempat:string; topikStr:string; rangkum:string }) =>
    `BNN Provinsi Sulawesi Selatan menjalin kerja sama ${p.jenis} dengan ${p.namaMitra}${p.waktuTempat ? ` ${p.waktuTempat}` : ''}, berfokus pada ${p.topikStr}.${p.rangkum ? `\n\nRangkaian kegiatan mencakup: ${p.rangkum}.` : ''}`,
  (p: { jenis:string; namaMitra:string; waktuTempat:string; topikStr:string; rangkum:string }) =>
    `Sebagai wujud komitmen bersama memberantas penyalahgunaan narkotika, BNN Provinsi Sulawesi Selatan dan ${p.namaMitra} merajut kerja sama ${p.jenis}${p.waktuTempat ? ` ${p.waktuTempat}` : ''}. Kolaborasi ini menghadirkan ${p.topikStr} yang menyasar langsung lingkungan ${p.namaMitra}.${p.rangkum ? `\n\nBeberapa hal yang disepakati: ${p.rangkum}.` : ''}`,
  (p: { jenis:string; namaMitra:string; waktuTempat:string; topikStr:string; rangkum:string }) =>
    `${p.namaMitra} resmi bergandengan tangan dengan BNN Provinsi Sulawesi Selatan lewat ${p.jenis}${p.waktuTempat ? ` ${p.waktuTempat}` : ''}. Fokus utamanya: ${p.topikStr}.${p.rangkum ? ` Poin kesepakatan meliputi ${p.rangkum}.` : ''}`,
];

function generateNarasi(params: { jenis:string; namaMitra:string; tanggalKegiatan:string; tempatKegiatan:string; poinDipilih:string[]; gaya:number }): string {
  const { jenis, namaMitra, tanggalKegiatan, tempatKegiatan, poinDipilih, gaya } = params;
  const teks = poinDipilih.join(' ').toLowerCase();
  const topikFrasa = TOPIK_MAP.filter(t => t.kata.some(k => teks.includes(k))).map(t => t.frase);
  const topikStr = topikFrasa.length > 0 ? topikFrasa.slice(0,2).join(' dan ') : 'kegiatan pencegahan penyalahgunaan narkotika';
  const rangkum = poinDipilih.slice(0,3).map(p => p.split('.')[0].trim().substring(0,70)).join('; ');

  let waktuTempat = '';
  if (tanggalKegiatan) {
    try { waktuTempat += `pada ${new Date(tanggalKegiatan).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}`; }
    catch { waktuTempat += `pada ${tanggalKegiatan}`; }
  }
  if (tempatKegiatan) waktuTempat += `${waktuTempat ? ' di ' : 'di '}${tempatKegiatan}`;

  const fn = GAYA_NARASI[gaya % GAYA_NARASI.length];
  return fn({ jenis, namaMitra, waktuTempat, topikStr, rangkum });
}

const BLUE = '#1D4ED8';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

export default function ExtractPoinPage() {
  const [role, setRole]           = useState('');
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [level, setLevel] = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [dokList, setDokList]     = useState<DokSelesai[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [msg, setMsg]             = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [activeDok, setActiveDok]       = useState<DokSelesai | null>(null);
  const [pasalData, setPasalData]       = useState<PasalData[]>([]);
  const [loadingPasal, setLoadingPasal] = useState(false);
  const [poinDipilih, setPoinDipilih]   = useState<string[]>([]);
  const [pasalAktif, setPasalAktif] = useState<number | null>(null);
  const [tanggalKegiatan, setTanggalKegiatan] = useState('');
  const [tempatKegiatan, setTempatKegiatan]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [cariPoin, setCariPoin] = useState('');

  const [gayaNarasi, setGayaNarasi] = useState(0);
  const [narasiEdit, setNarasiEdit] = useState('');
  const [narasiDisunting, setNarasiDisunting] = useState(false);

  const narasiOtomatis = activeDok ? generateNarasi({
    jenis: activeDok.jenis, namaMitra: activeDok.namaMitra,
    tanggalKegiatan, tempatKegiatan, poinDipilih, gaya: gayaNarasi,
  }) : '';

  useEffect(() => {
    if (!narasiDisunting) setNarasiEdit(narasiOtomatis);
  }, [narasiOtomatis, narasiDisunting]);

  const loadDokList = useCallback(() => {
    setLoading(true);
    fetch('/api/extract-poin')
      .then(r => r.json())
      .then(d => { setDokList(d.dokumen || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat data.'); setLoading(false); });
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setRole(u.role);
        setNamaAdmin(u.nama || u.email || 'Admin');
        setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
        loadDokList();

        const params = new URLSearchParams(window.location.search);
        const idDariUrl  = params.get('idDokumen');
        const tglDariUrl = params.get('tglMulai');
        if (idDariUrl) pilihDokumenById(idDariUrl, tglDariUrl || undefined);
      })
      .catch(() => { window.location.href = '/login'; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDokList]);

  useEffect(() => {
    setSelectedCount(poinDipilih.length);
  }, [poinDipilih]);

  const pilihDokumen = async (dok: DokSelesai, tglDefault?: string) => {
    setActiveDok(dok); setPasalData([]); setPoinDipilih([]);
    setMsg(''); setError(''); setLoadingPasal(true);
    setTanggalKegiatan(tglDefault || dok.tglKegiatanMulai || ''); setTempatKegiatan(''); setCariPoin('');
    setGayaNarasi(0); setNarasiDisunting(false); setNarasiEdit('');
    setPasalAktif(null);

    try {
      const res = await fetch(`/api/extract-poin?idDokumen=${dok.id}&getPoin=true`);
      const d   = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }

      setPasalData(d.pasalData || []);
      if ((d.pasalData || []).length > 0) setPasalAktif(d.pasalData[0].nomor);

      if (d.savedData) {
        setTanggalKegiatan(d.savedData.tanggalKegiatan || tglDefault || dok.tglKegiatanMulai || '');
        setTempatKegiatan(d.savedData.tempatKegiatan || '');
        setPoinDipilih(d.savedData.poinDipilih || []);
        if (d.savedData.narasiKustom) {
          setNarasiEdit(d.savedData.narasiKustom);
          setNarasiDisunting(true);
        }
      }
    } catch { setError('Gagal memuat pasal.'); }
    finally { setLoadingPasal(false); }
  };

  const pilihDokumenById = async (idDokumen: string, tglDefault?: string) => {
    setMsg(''); setError(''); setLoadingPasal(true);
    try {
      const res = await fetch(`/api/extract-poin?idDokumen=${idDokumen}&getPoin=true`);
      const d   = await res.json();
      if (!res.ok) { setError(d.message || 'Dokumen tidak ditemukan.'); setLoadingPasal(false); return; }
      await pilihDokumen(d.dok, tglDefault);
    } catch { setError('Gagal memuat dokumen dari link.'); setLoadingPasal(false); }
  };

  const togglePoinPasal = (poinList: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    const allSelected = poinList.every(p => poinDipilih.includes(p));
    if (allSelected) {
      setPoinDipilih(prev => prev.filter(p => !poinList.includes(p)));
    } else {
      setPoinDipilih(prev => [...new Set([...prev, ...poinList])]);
    }
  };

  const togglePoin = (poin: string) => {
    setPoinDipilih(prev => prev.includes(poin) ? prev.filter(p => p !== poin) : [...prev, poin]);
  };

  const pasalTersaring = useMemo(() => {
    if (!cariPoin.trim()) return pasalData;
    const kw = cariPoin.toLowerCase();
    return pasalData
      .map(p => ({ ...p, poin: p.poin.filter(x => x.toLowerCase().includes(kw) || p.judul.toLowerCase().includes(kw)) }))
      .filter(p => p.poin.length > 0 || p.judul.toLowerCase().includes(kw));
  }, [pasalData, cariPoin]);

  // Dokumen "Selesai" yang tanggal kegiatannya sudah ditentukan TAPI belum
  // pernah dipublikasikan sama sekali — kandidat kuat yang admin mungkin lupa.
  const siapDipublikasi = useMemo(() =>
    dokList.filter(d => d.status === 'Selesai' && !!d.tglKegiatanMulai && !d.publikasi?.statusPublikasi),
  [dokList]);

  const acakGaya = () => {
    let next = gayaNarasi;
    while (next === gayaNarasi) next = Math.floor(Math.random() * GAYA_NARASI.length);
    setGayaNarasi(next);
    setNarasiDisunting(false);
  };

  const simpan = async () => {
    if (!activeDok || poinDipilih.length === 0) { setError('Pilih minimal 1 poin.'); return; }
    setSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/extract-poin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idDokumen: activeDok.id, jenis: activeDok.jenis,
          judul: activeDok.judul, namaMitra: activeDok.namaMitra,
          statusPublikasi: STATUS_TETAP, tanggalKegiatan, tempatKegiatan,
          poinDipilih, dibuatOleh: namaAdmin,
          narasiKustom: narasiEdit,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }
      setMsg(d.message); loadDokList();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const backUrl  = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/dokumen-basah', icon: <FiDroplet size={17} />, label: 'Dokumen Basah' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiListSidebar size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/laporan', icon: <FiFileText size={17} />, label: 'Laporan' },
    { href: '/dashboard/kelola-chatbot', icon: <FiMessageCircle size={17} />, label: 'Kelola Chatbot' },
    { href: '/dashboard/kotak-saran', icon: <FiMessageSquare size={17} />, label: 'Kotak Saran' },
    ...(level === 'bnnp_bnnk' ? [{ href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' }] : []),
  ];

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  const filtered = dokList.filter(d =>
    d.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.namaMitra.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPoin = pasalData.reduce((acc, p) => acc + p.poin.length, 0);
  const pasalAktifData = pasalData.find(p => p.nomor === pasalAktif) || null;

  if (!role) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily:'sans-serif', color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily:'sans-serif' }}>
      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/dokumen/extract-poin"
        brandLabel="E-POKJA HUKER"
        brandSub={level === 'utama' ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        userName={namaAdmin}
        userTag={level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={BLUE}
        onLogout={logout}
      />

      <nav className="main-content-wrap" style={navStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
            <FileText size={18} style={{ color: BLUE }} />
            Extract Poin Publik
          </div>
        </div>
        <a href="/beranda" target="_blank" rel="noopener noreferrer" style={btnOutline}>
          <ExternalLink size={14} style={{ marginRight:4 }} />
          Lihat Beranda
        </a>
      </nav>

      <div className="main-content-wrap" style={{ maxWidth:1200, margin:'0 auto', padding:'1.25rem' }}>
        {siapDipublikasi.length > 0 && (
          <div style={{
            display:'flex', alignItems:'flex-start', gap:10, background:'linear-gradient(135deg,#FFFBEB,#FEF3C7)',
            border:'1.5px solid #FDE68A', borderRadius:14, padding:'14px 16px', marginBottom:16,
            animation:'fadeInDown 0.4s ease-out',
          }}>
            <Bell size={18} style={{ color: GOLD, flexShrink:0, marginTop:1 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#92400E', marginBottom:4 }}>
                {siapDipublikasi.length} dokumen siap dipublikasikan
              </div>
              <div style={{ fontSize:11.5, color:'#78350F', lineHeight:1.6, marginBottom: siapDipublikasi.length > 0 ? 8 : 0 }}>
                Status &quot;Selesai&quot; dan tanggal kegiatannya sudah ditentukan, tapi belum pernah diekstrak poinnya untuk beranda publik.
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {siapDipublikasi.slice(0, 6).map(d => (
                  <button key={d.id} onClick={() => pilihDokumen(d)} style={{
                    fontSize:11, fontWeight:600, padding:'5px 12px', borderRadius:100, cursor:'pointer',
                    border:'1px solid #FDE68A', background:'#fff', color:'#92400E', fontFamily:'sans-serif',
                    display:'flex', alignItems:'center', gap:5,
                  }}>
                    <FileText size={11} /> {d.judul.length > 34 ? d.judul.slice(0,34)+'…' : d.judul}
                  </button>
                ))}
                {siapDipublikasi.length > 6 && (
                  <span style={{ fontSize:11, color:'#92400E', alignSelf:'center' }}>+{siapDipublikasi.length - 6} lainnya</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="main-content-wrap" style={{ maxWidth:1200, margin:'0 auto', padding:'0 1.25rem 1.25rem', display:'grid', gridTemplateColumns:'320px 1fr', gap:20 }}>

        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, display:'flex', alignItems:'center', gap:6 }}>
              <FileText size={14} />
              Dokumen Selesai ({dokList.length})
            </div>
            <button onClick={loadDokList} style={{ ...btnSm, fontSize:10, display:'flex', alignItems:'center', gap:4, padding:'4px 10px' }}>
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>

          <div style={{ position:'relative', marginBottom:10 }}>
            <Search size={16} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color: isSearchFocused ? BLUE : '#94a3b8', transition:'color 0.3s ease' }} />
            <input
              placeholder="Cari dokumen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{ ...inputFull, paddingLeft:34, borderColor: isSearchFocused ? BLUE : '#e2e8f0', boxShadow: isSearchFocused ? `0 0 0 3px ${BLUE}1a` : 'none', transition:'all 0.3s ease' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:4, borderRadius:'50%' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ ...card, textAlign:'center', padding:'2rem', color:'#94a3b8', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: BLUE }} />
              <span style={{ fontSize:12 }}>Memuat dokumen...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ ...card, textAlign:'center', padding:'2rem', color:'#94a3b8', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <FileText size={32} style={{ color:'#cbd5e1' }} />
              <div style={{ fontSize:13 }}>
                {searchTerm ? 'Tidak ada yang cocok.' : 'Belum ada dokumen berstatus "Selesai".'}
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:'calc(100vh - 240px)', overflowY:'auto', paddingRight:4 }}>
              {filtered.map((d, index) => {
                const isActive   = activeDok?.id === d.id;
                const sudahPublik = !!(d.publikasi?.statusPublikasi);
                const siapPublik  = d.status === 'Selesai' && !!d.tglKegiatanMulai && !sudahPublik;
                return (
                  <div
                    key={d.id}
                    onClick={() => pilihDokumen(d)}
                    style={{
                      ...card, cursor:'pointer', padding:'12px 14px',
                      border: isActive ? `2px solid ${BLUE}` : (siapPublik ? '1.5px solid #FDE68A' : '1px solid #e2e8f0'),
                      background: isActive ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' : '#fff',
                      boxShadow: isActive ? `0 2px 12px ${BLUE}20` : 'none',
                      transition:'all 0.3s ease',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                      animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 10px', borderRadius:100, background:d.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:d.jenis==='MOU'?'#1D4ED8':'#92400E', display:'flex', alignItems:'center', gap:4 }}>
                        <Tag size={10} />
                        {d.jenis}
                      </span>
                      {sudahPublik && (
                        <span style={{ fontSize:10, padding:'2px 10px', borderRadius:100, background:'#FEF3C7', color:GOLD, display:'flex', alignItems:'center', gap:4 }}>
                          <Zap size={10} />
                          Aktif
                        </span>
                      )}
                      {siapPublik && (
                        <span style={{ fontSize:10, padding:'2px 10px', borderRadius:100, background:'#FEF3C7', color:'#92400E', display:'flex', alignItems:'center', gap:4 }}>
                          <Bell size={10} />
                          Siap Publikasi
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, lineHeight:1.4, marginBottom:3, color:'#0f1f3d' }}>{d.judul}</div>
                    <div style={{ fontSize:11, color:'#64748b', display:'flex', alignItems:'center', gap:4 }}>
                      <Building size={12} />
                      {d.namaMitra}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          {msg && (
            <div style={{ ...msgBox(BLUE_DARK,'#DBEAFE'), display:'flex', alignItems:'center', gap:8, animation: 'fadeInDown 0.4s ease-out' }}>
              <CheckCircle size={16} />
              {msg}
            </div>
          )}
          {error && (
            <div style={{ ...msgBox('#991B1B','#FEE2E2'), display:'flex', alignItems:'center', gap:8, animation: 'shake 0.4s ease-out' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!activeDok ? (
            <div style={{ ...card, textAlign:'center', padding:'3rem', color:'#94a3b8', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'#eef2f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <FileText size={32} style={{ color:'#cbd5e1' }} />
              </div>
              <div style={{ fontSize:14 }}>Pilih dokumen di kiri untuk extract poin</div>
            </div>
          ) : loadingPasal ? (
            <div style={{ ...card, textAlign:'center', padding:'3rem', color:'#94a3b8', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: BLUE }} />
              <div style={{ fontSize:13 }}>Mengambil pasal dari Google Docs...</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              <div style={{ ...card, animation: 'fadeInUp 0.4s ease-out', background: 'linear-gradient(135deg, #f8fafc 0%, #eef4fc 100%)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#0f1f3d' }}>{activeDok.judul}</div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                      <Building size={14} />
                      {activeDok.namaMitra}
                    </div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:600, padding:'4px 12px', borderRadius:100, background:activeDok.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:activeDok.jenis==='MOU'?'#1D4ED8':'#92400E', display:'flex', alignItems:'center', gap:4 }}>
                    <Tag size={12} />
                    {activeDok.jenis}
                  </span>
                </div>
              </div>

              <div style={{ ...card, animation: 'fadeInUp 0.4s ease-out 0.05s both' }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, color:'#334155' }}>
                  <Zap size={14} style={{ color: GOLD }} />
                  Status Publikasi
                </div>
                <div style={statusAktifBadge}>
                  <Zap size={16} style={{ color: GOLD }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color: GOLD }}>Aktif</div>
                    <div style={{ fontSize:10.5, color:'#92400E' }}>Kerja sama ditampilkan sebagai kegiatan aktif di beranda publik</div>
                  </div>
                  <Check size={16} style={{ color: GOLD, marginLeft:'auto' }} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
                  <div>
                    <label style={labelSt}>
                      <Calendar size={13} style={{ marginRight:4 }} />
                      Tanggal Kegiatan
                    </label>
                    <input type="date" style={inputFull} value={tanggalKegiatan} onChange={e => setTanggalKegiatan(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelSt}>
                      <MapPin size={13} style={{ marginRight:4 }} />
                      Tempat Kegiatan
                    </label>
                    <input style={inputFull} value={tempatKegiatan} onChange={e => setTempatKegiatan(e.target.value)} placeholder="Contoh: Kampus UNM, Makassar" />
                  </div>
                </div>
              </div>

              <div style={{ ...card, animation: 'fadeInUp 0.4s ease-out 0.1s both' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:6 }}>
                  <div style={{ fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
                    <List size={16} />
                    Pilih Poin
                    <span style={{ fontSize:11, fontWeight:500, color: '#64748b', background:'#eef2f6', padding:'2px 10px', borderRadius:100 }}>
                      {selectedCount} / {totalPoin} dipilih
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    <button onClick={() => setPoinDipilih(pasalData.flatMap(p => p.poin))} style={{ ...btnSm, fontSize:10, color:BLUE_DARK, borderColor:'#93C5FD', background:'#DBEAFE', display:'flex', alignItems:'center', gap:4 }}>
                      <Check size={12} />
                      Pilih Semua
                    </button>
                    <button onClick={() => setPoinDipilih([])} style={{ ...btnSm, fontSize:10, color:'#991B1B', borderColor:'#FCA5A5', display:'flex', alignItems:'center', gap:4 }}>
                      <X size={12} />
                      Reset
                    </button>
                  </div>
                </div>

                <div style={{ position:'relative', marginBottom:12 }}>
                  <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
                  <input
                    placeholder="Cari kata kunci dalam poin (mis. sosialisasi, jangka waktu, biaya)..."
                    value={cariPoin}
                    onChange={e => setCariPoin(e.target.value)}
                    style={{ ...inputFull, paddingLeft:32, fontSize:11.5 }}
                  />
                  {cariPoin && (
                    <button onClick={() => setCariPoin('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:4, borderRadius:'50%' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                {!cariPoin && (
                  <div style={{ fontSize:11, color:'#64748b', background:'#F5F1E8', padding:'8px 12px', borderRadius:8, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                    <Info size={14} />
                    Klik salah satu nomor pasal untuk melihat isi poinnya. Pasal lain akan memudar sampai kamu pilih lagi.
                  </div>
                )}

                {pasalData.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'2rem', color:'#94a3b8', fontSize:13 }}>
                    Tidak ada pasal yang berhasil diekstrak.
                  </div>
                ) : cariPoin ? (
                  pasalTersaring.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'2rem', color:'#94a3b8', fontSize:13 }}>
                      Tidak ada poin yang cocok dengan &quot;{cariPoin}&quot;.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:520, overflowY:'auto', paddingRight:4, minWidth:0 }}>
                      {pasalTersaring.map(pasal => (
                        <div key={pasal.nomor} style={{ minWidth:0 }}>
                          <div style={{ fontSize:11, fontWeight:700, color: BLUE_DARK, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ width:20, height:20, borderRadius:'50%', background:'#DBEAFE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0 }}>{pasal.nomor}</span>
                            {pasal.judul}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:5, minWidth:0 }}>
                            {pasal.poin.map((p, pi) => {
                              const isChecked = poinDipilih.includes(p);
                              return (
                                <label key={pi} style={{ display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer', padding:'9px 12px', borderRadius:9, background: isChecked ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' : '#f8fafc', border: `1px solid ${isChecked ? '#93C5FD' : '#f1f5f9'}`, minWidth:0 }}>
                                  <input type="checkbox" checked={isChecked} onChange={() => togglePoin(p)} style={{ marginTop:2, accentColor: BLUE, flexShrink:0, width:16, height:16, cursor:'pointer' }} />
                                  <span style={{ fontSize:12.5, lineHeight:1.75, color: isChecked ? BLUE_DARK : '#334155', flex:1, minWidth:0, overflowWrap:'break-word', wordBreak:'break-word', maxWidth:'70ch' }}>{p}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:8, marginBottom:14 }}>
                      {pasalData.map(pasal => {
                        const isActive = pasalAktif === pasal.nomor;
                        const selCount = pasal.poin.filter(p => poinDipilih.includes(p)).length;
                        return (
                          <button
                            key={pasal.nomor}
                            onClick={() => setPasalAktif(pasal.nomor)}
                            className="tab-pasal"
                            style={{
                              flexShrink:0, display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:12,
                              cursor:'pointer', fontFamily:'sans-serif', border:`1.5px solid ${isActive ? BLUE : '#e2e8f0'}`,
                              background: isActive ? `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})` : '#fff',
                              color: isActive ? '#fff' : '#64748b',
                              transition:'all 0.35s ease',
                              filter: isActive ? 'none' : 'blur(0.4px)',
                              opacity: isActive ? 1 : 0.55,
                              transform: isActive ? 'scale(1.03)' : 'scale(1)',
                              boxShadow: isActive ? `0 6px 16px -6px ${BLUE}70` : 'none',
                            }}
                          >
                            <span style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background: isActive ? 'rgba(255,255,255,0.22)' : '#eef2f6', color: isActive ? '#fff' : '#94a3b8', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {pasal.nomor}
                            </span>
                            <span style={{ fontSize:12.5, fontWeight:600, whiteSpace:'nowrap' }}>{pasal.judul}</span>
                            <span style={{ fontSize:10, opacity:0.8 }}>{pasal.poin.length} poin</span>
                            {selCount > 0 && (
                              <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 8px', borderRadius:100, background: isActive ? 'rgba(255,255,255,0.25)' : '#DBEAFE', color: isActive ? '#fff' : BLUE_DARK }}>
                                {selCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {pasalAktifData && (
                      <div key={pasalAktifData.nomor} className="fld-in">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                          <div style={{ fontSize:13, fontWeight:700, color: BLUE_DARK, display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ width:26, height:26, borderRadius:'50%', background:`linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`, color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{pasalAktifData.nomor}</span>
                            {pasalAktifData.judul}
                          </div>
                          {pasalAktifData.poin.length > 0 && (
                            <button onClick={e => togglePoinPasal(pasalAktifData.poin, e)} style={{ fontSize:10.5, padding:'4px 12px', borderRadius:7, cursor:'pointer', fontFamily:'sans-serif', border: pasalAktifData.poin.every(p => poinDipilih.includes(p)) ? '1px solid #FCA5A5' : '1px solid #93C5FD', background: pasalAktifData.poin.every(p => poinDipilih.includes(p)) ? '#FEE2E2' : '#DBEAFE', color: pasalAktifData.poin.every(p => poinDipilih.includes(p)) ? '#991B1B' : BLUE_DARK, display:'flex', alignItems:'center', gap:4 }}>
                              {pasalAktifData.poin.every(p => poinDipilih.includes(p)) ? <X size={11} /> : <Check size={11} />}
                              {pasalAktifData.poin.every(p => poinDipilih.includes(p)) ? 'Batal Semua' : 'Pilih Semua di Pasal Ini'}
                            </button>
                          )}
                        </div>

                        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:440, overflowY:'auto', paddingRight:4, minWidth:0 }}>
                          {pasalAktifData.poin.length > 0 ? (
                            pasalAktifData.poin.map((p, pi) => {
                              const isChecked = poinDipilih.includes(p);
                              return (
                                <label key={pi} style={{ display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer', padding:'10px 13px', borderRadius:10, background: isChecked ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' : '#f8fafc', border: `1px solid ${isChecked ? '#93C5FD' : '#f1f5f9'}`, transition:'all 0.2s ease', minWidth:0 }}>
                                  <input type="checkbox" checked={isChecked} onChange={() => togglePoin(p)} style={{ marginTop:2, accentColor: BLUE, flexShrink:0, width:16, height:16, cursor:'pointer' }} />
                                  <span style={{ fontSize:12.5, lineHeight:1.75, color: isChecked ? BLUE_DARK : '#334155', fontWeight: isChecked ? 500 : 400, flex:1, minWidth:0, overflowWrap:'break-word', wordBreak:'break-word', maxWidth:'70ch' }}>
                                    {p}
                                  </span>
                                </label>
                              );
                            })
                          ) : (
                            <div style={{ fontSize:11, color:'#94a3b8', fontStyle:'italic', padding:'6px' }}>
                              Tidak ada sub-poin di pasal ini
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {poinDipilih.length > 0 && (
                <div style={{ ...card, border:'2px solid #FDE68A', animation: 'fadeInUp 0.4s ease-out 0.15s both' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:6 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#92400E', display:'flex', alignItems:'center', gap:8 }}>
                      <Sparkles size={16} style={{ color: GOLD }} />
                      Narasi untuk Beranda Publik
                    </div>
                    <button onClick={acakGaya} style={{ ...btnSm, fontSize:10, display:'flex', alignItems:'center', gap:4, color:'#92400E', borderColor:'#FDE68A', background:'#FFFBEB' }}>
                      <Shuffle size={12} />
                      Coba Gaya Lain
                    </button>
                  </div>

                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <Edit3 size={12} />
                    Bisa diedit bebas — teks inilah yang beneran tampil di beranda, bukan cuma pratinjau.
                  </div>

                  <textarea
                    value={narasiEdit}
                    onChange={e => { setNarasiEdit(e.target.value); setNarasiDisunting(true); }}
                    style={{ width:'100%', minHeight:130, fontSize:13, color:'#334155', lineHeight:1.8, background:'#fff', padding:'14px 16px', borderRadius:10, border:'1.5px solid #FDE68A', fontFamily:'sans-serif', resize:'vertical', boxSizing:'border-box' }}
                  />

                  {narasiDisunting && (
                    <button onClick={() => { setNarasiEdit(narasiOtomatis); setNarasiDisunting(false); }} style={{ ...btnSm, fontSize:10, marginTop:8, display:'flex', alignItems:'center', gap:4 }}>
                      <RefreshCw size={11} />
                      Kembalikan ke draf otomatis
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={simpan}
                disabled={saving || poinDipilih.length === 0}
                style={{ ...btnPrimary, height:48, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: saving || poinDipilih.length === 0 ? 0.6 : 1, cursor: saving || poinDipilih.length === 0 ? 'not-allowed' : 'pointer', transition:'all 0.3s ease', animation: 'fadeInUp 0.4s ease-out 0.2s both' }}
              >
                {saving ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Simpan & Publikasikan ({poinDipilih.length} poin)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .fld-in { animation: fadeInUp 0.35s ease-out; }
        .tab-pasal:hover { opacity: 1 !important; filter: none !important; transform: scale(1.02); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>
    </div>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 1.5rem', background:'#fff', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:100, flexWrap:'wrap', gap:8, boxShadow:'0 1px 3px rgba(15,23,42,.04)' };
const backLink: React.CSSProperties = { fontSize:12, color:'#64748b', textDecoration:'none', display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:6 };
const card: React.CSSProperties = { background:'#fff', borderRadius:14, padding:'1.25rem', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(15,23,42,.04)', transition:'all .3s ease' };
const labelSt: React.CSSProperties = { display:'flex', alignItems:'center', fontSize:11, fontWeight:600, color:'#334155', marginBottom:5 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:9, border:'2px solid #e2e8f0', fontSize:12, fontFamily:'sans-serif', boxSizing:'border-box', background:'#F5F1E8', transition:'all .3s ease' };
const btnPrimary: React.CSSProperties = { width:'100%', padding:'10px 16px', borderRadius:11, border:'none', background:`linear-gradient(135deg, #2563EB 0%, ${BLUE_DARK} 100%)`, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'sans-serif', boxShadow:`0 2px 8px ${BLUE}30` };
const btnSm: React.CSSProperties = { padding:'5px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#334155', fontSize:11, cursor:'pointer', fontFamily:'sans-serif' };
const btnOutline: React.CSSProperties = { fontSize:12, padding:'6px 14px', borderRadius:9, border:'1px solid #e2e8f0', textDecoration:'none', color:'#334155', background:'#fff', display:'flex', alignItems:'center', gap:4 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:10, marginBottom:12 });
const statusAktifBadge: React.CSSProperties = { display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:12, border:`1.5px solid ${GOLD}40`, background:'#FFFBEB' };