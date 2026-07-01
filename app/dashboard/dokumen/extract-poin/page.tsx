'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  ArrowLeft,
  FileText,
  Search,
  Building,
  Tag,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Eye,
  EyeOff,
  Save,
  Calendar,
  MapPin,
  List,
  FileCheck,
  FileX,
  Plus,
  Minus,
  Target,
  BookOpen,
  Layers,
  ChevronRight,
  Filter,
  RefreshCw,
  Send,
  Award,
  Sparkles,
  Menu,
  Maximize2,
  Minimize2,
  Grid,
  List as ListIcon,
  MessageSquare,
  Info,
  Edit3,
  Trash2,
  Clipboard,
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface DokSelesai {
  id: string; jenis: string; judul: string; namaMitra: string;
  status: string; docsId: string; tglBerlaku: string; tglBerakhir: string;
  fotoFolderId: string;
  publikasi?: { statusPublikasi: string; tanggalKegiatan: string; tempatKegiatan: string } | null;
}

interface PasalData { nomor: number; judul: string; poin: string[]; }

const TOPIK_MAP: { kata: string[]; frase: string }[] = [
  { kata: ['sosialisasi','penyuluhan','edukasi','komunikasi','kie'], frase: 'sosialisasi dan edukasi pencegahan narkotika' },
  { kata: ['pelatihan','training','workshop','bimtek'], frase: 'pelatihan peningkatan kapasitas' },
  { kata: ['pengujian','tes urine','deteksi','uji narkoba'], frase: 'pengujian dan deteksi narkotika' },
  { kata: ['penggiat','relawan','kader','satgas','p4gn'], frase: 'pembentukan dan pembinaan penggiat P4GN' },
  { kata: ['kampanye','promosi','gerakan'], frase: 'kampanye anti narkoba' },
  { kata: ['kuliah','seminar','diskusi','forum','talkshow'], frase: 'seminar dan diskusi publik' },
  { kata: ['rehabilitasi','pemulihan','konseling'], frase: 'program rehabilitasi' },
];

function generateNarasi(params: { jenis:string; namaMitra:string; statusPublikasi:string; tanggalKegiatan:string; tempatKegiatan:string; poinDipilih:string[] }): string {
  const { jenis, namaMitra, statusPublikasi, tanggalKegiatan, tempatKegiatan, poinDipilih } = params;
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

  if (statusPublikasi === 'akan-berlangsung') {
    return `BNN Provinsi Sulawesi Selatan akan melaksanakan kegiatan kerja sama ${jenis} bersama ${namaMitra}${waktuTempat ? ' ' + waktuTempat : ''}.\n\nProgram ini dirancang untuk mendorong ${topikStr} sebagai bagian dari upaya P4GN di lingkungan ${namaMitra}.${poinDipilih.length > 0 ? `\n\nRangkaian kegiatan mencakup: ${rangkum}.` : ''}`;
  }
  if (statusPublikasi === 'berlangsung') {
    return `BNN Provinsi Sulawesi Selatan saat ini tengah melaksanakan kegiatan kerja sama ${jenis} bersama ${namaMitra}${waktuTempat ? ' yang berlangsung ' + waktuTempat : ''}.\n\nKegiatan berfokus pada ${topikStr} di lingkungan ${namaMitra}.${poinDipilih.length > 0 ? `\n\nSaat ini sedang berjalan: ${rangkum}.` : ''}`;
  }
  return `BNN Provinsi Sulawesi Selatan telah melaksanakan kegiatan kerja sama ${jenis} bersama ${namaMitra}${waktuTempat ? ' ' + waktuTempat : ''}.\n\nKegiatan mencakup ${topikStr} di lingkungan ${namaMitra}.${poinDipilih.length > 0 ? `\n\nKegiatan yang terlaksana: ${rangkum}.` : ''}`;
}

const STATUS_OPTS = [
  { key:'akan-berlangsung',  label:'Akan Berlangsung',   desc:'Kegiatan dijadwalkan', color:'#F59E0B', icon: Clock },
  { key:'berlangsung',       label:'Sedang Berlangsung', desc:'Saat ini berjalan', color:'#EF4444', icon: Send },
  { key:'telah-berlangsung', label:'Telah Selesai',      desc:'Sudah selesai dilaksanakan', color:'#10B981', icon: CheckCircle },
];

export default function ExtractPoinPage() {
  const [role, setRole]           = useState('');
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
  const [expandedPasal, setExpandedPasal] = useState<Set<number>>(new Set());
  const [statusPublikasi, setStatusPublikasi] = useState<'akan-berlangsung'|'berlangsung'|'telah-berlangsung'>('akan-berlangsung');
  const [tanggalKegiatan, setTanggalKegiatan] = useState('');
  const [tempatKegiatan, setTempatKegiatan]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [showNarasi, setShowNarasi] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  const narasiPreview = activeDok ? generateNarasi({
    jenis: activeDok.jenis, namaMitra: activeDok.namaMitra,
    statusPublikasi, tanggalKegiatan, tempatKegiatan, poinDipilih,
  }) : '';

  const loadDokList = useCallback(() => {
    setLoading(true);
    fetch('/api/extract-poin')
      .then(r => r.json())
      .then(d => { setDokList(d.dokumen || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat data.'); setLoading(false); });
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    loadDokList();
  }, [loadDokList]);

  useEffect(() => {
    setSelectedCount(poinDipilih.length);
  }, [poinDipilih]);

  const pilihDokumen = async (dok: DokSelesai) => {
    setActiveDok(dok); setPasalData([]); setPoinDipilih([]);
    setMsg(''); setError(''); setLoadingPasal(true); setShowNarasi(false);
    setStatusPublikasi('akan-berlangsung'); setTanggalKegiatan(''); setTempatKegiatan('');
    setExpandedPasal(new Set());

    try {
      const res = await fetch(`/api/extract-poin?idDokumen=${dok.id}&getPoin=true`);
      const d   = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }

      setPasalData(d.pasalData || []);
      const nomorSet = new Set<number>((d.pasalData || []).map((p: PasalData) => p.nomor));
      setExpandedPasal(nomorSet);

      if (d.savedData) {
        setStatusPublikasi(d.savedData.statusPublikasi || 'akan-berlangsung');
        setTanggalKegiatan(d.savedData.tanggalKegiatan || '');
        setTempatKegiatan(d.savedData.tempatKegiatan || '');
        setPoinDipilih(d.savedData.poinDipilih || []);
      }
    } catch { setError('Gagal memuat pasal.'); }
    finally { setLoadingPasal(false); }
  };

  const togglePasal = (nomor: number) => {
    const next = new Set(expandedPasal);
    next.has(nomor) ? next.delete(nomor) : next.add(nomor);
    setExpandedPasal(next);
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

  const simpan = async () => {
    if (!activeDok || poinDipilih.length === 0) { setError('Pilih minimal 1 poin.'); return; }
    setSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/extract-poin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idDokumen: activeDok.id, jenis: activeDok.jenis,
          judul: activeDok.judul, namaMitra: activeDok.namaMitra,
          statusPublikasi, tanggalKegiatan, tempatKegiatan,
          poinDipilih, dibuatOleh: role,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }
      setMsg(d.message); loadDokList();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const backUrl  = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';
  const filtered = dokList.filter(d =>
    d.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.namaMitra.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPoin = pasalData.reduce((acc, p) => acc + p.poin.length, 0);

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #f8fafb 0%, #e8f0fe 100%)', fontFamily:'sans-serif' }}>
      <nav style={navStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href={backUrl} style={backLink}>
            <ArrowLeft size={16} />
            Dashboard
          </a>
          <span style={{ color:'#e5e7eb' }}>|</span>
          <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
            <FileText size={18} />
            Extract Poin Publik
          </div>
        </div>
        <a href="/beranda" target="_blank" rel="noopener noreferrer" style={btnOutline}>
          <ExternalLink size={14} style={{ marginRight:4 }} />
          Lihat Beranda
        </a>
      </nav>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'1.25rem', display:'grid', gridTemplateColumns:'320px 1fr', gap:20 }}>

        {/* Kolom kiri - Daftar Dokumen */}
        <div>
          <div style={{ 
            display:'flex', 
            justifyContent:'space-between', 
            alignItems:'center', 
            marginBottom:10 
          }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, display:'flex', alignItems:'center', gap:6 }}>
              <FileText size={14} />
              Dokumen Selesai ({dokList.length})
            </div>
            <button 
              onClick={loadDokList}
              style={{
                ...btnSm,
                fontSize:10,
                display:'flex',
                alignItems:'center',
                gap:4,
                padding:'4px 10px'
              }}
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
          
          <div style={{ position:'relative', marginBottom:10 }}>
            <Search size={16} style={{ 
              position:'absolute', 
              left:10, 
              top:'50%', 
              transform:'translateY(-50%)',
              color: isSearchFocused ? '#0F6E56' : '#9ca3af',
              transition:'color 0.3s ease'
            }} />
            <input
              placeholder="Cari dokumen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{ 
                ...inputFull, 
                paddingLeft:34,
                borderColor: isSearchFocused ? '#0F6E56' : '#e5e7eb',
                boxShadow: isSearchFocused ? '0 0 0 3px rgba(15,110,86,.1)' : 'none',
                transition:'all 0.3s ease'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position:'absolute',
                  right:8,
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

          {loading ? (
            <div style={{ ...card, textAlign:'center', padding:'2rem', color:'#9ca3af', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#0F6E56' }} />
              <span style={{ fontSize:12 }}>Memuat dokumen...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ ...card, textAlign:'center', padding:'2rem', color:'#9ca3af', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <FileText size={32} style={{ color:'#d1d5db' }} />
              <div style={{ fontSize:13 }}>
                {searchTerm ? 'Tidak ada yang cocok.' : 'Belum ada dokumen berstatus "Selesai".'}
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:'calc(100vh - 240px)', overflowY:'auto', paddingRight:4 }}>
              {filtered.map((d, index) => {
                const isActive   = activeDok?.id === d.id;
                const sudahPublik = !!(d.publikasi?.statusPublikasi);
                return (
                  <div 
                    key={d.id} 
                    onClick={() => pilihDokumen(d)} 
                    style={{
                      ...card, 
                      cursor:'pointer', 
                      padding:'12px 14px',
                      border: isActive ? '2px solid #0F6E56' : '1px solid #e5e7eb',
                      background: isActive ? 'linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 100%)' : '#fff',
                      boxShadow: isActive ? '0 2px 12px rgba(15,110,86,.12)' : 'none',
                      transition:'all 0.3s ease',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                      animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`
                    }}
                  >
                    <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ 
                        fontSize:10, 
                        fontWeight:600, 
                        padding:'2px 10px', 
                        borderRadius:100, 
                        background:d.jenis==='MOU'?'#E6F1FB':'#FAEEDA', 
                        color:d.jenis==='MOU'?'#0C447C':'#854F0B',
                        display:'flex',
                        alignItems:'center',
                        gap:4
                      }}>
                        <Tag size={10} />
                        {d.jenis}
                      </span>
                      {sudahPublik && (
                        <span style={{ 
                          fontSize:10, 
                          padding:'2px 10px', 
                          borderRadius:100, 
                          background:'#D1FAE5', 
                          color:'#065F46',
                          display:'flex',
                          alignItems:'center',
                          gap:4
                        }}>
                          <CheckCircle size={10} />
                          Publik
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, lineHeight:1.4, marginBottom:3, color:'#1a1a2e' }}>{d.judul}</div>
                    <div style={{ fontSize:11, color:'#6b7280', display:'flex', alignItems:'center', gap:4 }}>
                      <Building size={12} />
                      {d.namaMitra}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom kanan - Detail */}
        <div>
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
          {error && (
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

          {!activeDok ? (
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
              <div style={{ fontSize:14 }}>Pilih dokumen di kiri untuk extract poin</div>
            </div>
          ) : loadingPasal ? (
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
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#0F6E56' }} />
              <div style={{ fontSize:13 }}>Mengambil pasal dari Google Docs...</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              {/* Header dokumen */}
              <div style={{ 
                ...card,
                animation: 'fadeInUp 0.4s ease-out',
                background: 'linear-gradient(135deg, #f9fafb 0%, #f0f4f8 100%)'
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e' }}>{activeDok.judul}</div>
                    <div style={{ fontSize:12, color:'#6b7280', marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                      <Building size={14} />
                      {activeDok.namaMitra}
                    </div>
                  </div>
                  <span style={{ 
                    fontSize:10, 
                    fontWeight:600, 
                    padding:'4px 12px', 
                    borderRadius:100, 
                    background:activeDok.jenis==='MOU'?'#E6F1FB':'#FAEEDA', 
                    color:activeDok.jenis==='MOU'?'#0C447C':'#854F0B',
                    display:'flex',
                    alignItems:'center',
                    gap:4
                  }}>
                    <Tag size={12} />
                    {activeDok.jenis}
                  </span>
                </div>
              </div>

              {/* Status + tanggal + tempat */}
              <div style={{ ...card, animation: 'fadeInUp 0.4s ease-out 0.05s both' }}>
                <div style={{ 
                  fontSize:12, 
                  fontWeight:600, 
                  marginBottom:10,
                  display:'flex',
                  alignItems:'center',
                  gap:6,
                  color:'#374151'
                }}>
                  <Clock size={14} />
                  Status Publikasi
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                  {STATUS_OPTS.map((s, index) => {
                    const isActive = statusPublikasi === s.key;
                    const Icon = s.icon;
                    return (
                      <button 
                        key={s.key} 
                        onClick={() => setStatusPublikasi(s.key as any)}
                        style={{
                          padding:'12px 16px',
                          borderRadius:10,
                          border:'2px solid',
                          cursor:'pointer',
                          fontFamily:'sans-serif',
                          textAlign:'left',
                          borderColor: isActive ? s.color : '#e5e7eb',
                          background: isActive ? `${s.color}10` : '#fff',
                          transition:'all 0.3s ease',
                          transform: isActive ? 'scale(1.01)' : 'scale(1)',
                          boxShadow: isActive ? `0 2px 8px ${s.color}20` : 'none',
                          animation: `fadeInUp 0.3s ease-out ${0.1 + index * 0.05}s both`
                        }}
                      >
                        <div style={{ 
                          fontSize:13, 
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? s.color : '#374151',
                          display:'flex',
                          alignItems:'center',
                          gap:8
                        }}>
                          <Icon size={16} />
                          {s.label}
                          {isActive && (
                            <Check size={14} style={{ color: s.color, marginLeft:'auto' }} />
                          )}
                        </div>
                        <div style={{ fontSize:11, color:'#6b7280', marginTop:3 }}>{s.desc}</div>
                      </button>
                    );
                  })}
                </div>
                
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={labelSt}>
                      <Calendar size={13} style={{ marginRight:4 }} />
                      Tanggal Kegiatan
                    </label>
                    <input 
                      type="date" 
                      style={{
                        ...inputFull,
                        borderColor: '#e5e7eb',
                        transition:'all 0.3s ease'
                      }} 
                      value={tanggalKegiatan} 
                      onChange={e => setTanggalKegiatan(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={labelSt}>
                      <MapPin size={13} style={{ marginRight:4 }} />
                      Tempat Kegiatan
                    </label>
                    <input 
                      style={{
                        ...inputFull,
                        borderColor: '#e5e7eb',
                        transition:'all 0.3s ease'
                      }} 
                      value={tempatKegiatan} 
                      onChange={e => setTempatKegiatan(e.target.value)} 
                      placeholder="Contoh: Kampus UNM, Makassar" 
                    />
                  </div>
                </div>
              </div>

              {/* Pilih poin — accordion */}
              <div style={{ ...card, animation: 'fadeInUp 0.4s ease-out 0.1s both' }}>
                <div style={{ 
                  display:'flex', 
                  justifyContent:'space-between', 
                  alignItems:'center', 
                  marginBottom:10,
                  flexWrap:'wrap',
                  gap:6
                }}>
                  <div style={{ 
                    fontSize:13, 
                    fontWeight:600,
                    display:'flex',
                    alignItems:'center',
                    gap:8,
                    color:'#1a1a2e'
                  }}>
                    <List size={16} />
                    Pilih Poin
                    <span style={{ 
                      fontSize:11, 
                      fontWeight:500,
                      color: '#6b7280',
                      background:'#f3f4f6',
                      padding:'2px 10px',
                      borderRadius:100
                    }}>
                      {selectedCount} / {totalPoin} dipilih
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    <button 
                      onClick={() => setExpandedPasal(new Set(pasalData.map(p => p.nomor)))} 
                      style={{ 
                        ...btnSm, 
                        fontSize:10,
                        display:'flex',
                        alignItems:'center',
                        gap:4
                      }}
                    >
                      <Maximize2 size={12} />
                      Buka Semua
                    </button>
                    <button 
                      onClick={() => setExpandedPasal(new Set())} 
                      style={{ 
                        ...btnSm, 
                        fontSize:10,
                        display:'flex',
                        alignItems:'center',
                        gap:4
                      }}
                    >
                      <Minimize2 size={12} />
                      Tutup Semua
                    </button>
                    <button 
                      onClick={() => setPoinDipilih(pasalData.flatMap(p => p.poin))} 
                      style={{ 
                        ...btnSm, 
                        fontSize:10, 
                        color:'#065F46', 
                        borderColor:'#86EFAC',
                        background:'#D1FAE5',
                        display:'flex',
                        alignItems:'center',
                        gap:4
                      }}
                    >
                      <Check size={12} />
                      Pilih Semua
                    </button>
                    <button 
                      onClick={() => setPoinDipilih([])} 
                      style={{ 
                        ...btnSm, 
                        fontSize:10, 
                        color:'#991B1B', 
                        borderColor:'#FCA5A5',
                        display:'flex',
                        alignItems:'center',
                        gap:4
                      }}
                    >
                      <X size={12} />
                      Reset
                    </button>
                  </div>
                </div>

                <div style={{ 
                  fontSize:11, 
                  color:'#6b7280', 
                  background:'#f9fafb', 
                  padding:'8px 12px', 
                  borderRadius:6, 
                  marginBottom:12,
                  display:'flex',
                  alignItems:'center',
                  gap:6
                }}>
                  <Info size={14} />
                  Di halaman publik hanya isi poin yang tampil — tanpa nama/nomor pasal. Klik header pasal untuk buka/tutup.
                </div>

                {pasalData.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'2rem', color:'#9ca3af', fontSize:13 }}>
                    Tidak ada pasal yang berhasil diekstrak.
                  </div>
                ) : (
                  <div style={{ 
                    display:'flex', 
                    flexDirection:'column', 
                    gap:6, 
                    maxHeight:500, 
                    overflowY:'auto', 
                    paddingRight:4 
                  }}>
                    {pasalData.map((pasal, index) => {
                      const isOpen        = expandedPasal.has(pasal.nomor);
                      const selectedCount = pasal.poin.filter(p => poinDipilih.includes(p)).length;
                      const allSelected   = pasal.poin.length > 0 && pasal.poin.every(p => poinDipilih.includes(p));

                      return (
                        <div 
                          key={pasal.nomor} 
                          style={{ 
                            border:`1px solid ${isOpen ? '#86EFAC' : '#e5e7eb'}`, 
                            borderRadius:10, 
                            overflow:'hidden', 
                            background:'#fff',
                            transition:'all 0.3s ease',
                            boxShadow: isOpen ? '0 2px 8px rgba(15,110,86,.06)' : 'none',
                            animation: `fadeInUp 0.3s ease-out ${0.15 + index * 0.04}s both`
                          }}
                        >

                          {/* Header pasal */}
                          <div
                            onClick={() => togglePasal(pasal.nomor)}
                            style={{
                              display:'flex', 
                              alignItems:'center', 
                              justifyContent:'space-between',
                              padding:'10px 14px', 
                              cursor:'pointer', 
                              userSelect:'none',
                              background: isOpen ? 'linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 100%)' : '#f9fafb',
                              borderBottom: isOpen ? '1px solid #e5e7eb' : 'none',
                              transition:'all 0.3s ease'
                            }}
                          >
                            <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                              <span style={{
                                width:28, 
                                height:28, 
                                borderRadius:'50%', 
                                flexShrink:0,
                                background: selectedCount > 0 ? 'linear-gradient(135deg, #0F6E56 0%, #22a67e 100%)' : '#e5e7eb',
                                color: selectedCount > 0 ? '#fff' : '#9ca3af',
                                fontSize:11, 
                                fontWeight:700,
                                display:'flex', 
                                alignItems:'center', 
                                justifyContent:'center',
                                transition:'all 0.3s ease'
                              }}>
                                {pasal.nomor}
                              </span>
                              <span style={{ 
                                fontSize:13, 
                                fontWeight: isOpen ? 600 : 500, 
                                color: isOpen ? '#065F46' : '#374151', 
                                overflow:'hidden', 
                                textOverflow:'ellipsis', 
                                whiteSpace:'nowrap' 
                              }}>
                                {pasal.judul}
                              </span>
                              <span style={{ fontSize:11, color:'#9ca3af', flexShrink:0 }}>{pasal.poin.length} poin</span>
                              {selectedCount > 0 && (
                                <span style={{ 
                                  fontSize:10, 
                                  fontWeight:600, 
                                  padding:'2px 10px', 
                                  borderRadius:100, 
                                  background:'#D1FAE5', 
                                  color:'#065F46', 
                                  flexShrink:0,
                                  display:'flex',
                                  alignItems:'center',
                                  gap:4
                                }}>
                                  <Check size={10} />
                                  {selectedCount}
                                </span>
                              )}
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, marginLeft:8 }}>
                              {isOpen && pasal.poin.length > 0 && (
                                <button
                                  onClick={e => togglePoinPasal(pasal.poin, e)}
                                  style={{
                                    fontSize:10, 
                                    padding:'3px 10px', 
                                    borderRadius:5, 
                                    cursor:'pointer',
                                    fontFamily:'sans-serif', 
                                    transition:'all 0.2s ease',
                                    border: allSelected ? '1px solid #FCA5A5' : '1px solid #86EFAC',
                                    background: allSelected ? '#FEE2E2' : '#D1FAE5',
                                    color: allSelected ? '#991B1B' : '#065F46',
                                    display:'flex',
                                    alignItems:'center',
                                    gap:4
                                  }}
                                >
                                  {allSelected ? <X size={10} /> : <Check size={10} />}
                                  {allSelected ? 'Batal' : 'Semua'}
                                </button>
                              )}
                              <span style={{ 
                                fontSize:12, 
                                color:'#9ca3af', 
                                transition:'transform 0.3s ease', 
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                                display:'inline-block' 
                              }}>
                                <ChevronDown size={16} />
                              </span>
                            </div>
                          </div>

                          {/* Sub-poin */}
                          {isOpen && (
                            <div style={{ padding:'10px 14px 14px', display:'flex', flexDirection:'column', gap:5 }}>
                              {pasal.poin.length > 0 ? (
                                pasal.poin.map((p, pi) => {
                                  const isChecked = poinDipilih.includes(p);
                                  return (
                                    <label 
                                      key={pi} 
                                      style={{
                                        display:'flex', 
                                        gap:10, 
                                        alignItems:'flex-start', 
                                        cursor:'pointer',
                                        padding:'8px 12px', 
                                        borderRadius:8,
                                        background: isChecked ? 'linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 100%)' : '#f9fafb',
                                        border: `1px solid ${isChecked ? '#86EFAC' : '#f3f4f6'}`,
                                        transition:'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isChecked) {
                                          (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isChecked) {
                                          (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                                        }
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => togglePoin(p)}
                                        style={{ 
                                          marginTop:2, 
                                          accentColor:'#0F6E56', 
                                          flexShrink:0, 
                                          width:16, 
                                          height:16, 
                                          cursor:'pointer' 
                                        }}
                                      />
                                      <span style={{
                                        fontSize:12, 
                                        lineHeight:1.7,
                                        color: isChecked ? '#065F46' : '#374151',
                                        fontWeight: isChecked ? 500 : 400,
                                        flex:1,
                                      }}>
                                        {p}
                                      </span>
                                    </label>
                                  );
                                })
                              ) : (
                                <div style={{ fontSize:11, color:'#9ca3af', fontStyle:'italic', padding:'6px' }}>
                                  Tidak ada sub-poin di pasal ini
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Preview narasi */}
              {poinDipilih.length > 0 && (
                <div style={{ 
                  ...card, 
                  border:'2px solid #86EFAC',
                  animation: 'fadeInUp 0.4s ease-out 0.15s both'
                }}>
                  <div style={{ 
                    display:'flex', 
                    justifyContent:'space-between', 
                    alignItems:'center', 
                    marginBottom:10
                  }}>
                    <div style={{ 
                      fontSize:13, 
                      fontWeight:600, 
                      color:'#065F46',
                      display:'flex',
                      alignItems:'center',
                      gap:8
                    }}>
                      <FileText size={16} />
                      Preview Narasi Otomatis
                    </div>
                    <button 
                      onClick={() => setShowNarasi(s => !s)} 
                      style={{ 
                        ...btnSm, 
                        fontSize:11,
                        display:'flex',
                        alignItems:'center',
                        gap:4
                      }}
                    >
                      {showNarasi ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showNarasi ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                  </div>
                  
                  {showNarasi && (
                    <div style={{ 
                      fontSize:13, 
                      color:'#374151', 
                      lineHeight:1.8, 
                      background:'#f9fafb', 
                      padding:'14px 18px', 
                      borderRadius:8, 
                      whiteSpace:'pre-line',
                      border:'1px solid #e5e7eb',
                      animation: 'fadeInUp 0.3s ease-out'
                    }}>
                      {narasiPreview}
                    </div>
                  )}
                  {!showNarasi && (
                    <div style={{ 
                      fontSize:12, 
                      color:'#6b7280',
                      display:'flex',
                      alignItems:'center',
                      gap:6
                    }}>
                      <Info size={14} />
                      Narasi dibuat otomatis dari poin yang dipilih. Klik "Tampilkan" untuk preview.
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={simpan}
                disabled={saving || poinDipilih.length === 0}
                style={{ 
                  ...btnPrimary, 
                  height:48, 
                  fontSize:14,
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:8,
                  opacity: saving || poinDipilih.length === 0 ? 0.6 : 1,
                  cursor: saving || poinDipilih.length === 0 ? 'not-allowed' : 'pointer',
                  transition:'all 0.3s ease',
                  animation: 'fadeInUp 0.4s ease-out 0.2s both'
                }}
                onMouseEnter={(e) => {
                  if (!saving && poinDipilih.length > 0) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,110,86,.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,110,86,.2)';
                }}
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
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
  padding:'1.25rem', 
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
  width:'100%', 
  padding:'10px 16px', 
  borderRadius:10, 
  border:'none', 
  background:'linear-gradient(135deg, #0F6E56 0%, #1a8f70 100%)', 
  color:'#fff', 
  fontSize:13, 
  fontWeight:600, 
  cursor:'pointer', 
  fontFamily:'sans-serif',
  boxShadow:'0 2px 8px rgba(15,110,86,.2)',
  transition:'all .3s ease'
};

const btnSm: React.CSSProperties = { 
  padding:'5px 12px', 
  borderRadius:7, 
  border:'1px solid #e5e7eb', 
  background:'#fff', 
  color:'#374151', 
  fontSize:11, 
  cursor:'pointer', 
  fontFamily:'sans-serif',
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

const msgBox = (color: string, bg: string): React.CSSProperties => ({ 
  fontSize:12, 
  color, 
  background:bg, 
  padding:'10px 14px', 
  borderRadius:10, 
  marginBottom:12,
  border:'1px solid transparent'
});