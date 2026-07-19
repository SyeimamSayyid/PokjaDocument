'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiCalendar, FiInbox, FiKey, FiFolder, FiActivity,
  FiUsers, FiList, FiArchive, FiShield,
} from 'react-icons/fi';
import {
  FileText, Search, Filter, Eye, Check, X, Edit, Save, Send,
  Mail, Phone, Calendar, Building, GraduationCap, Clipboard,
  Copy, CheckCircle, AlertCircle, Clock, Tag, ExternalLink,
  ChevronDown, ChevronUp, Info, Key, MessageSquare, Paperclip,
  List, Landmark,
} from 'lucide-react';

interface PengajuanItem {
  id: string; namaInstitusi: string; jenis: string; deskripsi: string;
  email: string; noWa: string;
  status: string; kodeTracking: string; tglSubmit: string; catatan: string;
  jurusan?: string;
  fileDokumenId?: string;
  fileDokumenUrl?: string;
  fileDokumenNama?: string;
  divisi?: string[];
}

interface HasilGenerate {
  idDokumen: string; kodeAkses: string; kodeExpire: string;
  tglBerlaku: string; tglBerakhir: string; durasi: number;
  docsUrl: string; message: string;
}

const STATUS_LIST = ['Diajukan','Ditinjau','Disetujui','Ditolak'] as const;
type StatusType = typeof STATUS_LIST[number];

const FILTER_TABS = [
  { key:'semua',  label:'Semua',        statuses:[] as string[], icon: List },
  { key:'review', label:'Dalam Review', statuses:['Diajukan','Ditinjau'], icon: Clock },
  { key:'acc',    label:'Disetujui',    statuses:['Disetujui'], icon: CheckCircle },
  { key:'tolak',  label:'Ditolak',      statuses:['Ditolak'], icon: X },
];

const STATUS_COLOR: Record<StatusType, { bg: string; color: string; icon: any }> = {
  'Diajukan': { bg:'#DBEAFE', color:'#1D4ED8', icon: Clock },
  'Ditinjau': { bg:'#FEF3C7', color:'#92400E', icon: Eye },
  'Disetujui':{ bg:'#DBEAFE', color:'#1E3A8A', icon: CheckCircle },
  'Ditolak':  { bg:'#FEE2E2', color:'#991B1B', icon: X },
};

const DEFAULT_STATUS_COLOR = { bg:'#f1f5f9', color:'#64748b', icon: FileText };

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const DIVISI_LIST = [
  { key: 'pencegahan',    label: 'Pencegahan',    color: BLUE_DARK, bg: '#DBEAFE' },
  { key: 'pemberantasan', label: 'Pemberantasan', color: '#A32D2D', bg: '#FEE2E2' },
  { key: 'rehabilitasi',  label: 'Rehabilitasi',  color: '#5B21B6', bg: '#EDE9FE' },
  { key: 'pemberdayaan',  label: 'Pemberdayaan',  color: '#92400E', bg: '#FEF3C7' },
];
const MAKS_DIVISI = 4;

const divisiLabel = (key: string) => DIVISI_LIST.find(d => d.key === key)?.label || key;
const divisiStyle = (key: string) => DIVISI_LIST.find(d => d.key === key) || { color: '#64748b', bg: '#f1f5f9' };

function toDivisiArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

export default function PengajuanPage() {
  const [role, setRole]           = useState('');
  const [level, setLevel]         = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [aksesMap, setAksesMap]   = useState<Record<string, { diaccOleh: string; emailTerkirim: boolean; loading?: boolean }>>({});
  const [data, setData]           = useState<PengajuanItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [msg, setMsg]             = useState('');
  const [search, setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState('semua');
  const [filterDivisi, setFilterDivisi] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [openDivisiPicker, setOpenDivisiPicker] = useState<string | null>(null);

  const [detail, setDetail]           = useState<PengajuanItem | null>(null);
  const [showTolak, setShowTolak]     = useState(false);
  const [alasanTolak, setAlasanTolak] = useState('');
  const [showUbah, setShowUbah]       = useState(false);
  const [newStatus, setNewStatus]     = useState('');
  const [catatanUbah, setCatatanUbah] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const [showAcc, setShowAcc]         = useState(false);
  const [accItem, setAccItem]         = useState<PengajuanItem | null>(null);
  const [pilihanTemplate, setPilihanTemplate] = useState<'bnn'|'mitra'>('bnn');
  const [judulDok, setJudulDok]       = useState('');
  const [generating, setGenerating]   = useState(false);
  const [hasilGenerate, setHasilGenerate] = useState<HasilGenerate | null>(null);
  const [mitraList, setMitraList]     = useState<{id:string;nama:string}[]>([]);
  const [idMitraAcc, setIdMitraAcc]   = useState('');
  const [previewMitra, setPreviewMitra] = useState(false);
  const [kirimEmailLoading, setKirimEmailLoading] = useState(false);
  const [emailTerkirim, setEmailTerkirim] = useState(false);
  const [showPlaneAnimation, setShowPlaneAnimation] = useState(false);

  const getStatusColor = (status: string) => {
    if (STATUS_LIST.includes(status as StatusType)) return STATUS_COLOR[status as StatusType];
    return DEFAULT_STATUS_COLOR;
  };

  // Ambil status "diacc oleh siapa" + "email sudah terkirim?" — lazy, cuma
  // dipanggil sekali per item pas kartu di-expand (biar tidak batch-fetch
  // semua item sekaligus di awal, hemat request).
  const muatAksesInfo = useCallback(async (id: string) => {
    setAksesMap(prev => ({ ...prev, [id]: { ...(prev[id] || { diaccOleh:'', emailTerkirim:false }), loading: true } }));
    try {
      const r = await fetch(`/api/pengajuan/akses-mitra?id=${id}`);
      const d = await r.json();
      setAksesMap(prev => ({ ...prev, [id]: { diaccOleh: d.diaccOleh || '', emailTerkirim: !!d.emailTerkirim, loading: false } }));
    } catch {
      setAksesMap(prev => ({ ...prev, [id]: { ...(prev[id] || { diaccOleh:'', emailTerkirim:false }), loading: false } }));
    }
  }, []);

  const kirimUlangAkses = async (id: string) => {
    setAksesMap(prev => ({ ...prev, [id]: { ...(prev[id] || { diaccOleh:'', emailTerkirim:false }), loading: true } }));
    setError(''); setMsg('');
    try {
      const r = await fetch('/api/pengajuan/akses-mitra', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, aksi: 'kirimUlangAkses' }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.message || 'Gagal mengirim kode akses.'); setAksesMap(prev => ({ ...prev, [id]: { ...(prev[id] || { diaccOleh:'', emailTerkirim:false }), loading: false } })); return; }
      setMsg(d.message);
      setAksesMap(prev => ({ ...prev, [id]: { ...(prev[id] || { diaccOleh:'' }), emailTerkirim: true, loading: false } }));
    } catch {
      setError('Terjadi kesalahan saat mengirim kode akses.');
      setAksesMap(prev => ({ ...prev, [id]: { ...(prev[id] || { diaccOleh:'', emailTerkirim:false }), loading: false } }));
    }
  };

  const toggleExpand = (id: string, status: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) newSet.delete(id);
    else {
      newSet.add(id);
      // Lazy-load info akses cuma pas item Disetujui di-expand & belum pernah dicek
      if (status === 'Disetujui' && !aksesMap[id]) muatAksesInfo(id);
    }
    setExpandedItems(newSet);
  };

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/pengajuan/status')
      .then(r => r.json())
      .then(d => {
        const normalized: PengajuanItem[] = (d.data || []).map((item: any) => ({
          ...item,
          divisi: toDivisiArray(item.divisi),
        }));
        setData(normalized);
        setLoading(false);
      })
      .catch(() => { setError('Gagal memuat data.'); setLoading(false); });
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setRole(u.role);
        setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
        setNamaAdmin(u.nama || u.email || 'Admin');
        load();
        fetch('/api/superadmin/mitra').then(r => r.json()).then(d => setMitraList(d.data || []));
      })
      .catch(() => { window.location.href = '/login'; });
  }, [load]);

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiList size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    ...(level === 'bnnp_bnnk' ? [{ href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' }] : []),
  ];

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };


  const activeStatuses = FILTER_TABS.find(f => f.key === activeFilter)?.statuses || [];
  const filtered = data.filter(d => {
    const dv = d.divisi || [];
    const matchFilter = activeFilter === 'semua' || activeStatuses.includes(d.status);
    const matchDivisi = !filterDivisi
      || (filterDivisi === 'belum' ? dv.length === 0 : dv.includes(filterDivisi));
    const matchSearch = !search ||
      d.namaInstitusi?.toLowerCase().includes(search.toLowerCase()) ||
      d.kodeTracking?.toLowerCase().includes(search.toLowerCase()) ||
      d.jenis?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchDivisi && matchSearch;
  });

  const countPerFilter = FILTER_TABS.map(f => ({
    ...f,
    count: f.key === 'semua' ? data.length : data.filter(d => f.statuses.includes(d.status)).length,
  }));

  const openDetail = (item: PengajuanItem) => {
    setDetail(item); setShowTolak(false); setShowUbah(false);
    setAlasanTolak(''); setCatatanUbah(''); setNewStatus(item.status);
    setMsg(''); setError('');
  };

  const toggleDivisi = async (item: PengajuanItem, key: string) => {
    const current = item.divisi || [];
    const next = current.includes(key)
      ? current.filter(d => d !== key)
      : (current.length < MAKS_DIVISI ? [...current, key] : current);
    if (next === current) return;

    setError(''); setMsg('');
    try {
      const res = await fetch('/api/pengajuan/divisi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, divisi: next }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.message || 'Gagal ubah divisi.'); return; }
      setData(prev => prev.map(p => p.id === item.id ? { ...p, divisi: next } : p));
      if (detail?.id === item.id) setDetail(prev => prev ? { ...prev, divisi: next } : prev);
      if (accItem?.id === item.id) setAccItem(prev => prev ? { ...prev, divisi: next } : prev);
    } catch { setError('Gagal mengubah divisi.'); }
  };

  const openAcc = (item: PengajuanItem) => {
    setAccItem(item);
    setDetail(null);
    setPilihanTemplate('bnn');
    setHasilGenerate(null);
    setError('');
    setJudulDok(item.deskripsi?.slice(0, 60) || '');
    const cocok = mitraList.find(m => m.nama.toLowerCase() === item.namaInstitusi.toLowerCase());
    setIdMitraAcc(cocok?.id || '');
    setShowAcc(true);
    setEmailTerkirim(false);
    setShowPlaneAnimation(false);
  };

  const handleGenerateFromAcc = async () => {
    if (!accItem) return;
    if (!judulDok.trim()) { setError('Judul dokumen wajib diisi.'); return; }
    if ((accItem.divisi || []).length === 0) { setError('Tetapkan minimal 1 divisi sebelum generate dokumen.'); return; }
    const tglMulaiOtomatis = new Date().toISOString().split('T')[0];
    setGenerating(true); setError('');
    setEmailTerkirim(false);
    setShowPlaneAnimation(false);
    const mitraCocok = mitraList.find(m => m.id === idMitraAcc);
    const namaMitra  = mitraCocok?.nama || accItem.namaInstitusi;
    try {
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipeKode: 'dokumen', idMitra: idMitraAcc || '', namaMitra,
          namaPIC: '', jenis: accItem.jenis, judul: judulDok.trim(),
          tglBerlaku: tglMulaiOtomatis, tglBerakhir: '', dibuatOleh: namaAdmin,
          templateMitraId: pilihanTemplate === 'mitra' ? (accItem.fileDokumenId || '') : '',
          divisi: accItem.divisi || [],
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || d.error || 'Gagal generate kode.'); return; }

      await fetch('/api/pengajuan/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipe: 'pengajuan', id: accItem.id, statusBaru: 'Disetujui',
          catatan: `Disetujui. Template: ${pilihanTemplate === 'mitra' ? 'Dokumen mitra' : 'Template resmi BNN'}.`,
        }),
      });

      // Catat siapa yang meng-ACC — endpoint terpisah, tidak menyentuh route status di atas.
      fetch('/api/pengajuan/akses-mitra', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accItem.id, aksi: 'catatDiacc', diaccOleh: namaAdmin }),
      }).catch(() => {});

      setHasilGenerate(d);
      load();
    } catch (e) {
      setError('Terjadi kesalahan: ' + String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleKirimEmail = async () => {
    if (!accItem || !hasilGenerate) return;
    if (!accItem.email) { setError('Pengajuan ini tidak punya alamat email mitra.'); return; }
    setKirimEmailLoading(true); setError('');
    setShowPlaneAnimation(true);

    try {
      const res = await fetch('/api/email/kirim-akses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     accItem.email,
          namaMitra: accItem.namaInstitusi,
          jenis:     accItem.jenis,
          judul:     judulDok.trim(),
          kodeAkses: hasilGenerate.kodeAkses,
          kodeExpire: hasilGenerate.kodeExpire,
          idDokumen: hasilGenerate.idDokumen,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengirim email.'); return; }
      setEmailTerkirim(true);
      // Sekalian tandai di sheet biar status "sudah terkirim" persisten,
      // bukan cuma hidup di state lokal modal ini.
      fetch('/api/pengajuan/akses-mitra', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accItem.id, aksi: 'kirimUlangAkses' }),
      }).catch(() => {});
      setTimeout(() => setShowPlaneAnimation(false), 3000);
    } catch {
      setError('Terjadi kesalahan saat mengirim email.');
      setShowPlaneAnimation(false);
    } finally {
      setKirimEmailLoading(false);
    }
  };

  const handleTolak = async () => {
    if (!detail) return;
    if (!alasanTolak.trim()) { setError('Alasan penolakan wajib diisi.'); return; }
    setSubmitting(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/pengajuan/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipe:'pengajuan', id:detail.id, statusBaru:'Ditolak', catatan:alasanTolak.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }
      setMsg('Pengajuan berhasil ditolak.');
      setDetail(null); setShowTolak(false); setAlasanTolak(''); load();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSubmitting(false); }
  };

  const handleUbahStatus = async () => {
    if (!detail) return;
    setSubmitting(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/pengajuan/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipe:'pengajuan', id:detail.id, statusBaru:newStatus, catatan:catatanUbah }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }
      setMsg(d.message); setDetail(null); setShowUbah(false); setCatatanUbah(''); load();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat pengajuan...</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <GlobalStyle />

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/pengajuan"
        brandLabel="SI-POKJA HUMKER"
        brandSub={level === 'utama' ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        userName={namaAdmin}
        userTag={level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={BLUE}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth:960, margin:'0 auto', padding:'1.4rem 1.25rem 0' }}>
        <nav style={navStyle} className="fld">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontWeight:800, fontSize:14, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
              <FileText size={16} style={{ color: BLUE }} />
              Kelola Pengajuan
            </div>
          </div>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth:960, margin:'0 auto', padding:'1.25rem 1.25rem 3rem' }}>
        {msg && (
          <div style={{ ...msgBox(BLUE_DARK,'#DBEAFE'), display:'flex', alignItems:'center', gap:8, animation:'fadeInDown 0.4s ease-out' }}>
            <CheckCircle size={16} />
            {msg}
          </div>
        )}
        {error && !showAcc && (
          <div style={{ ...msgBox('#991B1B','#FEE2E2'), display:'flex', alignItems:'center', gap:8, animation:'shake 0.4s ease-out' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={{ ...shellStyle, marginBottom:12 }} className="fld">
          <div style={{ ...coreStyle, padding:'0.4rem 0.6rem' }}>
            <div style={{ position:'relative' }}>
              <Search size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
              <input
                style={searchInput}
                placeholder="Cari institusi, kode tracking, jenis..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:4, borderRadius:'50%', display:'flex' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }} className="fld">
          {countPerFilter.map(f => {
            const isActive = activeFilter === f.key;
            const Icon = f.icon;
            return (
              <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
                padding:'9px 16px', borderRadius:100, borderWidth:1.5, borderStyle:'solid',
                fontSize:12, cursor:'pointer', fontFamily:FONT,
                fontWeight: isActive ? 700 : 500,
                background: isActive ? `linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})` : '#fff',
                color: isActive ? '#fff' : '#334155',
                display:'flex', alignItems:'center', gap:6,
                boxShadow: isActive ? `0 6px 16px -6px ${BLUE}60` : 'none',
                borderColor: isActive ? 'transparent' : 'rgba(29,78,216,0.10)',
              }} className="btn-hover">
                <Icon size={13} />
                {f.label}
                <span style={{ marginLeft:2, fontSize:10, background: isActive ? 'rgba(255,255,255,.22)' : '#eef2f6', padding:'1px 8px', borderRadius:100, color: isActive ? '#fff' : '#64748b', fontWeight:700 }}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ ...shellStyle, marginBottom:16 }} className="fld">
          <div style={{ ...coreStyle, padding:'0.55rem 0.7rem', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            <Filter size={13} style={{ color:'#94a3b8' }} />
            <span style={{ fontSize:11, color:'#94a3b8', marginRight:2, fontWeight:600 }}>Divisi:</span>
            <button onClick={() => setFilterDivisi('')} style={chipDivisi(filterDivisi === '', '#334155')} className="btn-hover">Semua</button>
            <button onClick={() => setFilterDivisi('belum')} style={chipDivisi(filterDivisi === 'belum', GOLD)} className="btn-hover">Belum Ditetapkan</button>
            {DIVISI_LIST.map(dv => {
              const count = data.filter(d => (d.divisi || []).includes(dv.key)).length;
              return (
                <button key={dv.key} onClick={() => setFilterDivisi(dv.key)} style={chipDivisi(filterDivisi === dv.key, dv.color)} className="btn-hover">
                  {dv.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={shellStyle} className="fld">
            <div style={{ ...coreStyle, textAlign:'center', padding:'3rem 2rem', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'#eef2f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <FileText size={30} style={{ color:'#cbd5e1' }} />
              </div>
              <div style={{ fontSize:13.5, color:'#64748b', fontWeight:500 }}>Tidak ada pengajuan pada filter ini.</div>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map((item, index) => {
              const sc = getStatusColor(item.status);
              const StatusIcon = sc.icon;
              const adaDok = !!(item.fileDokumenId);
              const dv = item.divisi || [];
              const isExpanded = expandedItems.has(item.id);
              const pickerOpen = openDivisiPicker === item.id;
              const bisaAksi = !['Disetujui','Ditolak','Kegiatan Selesai'].includes(item.status);
              const akses = aksesMap[item.id];

              return (
                <div key={item.id} style={{ ...shellStyle, animation: `fadeInUp 0.4s ease-out ${index * 0.03}s both` }}>
                  <div style={{ ...coreStyle, padding:'1.1rem 1.3rem 0' }}>

                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start' }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', flex:1, minWidth:0 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:100, background:item.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:item.jenis==='MOU'?BLUE_DARK:'#92400E', display:'flex', alignItems:'center', gap:4 }}>
                          <FileText size={11} />
                          {item.jenis}
                        </span>
                        <span style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:100, background:sc.bg, color:sc.color, display:'flex', alignItems:'center', gap:4 }}>
                          <StatusIcon size={11} />
                          {item.status}
                        </span>
                        {dv.length > 0 ? (
                          dv.map(d => {
                            const ds = divisiStyle(d);
                            return (
                              <span key={d} style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:100, background:ds.bg, color:ds.color, display:'flex', alignItems:'center', gap:4 }}>
                                <Building size={11} />
                                {divisiLabel(d)}
                              </span>
                            );
                          })
                        ) : (
                          <span style={{ fontSize:10, padding:'3px 10px', borderRadius:100, background:'#FEF3C7', color:'#92400E', display:'flex', alignItems:'center', gap:4 }}>
                            <AlertCircle size={11} />
                            Belum ada divisi
                          </span>
                        )}
                        {adaDok && (
                          <span style={{ fontSize:10, padding:'3px 10px', borderRadius:100, background:'#DBEAFE', color:BLUE_DARK, display:'flex', alignItems:'center', gap:4 }}>
                            <Paperclip size={11} />
                            Ada dok. mitra
                          </span>
                        )}
                        {item.jurusan && (
                          <span style={{ fontSize:10, padding:'3px 10px', borderRadius:100, background:'#EDE9FE', color:'#5B21B6', display:'flex', alignItems:'center', gap:4 }}>
                            <GraduationCap size={11} />
                            {item.jurusan}
                          </span>
                        )}
                      </div>

                      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                        <button onClick={() => openDetail(item)} style={iconToolBtn} className="btn-hover" title="Lihat Detail">
                          <Eye size={14} />
                        </button>
                        <div style={{ position:'relative' }}>
                          <button onClick={() => setOpenDivisiPicker(pickerOpen ? null : item.id)} style={{ ...iconToolBtn, ...(dv.length === 0 ? { background:'#FEF3C7', borderColor:'#FDE68A', color:'#92400E' } : {}) }} className="btn-hover" title={`Divisi (${dv.length})`}>
                            <Building size={14} />
                            {dv.length > 0 && <span style={iconToolBadge}>{dv.length}</span>}
                          </button>
                          {pickerOpen && (
                            <div style={divisiPopover}>
                              {DIVISI_LIST.map(d => {
                                const checked = dv.includes(d.key);
                                const disabled = !checked && dv.length >= MAKS_DIVISI;
                                return (
                                  <button
                                    key={d.key}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => toggleDivisi(item, d.key)}
                                    style={{
                                      padding:'6px 12px', borderRadius:100, borderWidth:1.5, borderStyle:'solid',
                                      borderColor: checked ? d.color : 'rgba(29,78,216,0.10)',
                                      background: checked ? d.bg : '#fff',
                                      color: checked ? d.color : (disabled ? '#cbd5e1' : '#334155'),
                                      fontSize:11, fontWeight: checked ? 700 : 500, fontFamily: FONT,
                                      cursor: disabled ? 'not-allowed' : 'pointer',
                                      whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:4,
                                    }}
                                    className="btn-hover"
                                  >
                                    {checked && <Check size={11} />}
                                    {d.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <button onClick={() => toggleExpand(item.id, item.status)} style={iconToolBtn} className="btn-hover" title={isExpanded ? 'Sembunyikan' : 'Tampilkan detail'}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize:15, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.01em', marginTop:8 }}>{item.namaInstitusi}</div>

                    <div style={{
                      fontSize:12, color:'#64748b', marginTop:4, lineHeight:1.6,
                      display: isExpanded ? 'block' : '-webkit-box',
                      WebkitLineClamp: isExpanded ? 'none' as any : 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {item.deskripsi}
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop:8, animation: 'fadeInUp 0.3s ease-out' }}>
                        {(item.email||item.noWa) && (
                          <div style={{ fontSize:11, color:'#64748b', marginTop:4, display:'flex', gap:14, flexWrap:'wrap', background:'#F5F1E8', padding:'4px 10px', borderRadius:8 }}>
                            {item.email && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Mail size={12} />{item.email}</span>}
                            {item.noWa && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Phone size={12} />{item.noWa}</span>}
                          </div>
                        )}
                        {item.catatan && (
                          <div style={{ fontSize:11, color:'#92400E', background:'#FFFBEB', padding:'6px 10px', borderRadius:8, marginTop:6, display:'flex', alignItems:'flex-start', gap:4 }}>
                            <MessageSquare size={12} style={{ flexShrink:0, marginTop:1 }} />
                            {item.catatan}
                          </div>
                        )}
                        {item.status === 'Disetujui' && (
                          <div style={{ marginTop:8, background:'#F8FAFC', border:'1px solid rgba(29,78,216,0.08)', borderRadius:10, padding:'10px 12px' }}>
                            {akses?.diaccOleh && (
                              <div style={{ fontSize:11, color:'#64748b', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
                                <CheckCircle size={12} style={{ color: BLUE }} />
                                Disetujui oleh <strong style={{ color:'#0f1f3d' }}>{akses.diaccOleh}</strong>
                              </div>
                            )}
                            {item.email ? (
                              akses?.emailTerkirim ? (
                                <div style={{ fontSize:11.5, fontWeight:700, color: BLUE_DARK, background:'#DBEAFE', padding:'8px 12px', borderRadius:8, display:'flex', alignItems:'center', gap:6 }}>
                                  <CheckCircle size={13} />
                                  Kode akses mitra telah dikirim
                                </div>
                              ) : (
                                <button onClick={() => kirimUlangAkses(item.id)} disabled={akses?.loading} style={{ ...btnSm, width:'100%', background:`linear-gradient(135deg,${GOLD},#B45309)`, color:'#fff', border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }} className="btn-hover">
                                  {akses?.loading ? (
                                    <>
                                      <div style={{ width:13, height:13, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                                      Memproses...
                                    </>
                                  ) : (
                                    <>
                                      <Send size={13} />
                                      Kirimkan Kode Akses ke Mitra
                                    </>
                                  )}
                                </button>
                              )
                            ) : (
                              <div style={{ fontSize:11, color:'#94a3b8' }}>Pengajuan ini tidak punya alamat email mitra.</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:10, display:'flex', gap:14, flexWrap:'wrap' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clipboard size={12} />Kode: <strong style={{ color:BLUE }}>{item.kodeTracking}</strong></span>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}><Calendar size={12} />Submit: {item.tglSubmit}</span>
                    </div>
                  </div>

                  {bisaAksi && (
                    <div style={{ display:'flex', gap:8, padding:'12px 1.3rem 1rem', marginTop:12, borderTop:'1px solid rgba(29,78,216,0.06)' }}>
                      <button onClick={() => openAcc(item)} style={{ ...btnSm, flex:1, background:'#DBEAFE', color:BLUE_DARK, borderColor:'#93C5FD', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }} className="btn-hover">
                        <Check size={14} />
                        Acc
                      </button>
                      <button onClick={() => { openDetail(item); setShowTolak(true); }} style={{ ...btnSm, flex:1, background:'#FEE2E2', color:'#991B1B', borderColor:'#FCA5A5', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }} className="btn-hover">
                        <X size={14} />
                        Tolak
                      </button>
                    </div>
                  )}
                  {!bisaAksi && <div style={{ paddingBottom: 4 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAcc && accItem && (
        <div style={overlay} onClick={() => { if (!generating) { setShowAcc(false); setAccItem(null); setHasilGenerate(null); setError(''); setPreviewMitra(false); setShowPlaneAnimation(false); } }}>
          <div style={{ ...modalBox, maxWidth:600, animation: 'scaleIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            {hasilGenerate ? (
              <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:64, height:64, borderRadius:'50%', background:`linear-gradient(135deg, #2563EB, ${BLUE_DARK})`, marginBottom:12, boxShadow:`0 4px 20px ${BLUE}40` }}>
                    <CheckCircle size={32} style={{ color:'#fff' }} />
                  </div>
                  <div style={{ fontSize:18, fontWeight:800, color:BLUE }}>Kode Dokumen Berhasil Dibuat!</div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{accItem.namaInstitusi} · {accItem.jenis}</div>
                </div>

                <div style={{ background:'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border:'2px solid #93C5FD', borderRadius:16, padding:'1.5rem', marginBottom:16, textAlign:'center', boxShadow:`0 2px 12px ${BLUE}20` }}>
                  <div style={{ fontSize:10, color:BLUE_DARK, marginBottom:6, textTransform:'uppercase', letterSpacing:1.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <Key size={14} />
                    Kode Akses Dokumen
                  </div>
                  <div style={{ fontSize:28, fontWeight:800, letterSpacing:4, color:BLUE_DARK, marginBottom:12, fontFamily:'monospace', background:'rgba(255,255,255,.6)', padding:'8px 16px', borderRadius:10, display:'inline-block' }}>
                    {hasilGenerate.kodeAkses}
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(hasilGenerate.kodeAkses)} style={{ ...btnPrimary, display:'inline-flex', alignItems:'center', gap:6, padding:'9px 22px' }} className="btn-hover">
                    <Copy size={14} />
                    Salin Kode
                  </button>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16, fontSize:12 }}>
                  <div style={dField}><span style={dLabel}>ID Dokumen</span><span style={{ fontFamily:'monospace', fontSize:11 }}>{hasilGenerate.idDokumen}</span></div>
                  <div style={dField}><span style={dLabel}>Kode Expire</span><span>{hasilGenerate.kodeExpire}</span></div>
                  <div style={dField}><span style={dLabel}>Berlaku</span><span>{hasilGenerate.tglBerlaku}</span></div>
                  <div style={dField}><span style={dLabel}>Berakhir</span><span>{hasilGenerate.tglBerakhir}</span></div>
                </div>

                {hasilGenerate.docsUrl && (
                  <a href={hasilGenerate.docsUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, display:'flex', alignItems:'center', justifyContent:'center', gap:6, textDecoration:'none', marginBottom:12 }} className="btn-hover">
                    <ExternalLink size={14} />
                    Buka Google Docs
                  </a>
                )}

                {accItem.email ? (
                  emailTerkirim ? (
                    <div style={{ background:'#DBEAFE', borderRadius:10, padding:'12px 16px', fontSize:13, color:BLUE_DARK, marginBottom:14, textAlign:'center', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8, animation: 'fadeInUp 0.4s ease-out' }}>
                      <CheckCircle size={18} />
                      Kode akses mitra telah dikirim
                    </div>
                  ) : (
                    <button onClick={handleKirimEmail} disabled={kirimEmailLoading} style={{ ...btnPrimary, width:'100%', marginBottom:12, background:`linear-gradient(135deg,${GOLD},#B45309)`, height:48, display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:13, opacity: kirimEmailLoading ? 0.7 : 1, position:'relative', overflow:'hidden' }} className="btn-hover">
                      {kirimEmailLoading ? (
                        <>
                          <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation: 'spin 0.8s linear infinite' }} />
                          Mengirim email...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Kirim Kode Akses ke Email Mitra
                        </>
                      )}
                      {showPlaneAnimation && (
                        <div style={{ position:'absolute', top:'50%', left:'-10%', transform: 'translateY(-50%)', animation: 'planeFly 1.5s ease-in-out forwards' }}>
                          <Send size={24} style={{ color: '#fff', transform: 'rotate(-45deg)' }} />
                        </div>
                      )}
                    </button>
                  )
                ) : (
                  <div style={{ background:'#FFFBEB', borderRadius:10, padding:'10px 14px', fontSize:11, color:'#78350F', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    <AlertCircle size={14} />
                    <span>Mitra tidak mencantumkan email. Sampaikan kode <strong>{hasilGenerate.kodeAkses}</strong> secara manual{accItem.noWa ? ` (WA: ${accItem.noWa})` : ''}.</span>
                  </div>
                )}

                {accItem.email && (
                  <div style={{ background:'#EFF6FF', borderRadius:10, padding:'8px 12px', fontSize:11, color:BLUE_DARK, marginBottom:14, textAlign:'center' }}>
                    <Mail size={14} style={{ marginRight:6 }} />
                    Tujuan: {accItem.email}
                  </div>
                )}

                <button onClick={() => { setShowAcc(false); setAccItem(null); setHasilGenerate(null); setEmailTerkirim(false); setShowPlaneAnimation(false); }} style={{ ...btnSm, width:'100%' }} className="btn-hover">
                  Tutup
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:'#0f1f3d' }}>Setujui & Generate Kode</div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{accItem.namaInstitusi} · {accItem.jenis}</div>
                  </div>
                  <button onClick={() => { setShowAcc(false); setAccItem(null); setError(''); setShowPlaneAnimation(false); }} style={{ ...btnSm, padding:'4px 8px' }} className="btn-hover">
                    <X size={16} />
                  </button>
                </div>

                {error && (
                  <div style={{ ...msgBox('#991B1B','#FEE2E2'), display:'flex', alignItems:'center', gap:6, animation: 'shake 0.4s ease-out' }}>
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <div style={{ background:'#F5F1E8', borderRadius:12, padding:'12px 16px', marginBottom:16, border:'1px solid rgba(29,78,216,0.08)' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5, display:'flex', alignItems:'center', gap:6 }}>
                    <FileText size={14} />
                    Data Pengajuan
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:12 }}>
                    <div style={dField}><span style={dLabel}>Nama Institusi</span><span style={{ fontWeight:600 }}>{accItem.namaInstitusi}</span></div>
                    <div style={dField}><span style={dLabel}>Jenis</span><span>{accItem.jenis}</span></div>
                    {(accItem.divisi || []).length > 0 && <div style={dField}><span style={dLabel}>Divisi</span><span>{(accItem.divisi || []).map(divisiLabel).join(', ')}</span></div>}
                    {accItem.jurusan && <div style={dField}><span style={dLabel}>Jurusan/Prodi</span><span>{accItem.jurusan}</span></div>}
                    {accItem.email && <div style={dField}><span style={dLabel}>Email</span><span>{accItem.email}</span></div>}
                    {accItem.noWa && <div style={dField}><span style={dLabel}>WhatsApp</span><span>{accItem.noWa}</span></div>}
                    <div style={{ ...dField, gridColumn:'1/-1' }}><span style={dLabel}>Deskripsi</span><span style={{ lineHeight:1.5 }}>{accItem.deskripsi}</span></div>
                  </div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}>
                    <Building size={14} style={{ marginRight:4 }} />
                    Divisi Penanganan <span style={{ color:'#DC2626' }}>*</span>
                    <span style={{ fontWeight:400, color:'#94a3b8', marginLeft:6, fontSize:10.5 }}>(wajib, pilih 1–{MAKS_DIVISI})</span>
                  </label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {DIVISI_LIST.map(dv => {
                      const dvArr = accItem.divisi || [];
                      const checked = dvArr.includes(dv.key);
                      const disabled = !checked && dvArr.length >= MAKS_DIVISI;
                      return (
                        <button key={dv.key} type="button" disabled={disabled} onClick={() => toggleDivisi(accItem, dv.key)}
                          style={{
                            padding:'9px 10px', borderRadius:10, cursor: disabled ? 'not-allowed' : 'pointer',
                            fontFamily:FONT, fontSize:12, textAlign:'left',
                            border:`1.5px solid ${checked ? dv.color : 'rgba(29,78,216,0.10)'}`,
                            background: checked ? dv.bg : '#fff',
                            color: checked ? dv.color : '#334155',
                            fontWeight: checked ? 700 : 500,
                            opacity: disabled ? 0.4 : 1,
                          }} className="btn-hover">
                          {dv.label}
                        </button>
                      );
                    })}
                  </div>
                  {(accItem.divisi || []).length === 0 && (
                    <div style={{ fontSize:10.5, color:'#DC2626', marginTop:6 }}>Belum ada divisi dipilih — wajib diisi sebelum generate.</div>
                  )}
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}>
                    <Building size={14} style={{ marginRight:4 }} />
                    Mitra (dari daftar sistem)
                  </label>
                  <select style={inputFull} value={idMitraAcc} onChange={e => setIdMitraAcc(e.target.value)}>
                    <option value="">-- Belum terdaftar (akan dibuat otomatis) --</option>
                    {mitraList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>
                    {idMitraAcc ? 'Otomatis ter-pilih ke mitra yang namanya cocok di sistem.' : 'Tidak ada mitra yang cocok — akan dibuat baru otomatis.'}
                  </div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}>
                    <FileText size={14} style={{ marginRight:4 }} />
                    Template Dokumen {accItem.jenis}
                  </label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <button type="button" onClick={() => setPilihanTemplate('bnn')} style={{
                      padding:'12px', borderRadius:12, cursor:'pointer', fontFamily:FONT, textAlign:'left',
                      border:`1.5px solid ${pilihanTemplate==='bnn'?BLUE:'rgba(29,78,216,0.10)'}`,
                      background: pilihanTemplate==='bnn' ? '#EFF6FF' : '#fff',
                    }} className="btn-hover">
                      <Landmark size={20} style={{ color: BLUE, marginBottom:4 }} />
                      <div style={{ fontSize:12, fontWeight:700, color:pilihanTemplate==='bnn'?BLUE_DARK:'#334155' }}>Template Resmi BNN</div>
                      <div style={{ fontSize:10, color:'#64748b', marginTop:2, lineHeight:1.4 }}>Gunakan template standar BNN Provinsi</div>
                    </button>
                    <button type="button"
                      onClick={() => accItem.fileDokumenId && setPilihanTemplate('mitra')}
                      disabled={!accItem.fileDokumenId}
                      style={{
                        padding:'12px', borderRadius:12, cursor:accItem.fileDokumenId?'pointer':'not-allowed', fontFamily:FONT, textAlign:'left',
                        border:`1.5px solid ${pilihanTemplate==='mitra'?GOLD:'rgba(29,78,216,0.10)'}`,
                        background: pilihanTemplate==='mitra' ? '#FFFBEB' : '#fff',
                        opacity: accItem.fileDokumenId ? 1 : 0.5,
                      }} className="btn-hover">
                      <FileText size={20} style={{ color: GOLD, marginBottom:4 }} />
                      <div style={{ fontSize:12, fontWeight:700, color:pilihanTemplate==='mitra'?'#92400E':'#334155' }}>Dokumen Mitra</div>
                      {accItem.fileDokumenId ? (
                        <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{accItem.fileDokumenNama || 'File terlampir'}</div>
                      ) : (
                        <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>Mitra tidak upload dokumen</div>
                      )}
                    </button>
                  </div>

                  {accItem.fileDokumenId && (
                    <div style={{ marginTop:10, border:'1px solid rgba(29,78,216,0.10)', borderRadius:12, overflow:'hidden', background:'#fff' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#F5F1E8', borderBottom:'1px solid rgba(29,78,216,0.08)' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:BLUE_DARK, display:'flex', alignItems:'center', gap:6 }}>
                          <Eye size={14} />
                          Preview Dokumen Mitra
                        </span>
                        <button type="button" onClick={() => setPreviewMitra(true)} style={{ ...btnSm, padding:'4px 10px', fontSize:11, display:'flex', alignItems:'center', gap:4 }} className="btn-hover">
                          <ExternalLink size={12} />
                          Buka Penuh
                        </button>
                      </div>
                      <iframe src={`https://docs.google.com/document/d/${accItem.fileDokumenId}/preview`} style={{ width:'100%', height:200, border:'none', display:'block' }} title="Preview dokumen mitra" />
                    </div>
                  )}
                </div>

                <div style={{ marginBottom:10 }}>
                  <label style={labelSt}>
                    <FileText size={14} style={{ marginRight:4 }} />
                    Judul Dokumen <span style={{ color:'#DC2626' }}>*</span>
                  </label>
                  <input style={inputFull} value={judulDok} onChange={e => setJudulDok(e.target.value)} placeholder="Contoh: Kerja Sama P4GN di Lingkungan Kampus" />
                </div>

                <div style={{ marginBottom:16 }}>
                  <label style={labelSt}>
                    <Clock size={14} style={{ marginRight:4 }} />
                    Tanggal Acc (Mulai Berlaku)
                  </label>
                  <div style={{ ...inputFull, background:'#f1f3f2', color:'#5b6b66', display:'flex', alignItems:'center', cursor:'not-allowed' }}>
                    {new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>Otomatis = hari ini, tanggal Acc diklik. Tanggal berakhir bisa diisi admin belakangan lewat halaman detail dokumen.</div>
                </div>

                <button onClick={handleGenerateFromAcc} disabled={generating || !judulDok.trim() || (accItem.divisi || []).length === 0} style={{ ...btnPrimary, width:'100%', height:48, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: (generating || !judulDok.trim() || (accItem.divisi || []).length === 0) ? 0.6 : 1 }} className="btn-hover">
                  {generating ? (
                    <>
                      <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation: 'spin 0.8s linear infinite' }} />
                      Membuat dokumen...
                    </>
                  ) : (
                    <>
                      <Key size={18} />
                      Setujui & Generate Kode Dokumen
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {previewMitra && accItem?.fileDokumenId && (
        <div style={{ ...overlay, zIndex:300 }} onClick={() => setPreviewMitra(false)}>
          <div style={{ background:'#fff', borderRadius:18, padding:0, width:'100%', maxWidth:840, height:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', animation: 'scaleIn 0.3s ease-out', boxShadow:'0 30px 70px -20px rgba(15,23,42,0.35)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid rgba(29,78,216,0.08)', flexShrink:0, background:'#f8fafc' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800, display:'flex', alignItems:'center', gap:8 }}>
                  <FileText size={18} />
                  Dokumen Mitra — {accItem.namaInstitusi}
                </div>
                <div style={{ fontSize:11, color:'#64748b' }}>{accItem.fileDokumenNama || 'File terlampir'}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {accItem.fileDokumenUrl && (
                  <a href={accItem.fileDokumenUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }} className="btn-hover">
                    <ExternalLink size={14} />
                    Buka di Docs
                  </a>
                )}
                <button onClick={() => setPreviewMitra(false)} style={{ ...btnSm, padding:'6px 12px', display:'flex', alignItems:'center', gap:4 }} className="btn-hover">
                  <X size={14} />
                  Tutup
                </button>
              </div>
            </div>
            <iframe src={`https://docs.google.com/document/d/${accItem.fileDokumenId}/preview`} style={{ width:'100%', flex:1, border:'none' }} title="Preview penuh dokumen mitra" />
          </div>
        </div>
      )}

      {detail && (
        <div style={overlay} onClick={() => { setDetail(null); setShowTolak(false); setShowUbah(false); }}>
          <div style={{ ...modalBox, maxWidth:540, animation: 'scaleIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            {error && (
              <div style={{ ...msgBox('#991B1B','#FEE2E2'), display:'flex', alignItems:'center', gap:6, animation: 'shake 0.4s ease-out' }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <div style={{ display:'flex', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:100, background:detail.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:detail.jenis==='MOU'?BLUE_DARK:'#92400E', display:'flex', alignItems:'center', gap:4 }}>
                    <FileText size={11} />
                    {detail.jenis}
                  </span>
                  <span style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:100, ...getStatusColor(detail.status), display:'flex', alignItems:'center', gap:4 }}>
                    {detail.status}
                  </span>
                </div>
                <div style={{ fontSize:16, fontWeight:800, color:'#0f1f3d' }}>{detail.namaInstitusi}</div>
              </div>
              <button onClick={() => { setDetail(null); setShowTolak(false); setShowUbah(false); }} style={{ ...btnSm, padding:'4px 8px' }} className="btn-hover">
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={labelSt}>
                <Building size={14} style={{ marginRight:4 }} />
                Divisi Penanganan <span style={{ fontWeight:400, color:'#94a3b8', fontSize:10 }}>(pilih 0–{MAKS_DIVISI})</span>
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {DIVISI_LIST.map(d => {
                  const dv = detail.divisi || [];
                  const checked = dv.includes(d.key);
                  const disabled = !checked && dv.length >= MAKS_DIVISI;
                  return (
                    <button key={d.key} type="button" disabled={disabled} onClick={() => toggleDivisi(detail, d.key)}
                      style={{
                        padding:'9px 10px', borderRadius:10, cursor: disabled ? 'not-allowed' : 'pointer',
                        fontFamily:FONT, fontSize:12, textAlign:'left',
                        border:`1.5px solid ${checked ? d.color : 'rgba(29,78,216,0.10)'}`,
                        background: checked ? d.bg : '#fff',
                        color: checked ? d.color : '#334155',
                        fontWeight: checked ? 700 : 500,
                        opacity: disabled ? 0.4 : 1,
                      }} className="btn-hover">
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14, fontSize:12 }}>
              <div style={dField}><span style={dLabel}>Deskripsi</span><span style={{ lineHeight:1.5 }}>{detail.deskripsi}</span></div>
              {detail.jurusan && <div style={dField}><span style={dLabel}>Jurusan</span><span>{detail.jurusan}</span></div>}
              {detail.email && <div style={dField}><span style={dLabel}>Email</span><span>{detail.email}</span></div>}
              {detail.noWa && <div style={dField}><span style={dLabel}>WhatsApp</span><span>{detail.noWa}</span></div>}
              <div style={dField}><span style={dLabel}>Submit</span><span>{detail.tglSubmit}</span></div>
              <div style={dField}><span style={dLabel}>Kode</span><span style={{ color:BLUE, fontWeight:700 }}>{detail.kodeTracking}</span></div>
            </div>

            {detail.fileDokumenId && (
              <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:12, padding:'12px 14px', marginBottom:14, fontSize:12 }}>
                <div style={{ fontWeight:700, color:BLUE_DARK, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                  <Paperclip size={14} />
                  Dokumen {detail.jenis} dari Mitra
                </div>
                <div style={{ color:'#64748b', marginBottom:8 }}>{detail.fileDokumenNama || 'File terlampir'}</div>
                <iframe src={`https://docs.google.com/document/d/${detail.fileDokumenId}/preview`} style={{ width:'100%', height:220, border:'1px solid #BFDBFE', borderRadius:10, background:'#fff', display:'block', marginBottom:6 }} title="Preview dokumen mitra" />
                {detail.fileDokumenUrl && (
                  <a href={detail.fileDokumenUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:BLUE_DARK, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                    <ExternalLink size={12} />
                    Buka di Google Docs
                  </a>
                )}
              </div>
            )}

            {detail.catatan && (
              <div style={{ fontSize:12, padding:'8px 12px', background:'#FFFBEB', borderRadius:10, marginBottom:14, color:'#78350F', display:'flex', alignItems:'flex-start', gap:6 }}>
                <MessageSquare size={14} style={{ flexShrink:0, marginTop:1 }} />
                {detail.catatan}
              </div>
            )}

            {showTolak && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:12, padding:'14px 16px', marginBottom:14, animation: 'fadeInUp 0.3s ease-out' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#991B1B', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <AlertCircle size={14} />
                  Alasan Penolakan
                </div>
                <textarea style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px solid #FCA5A5', fontSize:12, fontFamily:FONT, height:70, resize:'none', boxSizing:'border-box', background:'#fff' }}
                  value={alasanTolak} onChange={e => setAlasanTolak(e.target.value)} placeholder="Jelaskan alasan penolakan dengan jelas..." autoFocus />
              </div>
            )}

            {showUbah && (
              <div style={{ background:'#F5F1E8', border:'1px solid rgba(29,78,216,0.08)', borderRadius:12, padding:'14px 16px', marginBottom:14, animation: 'fadeInUp 0.3s ease-out' }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>Ubah Status</div>
                <select style={{ ...inputFull, marginBottom:8 }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <textarea style={{ ...inputFull, height:55, resize:'none' }} value={catatanUbah} onChange={e => setCatatanUbah(e.target.value)} placeholder="Catatan (opsional)" />
              </div>
            )}

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {!showTolak && !showUbah && !['Ditolak','Kegiatan Selesai','Disetujui'].includes(detail.status) && (
                <>
                  <button onClick={() => openAcc(detail)} style={{ ...btnPrimary, flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }} className="btn-hover">
                    <Check size={16} />
                    Acc & Generate Kode
                  </button>
                  <button onClick={() => setShowTolak(true)} style={{ ...btnSm, background:'#FEE2E2', color:'#991B1B', borderColor:'#FCA5A5', flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }} className="btn-hover">
                    <X size={14} />
                    Tolak
                  </button>
                  <button onClick={() => setShowUbah(true)} style={{ ...btnSm, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }} className="btn-hover">
                    <Edit size={14} />
                    Ubah Status
                  </button>
                </>
              )}
              {showTolak && (
                <>
                  <button onClick={handleTolak} disabled={submitting} style={{ ...btnPrimary, background:'#DC2626', flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity: submitting ? 0.7 : 1 }} className="btn-hover">
                    {submitting ? (
                      <>
                        <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation: 'spin 0.8s linear infinite' }} />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <X size={16} />
                        Konfirmasi Tolak
                      </>
                    )}
                  </button>
                  <button onClick={() => { setShowTolak(false); setAlasanTolak(''); }} style={btnSm} className="btn-hover">Batal</button>
                </>
              )}
              {showUbah && (
                <>
                  <button onClick={handleUbahStatus} disabled={submitting} style={{ ...btnPrimary, flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity: submitting ? 0.7 : 1 }} className="btn-hover">
                    {submitting ? (
                      <>
                        <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation: 'spin 0.8s linear infinite' }} />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Simpan Status
                      </>
                    )}
                  </button>
                  <button onClick={() => { setShowUbah(false); setCatatanUbah(''); }} style={btnSm} className="btn-hover">Batal</button>
                </>
              )}
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
      @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeInDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
      @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
      @keyframes spin { to{transform:rotate(360deg)} }
      @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
      @keyframes planeFly { 0%{left:-10%;opacity:0;transform:translateY(-50%) scale(0.5)} 20%{opacity:1;transform:translateY(-50%) scale(1)} 80%{opacity:1;transform:translateY(-50%) scale(1)} 100%{left:110%;opacity:0;transform:translateY(-50%) scale(0.5)} }
      .fld { animation: fadeInUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all .3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { filter:brightness(1.05); transform:translateY(-1px); }
      @media (min-width: 901px) {
        .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
      }
    `}</style>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.72)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:100, padding:'9px 10px 9px 18px', boxShadow:'0 10px 26px -18px rgba(15,23,42,0.25)' };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#64748b', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:100 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', borderRadius:20, padding:6, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const searchInput: React.CSSProperties = { width:'100%', padding:'10px 12px 10px 36px', borderRadius:11, border:'1.5px solid rgba(29,78,216,0.10)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', background:'#F5F1E8', outline:'none' };
const card: React.CSSProperties = { background:'#fff', borderRadius:14, padding:'1rem 1.25rem', border:'1px solid rgba(29,78,216,0.08)', boxShadow:'0 1px 4px rgba(15,23,42,.04)' };
const labelSt: React.CSSProperties = { display:'flex', alignItems:'center', fontSize:11, fontWeight:700, color:'#334155', marginBottom:5 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', background:'#F5F1E8', outline:'none' };
const btnPrimary: React.CSSProperties = { padding:'9px 18px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:`0 6px 16px -6px ${BLUE}60` };
const btnSm: React.CSSProperties = { padding:'8px 14px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', color:'#334155', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap' };
const btnOutline: React.CSSProperties = { fontSize:12, padding:'8px 15px', borderRadius:100, border:'1.5px solid rgba(29,78,216,0.10)', textDecoration:'none', color:'#334155', background:'#fff', display:'flex', alignItems:'center', gap:5, fontWeight:600 };
const overlay: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(15,23,42,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'1rem', backdropFilter:'blur(4px)' };
const modalBox: React.CSSProperties = { background:'#fff', borderRadius:20, padding:'1.75rem', width:'100%', maxWidth:480, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 30px 70px -20px rgba(15,23,42,0.3)' };
const dField: React.CSSProperties = { display:'flex', flexDirection:'column', gap:2, background:'#F5F1E8', borderRadius:10, padding:'8px 10px' };
const dLabel: React.CSSProperties = { fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.3, fontWeight:600 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:12, marginBottom:12 });
const chipDivisi = (active: boolean, color: string): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 100, borderWidth:1.5, borderStyle:'solid', fontSize: 11, cursor: 'pointer', fontFamily: FONT,
  fontWeight: active ? 700 : 500, background: active ? color : '#fff', color: active ? '#fff' : '#334155',
  borderColor: active ? 'transparent' : 'rgba(29,78,216,0.10)',
});
const divisiPopover: React.CSSProperties = { position:'absolute', top:'100%', right:0, marginTop:6, background:'#fff', border:'1px solid rgba(29,78,216,0.08)', borderRadius:12, padding:'10px 12px', boxShadow:'0 12px 30px -10px rgba(15,23,42,.25)', zIndex:50, display:'flex', flexDirection:'row', flexWrap:'wrap', gap:6, minWidth:260, maxWidth:300 };
const iconToolBtn: React.CSSProperties = { position:'relative', width:32, height:32, borderRadius:10, border:'1.5px solid rgba(29,78,216,0.10)', background:'#fff', color:'#334155', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const iconToolBadge: React.CSSProperties = { position:'absolute', top:-4, right:-4, minWidth:14, height:14, padding:'0 3px', borderRadius:100, background:BLUE, color:'#fff', fontSize:8.5, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid #fff' };