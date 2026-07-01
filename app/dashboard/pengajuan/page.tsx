'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  ArrowLeft,
  FileText,
  Users,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Edit,
  Save,
  Send,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Building,
  GraduationCap,
  Clipboard,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Tag,
  FileCheck,
  FileX,
  ExternalLink,
  Plus,
  ChevronDown,
  ChevronUp,
  Info,
  Globe,
  Lock,
  Unlock,
  Key,
  Briefcase,
  Scale,
  Handshake,
  MessageSquare,
  Paperclip,
  File,
  Download,
  Printer,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Award,
  Shield,
  BookOpen,
  Target,
  List // <-- Tambahkan import List
} from 'lucide-react';

interface PengajuanItem {
  id: string; namaInstitusi: string; jenis: string; deskripsi: string;
  tanggalKegiatan: string; biaya: string; email: string; noWa: string;
  status: string; kodeTracking: string; tglSubmit: string; catatan: string;
  jurusan?: string;
  fileDokumenId?: string;
  fileDokumenUrl?: string;
  fileDokumenNama?: string;
  divisi?: string;
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
  'Diajukan': { bg:'#E6F1FB', color:'#0C447C', icon: Clock },
  'Ditinjau': { bg:'#FAEEDA', color:'#854F0B', icon: Eye },
  'Disetujui':{ bg:'#D1FAE5', color:'#065F46', icon: CheckCircle },
  'Ditolak':  { bg:'#FEE2E2', color:'#991B1B', icon: X },
};

const DEFAULT_STATUS_COLOR = { bg:'#f3f4f6', color:'#6b7280', icon: FileText };

const DIVISI_LIST = [
  { key: 'pencegahan',    label: 'Pencegahan',    color: '#0C447C', bg: '#E6F1FB' },
  { key: 'pemberantasan', label: 'Pemberantasan', color: '#A32D2D', bg: '#FEE2E2' },
  { key: 'rehabilitasi',  label: 'Rehabilitasi',  color: '#5B21B6', bg: '#EDE9FE' },
  { key: 'pemberdayaan',  label: 'Pemberdayaan',  color: '#085041', bg: '#D1FAE5' },
];

const divisiLabel = (key: string) => DIVISI_LIST.find(d => d.key === key)?.label || key;
const divisiStyle = (key: string) => DIVISI_LIST.find(d => d.key === key) || { color: '#6b7280', bg: '#f3f4f6' };

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
      .then(d => { setData(d.data || []); setLoading(false); })
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
    const matchFilter = activeFilter === 'semua' || activeStatuses.includes(d.status);
    const matchDivisi = !filterDivisi
      || (filterDivisi === 'belum' ? !d.divisi : d.divisi === filterDivisi);
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

  const assignDivisi = async (id: string, divisi: string) => {
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/pengajuan/divisi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, divisi }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.message || 'Gagal ubah divisi.'); return; }
      setData(prev => prev.map(item => item.id === id ? { ...item, divisi } : item));
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, divisi } : prev);
      setMsg(divisi ? `Pengajuan dimasukkan ke divisi ${divisiLabel(divisi)}.` : 'Divisi dilepas.');
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
    const cocok = mitraList.find(m => m.nama.toLowerCase() === item.namaInstitusi.toLowerCase());
    setIdMitraAcc(cocok?.id || (mitraList[0]?.id || ''));
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
      
      // Matikan animasi pesawat setelah 3 detik
      setTimeout(() => {
        setShowPlaneAnimation(false);
      }, 3000);
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
    <div style={{ 
      minHeight:'100vh', 
      display:'flex', 
      flexDirection:'column',
      alignItems:'center', 
      justifyContent:'center', 
      background:'#f8fafb', 
      fontFamily:'sans-serif', 
      color:'#6b7280',
      gap:16
    }}>
      <div style={{
        width:40,
        height:40,
        border:'3px solid #f3f4f6',
        borderTop:'3px solid #0F6E56',
        borderRadius:'50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <div style={{ fontSize:13 }}>Memuat pengajuan...</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafb', fontFamily:'sans-serif' }}>
      <nav style={navStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href={backUrl} style={backLink}>
            <ArrowLeft size={16} />
            Dashboard
          </a>
          <span style={{ color:'#e5e7eb' }}>|</span>
          <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
            <FileText size={18} />
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
          <div style={{ 
            ...msgBox('#065F46','#D1FAE5'),
            display:'flex',
            alignItems:'center',
            gap:8,
            animation: 'fadeInDown 0.4s ease-out'
          }}>
            <CheckCircle size={16} />
            {msg}
          </div>
        )}
        {error && !showAcc && (
          <div style={{ 
            ...msgBox('#991B1B','#FEE2E2'),
            display:'flex',
            alignItems:'center',
            gap:8,
            animation: 'shake 0.4s ease-out'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={{ position:'relative', marginBottom:12 }}>
          <Search size={16} style={{ 
            position:'absolute', 
            left:12, 
            top:'50%', 
            transform:'translateY(-50%)',
            color:'#9ca3af'
          }} />
          <input
            style={{ 
              width:'100%', 
              padding:'10px 12px 10px 36px', 
              borderRadius:10, 
              border:'2px solid #e5e7eb', 
              fontSize:12, 
              fontFamily:'sans-serif', 
              boxSizing:'border-box',
              transition:'all .3s ease',
              background:'#fafbfc'
            }}
            placeholder="Cari institusi, kode tracking, jenis..."
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position:'absolute',
                right:10,
                top:'50%',
                transform:'translateY(-50%)',
                background:'none',
                border:'none',
                color:'#9ca3af',
                cursor:'pointer',
                padding:4,
                borderRadius:'50%',
                transition:'all .2s ease'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter status */}
        <div style={{ 
          display:'flex', 
          gap:6, 
          marginBottom:12, 
          flexWrap:'wrap',
          padding:'4px',
          background:'#f1f5f9',
          borderRadius:12
        }}>
          {countPerFilter.map(f => {
            const isActive = activeFilter === f.key;
            const Icon = f.icon;
            return (
              <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
                padding:'8px 16px', 
                borderRadius:8, 
                border:'none',
                fontSize:12, 
                cursor:'pointer', 
                fontFamily:'sans-serif',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? '#0F6E56' : 'transparent',
                color: isActive ? '#fff' : '#374151',
                display:'flex',
                alignItems:'center',
                gap:6,
                transition:'all .3s ease',
                boxShadow: isActive ? '0 2px 8px rgba(15,110,86,.2)' : 'none'
              }}>
                <Icon size={14} />
                {f.label}
                <span style={{ 
                  marginLeft:2, 
                  fontSize:10, 
                  background: isActive ? 'rgba(255,255,255,.2)' : '#e5e7eb',
                  padding:'1px 8px',
                  borderRadius:100,
                  color: isActive ? '#fff' : '#6b7280'
                }}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter divisi */}
        <div style={{ 
          display:'flex', 
          gap:6, 
          marginBottom:16, 
          flexWrap:'wrap', 
          alignItems:'center',
          padding:'6px 10px',
          background:'#fff',
          borderRadius:10,
          border:'1px solid #e5e7eb'
        }}>
          <Filter size={14} style={{ color:'#6b7280' }} />
          <span style={{ fontSize:11, color:'#6b7280', marginRight:4 }}>Divisi:</span>
          <button onClick={() => setFilterDivisi('')} style={chipDivisi(filterDivisi === '', '#374151')}>
            Semua
          </button>
          <button onClick={() => setFilterDivisi('belum')} style={chipDivisi(filterDivisi === 'belum', '#854F0B')}>
            Belum Ditetapkan
          </button>
          {DIVISI_LIST.map(dv => {
            const count = data.filter(d => d.divisi === dv.key).length;
            return (
              <button key={dv.key} onClick={() => setFilterDivisi(dv.key)} style={chipDivisi(filterDivisi === dv.key, dv.color)}>
                {dv.label} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div style={{ 
            ...card, 
            textAlign:'center', 
            padding:'3rem', 
            color:'#9ca3af',
            display:'flex',
            flexDirection:'column',
            alignItems:'center',
            gap:12
          }}>
            <div style={{ 
              width:64,
              height:64,
              borderRadius:'50%',
              background:'#f3f4f6',
              display:'flex',
              alignItems:'center',
              justifyContent:'center'
            }}>
              <FileText size={32} style={{ color:'#d1d5db' }} />
            </div>
            <div style={{ fontSize:14, fontWeight:500 }}>Tidak ada pengajuan pada filter ini.</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map((item, index) => {
              const sc = getStatusColor(item.status);
              const StatusIcon = sc.icon;
              const adaDok = !!(item.fileDokumenId);
              const dvs = item.divisi ? divisiStyle(item.divisi) : null;
              const isExpanded = expandedItems.has(item.id);
              
              return (
                <div 
                  key={item.id} 
                  style={{
                    ...card,
                    animation: `fadeInUp 0.4s ease-out ${index * 0.03}s both`,
                    transition:'all .3s ease'
                  }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                        <span style={{ 
                          fontSize:10, 
                          fontWeight:600, 
                          padding:'3px 10px', 
                          borderRadius:100, 
                          background:item.jenis==='MOU'?'#E6F1FB':'#FAEEDA', 
                          color:item.jenis==='MOU'?'#0C447C':'#854F0B',
                          display:'flex',
                          alignItems:'center',
                          gap:4
                        }}>
                          <FileText size={11} />
                          {item.jenis}
                        </span>
                        <span style={{ 
                          fontSize:10, 
                          fontWeight:500, 
                          padding:'3px 10px', 
                          borderRadius:100, 
                          background:sc.bg, 
                          color:sc.color,
                          display:'flex',
                          alignItems:'center',
                          gap:4
                        }}>
                          <StatusIcon size={11} />
                          {item.status}
                        </span>
                        {item.divisi && dvs ? (
                          <span style={{ 
                            fontSize:10, 
                            fontWeight:600, 
                            padding:'3px 10px', 
                            borderRadius:100, 
                            background:dvs.bg, 
                            color:dvs.color,
                            display:'flex',
                            alignItems:'center',
                            gap:4
                          }}>
                            <Building size={11} />
                            {divisiLabel(item.divisi)}
                          </span>
                        ) : (
                          <span style={{ 
                            fontSize:10, 
                            padding:'3px 10px', 
                            borderRadius:100, 
                            background:'#FEF3C7', 
                            color:'#92400E',
                            display:'flex',
                            alignItems:'center',
                            gap:4
                          }}>
                            <AlertCircle size={11} />
                            Belum ada divisi
                          </span>
                        )}
                        {adaDok && (
                          <span style={{ 
                            fontSize:10, 
                            padding:'3px 10px', 
                            borderRadius:100, 
                            background:'#E6F1FB', 
                            color:'#0C447C',
                            display:'flex',
                            alignItems:'center',
                            gap:4
                          }}>
                            <Paperclip size={11} />
                            Ada dok. mitra
                          </span>
                        )}
                        {item.jurusan && (
                          <span style={{ 
                            fontSize:10, 
                            padding:'3px 10px', 
                            borderRadius:100, 
                            background:'#EDE9FE', 
                            color:'#5B21B6',
                            display:'flex',
                            alignItems:'center',
                            gap:4
                          }}>
                            <GraduationCap size={11} />
                            {item.jurusan}
                          </span>
                        )}
                      </div>
                      
                      <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e' }}>{item.namaInstitusi}</div>
                      
                      <div style={{ 
                        fontSize:12, 
                        color:'#6b7280', 
                        marginTop:4, 
                        lineHeight:1.6,
                        display: isExpanded ? 'block' : '-webkit-box',
                        WebkitLineClamp: isExpanded ? 'none' : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {item.deskripsi}
                      </div>
                      
                      {isExpanded && (
                        <div style={{ 
                          marginTop:8,
                          animation: 'fadeInUp 0.3s ease-out'
                        }}>
                          {(item.email||item.noWa) && (
                            <div style={{ 
                              fontSize:11, 
                              color:'#6b7280', 
                              marginTop:4,
                              display:'flex',
                              gap:14,
                              flexWrap:'wrap',
                              background:'#f9fafb',
                              padding:'4px 10px',
                              borderRadius:6
                            }}>
                              {item.email && (
                                <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                  <Mail size={12} />
                                  {item.email}
                                </span>
                              )}
                              {item.noWa && (
                                <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                  <Phone size={12} />
                                  {item.noWa}
                                </span>
                              )}
                              {item.biaya && (
                                <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                  <DollarSign size={12} />
                                  Rp {item.biaya}
                                </span>
                              )}
                            </div>
                          )}
                          {item.catatan && (
                            <div style={{ 
                              fontSize:11, 
                              color:'#854F0B', 
                              background:'#FFFBEB', 
                              padding:'6px 10px', 
                              borderRadius:6, 
                              marginTop:6,
                              display:'flex',
                              alignItems:'flex-start',
                              gap:4
                            }}>
                              <MessageSquare size={12} style={{ flexShrink:0, marginTop:1 }} />
                              {item.catatan}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div style={{ 
                        fontSize:11, 
                        color:'#9ca3af', 
                        marginTop:6,
                        display:'flex',
                        gap:14,
                        flexWrap:'wrap'
                      }}>
                        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <Clipboard size={12} />
                          Kode: <strong style={{ color:'#0F6E56' }}>{item.kodeTracking}</strong>
                        </span>
                        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <Calendar size={12} />
                          Submit: {item.tglSubmit}
                        </span>
                        {item.tanggalKegiatan && (
                          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <Target size={12} />
                            Tgl: {item.tanggalKegiatan}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display:'flex', 
                      flexDirection:'column', 
                      gap:5, 
                      flexShrink:0,
                      minWidth:100
                    }}>
                      <button 
                        onClick={() => openDetail(item)} 
                        style={{ 
                          ...btnSm,
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          gap:4,
                          transition:'all .2s ease'
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = '#fff';
                        }}
                      >
                        <Eye size={14} />
                        Detail
                      </button>
                      
                      <select
                        value={item.divisi || ''}
                        onChange={e => assignDivisi(item.id, e.target.value)}
                        style={{ 
                          ...btnSm, 
                          cursor:'pointer', 
                          fontSize:11,
                          padding:'6px 10px',
                          transition:'all .2s ease'
                        }}
                        title="Tetapkan divisi"
                      >
                        <option value="">🏛 Pilih Divisi</option>
                        {DIVISI_LIST.map(dv => <option key={dv.key} value={dv.key}>{dv.label}</option>)}
                      </select>
                      
                      {!['Disetujui','Ditolak','Kegiatan Selesai'].includes(item.status) && (
                        <>
                          <button 
                            onClick={() => openAcc(item)} 
                            style={{ 
                              ...btnSm, 
                              background:'#D1FAE5', 
                              color:'#065F46', 
                              borderColor:'#86EFAC', 
                              fontWeight:500,
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'center',
                              gap:4,
                              transition:'all .2s ease'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#A7F3D0';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#D1FAE5';
                            }}
                          >
                            <Check size={14} />
                            Acc
                          </button>
                          <button 
                            onClick={() => { openDetail(item); setShowTolak(true); }} 
                            style={{ 
                              ...btnSm, 
                              background:'#FEE2E2', 
                              color:'#991B1B', 
                              borderColor:'#FCA5A5',
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'center',
                              gap:4,
                              transition:'all .2s ease'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#FECACA';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#FEE2E2';
                            }}
                          >
                            <X size={14} />
                            Tolak
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => toggleExpand(item.id)}
                        style={{
                          ...btnSm,
                          fontSize:10,
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          gap:4
                        }}
                      >
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
          <div style={{ 
            ...modalBox, 
            maxWidth:600,
            animation: 'scaleIn 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            {hasilGenerate ? (
              <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ 
                    display:'inline-flex',
                    alignItems:'center',
                    justifyContent:'center',
                    width:64,
                    height:64,
                    borderRadius:'50%',
                    background:'linear-gradient(135deg, #0F6E56, #22a67e)',
                    marginBottom:12,
                    boxShadow:'0 4px 20px rgba(15,110,86,.3)'
                  }}>
                    <CheckCircle size={32} style={{ color:'#fff' }} />
                  </div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#0F6E56' }}>Kode Dokumen Berhasil Dibuat!</div>
                  <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>
                    {accItem.namaInstitusi} · {accItem.jenis}
                  </div>
                </div>
                
                <div style={{ 
                  background:'linear-gradient(135deg, #F0FDF4, #D1FAE5)', 
                  border:'2px solid #86EFAC', 
                  borderRadius:12, 
                  padding:'1.5rem', 
                  marginBottom:16, 
                  textAlign:'center',
                  boxShadow:'0 2px 12px rgba(15,110,86,.1)'
                }}>
                  <div style={{ 
                    fontSize:10, 
                    color:'#065F46', 
                    marginBottom:6, 
                    textTransform:'uppercase', 
                    letterSpacing:1.5,
                    fontWeight:600,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:6
                  }}>
                    <Key size={14} />
                    Kode Akses Dokumen
                  </div>
                  <div style={{ 
                    fontSize:28, 
                    fontWeight:800, 
                    letterSpacing:4, 
                    color:'#065F46', 
                    marginBottom:12,
                    fontFamily:'monospace',
                    background:'rgba(255,255,255,.6)',
                    padding:'8px 16px',
                    borderRadius:8,
                    display:'inline-block'
                  }}>
                    {hasilGenerate.kodeAkses}
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(hasilGenerate.kodeAkses); }} 
                    style={{
                      ...btnPrimary,
                      display:'inline-flex',
                      alignItems:'center',
                      gap:6,
                      padding:'8px 20px'
                    }}
                  >
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
                  <a href={hasilGenerate.docsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ ...btnPrimary, display:'flex', alignItems:'center', justifyContent:'center', gap:6, textDecoration:'none', marginBottom:12 }}>
                    <ExternalLink size={14} />
                    Buka Google Docs
                  </a>
                )}

                {accItem.email ? (
                  emailTerkirim ? (
                    <div style={{ 
                      background:'#D1FAE5', 
                      borderRadius:8, 
                      padding:'12px 16px', 
                      fontSize:13, 
                      color:'#065F46', 
                      marginBottom:14, 
                      textAlign:'center', 
                      fontWeight:600,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:8,
                      animation: 'fadeInUp 0.4s ease-out'
                    }}>
                      <CheckCircle size={18} />
                      Email kode akses terkirim ke {accItem.email}
                    </div>
                  ) : (
                    <button 
                      onClick={handleKirimEmail} 
                      disabled={kirimEmailLoading}
                      style={{ 
                        ...btnPrimary, 
                        width:'100%', 
                        marginBottom:12, 
                        background:'#185FA5', 
                        height:48,
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        gap:8,
                        fontSize:13,
                        opacity: kirimEmailLoading ? 0.7 : 1,
                        cursor: kirimEmailLoading ? 'not-allowed' : 'pointer',
                        transition:'all .3s ease',
                        position:'relative',
                        overflow:'hidden'
                      }}
                      onMouseEnter={(e) => {
                        if (!kirimEmailLoading) {
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(24,95,165,.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(24,95,165,.2)';
                      }}
                    >
                      {kirimEmailLoading ? (
                        <>
                          <div style={{
                            width:18,
                            height:18,
                            border:'2px solid rgba(255,255,255,.3)',
                            borderTop:'2px solid #fff',
                            borderRadius:'50%',
                            animation: 'spin 0.8s linear infinite'
                          }} />
                          Mengirim email...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Kirim Kode Akses ke Email Mitra
                        </>
                      )}
                      
                      {/* Animasi pesawat terbang */}
                      {showPlaneAnimation && (
                        <div style={{
                          position:'absolute',
                          top:'50%',
                          left:'-10%',
                          transform: 'translateY(-50%)',
                          animation: 'planeFly 1.5s ease-in-out forwards'
                        }}>
                          <Send size={24} style={{ color: '#fff', transform: 'rotate(-45deg)' }} />
                        </div>
                      )}
                    </button>
                  )
                ) : (
                  <div style={{ 
                    background:'#FFFBEB', 
                    borderRadius:8, 
                    padding:'10px 14px', 
                    fontSize:11, 
                    color:'#78350F',
                    marginBottom:14,
                    display:'flex',
                    alignItems:'center',
                    gap:8
                  }}>
                    <AlertCircle size={14} />
                    <span>
                      Mitra tidak mencantumkan email. Sampaikan kode <strong>{hasilGenerate.kodeAkses}</strong> secara manual
                      {accItem.noWa ? ` (WA: ${accItem.noWa})` : ''}.
                    </span>
                  </div>
                )}

                {accItem.email && (
                  <div style={{ 
                    background:'#E6F1FB', 
                    borderRadius:8, 
                    padding:'8px 12px', 
                    fontSize:11, 
                    color:'#0C447C', 
                    marginBottom:14, 
                    textAlign:'center' 
                  }}>
                    <Mail size={14} style={{ marginRight:6 }} />
                    Tujuan: {accItem.email}
                  </div>
                )}
                
                <button 
                  onClick={() => { setShowAcc(false); setAccItem(null); setHasilGenerate(null); setEmailTerkirim(false); setShowPlaneAnimation(false); }} 
                  style={{ 
                    ...btnSm, 
                    width:'100%',
                    transition:'all .2s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#fff';
                  }}
                >
                  Tutup
                </button>
              </div>
            ) : (
              <div>
                <div style={{ 
                  display:'flex', 
                  justifyContent:'space-between', 
                  alignItems:'flex-start', 
                  marginBottom:16 
                }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>Setujui & Generate Kode</div>
                    <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>
                      {accItem.namaInstitusi} · {accItem.jenis}
                    </div>
                  </div>
                  <button 
                    onClick={() => { setShowAcc(false); setAccItem(null); setError(''); setShowPlaneAnimation(false); }} 
                    style={{ 
                      ...btnSm, 
                      padding:'4px 8px',
                      transition:'all .2s ease'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#fff';
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {error && (
                  <div style={{ 
                    ...msgBox('#991B1B','#FEE2E2'),
                    display:'flex',
                    alignItems:'center',
                    gap:6,
                    animation: 'shake 0.4s ease-out'
                  }}>
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <div style={{ 
                  background:'#f9fafb', 
                  borderRadius:10, 
                  padding:'12px 16px', 
                  marginBottom:16, 
                  border:'1px solid #e5e7eb' 
                }}>
                  <div style={{ 
                    fontSize:11, 
                    fontWeight:600, 
                    color:'#6b7280', 
                    marginBottom:8, 
                    textTransform:'uppercase', 
                    letterSpacing:0.5,
                    display:'flex',
                    alignItems:'center',
                    gap:6
                  }}>
                    <FileText size={14} />
                    Data Pengajuan
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:12 }}>
                    <div style={dField}><span style={dLabel}>Nama Institusi</span><span style={{ fontWeight:500 }}>{accItem.namaInstitusi}</span></div>
                    <div style={dField}><span style={dLabel}>Jenis</span><span>{accItem.jenis}</span></div>
                    {accItem.divisi && <div style={dField}><span style={dLabel}>Divisi</span><span>{divisiLabel(accItem.divisi)}</span></div>}
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
                  <select 
                    style={{
                      ...inputFull,
                      borderColor: '#e5e7eb',
                      transition:'all .3s ease'
                    }} 
                    value={idMitraAcc} 
                    onChange={e => setIdMitraAcc(e.target.value)}
                  >
                    <option value="">-- Belum terdaftar (akan dibuat otomatis) --</option>
                    {mitraList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}>
                    <FileText size={14} style={{ marginRight:4 }} />
                    Template Dokumen {accItem.jenis}
                  </label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <button type="button" onClick={() => setPilihanTemplate('bnn')} style={{
                      padding:'12px', borderRadius:10, cursor:'pointer', fontFamily:'sans-serif', textAlign:'left',
                      border:`2px solid ${pilihanTemplate==='bnn'?'#0F6E56':'#e5e7eb'}`,
                      background: pilihanTemplate==='bnn' ? '#F0FDF4' : '#fff',
                      transition:'all .2s ease'
                    }}>
                      <div style={{ fontSize:20, marginBottom:4 }}>🏛</div>
                      <div style={{ fontSize:12, fontWeight:600, color:pilihanTemplate==='bnn'?'#065F46':'#374151' }}>Template Resmi BNN</div>
                      <div style={{ fontSize:10, color:'#6b7280', marginTop:2, lineHeight:1.4 }}>Gunakan template standar BNN Provinsi</div>
                    </button>
                    <button type="button"
                      onClick={() => accItem.fileDokumenId && setPilihanTemplate('mitra')}
                      disabled={!accItem.fileDokumenId}
                      style={{
                        padding:'12px', borderRadius:10, cursor:accItem.fileDokumenId?'pointer':'not-allowed', fontFamily:'sans-serif', textAlign:'left',
                        border:`2px solid ${pilihanTemplate==='mitra'?'#185FA5':'#e5e7eb'}`,
                        background: pilihanTemplate==='mitra' ? '#E6F1FB' : '#fff',
                        opacity: accItem.fileDokumenId ? 1 : 0.5,
                        transition:'all .2s ease'
                      }}>
                      <div style={{ fontSize:20, marginBottom:4 }}>📄</div>
                      <div style={{ fontSize:12, fontWeight:600, color:pilihanTemplate==='mitra'?'#0C447C':'#374151' }}>Dokumen Mitra</div>
                      {accItem.fileDokumenId ? (
                        <div style={{ fontSize:10, color:'#6b7280', marginTop:2 }}>{accItem.fileDokumenNama || 'File terlampir'}</div>
                      ) : (
                        <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>Mitra tidak upload dokumen</div>
                      )}
                    </button>
                  </div>

                  {accItem.fileDokumenId && (
                    <div style={{ marginTop:10, border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden', background:'#fff' }}>
                      <div style={{ 
                        display:'flex', 
                        justifyContent:'space-between', 
                        alignItems:'center', 
                        padding:'8px 12px', 
                        background:'#f9fafb', 
                        borderBottom:'1px solid #e5e7eb' 
                      }}>
                        <span style={{ fontSize:11, fontWeight:600, color:'#0C447C', display:'flex', alignItems:'center', gap:6 }}>
                          <Eye size={14} />
                          Preview Dokumen Mitra
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setPreviewMitra(true)} 
                          style={{ 
                            ...btnSm, 
                            padding:'4px 10px', 
                            fontSize:11,
                            display:'flex',
                            alignItems:'center',
                            gap:4
                          }}
                        >
                          <ExternalLink size={12} />
                          Buka Penuh
                        </button>
                      </div>
                      <iframe
                        src={`https://docs.google.com/document/d/${accItem.fileDokumenId}/preview`}
                        style={{ width:'100%', height:200, border:'none', display:'block' }}
                        title="Preview dokumen mitra"
                      />
                    </div>
                  )}
                </div>

                <div style={{ marginBottom:10 }}>
                  <label style={labelSt}>
                    <FileText size={14} style={{ marginRight:4 }} />
                    Judul Dokumen <span style={{ color:'#DC2626' }}>✱</span>
                  </label>
                  <input 
                    style={{
                      ...inputFull,
                      borderColor: '#e5e7eb',
                      transition:'all .3s ease'
                    }} 
                    value={judulDok} 
                    onChange={e => setJudulDok(e.target.value)}
                    placeholder="Contoh: Kerja Sama P4GN di Lingkungan Kampus" 
                  />
                </div>

                <div style={{ marginBottom:16 }}>
                  <label style={labelSt}>
                    <Clock size={14} style={{ marginRight:4 }} />
                    Durasi Berlaku
                  </label>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {DURASI_OPTS.map(d => (
                      <button key={d} type="button" onClick={() => setDurasiDok(d)} style={{
                        padding:'6px 14px', borderRadius:7, border:`2px solid ${durasiDok===d?'#0F6E56':'#e5e7eb'}`,
                        background: durasiDok===d ? '#0F6E56' : '#fff',
                        color: durasiDok===d ? '#fff' : '#374151',
                        fontSize:12, cursor:'pointer', fontFamily:'sans-serif', fontWeight:durasiDok===d?600:400,
                        transition:'all .2s ease'
                      }}>{d} th</button>
                    ))}
                  </div>
                  <div style={{ fontSize:10, color:'#9ca3af', marginTop:4 }}>Minimal 5 tahun</div>
                </div>

                <button
                  onClick={handleGenerateFromAcc}
                  disabled={generating || !judulDok.trim()}
                  style={{ 
                    ...btnPrimary, 
                    width:'100%', 
                    height:48, 
                    fontSize:14,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:8,
                    opacity: (generating || !judulDok.trim()) ? 0.7 : 1,
                    cursor: (generating || !judulDok.trim()) ? 'not-allowed' : 'pointer',
                    transition:'all .3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!generating && judulDok.trim()) {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,110,86,.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,110,86,.2)';
                  }}
                >
                  {generating ? (
                    <>
                      <div style={{
                        width:18,
                        height:18,
                        border:'2px solid rgba(255,255,255,.3)',
                        borderTop:'2px solid #fff',
                        borderRadius:'50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
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
          <div style={{ 
            background:'#fff', 
            borderRadius:14, 
            padding:0, 
            width:'100%', 
            maxWidth:840, 
            height:'90vh', 
            display:'flex', 
            flexDirection:'column', 
            overflow:'hidden',
            animation: 'scaleIn 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ 
              display:'flex', 
              justifyContent:'space-between', 
              alignItems:'center', 
              padding:'14px 20px', 
              borderBottom:'1px solid #e5e7eb', 
              flexShrink:0,
              background:'#f9fafb'
            }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
                  <FileText size={18} />
                  Dokumen Mitra — {accItem.namaInstitusi}
                </div>
                <div style={{ fontSize:11, color:'#6b7280' }}>{accItem.fileDokumenNama || 'File terlampir'}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {accItem.fileDokumenUrl && (
                  <a href={accItem.fileDokumenUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                    <ExternalLink size={14} />
                    Buka di Docs
                  </a>
                )}
                <button 
                  onClick={() => setPreviewMitra(false)} 
                  style={{ 
                    ...btnSm, 
                    padding:'6px 12px',
                    display:'flex',
                    alignItems:'center',
                    gap:4
                  }}
                >
                  <X size={14} />
                  Tutup
                </button>
              </div>
            </div>
            <iframe
              src={`https://docs.google.com/document/d/${accItem.fileDokumenId}/preview`}
              style={{ width:'100%', flex:1, border:'none' }}
              title="Preview penuh dokumen mitra"
            />
          </div>
        </div>
      )}

      {/* Modal detail */}
      {detail && (
        <div style={overlay} onClick={() => { setDetail(null); setShowTolak(false); setShowUbah(false); }}>
          <div style={{ 
            ...modalBox, 
            maxWidth:540,
            animation: 'scaleIn 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            {error && (
              <div style={{ 
                ...msgBox('#991B1B','#FEE2E2'),
                display:'flex',
                alignItems:'center',
                gap:6,
                animation: 'shake 0.4s ease-out'
              }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <div style={{ display:'flex', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ 
                    fontSize:10, 
                    fontWeight:600, 
                    padding:'3px 10px', 
                    borderRadius:100, 
                    background:detail.jenis==='MOU'?'#E6F1FB':'#FAEEDA', 
                    color:detail.jenis==='MOU'?'#0C447C':'#854F0B',
                    display:'flex',
                    alignItems:'center',
                    gap:4
                  }}>
                    <FileText size={11} />
                    {detail.jenis}
                  </span>
                  <span style={{ 
                    fontSize:10, 
                    fontWeight:500, 
                    padding:'3px 10px', 
                    borderRadius:100, 
                    ...getStatusColor(detail.status),
                    display:'flex',
                    alignItems:'center',
                    gap:4
                  }}>
                    {detail.status}
                  </span>
                  {detail.divisi && (
                    <span style={{ 
                      fontSize:10, 
                      fontWeight:600, 
                      padding:'3px 10px', 
                      borderRadius:100, 
                      ...divisiStyle(detail.divisi),
                      display:'flex',
                      alignItems:'center',
                      gap:4
                    }}>
                      <Building size={11} />
                      {divisiLabel(detail.divisi)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>{detail.namaInstitusi}</div>
              </div>
              <button 
                onClick={() => { setDetail(null); setShowTolak(false); setShowUbah(false); }} 
                style={{ 
                  ...btnSm, 
                  padding:'4px 8px',
                  transition:'all .2s ease'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#fff';
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Assign divisi di modal */}
            <div style={{ marginBottom:14 }}>
              <label style={labelSt}>
                <Building size={14} style={{ marginRight:4 }} />
                Divisi Penanganan
              </label>
              <select 
                style={{
                  ...inputFull,
                  borderColor: '#e5e7eb',
                  transition:'all .3s ease'
                }} 
                value={detail.divisi || ''} 
                onChange={e => assignDivisi(detail.id, e.target.value)}
              >
                <option value="">-- Belum ditetapkan --</option>
                {DIVISI_LIST.map(dv => <option key={dv.key} value={dv.key}>{dv.label}</option>)}
              </select>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14, fontSize:12 }}>
              <div style={dField}><span style={dLabel}>Deskripsi</span><span style={{ lineHeight:1.5 }}>{detail.deskripsi}</span></div>
              {detail.jurusan && <div style={dField}><span style={dLabel}>Jurusan</span><span>{detail.jurusan}</span></div>}
              {detail.tanggalKegiatan && <div style={dField}><span style={dLabel}>Tgl Kegiatan</span><span>{detail.tanggalKegiatan}</span></div>}
              {detail.biaya && <div style={dField}><span style={dLabel}>Biaya</span><span>Rp {detail.biaya}</span></div>}
              {detail.email && <div style={dField}><span style={dLabel}>Email</span><span>{detail.email}</span></div>}
              {detail.noWa && <div style={dField}><span style={dLabel}>WhatsApp</span><span>{detail.noWa}</span></div>}
              <div style={dField}><span style={dLabel}>Submit</span><span>{detail.tglSubmit}</span></div>
              <div style={dField}><span style={dLabel}>Kode</span><span style={{ color:'#0F6E56', fontWeight:600 }}>{detail.kodeTracking}</span></div>
            </div>

            {detail.fileDokumenId && (
              <div style={{ 
                background:'#E6F1FB', 
                border:'1px solid #BFDBFE', 
                borderRadius:10, 
                padding:'12px 14px', 
                marginBottom:14, 
                fontSize:12 
              }}>
                <div style={{ 
                  fontWeight:600, 
                  color:'#0C447C', 
                  marginBottom:4,
                  display:'flex',
                  alignItems:'center',
                  gap:6
                }}>
                  <Paperclip size={14} />
                  Dokumen {detail.jenis} dari Mitra
                </div>
                <div style={{ color:'#6b7280', marginBottom:8 }}>{detail.fileDokumenNama || 'File terlampir'}</div>
                <iframe
                  src={`https://docs.google.com/document/d/${detail.fileDokumenId}/preview`}
                  style={{ width:'100%', height:220, border:'1px solid #BFDBFE', borderRadius:8, background:'#fff', display:'block', marginBottom:6 }}
                  title="Preview dokumen mitra"
                />
                {detail.fileDokumenUrl && (
                  <a href={detail.fileDokumenUrl} target="_blank" rel="noopener noreferrer" style={{ 
                    fontSize:11, 
                    color:'#0C447C', 
                    textDecoration:'none',
                    display:'flex',
                    alignItems:'center',
                    gap:4
                  }}>
                    <ExternalLink size={12} />
                    Buka di Google Docs
                  </a>
                )}
              </div>
            )}

            {detail.catatan && (
              <div style={{ 
                fontSize:12, 
                padding:'8px 12px', 
                background:'#FFFBEB', 
                borderRadius:8, 
                marginBottom:14, 
                color:'#78350F',
                display:'flex',
                alignItems:'flex-start',
                gap:6
              }}>
                <MessageSquare size={14} style={{ flexShrink:0, marginTop:1 }} />
                {detail.catatan}
              </div>
            )}

            {showTolak && (
              <div style={{ 
                background:'#FEF2F2', 
                border:'1px solid #FCA5A5', 
                borderRadius:10, 
                padding:'14px 16px', 
                marginBottom:14,
                animation: 'fadeInUp 0.3s ease-out'
              }}>
                <div style={{ 
                  fontSize:12, 
                  fontWeight:600, 
                  color:'#991B1B', 
                  marginBottom:8,
                  display:'flex',
                  alignItems:'center',
                  gap:6
                }}>
                  <AlertCircle size={14} />
                  Alasan Penolakan
                </div>
                <textarea 
                  style={{ 
                    width:'100%', 
                    padding:'8px 12px', 
                    borderRadius:8, 
                    border:'1px solid #FCA5A5', 
                    fontSize:12, 
                    fontFamily:'sans-serif', 
                    height:70, 
                    resize:'none', 
                    boxSizing:'border-box',
                    background:'#fff'
                  }}
                  value={alasanTolak} 
                  onChange={e => setAlasanTolak(e.target.value)} 
                  placeholder="Jelaskan alasan penolakan dengan jelas..." 
                  autoFocus 
                />
              </div>
            )}

            {showUbah && (
              <div style={{ 
                background:'#f9fafb', 
                border:'1px solid #e5e7eb', 
                borderRadius:10, 
                padding:'14px 16px', 
                marginBottom:14,
                animation: 'fadeInUp 0.3s ease-out'
              }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Ubah Status</div>
                <select 
                  style={{ 
                    ...inputFull, 
                    marginBottom:8,
                    borderColor: '#e5e7eb'
                  }} 
                  value={newStatus} 
                  onChange={e => setNewStatus(e.target.value)}
                >
                  {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <textarea 
                  style={{ 
                    ...inputFull, 
                    height:55, 
                    resize:'none',
                    borderColor: '#e5e7eb'
                  }} 
                  value={catatanUbah} 
                  onChange={e => setCatatanUbah(e.target.value)} 
                  placeholder="Catatan (opsional)" 
                />
              </div>
            )}

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {!showTolak && !showUbah && !['Ditolak','Kegiatan Selesai','Disetujui'].includes(detail.status) && (
                <>
                  <button 
                    onClick={() => openAcc(detail)} 
                    style={{ 
                      ...btnPrimary, 
                      flex:1,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:6
                    }}
                  >
                    <Check size={16} />
                    Acc & Generate Kode
                  </button>
                  <button 
                    onClick={() => setShowTolak(true)} 
                    style={{ 
                      ...btnSm, 
                      background:'#FEE2E2', 
                      color:'#991B1B', 
                      borderColor:'#FCA5A5',
                      flex:1,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:4
                    }}
                  >
                    <X size={14} />
                    Tolak
                  </button>
                  <button 
                    onClick={() => setShowUbah(true)} 
                    style={{ 
                      ...btnSm,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:4
                    }}
                  >
                    <Edit size={14} />
                    Ubah Status
                  </button>
                </>
              )}
              {showTolak && (
                <>
                  <button 
                    onClick={handleTolak} 
                    disabled={submitting} 
                    style={{ 
                      ...btnPrimary, 
                      background:'#DC2626', 
                      flex:1,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:6,
                      opacity: submitting ? 0.7 : 1,
                      cursor: submitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submitting ? (
                      <>
                        <div style={{
                          width:16,
                          height:16,
                          border:'2px solid rgba(255,255,255,.3)',
                          borderTop:'2px solid #fff',
                          borderRadius:'50%',
                          animation: 'spin 0.8s linear infinite'
                        }} />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <X size={16} />
                        Konfirmasi Tolak
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => { setShowTolak(false); setAlasanTolak(''); }} 
                    style={{ 
                      ...btnSm,
                      transition:'all .2s ease'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#fff';
                    }}
                  >
                    Batal
                  </button>
                </>
              )}
              {showUbah && (
                <>
                  <button 
                    onClick={handleUbahStatus} 
                    disabled={submitting} 
                    style={{ 
                      ...btnPrimary, 
                      flex:1,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:6,
                      opacity: submitting ? 0.7 : 1,
                      cursor: submitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submitting ? (
                      <>
                        <div style={{
                          width:16,
                          height:16,
                          border:'2px solid rgba(255,255,255,.3)',
                          borderTop:'2px solid #fff',
                          borderRadius:'50%',
                          animation: 'spin 0.8s linear infinite'
                        }} />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Simpan Status
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => { setShowUbah(false); setCatatanUbah(''); }} 
                    style={{ 
                      ...btnSm,
                      transition:'all .2s ease'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#fff';
                    }}
                  >
                    Batal
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animasi CSS */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        @keyframes planeFly {
          0% {
            left: -10%;
            opacity: 0;
            transform: translateY(-50%) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          100% {
            left: 110%;
            opacity: 0;
            transform: translateY(-50%) scale(0.5);
          }
        }
      `}</style>
    </div>
  );
}

const navStyle: React.CSSProperties = { 
  display:'flex', 
  alignItems:'center', 
  justifyContent:'space-between', 
  padding:'0.85rem 1.5rem', 
  background:'#fff', 
  borderBottom:'1px solid #e5e7eb', 
  position:'sticky', 
  top:0, 
  zIndex:100, 
  flexWrap:'wrap', 
  gap:8,
  boxShadow:'0 1px 3px rgba(0,0,0,.04)'
};

const backLink: React.CSSProperties = { 
  fontSize:12, 
  color:'#6b7280', 
  textDecoration:'none',
  display:'flex',
  alignItems:'center',
  gap:4,
  padding:'4px 8px',
  borderRadius:6,
  transition:'all .2s ease'
};

const card: React.CSSProperties = { 
  background:'#fff', 
  borderRadius:14, 
  padding:'1rem 1.25rem', 
  border:'1px solid #e5e7eb',
  boxShadow:'0 1px 4px rgba(0,0,0,.04)',
  transition:'all .3s ease'
};

const labelSt: React.CSSProperties = { 
  display:'flex', 
  alignItems:'center',
  fontSize:11, 
  fontWeight:600,
  color:'#374151', 
  marginBottom:5 
};

const inputFull: React.CSSProperties = { 
  width:'100%', 
  padding:'9px 12px', 
  borderRadius:8, 
  border:'2px solid #e5e7eb', 
  fontSize:12, 
  fontFamily:'sans-serif', 
  boxSizing:'border-box',
  background:'#fafbfc',
  transition:'all .3s ease'
};

const btnPrimary: React.CSSProperties = { 
  padding:'8px 16px', 
  borderRadius:8, 
  border:'none', 
  background:'#0F6E56', 
  color:'#fff', 
  fontSize:12, 
  fontWeight:500, 
  cursor:'pointer', 
  fontFamily:'sans-serif',
  boxShadow:'0 2px 8px rgba(15,110,86,.2)',
  transition:'all .3s ease'
};

const btnSm: React.CSSProperties = { 
  padding:'6px 12px', 
  borderRadius:8, 
  border:'1px solid #e5e7eb', 
  background:'#fff', 
  color:'#374151', 
  fontSize:12, 
  cursor:'pointer', 
  fontFamily:'sans-serif', 
  whiteSpace:'nowrap',
  transition:'all .2s ease'
};

const btnOutline: React.CSSProperties = { 
  fontSize:12, 
  padding:'6px 14px', 
  borderRadius:8, 
  border:'1px solid #e5e7eb', 
  textDecoration:'none', 
  color:'#374151', 
  background:'#fff',
  display:'flex',
  alignItems:'center',
  gap:4,
  transition:'all .2s ease'
};

const overlay: React.CSSProperties = { 
  position:'fixed', 
  inset:0, 
  background:'rgba(0,0,0,.5)', 
  display:'flex', 
  alignItems:'center', 
  justifyContent:'center', 
  zIndex:200, 
  padding:'1rem',
  backdropFilter:'blur(4px)'
};

const modalBox: React.CSSProperties = { 
  background:'#fff', 
  borderRadius:14, 
  padding:'1.75rem', 
  width:'100%', 
  maxWidth:480, 
  maxHeight:'92vh', 
  overflowY:'auto',
  boxShadow:'0 20px 60px rgba(0,0,0,.2)'
};

const dField: React.CSSProperties = { 
  display:'flex', 
  flexDirection:'column', 
  gap:2, 
  background:'#f9fafb', 
  borderRadius:8, 
  padding:'8px 10px' 
};

const dLabel: React.CSSProperties = { 
  fontSize:10, 
  color:'#9ca3af', 
  textTransform:'uppercase', 
  letterSpacing:0.3, 
  fontWeight:500 
};

const msgBox = (color: string, bg: string): React.CSSProperties => ({ 
  fontSize:12, 
  color, 
  background:bg, 
  padding:'10px 14px', 
  borderRadius:10, 
  marginBottom:12,
  border:'1px solid transparent'
});

const chipDivisi = (active: boolean, color: string): React.CSSProperties => ({
  padding: '5px 14px', 
  borderRadius: 20, 
  border: '1px solid', 
  fontSize: 11, 
  cursor: 'pointer', 
  fontFamily: 'sans-serif',
  fontWeight: active ? 600 : 400,
  background: active ? color : '#fff',
  color: active ? '#fff' : '#374151',
  borderColor: active ? 'transparent' : '#e5e7eb',
  transition:'all .2s ease'
});