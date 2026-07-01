'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Download,
  Eye,
  Check,
  X,
  Search,
  Filter,
  Users,
  FileText,
  Tag,
  Mail,
  Phone,
  MessageSquare,
  Clipboard,
  Calendar,
  Building,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  Plus,
  Clock,
  FileCheck,
  FileX,
  ExternalLink,
  Copy,
  Shield,
  User,
  List,
  LayoutDashboard,
  RefreshCw,
  Send,
  Key,
  Lock,
  Unlock,
  Trash2,
  Edit,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface Pendaftaran {
  id: string; idKegiatan: string; judulKegiatan: string; jenis: string;
  namaInstitusi: string; jurusan: string; email: string; noWa: string;
  deskripsi: string; kodeTracking: string; status: string; catatan: string;
  idDokumen: string; tglDaftar: string;
}

interface HasilGenerate {
  idDokumen: string; kodeAkses: string; kodeExpire: string;
  tglBerlaku: string; tglBerakhir: string; durasi: number; docsUrl: string;
}

const FILTER = [
  { key:'semua',  label:'Semua',        statuses:[], icon: List },
  { key:'baru',   label:'Perlu Review', statuses:['Diajukan','Ditinjau'], icon: Clock },
  { key:'acc',    label:'Disetujui',    statuses:['Disetujui'], icon: CheckCircle },
  { key:'tolak',  label:'Ditolak',      statuses:['Ditolak'], icon: X },
];

const STATUS_COLOR: Record<string, { bg:string; color:string; icon: any }> = {
  'Diajukan': { bg:'#E6F1FB', color:'#0C447C', icon: Clock },
  'Ditinjau': { bg:'#FAEEDA', color:'#854F0B', icon: Eye },
  'Disetujui':{ bg:'#D1FAE5', color:'#065F46', icon: CheckCircle },
  'Ditolak':  { bg:'#FEE2E2', color:'#991B1B', icon: X },
};

export default function KelolaPendaftaranPage() {
  const [role, setRole]       = useState('');
  const [data, setData]       = useState<Pendaftaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('baru');
  const [search, setSearch]   = useState('');
  const [mitraList, setMitraList] = useState<{id:string;nama:string}[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Modal acc
  const [accItem, setAccItem]   = useState<Pendaftaran | null>(null);
  const [judulDok, setJudulDok] = useState('');
  const [durasiDok, setDurasiDok] = useState(5);
  const [idMitra, setIdMitra]   = useState('');
  const [generating, setGenerating] = useState(false);
  const [hasil, setHasil]       = useState<HasilGenerate | null>(null);
  const [copied, setCopied] = useState(false);

  // Modal tolak
  const [tolakItem, setTolakItem] = useState<Pendaftaran | null>(null);
  const [alasanTolak, setAlasanTolak] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/rencana/daftar')
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat.'); setLoading(false); });
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    load();
    fetch('/api/superadmin/mitra').then(r => r.json()).then(d => setMitraList(d.data || [])).catch(()=>{});
  }, [load]);

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';
  const activeStatuses = FILTER.find(f => f.key === filter)?.statuses || [];
  const filtered = data.filter(d => {
    const mf = filter === 'semua' || activeStatuses.includes(d.status);
    const ms = !search || d.namaInstitusi.toLowerCase().includes(search.toLowerCase()) ||
      d.kodeTracking.toLowerCase().includes(search.toLowerCase()) ||
      d.judulKegiatan.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedItems(newSet);
  };

  const openAcc = (item: Pendaftaran) => {
    setAccItem(item); setHasil(null); setError('');
    setJudulDok(item.judulKegiatan || ''); setDurasiDok(5);
    const cocok = mitraList.find(m => m.nama.toLowerCase() === item.namaInstitusi.toLowerCase());
    setIdMitra(cocok?.id || '');
    setCopied(false);
  };

  const handleAcc = async () => {
    if (!accItem) return;
    if (!judulDok.trim()) { setError('Judul dokumen wajib diisi.'); return; }
    setGenerating(true); setError('');

    const namaMitra = mitraList.find(m => m.id === idMitra)?.nama || accItem.namaInstitusi;

    try {
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipeKode: 'dokumen', idMitra: idMitra || '', namaMitra,
          jenis: accItem.jenis, judul: judulDok.trim(),
          durasiTahun: durasiDok, dibuatOleh: role,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal generate.'); return; }

      await fetch('/api/rencana/daftar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: accItem.id, statusBaru: 'Disetujui',
          idDokumen: d.idDokumen,
          catatan: `Disetujui & dokumen dibuat. Kode akses: ${d.kodeAkses}`,
        }),
      });

      setHasil(d); load();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setGenerating(false); }
  };

  const handleTolak = async () => {
    if (!tolakItem) return;
    if (!alasanTolak.trim()) { setError('Alasan wajib diisi.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/rencana/daftar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tolakItem.id, statusBaru: 'Ditolak', catatan: alasanTolak.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return; }
      setMsg('Pendaftaran ditolak. Kuota dikembalikan.');
      setTolakItem(null); setAlasanTolak(''); load();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafb', fontFamily:'sans-serif' }}>
      <nav style={navStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href="/dashboard/rencana" style={backLink}>
            <ArrowLeft size={16} />
            E-Planning
          </a>
          <span style={{ color:'#e5e7eb' }}>|</span>
          <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
            <Users size={18} />
            Kelola Pendaftaran Kegiatan
          </div>
        </div>
        <a href={backUrl} style={btnOutline}>
          <LayoutDashboard size={14} style={{ marginRight:4 }} />
          Dashboard
        </a>
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
        {error && !accItem && !tolakItem && (
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

        <div style={{ 
          display:'flex', 
          gap:10, 
          marginBottom:16,
          flexWrap:'wrap'
        }}>
          <div style={{ flex:1, minWidth:200, position:'relative' }}>
            <Search size={16} style={{ 
              position:'absolute', 
              left:12, 
              top:'50%', 
              transform:'translateY(-50%)',
              color:'#9ca3af'
            }} />
            <input 
              style={{ 
                ...inputFull, 
                paddingLeft:36,
                borderColor: search ? '#0F6E56' : '#e5e7eb',
                transition:'all .3s ease'
              }} 
              placeholder="Cari institusi, kode, kegiatan..." 
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
          <button 
            onClick={() => setFilter('semua')}
            style={{
              ...btnSm,
              background: filter === 'semua' ? '#0F6E56' : '#fff',
              color: filter === 'semua' ? '#fff' : '#374151',
              borderColor: filter === 'semua' ? 'transparent' : '#e5e7eb',
              fontWeight: filter === 'semua' ? 600 : 400
            }}
          >
            <List size={14} style={{ marginRight:4 }} />
            Semua ({data.length})
          </button>
        </div>

        <div style={{ 
          display:'flex', 
          gap:6, 
          marginBottom:18, 
          flexWrap:'wrap',
          padding:'4px',
          background:'#f1f5f9',
          borderRadius:12
        }}>
          {FILTER.map(f => {
            const count = f.key === 'semua' ? data.length : data.filter(d => f.statuses.includes(d.status)).length;
            const Icon = f.icon;
            const isActive = filter === f.key;
            return (
              <button 
                key={f.key} 
                onClick={() => setFilter(f.key)} 
                style={{
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
                }}
              >
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
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
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
              width:36,
              height:36,
              border:'3px solid #f3f4f6',
              borderTop:'3px solid #0F6E56',
              borderRadius:'50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            Memuat data pendaftaran...
          </div>
        ) : filtered.length === 0 ? (
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
              fontSize:48, 
              opacity:0.5
            }}>
              <FileText size={48} style={{ color:'#d1d5db' }} />
            </div>
            <div style={{ fontSize:14, fontWeight:500 }}>Tidak ada pendaftaran pada filter ini.</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map((item, index) => {
              const sc = STATUS_COLOR[item.status] || { bg:'#f3f4f6', color:'#6b7280', icon: FileText };
              const StatusIcon = sc.icon;
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
                      
                      <div style={{ 
                        fontSize:15, 
                        fontWeight:700, 
                        color:'#1a1a2e',
                        display:'flex',
                        alignItems:'center',
                        gap:8
                      }}>
                        <Building size={16} style={{ color:'#6b7280' }} />
                        {item.namaInstitusi}
                      </div>
                      
                      <div style={{ 
                        fontSize:12, 
                        color:'#0F6E56', 
                        marginTop:4,
                        display:'flex',
                        alignItems:'center',
                        gap:4
                      }}>
                        <FileText size={12} />
                        {item.judulKegiatan}
                      </div>

                      {isExpanded && (
                        <div style={{ 
                          marginTop:10,
                          animation: 'fadeInUp 0.3s ease-out'
                        }}>
                          {item.deskripsi && (
                            <div style={{ 
                              fontSize:12, 
                              color:'#6b7280', 
                              lineHeight:1.6,
                              background:'#f9fafb',
                              padding:'8px 12px',
                              borderRadius:6,
                              marginBottom:6
                            }}>
                              <MessageSquare size={12} style={{ marginRight:4, color:'#9ca3af' }} />
                              {item.deskripsi}
                            </div>
                          )}
                          <div style={{ 
                            fontSize:11, 
                            color:'#9ca3af', 
                            marginTop:4,
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
                              Daftar: {item.tglDaftar}
                            </span>
                          </div>
                          {(item.email||item.noWa) && (
                            <div style={{ 
                              fontSize:11, 
                              color:'#6b7280', 
                              marginTop:4,
                              display:'flex',
                              gap:14,
                              flexWrap:'wrap'
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
                              <Info size={12} style={{ flexShrink:0, marginTop:1 }} />
                              {item.catatan}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      display:'flex', 
                      flexDirection:'column', 
                      gap:5, 
                      flexShrink:0,
                      minWidth:100
                    }}>
                      {!['Disetujui','Ditolak'].includes(item.status) && (
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
                            Acc & Generate
                          </button>
                          <button 
                            onClick={() => { setTolakItem(item); setAlasanTolak(''); setError(''); }} 
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
                      {item.status === 'Disetujui' && item.idDokumen && (
                        <a 
                          href={`/dashboard/dokumen/${item.idDokumen}`} 
                          style={{ 
                            ...btnSm, 
                            textDecoration:'none', 
                            textAlign:'center',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            gap:4,
                            background:'#E6F1FB',
                            color:'#0C447C',
                            borderColor:'#BFDBFE'
                          }}
                        >
                          <Eye size={14} />
                          Lihat Dokumen
                        </a>
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

      {/* Modal Acc */}
      {accItem && (
        <div style={overlay} onClick={() => !generating && setAccItem(null)}>
          <div style={{ 
            ...modalBox, 
            animation: 'scaleIn 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            {hasil ? (
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
                  <div style={{ fontSize:18, fontWeight:700, color:'#0F6E56' }}>Dokumen Berhasil Dibuat!</div>
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
                    Kode Akses
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
                    {hasil.kodeAkses}
                  </div>
                  <button 
                    onClick={() => { 
                      navigator.clipboard.writeText(hasil.kodeAkses); 
                      setCopied(true); 
                      setTimeout(()=>setCopied(false),1500); 
                    }} 
                    style={{
                      ...btnPrimary,
                      display:'inline-flex',
                      alignItems:'center',
                      gap:6,
                      padding:'8px 20px'
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Tersalin!' : 'Salin Kode'}
                  </button>
                </div>

                <div style={{ 
                  background:'#E6F1FB', 
                  borderRadius:8, 
                  padding:'10px 14px', 
                  fontSize:12, 
                  color:'#0C447C',
                  marginBottom:16,
                  display:'flex',
                  alignItems:'flex-start',
                  gap:8
                }}>
                  <Info size={14} style={{ flexShrink:0, marginTop:1 }} />
                  <span>
                    Sampaikan kode <strong>{hasil.kodeAkses}</strong> ke {accItem.email || accItem.noWa}. 
                    Pendaftaran kini masuk alur pengajuan biasa.
                  </span>
                </div>

                {hasil.docsUrl && (
                  <a 
                    href={hasil.docsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ 
                      ...btnPrimary, 
                      display:'flex', 
                      alignItems:'center',
                      justifyContent:'center',
                      gap:6,
                      textDecoration:'none', 
                      marginBottom:10 
                    }}
                  >
                    <ExternalLink size={14} />
                    Buka Docs
                  </a>
                )}
                <button 
                  onClick={() => setAccItem(null)} 
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
                    onClick={() => setAccItem(null)} 
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
                  borderRadius:8, 
                  padding:'10px 14px', 
                  marginBottom:14, 
                  fontSize:12 
                }}>
                  <div style={{ color:'#6b7280', marginBottom:4, display:'flex', alignItems:'center', gap:4 }}>
                    <FileText size={12} />
                    Kegiatan: <strong>{accItem.judulKegiatan}</strong>
                  </div>
                  <div style={{ color:'#6b7280', display:'flex', alignItems:'center', gap:4 }}>
                    <Tag size={12} />
                    Jenis dokumen <strong>{accItem.jenis}</strong> (dari E-Planning)
                  </div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}>
                    <Building size={14} style={{ marginRight:4 }} />
                    Mitra (dari sistem)
                  </label>
                  <select 
                    style={{
                      ...inputFull,
                      borderColor: '#e5e7eb',
                      transition:'all .3s ease'
                    }} 
                    value={idMitra} 
                    onChange={e => setIdMitra(e.target.value)}
                  >
                    <option value="">-- Belum terdaftar (dibuat otomatis) --</option>
                    {mitraList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom:12 }}>
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
                  />
                </div>

                <div style={{ marginBottom:18 }}>
                  <label style={labelSt}>
                    <Clock size={14} style={{ marginRight:4 }} />
                    Durasi Berlaku
                  </label>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {[5,6,7,8,9,10].map(d => (
                      <button 
                        key={d} 
                        onClick={() => setDurasiDok(d)} 
                        style={{
                          padding:'6px 14px', 
                          borderRadius:7, 
                          cursor:'pointer', 
                          fontFamily:'sans-serif', 
                          fontSize:12,
                          border:`2px solid ${durasiDok===d?'#0F6E56':'#e5e7eb'}`,
                          background: durasiDok===d?'#0F6E56':'#fff', 
                          color: durasiDok===d?'#fff':'#374151', 
                          fontWeight:durasiDok===d?600:400,
                          transition:'all .2s ease'
                        }}
                      >
                        {d} th
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleAcc} 
                  disabled={generating} 
                  style={{ 
                    ...btnPrimary, 
                    width:'100%', 
                    height:48,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:8,
                    fontSize:14,
                    opacity: generating ? 0.7 : 1,
                    cursor: generating ? 'not-allowed' : 'pointer',
                    transition:'all .3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!generating) {
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
                      Setujui & Generate Kode
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tolak */}
      {tolakItem && (
        <div style={overlay} onClick={() => !submitting && setTolakItem(null)}>
          <div style={{ 
            ...modalBox, 
            maxWidth:460,
            animation: 'scaleIn 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>Tolak Pendaftaran</div>
                <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>
                  {tolakItem.namaInstitusi} · {tolakItem.judulKegiatan}
                </div>
              </div>
              <button 
                onClick={() => setTolakItem(null)} 
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
              background:'#FFFBEB', 
              borderRadius:8, 
              padding:'10px 14px', 
              fontSize:12, 
              color:'#78350F',
              marginBottom:14,
              display:'flex',
              alignItems:'flex-start',
              gap:8
            }}>
              <Info size={14} style={{ flexShrink:0, marginTop:1 }} />
              <span>Menolak pendaftaran akan mengembalikan kuota slot kegiatan (+1).</span>
            </div>

            <label style={labelSt}>
              <MessageSquare size={14} style={{ marginRight:4 }} />
              Alasan Penolakan <span style={{ color:'#DC2626' }}>✱</span>
            </label>
            <textarea 
              style={{ 
                ...inputFull, 
                height:80, 
                resize:'none', 
                marginBottom:16,
                borderColor: '#e5e7eb',
                transition:'all .3s ease',
                fontFamily:'sans-serif'
              }} 
              value={alasanTolak} 
              onChange={e => setAlasanTolak(e.target.value)} 
              placeholder="Jelaskan alasan penolakan dengan jelas..."
              autoFocus 
            />

            <div style={{ display:'flex', gap:8 }}>
              <button 
                onClick={() => setTolakItem(null)} 
                style={{ 
                  ...btnSm, 
                  flex:1,
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
              <button 
                onClick={handleTolak} 
                disabled={submitting} 
                style={{ 
                  ...btnPrimary, 
                  background: '#DC2626',
                  flex:1,
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:6,
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition:'all .3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    (e.currentTarget as HTMLElement).style.background = '#B91C1C';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#DC2626';
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
            transform: scale(0.9);
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
  maxWidth:500, 
  maxHeight:'92vh', 
  overflowY:'auto',
  boxShadow:'0 20px 60px rgba(0,0,0,.2)'
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