'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, FileText, Search, Filter, Eye, Check, X, Edit, Save, Send,
  Mail, Phone, Calendar, DollarSign, Building, GraduationCap, Clipboard,
  Copy, CheckCircle, AlertCircle, Clock, Tag, ExternalLink,
  ChevronDown, ChevronUp, Info, Key, Briefcase, MessageSquare, Paperclip,
  Target, List, Landmark,
} from 'lucide-react';

interface PengajuanItem {
  id: string; namaInstitusi: string; jenis: string; deskripsi: string;
  tanggalKegiatan: string; biaya: string; email: string; noWa: string;
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

const BLUE = '#1D4ED8';
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

// Backend lama (/api/pengajuan/status) masih bisa kirim divisi sebagai string tunggal,
// sementara backend baru (/api/pengajuan/divisi) kirim array. Normalisasi di sini
// supaya kode UI selalu bisa aman panggil .map()/.includes() tanpa peduli sumbernya.
function toDivisiArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

const DURASI_OPTS = [5,6,7,8,9,10];

export default function PengajuanPage() {
  const [role, setRole]           = useState('');
  const [data, setData]           = useState<PengajuanItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [msg, setMsg]             = useState('');
  const [search, setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState('semua');
  const [filterDivisi, setFilterDivisi] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [openDivisiPicker, setOpenDivisiPicker] = useState<string | null>(null);

  // Detail modal
  const [detail, setDetail]           = useState<PengajuanItem | null>(null);
  const [showTolak, setShowTolak]     = useState(false);
  const [alasanTolak, setAlasanTolak] = useState('');
  const [showUbah, setShowUbah]       = useState(false);
  const [newStatus, setNewStatus]     = useState('');
  const [catatanUbah, setCatatanUbah] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  // Modal Acc Lengkap
  const [showAcc, setShowAcc]         = useState(false);
  const [accItem, setAccItem]         = useState<PengajuanItem | null>(null);
  const [pilihanTemplate, setPilihanTemplate] = useState<'bnn'|'mitra'>('bnn');
  const [judulDok, setJudulDok]       = useState('');
  const [durasiDok, setDurasiDok]     = useState(5);
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

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
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
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    load();
    fetch('/api/superadmin/mitra').then(r => r.json()).then(d => setMitraList(d.data || []));
  }, [load]);

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

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

  // Toggle satu divisi dari array pengajuan (maks 4) — auto-save tiap klik
  const toggleDivisi = async (item: PengajuanItem, key: string) => {
    const current = item.divisi || [];
    const next = current.includes(key)
      ? current.filter(d => d !== key)
      : (current.length < MAKS_DIVISI ? [...current, key] : current);
    if (next === current) return; // sudah penuh & tidak toggle-off

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
    } catch { setError('Gagal mengubah divisi.'); }
  };

  const openAcc = (item: PengajuanItem) => {
    setAccItem(item);
    setDetail(null);
    setPilihanTemplate('bnn');
    setHasilGenerate(null);
    setError('');
    setJudulDok(item.deskripsi?.slice(0, 60) || '');
    setDurasiDok(5);
    // Auto-match ke mitra yang namanya cocok. Kalau tidak ketemu, KOSONGKAN
    // (jangan jatuh ke mitra pertama di daftar — itu bug lama).
    const cocok = mitraList.find(m => m.nama.toLowerCase() === item.namaInstitusi.toLowerCase());
    setIdMitraAcc(cocok?.id || '');
    setShowAcc(true);
    setEmailTerkirim(false);
    setShowPlaneAnimation(false);
  };

  const handleGenerateFromAcc = async () => {
    if (!accItem) return;
    if (!judulDok.trim()) { setError('Judul dokumen wajib diisi.'); return; }
    setGenerating(true); setError('');
    setEmailTerkirim(false);
    setShowPlaneAnimation(false);
    const mitraCocok = mitraList.find(m => m.id === idMitraAcc);
    const namaMitra  = mitraCocok?.nama || accItem.namaInstitusi;
    try {
      await fetch('/api/pengajuan/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipe: 'pengajuan', id: accItem.id, statusBaru: 'Disetujui',
          catatan: `Disetujui. Template: ${pilihanTemplate === 'mitra' ? 'Dokumen mitra' : 'Template resmi BNN'}.`,
        }),
      });
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipeKode: 'dokumen', idMitra: idMitraAcc || '', namaMitra,
          namaPIC: '', jabatanPIC: '', jenis: accItem.jenis, judul: judulDok.trim(),
          durasiTahun: durasiDok, dibuatOleh: role,
          templateMitraId: pilihanTemplate === 'mitra' ? (accItem.fileDokumenId || '') : '',
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || d.error || 'Gagal generate kode.'); return; }
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
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'sans-serif', color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat pengajuan...</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f8fafc,#eaf1fc)', fontFamily:'sans-serif' }}>
      <nav style={navStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href={backUrl} style={backLink}>
            <ArrowLeft size={16} />
            Dashboard
          </a>
          <span style={{ color:'#e2e8f0' }}>|</span>
          <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
            <FileText size={18} style={{ color: BLUE }} />
            Kelola Pengajuan
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <a href="/dashboard/rencana" style={btnOutline}>
            <Briefcase size={14} style={{ marginRight:4 }} />
            E-Planning
          </a>
          <a href="/pengajuan" target="_blank" rel="noopener noreferrer" style={btnOutline}>
            <ExternalLink size={14} style={{ marginRight:4 }} />
            Form Publik
          </a>
        </div>
      </nav>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'1.25rem' }}>
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

        <div style={{ position:'relative', marginBottom:12 }}>
          <Search size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
          <input
            style={{ width:'100%', padding:'10px 12px 10px 36px', borderRadius:10, border:'2px solid #e2e8f0', fontSize:12, fontFamily:'sans-serif', boxSizing:'border-box', background:'#f8fafc' }}
            placeholder="Cari institusi, kode tracking, jenis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:4, borderRadius:'50%' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter status */}
        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap', padding:'4px', background:'#eef2f6', borderRadius:12 }}>
          {countPerFilter.map(f => {
            const isActive = activeFilter === f.key;
            const Icon = f.icon;
            return (
              <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
                padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, cursor:'pointer', fontFamily:'sans-serif',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? BLUE : 'transparent',
                color: isActive ? '#fff' : '#334155',
                display:'flex', alignItems:'center', gap:6,
                boxShadow: isActive ? `0 2px 8px ${BLUE}30` : 'none',
              }}>
                <Icon size={14} />
                {f.label}
                <span style={{ marginLeft:2, fontSize:10, background: isActive ? 'rgba(255,255,255,.2)' : '#e2e8f0', padding:'1px 8px', borderRadius:100, color: isActive ? '#fff' : '#64748b' }}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter divisi */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', alignItems:'center', padding:'6px 10px', background:'#fff', borderRadius:10, border:'1px solid #e2e8f0' }}>
          <Filter size={14} style={{ color:'#64748b' }} />
          <span style={{ fontSize:11, color:'#64748b', marginRight:4 }}>Divisi:</span>
          <button onClick={() => setFilterDivisi('')} style={chipDivisi(filterDivisi === '', '#334155')}>Semua</button>
          <button onClick={() => setFilterDivisi('belum')} style={chipDivisi(filterDivisi === 'belum', GOLD)}>Belum Ditetapkan</button>
          {DIVISI_LIST.map(dv => {
            const count = data.filter(d => (d.divisi || []).includes(dv.key)).length;
            return (
              <button key={dv.key} onClick={() => setFilterDivisi(dv.key)} style={chipDivisi(filterDivisi === dv.key, dv.color)}>
                {dv.label} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign:'center', padding:'3rem', color:'#94a3b8', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'#eef2f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FileText size={32} style={{ color:'#cbd5e1' }} />
            </div>
            <div style={{ fontSize:14, fontWeight:500 }}>Tidak ada pengajuan pada filter ini.</div>
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

              return (
                <div key={item.id} style={{ ...card, animation: `fadeInUp 0.4s ease-out ${index * 0.03}s both` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:100, background:item.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:item.jenis==='MOU'?BLUE_DARK:'#92400E', display:'flex', alignItems:'center', gap:4 }}>
                          <FileText size={11} />
                          {item.jenis}
                        </span>
                        <span style={{ fontSize:10, fontWeight:500, padding:'3px 10px', borderRadius:100, background:sc.bg, color:sc.color, display:'flex', alignItems:'center', gap:4 }}>
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

                      <div style={{ fontSize:15, fontWeight:700, color:'#0f1f3d' }}>{item.namaInstitusi}</div>

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
                            <div style={{ fontSize:11, color:'#64748b', marginTop:4, display:'flex', gap:14, flexWrap:'wrap', background:'#f8fafc', padding:'4px 10px', borderRadius:8 }}>
                              {item.email && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Mail size={12} />{item.email}</span>}
                              {item.noWa && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Phone size={12} />{item.noWa}</span>}
                              {item.biaya && <span style={{ display:'flex', alignItems:'center', gap:4 }}><DollarSign size={12} />Rp {item.biaya}</span>}
                            </div>
                          )}
                          {item.catatan && (
                            <div style={{ fontSize:11, color:'#92400E', background:'#FFFBEB', padding:'6px 10px', borderRadius:8, marginTop:6, display:'flex', alignItems:'flex-start', gap:4 }}>
                              <MessageSquare size={12} style={{ flexShrink:0, marginTop:1 }} />
                              {item.catatan}
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:6, display:'flex', gap:14, flexWrap:'wrap' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clipboard size={12} />Kode: <strong style={{ color:BLUE }}>{item.kodeTracking}</strong></span>
                        <span style={{ display:'flex', alignItems:'center', gap:4 }}><Calendar size={12} />Submit: {item.tglSubmit}</span>
                        {item.tanggalKegiatan && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Target size={12} />Tgl: {item.tanggalKegiatan}</span>}
                      </div>
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0, minWidth:120, position:'relative' }}>
                      <button onClick={() => openDetail(item)} style={{ ...btnSm, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }} className="btn-hover">
                        <Eye size={14} />
                        Detail
                      </button>

                      <button onClick={() => setOpenDivisiPicker(pickerOpen ? null : item.id)} style={{ ...btnSm, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }} className="btn-hover">
                        <Building size={13} />
                        Divisi ({dv.length})
                      </button>
                      {pickerOpen && (
                        <div style={divisiPopover}>
                          {DIVISI_LIST.map(d => {
                            const checked = dv.includes(d.key);
                            const disabled = !checked && dv.length >= MAKS_DIVISI;
                            return (
                              <label key={d.key} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 4px', fontSize:11, color: disabled ? '#cbd5e1' : '#334155', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleDivisi(item, d.key)} style={{ accentColor: d.color, width:13, height:13 }} />
                                {d.label}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {!['Disetujui','Ditolak','Kegiatan Selesai'].includes(item.status) && (
                        <>
                          <button onClick={() => openAcc(item)} style={{ ...btnSm, background:'#DBEAFE', color:BLUE_DARK, borderColor:'#93C5FD', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }} className="btn-hover">
                            <Check size={14} />
                            Acc
                          </button>
                          <button onClick={() => { openDetail(item); setShowTolak(true); }} style={{ ...btnSm, background:'#FEE2E2', color:'#991B1B', borderColor:'#FCA5A5', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }} className="btn-hover">
                            <X size={14} />
                            Tolak
                          </button>
                        </>
                      )}
                      <button onClick={() => toggleExpand(item.id)} style={{ ...btnSm, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }} className="btn-hover">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'Sembunyikan' : 'Detail'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════ MODAL ACC LENGKAP ════ */}
      {showAcc && accItem && (
        <div style={overlay} onClick={() => { if (!generating) { setShowAcc(false); setAccItem(null); setHasilGenerate(null); setError(''); setPreviewMitra(false); setShowPlaneAnimation(false); } }}>
          <div style={{ ...modalBox, maxWidth:600, animation: 'scaleIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            {hasilGenerate ? (
              <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:64, height:64, borderRadius:'50%', background:`linear-gradient(135deg, #2563EB, ${BLUE_DARK})`, marginBottom:12, boxShadow:`0 4px 20px ${BLUE}40` }}>
                    <CheckCircle size={32} style={{ color:'#fff' }} />
                  </div>
                  <div style={{ fontSize:18, fontWeight:700, color:BLUE }}>Kode Dokumen Berhasil Dibuat!</div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{accItem.namaInstitusi} · {accItem.jenis}</div>
                </div>

                <div style={{ background:'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border:'2px solid #93C5FD', borderRadius:12, padding:'1.5rem', marginBottom:16, textAlign:'center', boxShadow:`0 2px 12px ${BLUE}20` }}>
                  <div style={{ fontSize:10, color:BLUE_DARK, marginBottom:6, textTransform:'uppercase', letterSpacing:1.5, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <Key size={14} />
                    Kode Akses Dokumen
                  </div>
                  <div style={{ fontSize:28, fontWeight:800, letterSpacing:4, color:BLUE_DARK, marginBottom:12, fontFamily:'monospace', background:'rgba(255,255,255,.6)', padding:'8px 16px', borderRadius:8, display:'inline-block' }}>
                    {hasilGenerate.kodeAkses}
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(hasilGenerate.kodeAkses)} style={{ ...btnPrimary, display:'inline-flex', alignItems:'center', gap:6, padding:'8px 20px' }} className="btn-hover">
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
                    <div style={{ background:'#DBEAFE', borderRadius:8, padding:'12px 16px', fontSize:13, color:BLUE_DARK, marginBottom:14, textAlign:'center', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8, animation: 'fadeInUp 0.4s ease-out' }}>
                      <CheckCircle size={18} />
                      Email kode akses terkirim ke {accItem.email}
                    </div>
                  ) : (
                    <button onClick={handleKirimEmail} disabled={kirimEmailLoading} style={{ ...btnPrimary, width:'100%', marginBottom:12, background:GOLD, height:48, display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:13, opacity: kirimEmailLoading ? 0.7 : 1, position:'relative', overflow:'hidden' }} className="btn-hover">
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
                  <div style={{ background:'#FFFBEB', borderRadius:8, padding:'10px 14px', fontSize:11, color:'#78350F', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    <AlertCircle size={14} />
                    <span>Mitra tidak mencantumkan email. Sampaikan kode <strong>{hasilGenerate.kodeAkses}</strong> secara manual{accItem.noWa ? ` (WA: ${accItem.noWa})` : ''}.</span>
                  </div>
                )}

                {accItem.email && (
                  <div style={{ background:'#EFF6FF', borderRadius:8, padding:'8px 12px', fontSize:11, color:BLUE_DARK, marginBottom:14, textAlign:'center' }}>
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
                    <div style={{ fontSize:16, fontWeight:700, color:'#0f1f3d' }}>Setujui & Generate Kode</div>
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

                <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 16px', marginBottom:16, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#64748b', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5, display:'flex', alignItems:'center', gap:6 }}>
                    <FileText size={14} />
                    Data Pengajuan
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:12 }}>
                    <div style={dField}><span style={dLabel}>Nama Institusi</span><span style={{ fontWeight:500 }}>{accItem.namaInstitusi}</span></div>
                    <div style={dField}><span style={dLabel}>Jenis</span><span>{accItem.jenis}</span></div>
                    {(accItem.divisi || []).length > 0 && <div style={dField}><span style={dLabel}>Divisi</span><span>{(accItem.divisi || []).map(divisiLabel).join(', ')}</span></div>}
                    {accItem.jurusan && <div style={dField}><span style={dLabel}>Jurusan/Prodi</span><span>{accItem.jurusan}</span></div>}
                    {accItem.tanggalKegiatan && <div style={dField}><span style={dLabel}>Tgl Rencana</span><span>{accItem.tanggalKegiatan}</span></div>}
                    {accItem.biaya && <div style={dField}><span style={dLabel}>Estimasi Biaya</span><span>Rp {accItem.biaya}</span></div>}
                    {accItem.email && <div style={dField}><span style={dLabel}>Email</span><span>{accItem.email}</span></div>}
                    {accItem.noWa && <div style={dField}><span style={dLabel}>WhatsApp</span><span>{accItem.noWa}</span></div>}
                    <div style={{ ...dField, gridColumn:'1/-1' }}><span style={dLabel}>Deskripsi</span><span style={{ lineHeight:1.5 }}>{accItem.deskripsi}</span></div>
                  </div>
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
                      padding:'12px', borderRadius:10, cursor:'pointer', fontFamily:'sans-serif', textAlign:'left',
                      border:`2px solid ${pilihanTemplate==='bnn'?BLUE:'#e2e8f0'}`,
                      background: pilihanTemplate==='bnn' ? '#EFF6FF' : '#fff',
                    }}>
                      <Landmark size={20} style={{ color: BLUE, marginBottom:4 }} />
                      <div style={{ fontSize:12, fontWeight:600, color:pilihanTemplate==='bnn'?BLUE_DARK:'#334155' }}>Template Resmi BNN</div>
                      <div style={{ fontSize:10, color:'#64748b', marginTop:2, lineHeight:1.4 }}>Gunakan template standar BNN Provinsi</div>
                    </button>
                    <button type="button"
                      onClick={() => accItem.fileDokumenId && setPilihanTemplate('mitra')}
                      disabled={!accItem.fileDokumenId}
                      style={{
                        padding:'12px', borderRadius:10, cursor:accItem.fileDokumenId?'pointer':'not-allowed', fontFamily:'sans-serif', textAlign:'left',
                        border:`2px solid ${pilihanTemplate==='mitra'?GOLD:'#e2e8f0'}`,
                        background: pilihanTemplate==='mitra' ? '#FFFBEB' : '#fff',
                        opacity: accItem.fileDokumenId ? 1 : 0.5,
                      }}>
                      <FileText size={20} style={{ color: GOLD, marginBottom:4 }} />
                      <div style={{ fontSize:12, fontWeight:600, color:pilihanTemplate==='mitra'?'#92400E':'#334155' }}>Dokumen Mitra</div>
                      {accItem.fileDokumenId ? (
                        <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{accItem.fileDokumenNama || 'File terlampir'}</div>
                      ) : (
                        <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>Mitra tidak upload dokumen</div>
                      )}
                    </button>
                  </div>

                  {accItem.fileDokumenId && (
                    <div style={{ marginTop:10, border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden', background:'#fff' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                        <span style={{ fontSize:11, fontWeight:600, color:BLUE_DARK, display:'flex', alignItems:'center', gap:6 }}>
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
                    Durasi Berlaku
                  </label>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {DURASI_OPTS.map(d => (
                      <button key={d} type="button" onClick={() => setDurasiDok(d)} style={{
                        padding:'6px 14px', borderRadius:7, border:`2px solid ${durasiDok===d?BLUE:'#e2e8f0'}`,
                        background: durasiDok===d ? BLUE : '#fff',
                        color: durasiDok===d ? '#fff' : '#334155',
                        fontSize:12, cursor:'pointer', fontFamily:'sans-serif', fontWeight:durasiDok===d?600:400,
                      }}>{d} th</button>
                    ))}
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>Minimal 5 tahun</div>
                </div>

                <button onClick={handleGenerateFromAcc} disabled={generating || !judulDok.trim()} style={{ ...btnPrimary, width:'100%', height:48, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: (generating || !judulDok.trim()) ? 0.7 : 1 }} className="btn-hover">
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

      {/* ════ MODAL PREVIEW PENUH DOKUMEN MITRA ════ */}
      {previewMitra && accItem?.fileDokumenId && (
        <div style={{ ...overlay, zIndex:300 }} onClick={() => setPreviewMitra(false)}>
          <div style={{ background:'#fff', borderRadius:14, padding:0, width:'100%', maxWidth:840, height:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', animation: 'scaleIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid #e2e8f0', flexShrink:0, background:'#f8fafc' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
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

      {/* Modal detail */}
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
                  <span style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:100, background:detail.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:detail.jenis==='MOU'?BLUE_DARK:'#92400E', display:'flex', alignItems:'center', gap:4 }}>
                    <FileText size={11} />
                    {detail.jenis}
                  </span>
                  <span style={{ fontSize:10, fontWeight:500, padding:'3px 10px', borderRadius:100, ...getStatusColor(detail.status), display:'flex', alignItems:'center', gap:4 }}>
                    {detail.status}
                  </span>
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:'#0f1f3d' }}>{detail.namaInstitusi}</div>
              </div>
              <button onClick={() => { setDetail(null); setShowTolak(false); setShowUbah(false); }} style={{ ...btnSm, padding:'4px 8px' }} className="btn-hover">
                <X size={16} />
              </button>
            </div>

            {/* Assign divisi di modal — multi-pilih maks 4 */}
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
                        padding:'9px 10px', borderRadius:9, cursor: disabled ? 'not-allowed' : 'pointer',
                        fontFamily:'sans-serif', fontSize:12, textAlign:'left',
                        border:`2px solid ${checked ? d.color : '#e2e8f0'}`,
                        background: checked ? d.bg : '#fff',
                        color: checked ? d.color : '#334155',
                        fontWeight: checked ? 600 : 400,
                        opacity: disabled ? 0.4 : 1,
                      }}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14, fontSize:12 }}>
              <div style={dField}><span style={dLabel}>Deskripsi</span><span style={{ lineHeight:1.5 }}>{detail.deskripsi}</span></div>
              {detail.jurusan && <div style={dField}><span style={dLabel}>Jurusan</span><span>{detail.jurusan}</span></div>}
              {detail.tanggalKegiatan && <div style={dField}><span style={dLabel}>Tgl Kegiatan</span><span>{detail.tanggalKegiatan}</span></div>}
              {detail.biaya && <div style={dField}><span style={dLabel}>Biaya</span><span>Rp {detail.biaya}</span></div>}
              {detail.email && <div style={dField}><span style={dLabel}>Email</span><span>{detail.email}</span></div>}
              {detail.noWa && <div style={dField}><span style={dLabel}>WhatsApp</span><span>{detail.noWa}</span></div>}
              <div style={dField}><span style={dLabel}>Submit</span><span>{detail.tglSubmit}</span></div>
              <div style={dField}><span style={dLabel}>Kode</span><span style={{ color:BLUE, fontWeight:600 }}>{detail.kodeTracking}</span></div>
            </div>

            {detail.fileDokumenId && (
              <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'12px 14px', marginBottom:14, fontSize:12 }}>
                <div style={{ fontWeight:600, color:BLUE_DARK, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                  <Paperclip size={14} />
                  Dokumen {detail.jenis} dari Mitra
                </div>
                <div style={{ color:'#64748b', marginBottom:8 }}>{detail.fileDokumenNama || 'File terlampir'}</div>
                <iframe src={`https://docs.google.com/document/d/${detail.fileDokumenId}/preview`} style={{ width:'100%', height:220, border:'1px solid #BFDBFE', borderRadius:8, background:'#fff', display:'block', marginBottom:6 }} title="Preview dokumen mitra" />
                {detail.fileDokumenUrl && (
                  <a href={detail.fileDokumenUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:BLUE_DARK, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                    <ExternalLink size={12} />
                    Buka di Google Docs
                  </a>
                )}
              </div>
            )}

            {detail.catatan && (
              <div style={{ fontSize:12, padding:'8px 12px', background:'#FFFBEB', borderRadius:8, marginBottom:14, color:'#78350F', display:'flex', alignItems:'flex-start', gap:6 }}>
                <MessageSquare size={14} style={{ flexShrink:0, marginTop:1 }} />
                {detail.catatan}
              </div>
            )}

            {showTolak && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'14px 16px', marginBottom:14, animation: 'fadeInUp 0.3s ease-out' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#991B1B', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <AlertCircle size={14} />
                  Alasan Penolakan
                </div>
                <textarea style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #FCA5A5', fontSize:12, fontFamily:'sans-serif', height:70, resize:'none', boxSizing:'border-box', background:'#fff' }}
                  value={alasanTolak} onChange={e => setAlasanTolak(e.target.value)} placeholder="Jelaskan alasan penolakan dengan jelas..." autoFocus />
              </div>
            )}

            {showUbah && (
              <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 16px', marginBottom:14, animation: 'fadeInUp 0.3s ease-out' }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Ubah Status</div>
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

      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeInDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @keyframes planeFly { 0%{left:-10%;opacity:0;transform:translateY(-50%) scale(0.5)} 20%{opacity:1;transform:translateY(-50%) scale(1)} 80%{opacity:1;transform:translateY(-50%) scale(1)} 100%{left:110%;opacity:0;transform:translateY(-50%) scale(0.5)} }
        .btn-hover { transition: all .25s ease; }
        .btn-hover:hover:not(:disabled) { filter:brightness(1.05); transform:translateY(-1px); }
      `}</style>
    </div>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 1.5rem', background:'#fff', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:100, flexWrap:'wrap', gap:8, boxShadow:'0 1px 3px rgba(15,23,42,.04)' };
const backLink: React.CSSProperties = { fontSize:12, color:'#64748b', textDecoration:'none', display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:6 };
const card: React.CSSProperties = { background:'#fff', borderRadius:14, padding:'1rem 1.25rem', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(15,23,42,.04)' };
const labelSt: React.CSSProperties = { display:'flex', alignItems:'center', fontSize:11, fontWeight:600, color:'#334155', marginBottom:5 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:9, borderWidth:2, borderStyle:'solid', borderColor:'#e2e8f0', fontSize:12, fontFamily:'sans-serif', boxSizing:'border-box', background:'#f8fafc' };
const btnPrimary: React.CSSProperties = { padding:'8px 16px', borderRadius:9, border:'none', background:`linear-gradient(135deg,#2563EB,${BLUE_DARK})`, color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'sans-serif', boxShadow:`0 2px 8px ${BLUE}30` };
const btnSm: React.CSSProperties = { padding:'6px 12px', borderRadius:9, borderWidth:1, borderStyle:'solid', borderColor:'#e2e8f0', background:'#fff', color:'#334155', fontSize:12, cursor:'pointer', fontFamily:'sans-serif', whiteSpace:'nowrap' };
const btnOutline: React.CSSProperties = { fontSize:12, padding:'6px 14px', borderRadius:9, border:'1px solid #e2e8f0', textDecoration:'none', color:'#334155', background:'#fff', display:'flex', alignItems:'center', gap:4 };
const overlay: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(15,23,42,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'1rem', backdropFilter:'blur(4px)' };
const modalBox: React.CSSProperties = { background:'#fff', borderRadius:14, padding:'1.75rem', width:'100%', maxWidth:480, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(15,23,42,.2)' };
const dField: React.CSSProperties = { display:'flex', flexDirection:'column', gap:2, background:'#f8fafc', borderRadius:8, padding:'8px 10px' };
const dLabel: React.CSSProperties = { fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.3, fontWeight:500 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:10, marginBottom:12 });
const chipDivisi = (active: boolean, color: string): React.CSSProperties => ({
  padding: '5px 14px', borderRadius: 100, borderWidth:1, borderStyle:'solid', fontSize: 11, cursor: 'pointer', fontFamily: 'sans-serif',
  fontWeight: active ? 600 : 400, background: active ? color : '#fff', color: active ? '#fff' : '#334155',
  borderColor: active ? 'transparent' : '#e2e8f0',
});
const divisiPopover: React.CSSProperties = { position:'absolute', top:'100%', right:0, marginTop:4, background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'8px 10px', boxShadow:'0 12px 30px -10px rgba(15,23,42,.25)', zIndex:50, minWidth:150 };