'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LoaderPage from '@/components/LoaderPage';
import EditPencilIndicator from '@/components/EditPencilIndicator';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiFolder, FiEdit, FiTrash2, FiSearch,
  FiEye, FiExternalLink, FiCheckCircle, FiClock, FiAlertCircle,
  FiCalendar, FiGrid, FiPlus,
  FiX, FiSave, FiArrowLeft, FiImage, FiDatabase,
  FiFileText, FiActivity, FiChevronDown, FiChevronRight, FiMessageCircle,
  FiUser, FiBookOpen, FiInfo, FiArchive, FiHome,
  FiInbox, FiKey, FiUsers, FiList, FiShield, FiMessageSquare, FiDroplet,
} from 'react-icons/fi';
import { FaFileSignature, FaFileAlt, FaBuilding, FaFolderOpen } from 'react-icons/fa';
import { SiGoogledocs } from 'react-icons/si';
import { STATUS_DOKUMEN } from '@/lib/constants';

interface DokumenItem {
  id: string; jenis: string; judul: string; namaMitra: string;
  tglDibuat: string; tglBerlaku: string; tglBerakhir: string;
  durasi: string; status: string; kode: string; kodeExpire: string;
  docsId: string; docsUrl: string; folderId: string; dibuatOleh: string;
  catatan?: string; divisi?: string[]; manualLog?: string; flagRevisi?: boolean;
  terakhirDiakses?: string; // format "role|nama|waktu|level"
}
interface KontakInfo { namaPIC: string; jurusan: string; }
interface NotifInfo { count: number; hasUnread: boolean; }
interface ArsipLamaItem {
  id: string; namaInstitusi: string; jenis: string; judul: string;
  tglBerlaku: string; tglBerakhir: string; fileId: string; fileUrl: string; namaFile: string;
  namaPIC: string; emailPIC: string; waPIC: string; catatan: string;
  diarsipkanOleh: string; tglDiarsipkan: string; statusKerjaSama: string;
}

const STATUS_LIST = STATUS_DOKUMEN;
const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  'Draft':                     { bg: '#f1f3f2', color: '#5b6b66' },
  'Dalam Proses':              { bg: '#EDE9FE', color: '#5B21B6' },
  'Selesai':                   { bg: '#FEF3C7', color: '#92400E' },
  'Kegiatan Akan Berlangsung': { bg: '#FEF3C7', color: '#92400E' },
  'Kegiatan Berlangsung':      { bg: '#FEF3C7', color: '#B45309' },
  'Kegiatan Selesai':          { bg: '#DBEAFE', color: '#1E40AF' },
  'MOU/PKS Berlaku':           { bg: '#DBEAFE', color: BLUE },
  'Kedaluwarsa':               { bg: '#FCEBEB', color: '#A32D2D' },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  'Draft': <FiFileText size={10} />,
  'Dalam Proses': <FiActivity size={10} />,
  'Selesai': <FiCheckCircle size={10} />,
  'Kegiatan Akan Berlangsung': <FiClock size={10} />,
  'Kegiatan Berlangsung': <FiClock size={10} />,
  'Kegiatan Selesai': <FiCheckCircle size={10} />,
  'MOU/PKS Berlaku': <FiCheckCircle size={10} />,
  'Kedaluwarsa': <FiAlertCircle size={10} />,
};

// Tahap status — dari halaman Tata Kelola lama, dipakai sbg filter tambahan
const STAGE_FILTER: { key: string; label: string; statuses: string[] }[] = [
  { key: 'draft',       label: 'Draft',       statuses: ['Draft'] },
  { key: 'proses',      label: 'Proses',      statuses: ['Dalam Proses'] },
  { key: 'berlangsung', label: 'Berlangsung', statuses: ['Selesai', 'Kegiatan Akan Berlangsung', 'Kegiatan Berlangsung'] },
  { key: 'selesai',     label: 'Selesai',     statuses: ['Kegiatan Selesai', 'MOU/PKS Berlaku', 'Kedaluwarsa'] },
];

const DIVISI_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pencegahan:    { label: 'Pencegahan',    color: BLUE_DARK, bg: '#DBEAFE' },
  pemberantasan: { label: 'Pemberantasan', color: '#A32D2D', bg: '#FEE2E2' },
  rehabilitasi:  { label: 'Rehabilitasi',  color: '#5B21B6', bg: '#EDE9FE' },
  pemberdayaan:  { label: 'Pemberdayaan',  color: '#92400E', bg: '#FEF3C7' },
};

// Parse format "role|nama|waktu|level" (sama pola dengan manualLog/EditPencilIndicator)
// jadi info siap-tampil + Date buat keperluan sorting.
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', mitra: 'Mitra', unknown: 'Anonim',
};
function parseAkses(raw?: string): { role: string; roleLabel: string; nama: string; waktu: Date | null; level: string } | null {
  if (!raw) return null;
  const [role, nama, waktuStr, level] = raw.split('|');
  if (!role || !nama) return null;
  const waktu = waktuStr ? new Date(waktuStr.replace(' ', 'T')) : null;
  return {
    role,
    roleLabel: role === 'admin' ? (level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK') : (ROLE_LABEL[role] || role),
    nama,
    waktu: waktu && !isNaN(waktu.getTime()) ? waktu : null,
    level: level || '',
  };
}

function normNama(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function groupByInstitusi(list: DokumenItem[]): [string, DokumenItem[]][] {
  const map = new Map<string, DokumenItem[]>();
  list.forEach(d => {
    const key = d.namaMitra || 'Tanpa Institusi';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  });
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

// Ringkasan poin kerja sama — dari halaman Tata Kelola lama
function generatePreviewPoin(d: DokumenItem): string[] {
  return [
    `Jenis kerja sama: ${d.jenis === 'MOU' ? 'Memorandum of Understanding' : 'Perjanjian Kerja Sama'}`,
    `Mitra: ${d.namaMitra}`,
    `Masa berlaku: ${d.tglBerlaku} s.d. ${d.tglBerakhir} (${d.durasi} tahun)`,
    `Dibuat oleh: ${d.dibuatOleh}`,
    d.catatan ? `Catatan: ${d.catatan}` : `Perihal: ${d.judul}`,
  ];
}

function DokumenPageContent() {
  const [role, setRole]       = useState('');
  const [level, setLevel]     = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [data, setData]       = useState<DokumenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [msg, setMsg]         = useState('');
  const [search, setSearch]   = useState('');
  const searchParams = useSearchParams();
  const [filterJenis, setFilterJenis] = useState('');
  const [hanyaFlag, setHanyaFlag] = useState(false);
  const [urutkanAkses, setUrutkanAkses] = useState(false);
  const [filterStage, setFilterStage] = useState('');
  const [viewMode, setViewMode] = useState<'folder' | 'table'>('folder');
  const [sumberTab, setSumberTab] = useState<'sistem' | 'arsip'>('sistem');
  const [arsipData, setArsipData] = useState<ArsipLamaItem[]>([]);
  const [arsipLoading, setArsipLoading] = useState(false);
  const [arsipLoaded, setArsipLoaded] = useState(false);
  const [arsipSearch, setArsipSearch] = useState('');
  const [expandedMou, setExpandedMou] = useState(true);
  const [expandedPks, setExpandedPks] = useState(true);
  const [expandedInstitusi, setExpandedInstitusi] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [kontakMap, setKontakMap] = useState<Record<string, KontakInfo>>({});
  const [notifMap, setNotifMap]   = useState<Record<string, NotifInfo>>({});

  const [editItem, setEditItem]     = useState<DokumenItem | null>(null);
  const [eStatus, setEStatus]       = useState('');
  const [eCatatan, setECatatan]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/superadmin/generate-kode')
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat dokumen.'); setLoading(false); });
  }, []);

  const loadKontak = useCallback(() => {
    fetch('/api/kontak-mitra')
      .then(r => r.json())
      .then(d => {
        const map: Record<string, KontakInfo> = {};
        (d.data || []).forEach((k: any) => {
          const key = normNama(k.namaInstitusi);
          if (!map[key] || k.namaPIC) map[key] = { namaPIC: k.namaPIC || map[key]?.namaPIC || '', jurusan: k.jurusan || map[key]?.jurusan || '' };
        });
        setKontakMap(map);
      })
      .catch(() => {});
  }, []);

  const loadNotif = useCallback(() => {
    fetch('/api/notifikasi-admin')
      .then(r => r.json())
      .then(d => {
        const map: Record<string, NotifInfo> = {};
        (d.notifikasi || []).forEach((n: any) => {
          if (!n.idDokumen) return;
          if (!map[n.idDokumen]) map[n.idDokumen] = { count: 0, hasUnread: false };
          map[n.idDokumen].count += 1;
          if (!n.dibaca) map[n.idDokumen].hasUnread = true;
        });
        setNotifMap(map);
      })
      .catch(() => {});
  }, []);

  const loadArsipLama = useCallback(() => {
    if (arsipLoaded) return;
    setArsipLoading(true);
    fetch('/api/arsip-dokumen')
      .then(r => r.json())
      .then(d => {
        // Cuma "Arsip Lama" (sumber: manual) — dokumen sebelum sistem ini
        // ada. "sumber: sistem" TIDAK dipakai di sini karena itu sudah
        // ditampilkan di tab "Dokumen Sistem" (data hidup di atas).
        const hanyaManual = (d.data || []).filter((a: any) => a.sumber === 'manual');
        setArsipData(hanyaManual);
        setArsipLoaded(true);
        setArsipLoading(false);
      })
      .catch(() => setArsipLoading(false));
  }, [arsipLoaded]);

  const gantiTab = (tab: 'sistem' | 'arsip') => {
    setSumberTab(tab);
    if (tab === 'arsip') loadArsipLama();
  };

  useEffect(() => {
    const cari = searchParams.get('cari');
    if (cari) setSearch(cari);
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setRole(u.role);
        setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
        setNamaAdmin(u.nama || u.email || 'Admin');
        load();
        loadKontak();
        loadNotif();
      })
      .catch(() => { window.location.href = '/login'; });
  }, [load, loadKontak, loadNotif]);

  const backUrl = level === 'utama' ? '/dashboard/bnn-utama' : (role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin');

  const sidebarItems: SidebarItem[] = level === 'utama' ? [
    { href: '/dashboard/bnn-utama', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Dokumen & Tata Kelola' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Daftar Admin' },
  ] : [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/dokumen-basah', icon: <FiDroplet size={17} />, label: 'Dokumen Basah' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiList size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/laporan', icon: <FiFileText size={17} />, label: 'Laporan' },
    { href: '/dashboard/kelola-chatbot', icon: <FiMessageCircle size={17} />, label: 'Kelola Chatbot' },
    { href: '/dashboard/kotak-saran', icon: <FiMessageSquare size={17} />, label: 'Kotak Saran' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' },
  ];

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };


  const openEdit = (d: DokumenItem) => {
    setEditItem(d); setEStatus(d.status); setECatatan(d.catatan || '');
    setMsg(''); setError('');
  };

  const submitEdit = async () => {
    if (!editItem) return;
    setSubmitting(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editItem.id, fields: { status: eStatus, catatan: eCatatan } }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }
      setMsg(d.message); setEditItem(null); load();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSubmitting(false); }
  };

  const hapus = async (id: string, judul: string) => {
    if (!confirm(`Hapus "${judul}"?\nIni akan menghapus dari Sheets, Google Docs, dan Drive.`)) return;
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }
      setMsg(d.message); load();
    } catch { setError('Terjadi kesalahan.'); }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleInstitusi = (key: string) => {
    setExpandedInstitusi(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const stageStatuses = STAGE_FILTER.find(f => f.key === filterStage)?.statuses || [];
  const filteredBase = data.filter(d => {
    const matchSearch =
      d.namaMitra?.toLowerCase().includes(search.toLowerCase()) ||
      d.judul?.toLowerCase().includes(search.toLowerCase()) ||
      d.status?.toLowerCase().includes(search.toLowerCase()) ||
      d.kode?.toLowerCase().includes(search.toLowerCase());
    const matchJenis = filterJenis ? d.jenis === filterJenis : true;
    const matchStage = filterStage ? stageStatuses.includes(d.status) : true;
    const matchFlag = hanyaFlag ? !!d.flagRevisi : true;
    return matchSearch && matchJenis && matchStage && matchFlag;
  });

  // Urutkan berdasarkan siapa/kapan TERAKHIR AKSES (buka halaman) — paling
  // atas = paling baru diakses. Dokumen yang belum pernah diakses siapa pun
  // (field kosong) ditaruh di paling bawah, bukan ikut tercampur di atas.
  const filtered = !urutkanAkses ? filteredBase : [...filteredBase].sort((a, b) => {
    const waktuA = parseAkses(a.terakhirDiakses)?.waktu?.getTime() ?? -1;
    const waktuB = parseAkses(b.terakhirDiakses)?.waktu?.getTime() ?? -1;
    return waktuB - waktuA;
  });

  const countPerStage = STAGE_FILTER.map(f => ({ ...f, count: data.filter(d => f.statuses.includes(d.status)).length }));

  if (loading) return <LoaderPage text="Memuat Semua Dokumen Kerja Sama..." />;

  const mouList = filtered.filter(d => d.jenis === 'MOU');
  const pksList = filtered.filter(d => d.jenis === 'PKS');

  return (
    <div style={{ minHeight:'100vh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <GlobalStyle />

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/dokumen"
        brandLabel="E-POKJA HUKER"
        brandSub={level === 'utama' ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        userName={namaAdmin}
        userTag={level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={level === 'utama' ? '#ABD1C6' : BLUE}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth:1080, margin:'0 auto', padding:'1.4rem 1.25rem 0' }}>
        <nav style={navPill} className="fld">
          <div style={{ fontWeight:800, fontSize:14, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
            <FiDatabase size={16} style={{ color: BLUE }} />
            Dokumen &amp; Tata Kelola Kerja Sama
          </div>
          {level === 'utama' ? (
            <span style={{ fontSize:10.5, fontWeight:700, padding:'6px 14px', borderRadius:100, background:'rgba(171,209,198,0.25)', color:'#2F5449', display:'flex', alignItems:'center', gap:6 }}>
              <FiEye size={12} /> Mode Tinjau — BNN Utama
            </span>
          ) : (
            <a href="/dashboard/superadmin/generate-kode" style={btnPrimary} className="btn-hover">
              <FiPlus size={13} style={{ marginRight:5, verticalAlign:'middle' }} /> Generate
            </a>
          )}
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth:1080, margin:'0 auto', padding:'1.25rem 1.25rem 3rem' }}>

        {msg   && <div style={{ ...msgBox(BLUE_DARK,'#DBEAFE'), marginBottom:14 }} className="fld"><FiCheckCircle size={14} style={{ marginRight:6, verticalAlign:'middle' }} />{msg}</div>}
        {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), marginBottom:14 }} className="fld"><FiAlertCircle size={14} style={{ marginRight:6, verticalAlign:'middle' }} />{error}</div>}

        {/* Tab sumber dokumen */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }} className="fld">
          <button onClick={() => gantiTab('sistem')} style={{
            flex:1, padding:'11px 16px', borderRadius:14, border:'none', cursor:'pointer', fontFamily:FONT,
            fontSize:12.5, fontWeight:700, textAlign:'left',
            background: sumberTab === 'sistem' ? `linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})` : '#fff',
            color: sumberTab === 'sistem' ? '#fff' : '#334155',
            boxShadow: sumberTab === 'sistem' ? `0 8px 20px -8px ${BLUE}70` : '0 1px 3px rgba(15,23,42,.06)',
          }} className="btn-hover">
            <div style={{ display:'flex', alignItems:'center', gap:6 }}><FiDatabase size={14} /> Dokumen Sistem</div>
            <div style={{ fontSize:10.5, fontWeight:500, opacity:.8, marginTop:2 }}>Sejak sistem ini dibangun — {data.length} dokumen</div>
          </button>
          <button onClick={() => gantiTab('arsip')} style={{
            flex:1, padding:'11px 16px', borderRadius:14, border:'none', cursor:'pointer', fontFamily:FONT,
            fontSize:12.5, fontWeight:700, textAlign:'left',
            background: sumberTab === 'arsip' ? '#5B21B6' : '#fff',
            color: sumberTab === 'arsip' ? '#fff' : '#334155',
            boxShadow: sumberTab === 'arsip' ? '0 8px 20px -8px rgba(91,33,182,0.45)' : '0 1px 3px rgba(15,23,42,.06)',
          }} className="btn-hover">
            <div style={{ display:'flex', alignItems:'center', gap:6 }}><FiArchive size={14} /> Dokumen Arsip</div>
            <div style={{ fontSize:10.5, fontWeight:500, opacity:.8, marginTop:2 }}>Sebelum sistem ini ada{arsipLoaded ? ` — ${arsipData.length} dokumen` : ''}</div>
          </button>
        </div>

        {sumberTab === 'arsip' ? (
          <ArsipLamaSection data={arsipData} loading={arsipLoading} search={arsipSearch} setSearch={setArsipSearch} />
        ) : (
        <>
        {/* Toolbar */}
        <div style={{ ...shellStyle, marginBottom:12 }} className="fld">
          <div style={{ ...coreStyle, padding:'0.9rem 1.1rem', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <FiSearch size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
              <input
                style={searchInput}
                placeholder="Cari mitra, judul, kode, status..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display:'flex', gap:4 }}>
              {['','MOU','PKS'].map(j => (
                <button key={j} onClick={() => setFilterJenis(j)} style={{ ...pillBtn, ...(filterJenis === j ? pillBtnActive : {}) }} className="btn-hover">
                  {j === 'MOU' && <FaFileSignature size={11} />}
                  {j === 'PKS' && <FaFileAlt size={11} />}
                  {j || 'Semua Jenis'}
                </button>
              ))}
              <button onClick={() => setHanyaFlag(v => !v)}
                style={{ ...pillBtn, ...(hanyaFlag ? { background:'#FEF3C7', color:'#92400E', borderColor:'#FBBF24' } : {}) }} className="btn-hover">
                🚩 Perlu Revisi
              </button>
              <button onClick={() => setUrutkanAkses(v => !v)}
                style={{ ...pillBtn, ...(urutkanAkses ? { background:'#DBEAFE', color: BLUE_DARK, borderColor: BLUE } : {}) }} className="btn-hover"
                title="Urutkan dari yang paling baru dibuka (admin BNNP/BNNK, BNN Utama, atau mitra)">
                <FiClock size={11} /> Akses Terbaru
              </button>
            </div>
            <div style={{ display:'flex', border:'1.5px solid rgba(29,78,216,0.10)', borderRadius:11, overflow:'hidden' }}>
              <button onClick={() => setViewMode('folder')} style={{ ...toggleBtn, ...(viewMode === 'folder' ? toggleBtnActive : {}) }} title="Tampilan Folder" className="btn-hover">
                <FiFolder size={14} />
              </button>
              <button onClick={() => setViewMode('table')} style={{ ...toggleBtn, ...(viewMode === 'table' ? toggleBtnActive : {}) }} title="Tampilan Tabel" className="btn-hover">
                <FiGrid size={14} />
              </button>
            </div>
            <div style={{ fontSize:11.5, color:'#94a3b8', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
              <FiDatabase size={12} /> {filtered.length} dokumen
            </div>
          </div>
        </div>

        {/* Filter tahap status */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }} className="fld">
          <button onClick={() => setFilterStage('')} style={{ ...stagePill, ...(filterStage === '' ? stagePillActive : {}) }} className="btn-hover">
            Semua Tahap
          </button>
          {countPerStage.map(f => (
            <button key={f.key} onClick={() => setFilterStage(f.key)} style={{ ...stagePill, ...(filterStage === f.key ? stagePillActive : {}) }} className="btn-hover">
              {f.label}
              <span style={{ marginLeft:6, fontSize:10, padding:'1px 7px', borderRadius:100, background: filterStage === f.key ? 'rgba(255,255,255,.25)' : '#eef2f6', color: filterStage === f.key ? '#fff' : '#64748b' }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={shellStyle} className="fld">
            <div style={{ ...coreStyle, textAlign:'center', padding:'3rem 2rem' }}>
              <FiFileText size={34} style={{ color:'#cbd5e1', marginBottom:10 }} />
              <div style={{ fontSize:13.5, color:'#64748b', marginBottom:10 }}>Tidak ada dokumen pada filter ini.</div>
              <a href="/dashboard/superadmin/generate-kode" style={{ color: BLUE, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5, fontWeight:600, fontSize:12.5 }}>
                <FiPlus size={14} /> Generate dokumen pertama
              </a>
            </div>
          </div>
        ) : viewMode === 'folder' ? (

          /* ══ MODE FOLDER — dikelompokkan per Jenis, lalu per Institusi ══ */
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { jenis: 'MOU', label: 'MOU', list: mouList, color: BLUE, bg: '#DBEAFE', open: expandedMou, setOpen: setExpandedMou },
              { jenis: 'PKS', label: 'PKS', list: pksList, color: GOLD, bg: '#FEF3C7', open: expandedPks, setOpen: setExpandedPks },
            ].filter(g => (!filterJenis || filterJenis === g.jenis) && g.list.length > 0).map((g, gi) => {
              const institusiGroups = groupByInstitusi(g.list);
              return (
                <div key={g.jenis} style={{ ...shellStyle, animationDelay: `${gi * 0.05}s` }} className="fld">
                  <div style={coreStyle}>
                    <button onClick={() => g.setOpen(o => !o)} style={folderHeaderBtn}>
                      <span style={{ color: g.color, display:'flex', alignItems:'center' }}>
                        {g.open ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                      </span>
                      <div style={{ width:34, height:34, borderRadius:11, background: g.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <FaFolderOpen size={15} style={{ color: g.color }} />
                      </div>
                      <span style={{ fontSize:14, fontWeight:800, color:'#0f1f3d' }}>{g.label}</span>
                      <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>{g.list.length} dokumen · {institusiGroups.length} institusi</span>
                    </button>

                    {g.open && (
                      <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                        {institusiGroups.map(([namaInstitusi, docs]) => {
                          const instKey = `${g.jenis}::${namaInstitusi}`;
                          const instOpen = expandedInstitusi.has(instKey);
                          // Pensil ringkasan di level institusi — ambil log edit paling baru
                          // di antara semua dokumen institusi ini, biar kelihatan tanpa expand dulu.
                          const logTerbaru = docs.reduce<string | undefined>((terbaru, d) => {
                            if (!d.manualLog) return terbaru;
                            if (!terbaru) return d.manualLog;
                            const wTerbaru = terbaru.split('|')[2] || '';
                            const wIni = d.manualLog.split('|')[2] || '';
                            return wIni > wTerbaru ? d.manualLog : terbaru;
                          }, undefined);
                          return (
                            <div key={instKey} style={institusiBox}>
                              <button onClick={() => toggleInstitusi(instKey)} style={{ ...folderHeaderBtn, padding:'8px 10px' }}>
                                <span style={{ color:'#94a3b8', display:'flex', alignItems:'center' }}>
                                  {instOpen ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
                                </span>
                                <FaBuilding size={13} style={{ color:'#64748b' }} />
                                <span style={{ fontSize:12.5, fontWeight:700, color:'#334155' }}>{namaInstitusi}</span>
                                <span style={{ fontSize:10.5, color:'#94a3b8' }}>{docs.length} dok</span>
                                <span style={{ marginLeft:'auto', display:'flex' }} onClick={e => e.stopPropagation()}>
                                  <EditPencilIndicator manualLog={logTerbaru} size={22} />
                                </span>
                              </button>
                              {instOpen && (
                                <div style={{ padding:'0 10px 10px', display:'flex', flexDirection:'column', gap:7 }}>
                                  {docs.map(d => (
                                    <DokFileRow key={d.id} d={d} kontak={kontakMap[normNama(d.namaMitra)]} notif={notifMap[d.id]}
                                      expanded={expandedRows.has(d.id)} onToggle={() => toggleRow(d.id)} onEdit={openEdit} onHapus={hapus} level={level} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ══ MODE TABEL ══ */
          <div style={{ ...shellStyle, padding:6 }} className="fld">
            <div style={{ ...coreStyle, padding:0, overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['','Jenis','Judul','Mitra / PIC','Berlaku s.d.','Status','Kode','Diedit',''].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => {
                      const sc = STATUS_COLOR[d.status] || { bg:'#f1f5f9', color:'#64748b' };
                      const kontak = kontakMap[normNama(d.namaMitra)];
                      const notif = notifMap[d.id];
                      const previewOpen = previewId === d.id;
                      return (
                        <tr key={d.id} className="trow" style={{ position:'relative' }}>
                          <td style={td}>{notif && <NotifBadge notif={notif} />}</td>
                          <td style={td}>
                            <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:100, background:d.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:d.jenis==='MOU'?BLUE_DARK:'#92400E', display:'inline-flex', alignItems:'center', gap:4 }}>
                              {d.jenis === 'MOU' ? <FaFileSignature size={10} /> : <FaFileAlt size={10} />}
                              {d.jenis}
                            </span>
                          </td>
                          <td style={{ ...td, fontWeight:600, color:'#0f1f3d', maxWidth:200, position:'relative' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.judul}</div>
                              <button onClick={() => setPreviewId(previewOpen ? null : d.id)} style={infoBtn} title="Ringkasan poin kerja sama" className="btn-hover">
                                <FiInfo size={11} />
                              </button>
                            </div>
                            {previewOpen && (
                              <div style={previewPopover} className="fld">
                                <div style={{ fontWeight:700, marginBottom:6, color: GOLD, fontSize:11 }}>Ringkasan {d.jenis}</div>
                                {generatePreviewPoin(d).map((p, i) => (
                                  <div key={i} style={{ display:'flex', gap:6, marginBottom:3, fontSize:11, lineHeight:1.5 }}>
                                    <span style={{ color: GOLD, flexShrink:0 }}>·</span>
                                    <span>{p}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ ...td, color:'#64748b' }}>
                            <div>{d.namaMitra}</div>
                            {kontak?.namaPIC && <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>PIC: {kontak.namaPIC}</div>}
                            {d.jenis === 'PKS' && kontak?.jurusan && <div style={{ fontSize:10, color:'#94a3b8' }}>{kontak.jurusan}</div>}
                            {(d.divisi || []).length > 0 && (
                              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:3 }}>
                                {(d.divisi || []).map(dv => {
                                  const info = DIVISI_LABEL[dv] || { label: dv, color:'#64748b', bg:'#f1f5f9' };
                                  return (
                                    <span key={dv} style={{ fontSize:9, fontWeight:700, padding:'1px 7px', borderRadius:100, background:info.bg, color:info.color }}>
                                      {info.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td style={{ ...td, color:'#64748b', whiteSpace:'nowrap' }}>{d.tglBerakhir}</td>
                          <td style={td}>
                            <span style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:100, background:sc.bg, color:sc.color, display:'inline-flex', alignItems:'center', gap:4 }}>
                              {STATUS_ICON[d.status]}
                              {d.status}
                            </span>
                          </td>
                          <td style={{ ...td, fontFamily:'monospace', color: BLUE, fontWeight:700 }}>{d.kode}</td>
                          <td style={td}><EditPencilIndicator manualLog={d.manualLog} terakhirDiakses={d.terakhirDiakses} size={24} /></td>
                          <td style={td}>
                            <div style={{ display:'flex', gap:5, justifyContent:'flex-end', flexWrap:'nowrap' }}>
                              <a href={`/dashboard/dokumen/${d.id}`} style={iconLinkBtn} title="Detail" className="btn-hover"><FiEye size={13} /></a>
                              {d.docsUrl && <a href={d.docsUrl} target="_blank" rel="noopener noreferrer" style={iconLinkBtn} title="Buka Docs" className="btn-hover"><SiGoogledocs size={13} /></a>}
                              <a href={`/dashboard/dokumen/foto?id=${d.id}&judul=${encodeURIComponent(d.judul)}`} style={iconLinkBtn} title="Kelola Foto" className="btn-hover"><FiImage size={13} /></a>
                              {level !== 'utama' && (
                                <>
                                  <button onClick={() => openEdit(d)} style={iconBtn} title="Edit Status" className="btn-hover"><FiEdit size={13} /></button>
                                  <button onClick={() => hapus(d.id, d.judul)} style={{ ...iconBtn, color:'#A32D2D', borderColor:'#FCEBEB' }} title="Hapus" className="btn-hover"><FiTrash2 size={13} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* Modal edit status */}
      {editItem && (
        <div style={overlay} onClick={() => setEditItem(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()} className="fld">
            <div style={{ fontSize:15, fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
              <FiEdit size={17} style={{ color: BLUE }} />
              Edit Status Dokumen
            </div>
            <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>
              {editItem.judul} · {editItem.namaMitra}
            </div>
            {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB') }}><FiAlertCircle size={13} style={{ marginRight:5, verticalAlign:'middle' }} />{error}</div>}
            <label style={labelSt}>Status Baru</label>
            <select style={{ ...inputFull, marginBottom:12 }} value={eStatus} onChange={e => setEStatus(e.target.value)}>
              {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label style={labelSt}>Catatan (opsional)</label>
            <textarea
              style={{ ...inputFull, height:70, resize:'none', marginBottom:16 }}
              value={eCatatan} onChange={e => setECatatan(e.target.value)}
              placeholder="Catatan perubahan status..."
            />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setEditItem(null)} style={btnSm} className="btn-hover">
                <FiX size={13} style={{ marginRight:5, verticalAlign:'middle' }} /> Batal
              </button>
              <button onClick={submitEdit} disabled={submitting} style={btnPrimarySolid} className="btn-hover">
                <FiSave size={13} style={{ marginRight:5, verticalAlign:'middle' }} />
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DokumenPage() {
  return (
    <Suspense fallback={null}>
      <DokumenPageContent />
    </Suspense>
  );
}

function NotifBadge({ notif }: { notif: NotifInfo }) {
  return (
    <span style={{ position:'relative', display:'inline-flex', color: notif.hasUnread ? GOLD : '#cbd5e1' }} title={`${notif.count} notifikasi terkait dokumen ini`}>
      <FiMessageCircle size={14} />
      {notif.hasUnread && <span style={notifDot} />}
    </span>
  );
}

// ── Baris dokumen dalam mode folder — aksi selalu terlihat, ringkasan bisa diklik ──
function groupByInstitusiArsip(list: ArsipLamaItem[]): [string, ArsipLamaItem[]][] {
  const map = new Map<string, ArsipLamaItem[]>();
  list.forEach(a => {
    const key = a.namaInstitusi || 'Tanpa Institusi';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  });
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function ArsipLamaSection({ data, loading, search, setSearch }: {
  data: ArsipLamaItem[]; loading: boolean; search: string; setSearch: (v: string) => void;
}) {
  const [filterJenis, setFilterJenis] = useState('');
  const [sortBy, setSortBy] = useState<'arsip' | 'berakhirAsc' | 'berakhirDesc'>('arsip');
  const [jenisOpen, setJenisOpen] = useState<Record<string, boolean>>({ MOU: true, PKS: true });
  const [instExpanded, setInstExpanded] = useState<Set<string>>(new Set());
  const toggleInst = (key: string) => {
    setInstExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filtered = data
    .filter(a =>
      (!search ||
        a.namaInstitusi?.toLowerCase().includes(search.toLowerCase()) ||
        a.judul?.toLowerCase().includes(search.toLowerCase())) &&
      (!filterJenis || a.jenis === filterJenis)
    )
    .sort((a, b) => {
      if (sortBy === 'berakhirAsc') return new Date(a.tglBerakhir || 0).getTime() - new Date(b.tglBerakhir || 0).getTime();
      if (sortBy === 'berakhirDesc') return new Date(b.tglBerakhir || 0).getTime() - new Date(a.tglBerakhir || 0).getTime();
      return 0; // 'arsip' — biarkan urutan asli (dari API, terbaru diarsipkan duluan)
    });

  const countJenis = (j: string) => data.filter(a => !j || a.jenis === j).length;

  return (
    <div className="fld">
      <div style={{ ...shellStyle, marginBottom:12 }}>
        <div style={{ ...coreStyle, padding:'0.9rem 1.1rem' }}>
          <div style={{ position:'relative', marginBottom:10 }}>
            <FiSearch size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
            <input
              style={searchInput}
              placeholder="Cari institusi atau judul di arsip lama..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ display:'flex', gap:4 }}>
              {['', 'MOU', 'PKS'].map(j => (
                <button key={j} onClick={() => setFilterJenis(j)} style={{
                  padding:'6px 13px', borderRadius:100, border:'1.5px solid', fontSize:11, cursor:'pointer', fontFamily:FONT,
                  fontWeight: filterJenis === j ? 700 : 500,
                  background: filterJenis === j ? '#5B21B6' : '#fff',
                  color: filterJenis === j ? '#fff' : '#334155',
                  borderColor: filterJenis === j ? '#5B21B6' : 'rgba(29,78,216,0.10)',
                }} className="btn-hover">
                  {j || 'Semua Jenis'} ({countJenis(j)})
                </button>
              ))}
            </div>

            <div style={{ width:1, height:22, background:'rgba(15,23,42,.08)' }} />

            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{
              padding:'6px 10px', borderRadius:100, border:'1.5px solid rgba(29,78,216,0.10)', fontSize:11,
              fontFamily:FONT, fontWeight:600, color:'#334155', background:'#fff', cursor:'pointer',
            }}>
              <option value="arsip">Urutkan: Terbaru Diarsipkan</option>
              <option value="berakhirDesc">Urutkan: Tanggal Berakhir (Terbaru)</option>
              <option value="berakhirAsc">Urutkan: Tanggal Berakhir (Terlama)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ ...msgBox('#5B21B6', '#EDE9FE'), marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
        <FiArchive size={14} />
        Dokumen di sini diarsipkan manual oleh admin — riwayat kerja sama <strong>sebelum sistem ini dibangun</strong>. Buat lihat/ubah lebih lengkap, buka halaman{' '}
        <a href="/dashboard/arsip" style={{ color:'#5B21B6', fontWeight:700, textDecoration:'underline' }}>Arsip Dokumen</a>.
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8', fontSize:13 }}>Memuat arsip lama...</div>
      ) : filtered.length === 0 ? (
        <div style={shellStyle}>
          <div style={{ ...coreStyle, textAlign:'center', padding:'3rem 2rem' }}>
            <FiArchive size={30} style={{ color:'#cbd5e1', marginBottom:10 }} />
            <div style={{ fontSize:13.5, color:'#64748b', fontWeight:500 }}>
              {search ? 'Tidak ada arsip yang cocok dengan pencarian.' : 'Belum ada dokumen arsip lama.'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[
            { jenis:'MOU', label:'MOU', color: BLUE, bg:'#DBEAFE' },
            { jenis:'PKS', label:'PKS', color: GOLD, bg:'#FEF3C7' },
          ].filter(g => !filterJenis || filterJenis === g.jenis)
           .map((g, gi) => {
            const list = filtered.filter(a => a.jenis === g.jenis);
            if (list.length === 0) return null;
            const instGroups = groupByInstitusiArsip(list);
            const open = jenisOpen[g.jenis] ?? true;
            return (
              <div key={g.jenis} style={{ ...shellStyle, animationDelay:`${gi*0.05}s` }} className="fld">
                <div style={coreStyle}>
                  <button onClick={() => setJenisOpen(prev => ({ ...prev, [g.jenis]: !open }))} style={folderHeaderBtn}>
                    <span style={{ color:g.color, display:'flex', alignItems:'center' }}>
                      {open ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                    </span>
                    <div style={{ width:34, height:34, borderRadius:11, background:g.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <FaFolderOpen size={15} style={{ color:g.color }} />
                    </div>
                    <span style={{ fontSize:14, fontWeight:800, color:'#0f1f3d' }}>{g.label}</span>
                    <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>{list.length} dokumen · {instGroups.length} institusi</span>
                  </button>

                  {open && (
                    <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                      {instGroups.map(([namaInstitusi, docs]) => {
                        const instKey = `${g.jenis}::${namaInstitusi}`;
                        const instOpen = instExpanded.has(instKey);
                        return (
                          <div key={instKey} style={institusiBox}>
                            <button onClick={() => toggleInst(instKey)} style={{ ...folderHeaderBtn, padding:'8px 10px' }}>
                              <span style={{ color:'#94a3b8', display:'flex', alignItems:'center' }}>
                                {instOpen ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
                              </span>
                              <FaBuilding size={13} style={{ color:'#64748b' }} />
                              <span style={{ fontSize:12.5, fontWeight:700, color:'#334155' }}>{namaInstitusi}</span>
                              <span style={{ fontSize:10.5, color:'#94a3b8' }}>{docs.length} dok</span>
                            </button>

                            {instOpen && (
                              <div style={{ padding:'0 10px 10px', display:'flex', flexDirection:'column', gap:8 }}>
                                {docs.map(a => (
                                  <div key={a.id} style={{ background:'#fff', border:'1px solid rgba(29,78,216,0.06)', borderRadius:11, padding:'0.85rem 1rem' }}>
                                    <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:6 }}>
                                      <span style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:100, background: a.statusKerjaSama === 'Masih Berlaku' ? '#DCFCE7' : '#f1f5f9', color: a.statusKerjaSama === 'Masih Berlaku' ? '#166534' : '#64748b' }}>{a.statusKerjaSama || 'Sudah Berakhir'}</span>
                                    </div>
                                    <div style={{ fontSize:13.5, fontWeight:700, color:'#0f1f3d', marginBottom:5 }}>{a.judul}</div>
                                    <div style={{ fontSize:11, color:'#94a3b8', display:'flex', gap:14, flexWrap:'wrap', marginBottom:6 }}>
                                      <span style={{ display:'flex', alignItems:'center', gap:4 }}><FiCalendar size={11} /> {a.tglBerlaku} s.d. {a.tglBerakhir}</span>
                                      {a.namaPIC && <span>{a.namaPIC}</span>}
                                    </div>
                                    {a.catatan && <div style={{ fontSize:11.5, color:'#78350F', background:'#FFFBEB', padding:'6px 10px', borderRadius:8, marginBottom:8, fontStyle:'italic' }}>{a.catatan}</div>}
                                    <div style={{ fontSize:10, color:'#94a3b8', marginBottom:8 }}>Diarsipkan {a.tglDiarsipkan} oleh {a.diarsipkanOleh}</div>
                                    {a.fileUrl && (
                                      <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" style={{ ...actBtn, textDecoration:'none', display:'inline-flex' }} className="btn-hover">
                                        <FiExternalLink size={11} /> Lihat Berkas
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DokFileRow({ d, kontak, notif, expanded, onToggle, onEdit, onHapus, level }: {
  d: DokumenItem; kontak?: KontakInfo; notif?: NotifInfo;
  expanded: boolean; onToggle: () => void;
  onEdit: (d: DokumenItem) => void;
  onHapus: (id: string, judul: string) => void;
  level?: 'utama' | 'bnnp_bnnk';
}) {
  const sc = STATUS_COLOR[d.status] || { bg:'#f1f5f9', color:'#64748b' };
  const [showRingkasan, setShowRingkasan] = useState(false);
  return (
    <div style={rowBox}>
      <div onClick={onToggle} style={rowHeader}>
        <span style={{ color:'#94a3b8', display:'flex', flexShrink:0 }}>{expanded ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}</span>
        <FiFileText size={14} style={{ color:'#94a3b8', flexShrink:0 }} />
        <span style={{ fontSize:12.5, fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#0f1f3d' }}>{d.judul}</span>
        {notif && <NotifBadge notif={notif} />}
        {d.flagRevisi && (
          <span title="Ditandai perlu revisi oleh BNN Utama" style={{ fontSize:9.5, fontWeight:700, padding:'3px 8px', borderRadius:100, background:'#FEF3C7', color:'#92400E', flexShrink:0 }}>🚩 Perlu Revisi</span>
        )}
        <EditPencilIndicator manualLog={d.manualLog} terakhirDiakses={d.terakhirDiakses} size={22} />
        <span style={{ fontSize:9.5, fontWeight:600, padding:'3px 9px', borderRadius:100, background:sc.bg, color:sc.color, flexShrink:0, display:'inline-flex', alignItems:'center', gap:4 }}>
          {STATUS_ICON[d.status]}
          {d.status}
        </span>
      </div>

      {expanded && (
        <div style={{ padding:'0 14px 12px 33px', display:'flex', flexDirection:'column', gap:8 }} className="fld">
          <div style={{ fontSize:11, color:'#64748b', display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
            <FaBuilding size={11} /> {d.namaMitra}
            <span style={{ opacity:0.4 }}>·</span>
            <FiCalendar size={11} /> {d.tglBerlaku} s.d. {d.tglBerakhir}
            <span style={{ opacity:0.4 }}>·</span>
            Kode: <strong style={{ color: BLUE }}>{d.kode}</strong>
          </div>
          {(() => {
            const akses = parseAkses(d.terakhirDiakses);
            if (!akses) return null;
            return (
              <div style={{ fontSize:10.5, color:'#94a3b8', display:'flex', alignItems:'center', gap:5 }}>
                <FiClock size={11} />
                Terakhir diakses: <strong style={{ color:'#64748b' }}>{akses.nama}</strong> ({akses.roleLabel})
                {akses.waktu && <span>· {akses.waktu.toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>}
              </div>
            );
          })()}
          {(kontak?.namaPIC || (d.jenis === 'PKS' && kontak?.jurusan)) && (
            <div style={{ fontSize:11, color:'#64748b', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              {kontak?.namaPIC && <span style={{ display:'flex', alignItems:'center', gap:4 }}><FiUser size={11} /> {kontak.namaPIC}</span>}
              {d.jenis === 'PKS' && kontak?.jurusan && <span style={{ display:'flex', alignItems:'center', gap:4 }}><FiBookOpen size={11} /> {kontak.jurusan}</span>}
            </div>
          )}
          {(d.divisi || []).length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {(d.divisi || []).map(dv => {
                const info = DIVISI_LABEL[dv] || { label: dv, color:'#64748b', bg:'#f1f5f9' };
                return (
                  <span key={dv} style={{ fontSize:9.5, fontWeight:700, padding:'2px 9px', borderRadius:100, background:info.bg, color:info.color }}>
                    {info.label}
                  </span>
                );
              })}
            </div>
          )}

          <button onClick={() => setShowRingkasan(s => !s)} style={{ ...actBtn, alignSelf:'flex-start' }} className="btn-hover">
            <FiInfo size={11} /> {showRingkasan ? 'Sembunyikan Ringkasan' : 'Lihat Ringkasan Poin'}
          </button>
          {showRingkasan && (
            <div style={ringkasanBox} className="fld">
              {generatePreviewPoin(d).map((p, i) => (
                <div key={i} style={{ display:'flex', gap:6, marginBottom:3, fontSize:11, lineHeight:1.5, color:'#92400E' }}>
                  <span style={{ color: GOLD, flexShrink:0 }}>·</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <a href={`/dashboard/dokumen/${d.id}`} style={actBtn} className="btn-hover"><FiEye size={11} /> Detail</a>
            {d.docsUrl && <a href={d.docsUrl} target="_blank" rel="noopener noreferrer" style={actBtn} className="btn-hover"><FiExternalLink size={11} /> Buka Docs</a>}
            <a href={`/dashboard/dokumen/foto?id=${d.id}&judul=${encodeURIComponent(d.judul)}`} style={actBtn} className="btn-hover"><FiImage size={11} /> Kelola Foto</a>
            {level !== 'utama' && (
              <>
                <button onClick={() => onEdit(d)} style={actBtn} className="btn-hover"><FiEdit size={11} /> Edit Status</button>
                <button onClick={() => onHapus(d.id, d.judul)} style={{ ...actBtn, color:'#A32D2D', borderColor:'#FCEBEB' }} className="btn-hover"><FiTrash2 size={11} /> Hapus</button>
              </>
            )}
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
      @keyframes fadeUp { from { opacity:0; transform: translateY(12px); filter: blur(3px);} to { opacity:1; transform: translateY(0); filter: blur(0);} }
      .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
      .trow { transition: background 0.2s ease; }
      .trow:hover { background: #f8fafc; }
      .trow td { padding: 12px; border-bottom: 1px solid rgba(29,78,216,0.05); }
      @media (min-width: 901px) {
        .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
      }
    `}</style>
  );
}

const navPill: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.72)', backdropFilter:'blur(12px)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:100, padding:'9px 10px 9px 18px', boxShadow:'0 10px 26px -18px rgba(15,23,42,0.25)' };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#64748b', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:6 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', borderRadius:20, padding:6, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, padding:'1.1rem 1.2rem', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const searchInput: React.CSSProperties = { padding:'9px 12px 9px 34px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', fontSize:12, fontFamily:FONT, width:'100%', outline:'none', background:'#F5F1E8', boxSizing:'border-box' };
const pillBtn: React.CSSProperties = { padding:'8px 14px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', fontSize:11.5, cursor:'pointer', fontFamily:FONT, background:'#fff', color:'#334155', display:'flex', alignItems:'center', gap:5, fontWeight:500 };
const pillBtnActive: React.CSSProperties = { background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', borderColor:'transparent', fontWeight:700 };
const stagePill: React.CSSProperties = { padding:'7px 15px', borderRadius:100, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(217,119,6,0.16)', fontSize:11.5, cursor:'pointer', fontFamily:FONT, background:'#fff', color:'#92400E', fontWeight:500 };
const stagePillActive: React.CSSProperties = { background: GOLD, color:'#fff', borderColor:'transparent', fontWeight:700 };
const toggleBtn: React.CSSProperties = { padding:'8px 13px', border:'none', fontSize:13, cursor:'pointer', fontFamily:FONT, background:'#fff', color:'#334155', display:'flex', alignItems:'center' };
const toggleBtnActive: React.CSSProperties = { background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff' };
const folderHeaderBtn: React.CSSProperties = { display:'flex', alignItems:'center', gap:10, width:'100%', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:FONT, textAlign:'left' };
const institusiBox: React.CSSProperties = { border:'1px solid rgba(29,78,216,0.06)', borderRadius:13, background:'#fdfefe' };
const rowBox: React.CSSProperties = { border:'1px solid rgba(29,78,216,0.07)', borderRadius:13, background:'#fbfcfe', overflow:'hidden' };
const rowHeader: React.CSSProperties = { display:'flex', alignItems:'center', gap:9, padding:'10px 12px', cursor:'pointer' };
const actBtn: React.CSSProperties = { fontSize:10.5, padding:'6px 11px', borderRadius:8, borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', color:'#334155', cursor:'pointer', fontFamily:FONT, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' };
const iconBtn: React.CSSProperties = { width:28, height:28, borderRadius:8, borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', color:'#334155', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const iconLinkBtn: React.CSSProperties = { ...iconBtn, textDecoration:'none' };
const infoBtn: React.CSSProperties = { width:20, height:20, borderRadius:6, border:'1px solid rgba(217,119,6,0.2)', background:'#FFFBEB', color: GOLD, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const labelSt: React.CSSProperties = { display:'block', fontSize:11, color:'#334155', marginBottom:5, fontWeight:600 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', outline:'none', background:'#f8fafc' };
const btnPrimary: React.CSSProperties = { fontSize:12, padding:'9px 16px', borderRadius:100, border:'none', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', boxShadow:`0 6px 16px -6px ${BLUE}60` };
const btnPrimarySolid: React.CSSProperties = { padding:'9px 18px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT, display:'inline-flex', alignItems:'center' };
const btnSm: React.CSSProperties = { padding:'9px 16px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', color:'#334155', fontSize:12, cursor:'pointer', fontFamily:FONT, display:'inline-flex', alignItems:'center' };
const overlay: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'1rem' };
const modalBox: React.CSSProperties = { background:'#fff', borderRadius:18, padding:'1.6rem', width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(15,23,42,0.25)' };
const th: React.CSSProperties = { padding:'12px', fontWeight:700, fontSize:10.5, color:'#94a3b8', textAlign:'left', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid rgba(29,78,216,0.08)' };
const td: React.CSSProperties = { padding:'12px' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12.5, color, background:bg, padding:'10px 14px', borderRadius:10 });
const notifDot: React.CSSProperties = { position:'absolute', top:-2, right:-2, width:6, height:6, borderRadius:'50%', background:'#A32D2D' };
const previewPopover: React.CSSProperties = { position:'absolute', top:'100%', left:0, marginTop:6, background:'#fff', border:'1px solid rgba(217,119,6,0.2)', borderRadius:12, padding:'12px 14px', minWidth:260, maxWidth:340, boxShadow:'0 16px 40px -14px rgba(15,23,42,0.3)', zIndex:60, whiteSpace:'normal' };
const ringkasanBox: React.CSSProperties = { background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'10px 12px' };