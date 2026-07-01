'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  FileText,
  Tag,
  MapPin,
  Calendar,
  DollarSign,
  Globe,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  List,
  Grid,
  Building,
  Briefcase,
  Scale,
  Handshake,
  FileCheck,
  FileX,
  User,
  Shield,
  Award,
  BookOpen,
  Target,
  CalendarDays,
  Edit3,
  Copy,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  EyeOff,
  Lock,
  Unlock,
  Send,
  FolderOpen
} from 'lucide-react';

interface Kegiatan {
  id: string; kategori: string; divisi: string; judul: string;
  deskripsi: string; jenis: string; target: number; terisi: number;
  wilayah: string; biaya: string; tglMulai: string; tglTarget: string;
  status: string; tampilPublik: boolean; dibuatOleh: string; tglDibuat: string;
  sisaKuota: number;
}

const KATEGORI = {
  'penegak-hukum': {
    label: 'Penegak Hukum', 
    icon: Scale, 
    color: '#5B21B6', 
    bg: '#EDE9FE',
    divisi: [
      { key: 'bantuan-hukum',      label: 'Bantuan Hukum' },
      { key: 'pendampingan-hukum', label: 'Pendampingan Hukum' },
    ],
  },
  'kerja-sama-kelembagaan': {
    label: 'Kerja Sama Kelembagaan', 
    icon: Handshake, 
    color: '#0F6E56', 
    bg: '#E1F5EE',
    divisi: [
      { key: 'pencegahan',    label: 'Pencegahan' },
      { key: 'pemberantasan', label: 'Pemberantasan' },
      { key: 'rehabilitasi',  label: 'Rehabilitasi' },
      { key: 'pemberdayaan',  label: 'Pemberdayaan' },
    ],
  },
};

const STATUS_COLOR: Record<string, { bg: string; color: string; icon: any }> = {
  'Rencana': { bg: '#f3f4f6', color: '#6b7280', icon: Clock },
  'Dibuka':  { bg: '#D1FAE5', color: '#065F46', icon: Unlock },
  'Penuh':   { bg: '#FEF3C7', color: '#92400E', icon: X },
  'Ditutup': { bg: '#FEE2E2', color: '#991B1B', icon: Lock },
  'Selesai': { bg: '#DBEAFE', color: '#1E40AF', icon: CheckCircle },
};

export default function EplanningPage() {
  const [role, setRole]         = useState('');
  const [tab, setTab]           = useState<'penegak-hukum'|'kerja-sama-kelembagaan'>('kerja-sama-kelembagaan');
  const [divisiAktif, setDivisiAktif] = useState<string>('semua');
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [msg, setMsg]           = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Modal form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [fJudul, setFJudul]       = useState('');
  const [fDeskripsi, setFDeskripsi] = useState('');
  const [fDivisi, setFDivisi]     = useState('');
  const [fJenis, setFJenis]       = useState<'MOU'|'PKS'>('PKS');
  const [fTarget, setFTarget]     = useState(5);
  const [fWilayah, setFWilayah]   = useState('');
  const [fBiaya, setFBiaya]       = useState('');
  const [fTglMulai, setFTglMulai] = useState('');
  const [fTglTarget, setFTglTarget] = useState('');
  const [fPublik, setFPublik]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/rencana?kategori=${tab}`)
      .then(r => r.json())
      .then(d => { setKegiatan(d.data || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat.'); setLoading(false); });
  }, [tab]);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
  }, []);

  useEffect(() => { load(); setDivisiAktif('semua'); }, [tab, load]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedItems(newSet);
  };

  const openCreate = () => {
    setEditId(null);
    setFJudul(''); setFDeskripsi(''); setFDivisi(KATEGORI[tab].divisi[0].key);
    setFJenis('PKS'); setFTarget(5); setFWilayah(''); setFBiaya('');
    setFTglMulai(''); setFTglTarget(''); setFPublik(true);
    setShowForm(true); setError('');
    setFocusedField(null);
  };

  const openEdit = (k: Kegiatan) => {
    setEditId(k.id);
    setFJudul(k.judul); setFDeskripsi(k.deskripsi); setFDivisi(k.divisi);
    setFJenis((k.jenis as any) || 'PKS'); setFTarget(k.target); setFWilayah(k.wilayah);
    setFBiaya(k.biaya); setFTglMulai(k.tglMulai); setFTglTarget(k.tglTarget);
    setFPublik(k.tampilPublik);
    setShowForm(true); setError('');
    setFocusedField(null);
  };

  const simpan = async () => {
    if (!fJudul.trim()) { setError('Judul wajib diisi.'); return; }
    setSubmitting(true); setError('');
    try {
      if (editId) {
        const res = await fetch('/api/rencana', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, fields: {
            judul: fJudul, deskripsi: fDeskripsi, jenis: fJenis, target: fTarget,
            wilayah: fWilayah, biaya: fBiaya, tglMulai: fTglMulai, tglTarget: fTglTarget,
            tampilPublik: fPublik,
          }}),
        });
        const d = await res.json();
        if (!res.ok) { setError(d.message); return; }
        setMsg('Kegiatan berhasil diperbarui.');
      } else {
        const res = await fetch('/api/rencana', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kategori: tab, divisi: fDivisi, judul: fJudul, deskripsi: fDeskripsi,
            jenis: fJenis, target: fTarget, wilayah: fWilayah, biaya: fBiaya,
            tglMulai: fTglMulai, tglTarget: fTglTarget, tampilPublik: fPublik,
            dibuatOleh: role,
          }),
        });
        const d = await res.json();
        if (!res.ok) { setError(d.message); return; }
        setMsg('Kegiatan berhasil dibuat.');
      }
      setShowForm(false); load();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSubmitting(false); }
  };

  const hapus = async (id: string) => {
    if (!confirm('Hapus kegiatan ini?')) return;
    await fetch('/api/rencana', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setMsg('Kegiatan dihapus.'); load();
  };

  const ubahStatus = async (id: string, status: string) => {
    await fetch('/api/rencana', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, fields: { status } }) });
    load();
  };

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';
  const cfg = KATEGORI[tab];
  const TabIcon = cfg.icon;
  const filtered = divisiAktif === 'semua' ? kegiatan : kegiatan.filter(k => k.divisi === divisiAktif);
  const divisiLabel = (key: string) => {
    for (const c of Object.values(KATEGORI)) {
      const d = c.divisi.find(x => x.key === key);
      if (d) return d.label;
    }
    return key;
  };

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
            <FolderOpen size={18} />
            E-Planning
          </div>
        </div>
        <a href="/dashboard/rencana/pendaftaran" style={btnOutline}>
          <Users size={14} style={{ marginRight:4 }} />
          Kelola Pendaftaran
        </a>
      </nav>

      {/* Tab kategori */}
      <div style={{ 
        background:'#fff', 
        borderBottom:'1px solid #e5e7eb', 
        padding:'0 1.5rem',
        boxShadow:'0 1px 3px rgba(0,0,0,.04)'
      }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'flex', gap:0 }}>
          {(Object.keys(KATEGORI) as Array<keyof typeof KATEGORI>).map(key => {
            const c = KATEGORI[key];
            const isActive = tab === key;
            const Icon = c.icon;
            return (
              <button 
                key={key} 
                onClick={() => setTab(key)} 
                style={{
                  padding:'14px 24px', 
                  border:'none', 
                  background:'transparent', 
                  cursor:'pointer',
                  fontFamily:'sans-serif', 
                  fontSize:13, 
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? c.color : '#6b7280',
                  borderBottom: `3px solid ${isActive ? c.color : 'transparent'}`,
                  display:'flex', 
                  alignItems:'center', 
                  gap:8,
                  transition:'all .3s ease',
                  position:'relative'
                }}
              >
                <Icon size={18} />
                {c.label}
                {isActive && (
                  <span style={{
                    position:'absolute',
                    bottom:-3,
                    left:0,
                    right:0,
                    height:3,
                    background:c.color,
                    borderRadius:2
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'1.25rem' }}>
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
        {error && !showForm && (
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

        {/* Penegak Hukum — placeholder */}
        {tab === 'penegak-hukum' ? (
          <div style={{ animation: 'fadeInUp 0.5s ease-out' }}>
            <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
              <button onClick={() => setDivisiAktif('semua')} style={chip(divisiAktif==='semua', cfg.color)}>
                <List size={12} style={{ marginRight:4 }} />
                Semua
              </button>
              {cfg.divisi.map(d => (
                <button key={d.key} onClick={() => setDivisiAktif(d.key)} style={chip(divisiAktif===d.key, cfg.color)}>
                  {d.label}
                </button>
              ))}
            </div>
            <div style={{ 
              ...card, 
              textAlign:'center', 
              padding:'4rem 2rem', 
              color:'#9ca3af',
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:16
            }}>
              <div style={{ 
                width:80,
                height:80,
                borderRadius:'50%',
                background:'#EDE9FE',
                display:'flex',
                alignItems:'center',
                justifyContent:'center'
              }}>
                <Scale size={40} style={{ color:'#5B21B6' }} />
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:'#374151' }}>Modul Penegakan Hukum</div>
              <div style={{ fontSize:13, color:'#6b7280' }}>
                Layanan: Bantuan Hukum & Pendampingan Hukum
              </div>
              <div style={{ fontSize:12, color:'#9ca3af' }}>Struktur dan isi modul ini sedang dalam perencanaan.</div>
            </div>
          </div>
        ) : (
          // Kerja Sama Kelembagaan
          <div style={{ animation: 'fadeInUp 0.5s ease-out' }}>
            <div style={{ 
              display:'flex', 
              justifyContent:'space-between', 
              alignItems:'center', 
              marginBottom:16, 
              flexWrap:'wrap', 
              gap:8 
            }}>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <button 
                  onClick={() => setDivisiAktif('semua')} 
                  style={{
                    ...chip(divisiAktif==='semua', cfg.color),
                    display:'flex',
                    alignItems:'center',
                    gap:4
                  }}
                >
                  <List size={12} />
                  Semua ({kegiatan.length})
                </button>
                {cfg.divisi.map(d => {
                  const count = kegiatan.filter(k => k.divisi === d.key).length;
                  return (
                    <button 
                      key={d.key} 
                      onClick={() => setDivisiAktif(d.key)} 
                      style={{
                        ...chip(divisiAktif===d.key, cfg.color),
                        display:'flex',
                        alignItems:'center',
                        gap:4
                      }}
                    >
                      {d.label} ({count})
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={openCreate} 
                style={{
                  ...btnPrimary,
                  display:'flex',
                  alignItems:'center',
                  gap:6,
                  padding:'10px 20px'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,110,86,.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,110,86,.2)';
                }}
              >
                <Plus size={16} />
                Kegiatan Baru
              </button>
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
                Memuat kegiatan...
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
                <div style={{ fontSize:14, fontWeight:500 }}>Belum ada kegiatan di kategori ini.</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {filtered.map((k, index) => {
                  const sc = STATUS_COLOR[k.status] || STATUS_COLOR['Rencana'];
                  const StatusIcon = sc.icon;
                  const persen = k.target > 0 ? Math.round((k.terisi / k.target) * 100) : 0;
                  const isExpanded = expandedItems.has(k.id);
                  
                  return (
                    <div 
                      key={k.id} 
                      style={{
                        ...card,
                        animation: `fadeInUp 0.4s ease-out ${index * 0.04}s both`,
                        transition:'all .3s ease'
                      }}
                    >
                      <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                        <div style={{ flex:1, minWidth:240 }}>
                          <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                            <span style={{ 
                              fontSize:10, 
                              fontWeight:600, 
                              padding:'3px 12px', 
                              borderRadius:100, 
                              background:cfg.bg, 
                              color:cfg.color,
                              display:'flex',
                              alignItems:'center',
                              gap:4
                            }}>
                              <Tag size={11} />
                              {divisiLabel(k.divisi)}
                            </span>
                            <span style={{ 
                              fontSize:10, 
                              fontWeight:600, 
                              padding:'3px 12px', 
                              borderRadius:100, 
                              background:k.jenis==='MOU'?'#E6F1FB':'#FAEEDA', 
                              color:k.jenis==='MOU'?'#0C447C':'#854F0B',
                              display:'flex',
                              alignItems:'center',
                              gap:4
                            }}>
                              <FileText size={11} />
                              {k.jenis}
                            </span>
                            <span style={{ 
                              fontSize:10, 
                              fontWeight:600, 
                              padding:'3px 12px', 
                              borderRadius:100, 
                              background:sc.bg, 
                              color:sc.color,
                              display:'flex',
                              alignItems:'center',
                              gap:4
                            }}>
                              <StatusIcon size={11} />
                              {k.status}
                            </span>
                            {k.tampilPublik && (
                              <span style={{ 
                                fontSize:10, 
                                padding:'3px 12px', 
                                borderRadius:100, 
                                background:'#D1FAE5', 
                                color:'#065F46',
                                display:'flex',
                                alignItems:'center',
                                gap:4
                              }}>
                                <Globe size={11} />
                                Publik
                              </span>
                            )}
                          </div>
                          
                          <div style={{ fontSize:16, fontWeight:700, marginBottom:4, color:'#1a1a2e' }}>{k.judul}</div>
                          
                          {isExpanded && (
                            <div style={{ 
                              marginTop:8,
                              animation: 'fadeInUp 0.3s ease-out'
                            }}>
                              {k.deskripsi && (
                                <div style={{ 
                                  fontSize:13, 
                                  color:'#6b7280', 
                                  marginBottom:8, 
                                  lineHeight:1.7,
                                  background:'#f9fafb',
                                  padding:'8px 12px',
                                  borderRadius:6
                                }}>
                                  {k.deskripsi}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div style={{ 
                            fontSize:11, 
                            color:'#9ca3af', 
                            display:'flex', 
                            gap:14, 
                            flexWrap:'wrap',
                            background:'#f9fafb',
                            padding:'4px 10px',
                            borderRadius:6,
                            marginTop:4
                          }}>
                            {k.wilayah && (
                              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <MapPin size={13} /> {k.wilayah}
                              </span>
                            )}
                            {k.tglMulai && (
                              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <Calendar size={13} /> {k.tglMulai}{k.tglTarget && ` – ${k.tglTarget}`}
                              </span>
                            )}
                            {k.biaya && (
                              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <DollarSign size={13} /> Rp {k.biaya}
                              </span>
                            )}
                          </div>

                          {/* Kuota bar */}
                          <div style={{ marginTop:10, maxWidth:320 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#6b7280', marginBottom:4 }}>
                              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <Users size={13} />
                                Kuota Mitra
                              </span>
                              <span style={{ 
                                fontWeight:600, 
                                color: k.sisaKuota === 0 ? '#DC2626' : '#0F6E56'
                              }}>
                                {k.terisi} / {k.target} terisi
                              </span>
                            </div>
                            <div style={{ height:6, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ 
                                height:'100%', 
                                width:`${persen}%`, 
                                background: persen >= 100 ? 'linear-gradient(90deg, #DC2626, #EF4444)' : 'linear-gradient(90deg, #0F6E56, #22a67e)',
                                borderRadius:3, 
                                transition:'width .8s cubic-bezier(0.4, 0, 0.2, 1)'
                              }} />
                            </div>
                          </div>
                          
                          <button
                            onClick={() => toggleExpand(k.id)}
                            style={{
                              ...btnSm,
                              fontSize:10,
                              marginTop:8,
                              display:'flex',
                              alignItems:'center',
                              gap:4,
                              padding:'4px 10px'
                            }}
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {isExpanded ? 'Sembunyikan Detail' : 'Lihat Detail'}
                          </button>
                        </div>

                        <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
                          <button 
                            onClick={() => openEdit(k)} 
                            style={{ 
                              ...btnSm, 
                              display:'flex',
                              alignItems:'center',
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
                            <Edit size={14} />
                            Edit
                          </button>
                          <select
                            value={k.status}
                            onChange={e => ubahStatus(k.id, e.target.value)}
                            style={{ 
                              ...btnSm, 
                              cursor:'pointer',
                              padding:'6px 10px',
                              fontSize:11,
                              transition:'all .2s ease'
                            }}
                          >
                            {['Rencana','Dibuka','Penuh','Ditutup','Selesai'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => hapus(k.id)} 
                            style={{ 
                              ...btnSm, 
                              color:'#991B1B', 
                              borderColor:'#FCA5A5',
                              display:'flex',
                              alignItems:'center',
                              gap:4,
                              transition:'all .2s ease'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#FEE2E2';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#fff';
                            }}
                          >
                            <Trash2 size={14} />
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={overlay} onClick={() => !submitting && setShowForm(false)}>
          <div style={{ 
            ...modalBox, 
            animation: 'scaleIn 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ 
              display:'flex', 
              justifyContent:'space-between', 
              alignItems:'flex-start', 
              marginBottom:16 
            }}>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:'#1a1a2e' }}>
                  {editId ? 'Edit Kegiatan' : 'Kegiatan Baru'}
                </div>
                <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>
                  {cfg.label}
                </div>
              </div>
              <button 
                onClick={() => setShowForm(false)} 
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

            {!editId && (
              <div style={{ marginBottom:12 }}>
                <label style={labelSt}>
                  <Tag size={14} style={{ marginRight:4 }} />
                  Divisi
                </label>
                <select 
                  style={{
                    ...inputFull,
                    borderColor: focusedField === 'divisi' ? '#0F6E56' : '#e5e7eb',
                    transition:'all .3s ease'
                  }} 
                  value={fDivisi} 
                  onChange={e => setFDivisi(e.target.value)}
                  onFocus={() => setFocusedField('divisi')}
                  onBlur={() => setFocusedField(null)}
                >
                  {cfg.divisi.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom:12 }}>
              <label style={labelSt}>
                <FileText size={14} style={{ marginRight:4 }} />
                Judul Kegiatan <span style={{ color:'#DC2626' }}>✱</span>
              </label>
              <input 
                style={{
                  ...inputFull,
                  borderColor: focusedField === 'judul' ? '#0F6E56' : '#e5e7eb',
                  transition:'all .3s ease'
                }} 
                value={fJudul} 
                onChange={e => setFJudul(e.target.value)} 
                placeholder="Contoh: Sosialisasi P4GN di Kampus"
                onFocus={() => setFocusedField('judul')}
                onBlur={() => setFocusedField(null)}
              />
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={labelSt}>
                <FileText size={14} style={{ marginRight:4 }} />
                Deskripsi
              </label>
              <textarea 
                style={{ 
                  ...inputFull, 
                  height:70, 
                  resize:'none',
                  borderColor: focusedField === 'deskripsi' ? '#0F6E56' : '#e5e7eb',
                  transition:'all .3s ease',
                  fontFamily:'sans-serif'
                }} 
                value={fDeskripsi} 
                onChange={e => setFDeskripsi(e.target.value)} 
                placeholder="Jelaskan kegiatan secara singkat..."
                onFocus={() => setFocusedField('deskripsi')}
                onBlur={() => setFocusedField(null)}
              />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <label style={labelSt}>
                  <FileCheck size={14} style={{ marginRight:4 }} />
                  Jenis Dokumen <span style={{ color:'#DC2626' }}>✱</span>
                </label>
                <div style={{ display:'flex', gap:6 }}>
                  {(['MOU','PKS'] as const).map(j => (
                    <button 
                      key={j} 
                      type="button" 
                      onClick={() => setFJenis(j)} 
                      style={{
                        flex:1, 
                        padding:'8px', 
                        borderRadius:8, 
                        cursor:'pointer', 
                        fontFamily:'sans-serif', 
                        fontSize:12,
                        border:`2px solid ${fJenis===j?'#0F6E56':'#e5e7eb'}`,
                        background: fJenis===j?'#F0FDF4':'#fff', 
                        color: fJenis===j?'#065F46':'#374151', 
                        fontWeight: fJenis===j?600:400,
                        transition:'all .2s ease'
                      }}
                    >
                      {j}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelSt}>
                  <Users size={14} style={{ marginRight:4 }} />
                  Kuota Mitra <span style={{ color:'#DC2626' }}>✱</span>
                </label>
                <input 
                  type="number" 
                  min={1} 
                  style={{
                    ...inputFull,
                    borderColor: focusedField === 'target' ? '#0F6E56' : '#e5e7eb',
                    transition:'all .3s ease'
                  }} 
                  value={fTarget} 
                  onChange={e => setFTarget(parseInt(e.target.value) || 1)}
                  onFocus={() => setFocusedField('target')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <label style={labelSt}>
                  <MapPin size={14} style={{ marginRight:4 }} />
                  Wilayah/Lokasi
                </label>
                <input 
                  style={{
                    ...inputFull,
                    borderColor: focusedField === 'wilayah' ? '#0F6E56' : '#e5e7eb',
                    transition:'all .3s ease'
                  }} 
                  value={fWilayah} 
                  onChange={e => setFWilayah(e.target.value)} 
                  placeholder="Contoh: Makassar"
                  onFocus={() => setFocusedField('wilayah')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
              <div>
                <label style={labelSt}>
                  <DollarSign size={14} style={{ marginRight:4 }} />
                  Biaya (opsional)
                </label>
                <input 
                  style={{
                    ...inputFull,
                    borderColor: focusedField === 'biaya' ? '#0F6E56' : '#e5e7eb',
                    transition:'all .3s ease'
                  }} 
                  value={fBiaya} 
                  onChange={e => setFBiaya(e.target.value)} 
                  placeholder="Kosongkan jika tidak ada"
                  onFocus={() => setFocusedField('biaya')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={labelSt}>
                  <Calendar size={14} style={{ marginRight:4 }} />
                  Tanggal Mulai
                </label>
                <input 
                  type="date" 
                  style={{
                    ...inputFull,
                    borderColor: focusedField === 'tglMulai' ? '#0F6E56' : '#e5e7eb',
                    transition:'all .3s ease'
                  }} 
                  value={fTglMulai} 
                  onChange={e => setFTglMulai(e.target.value)}
                  onFocus={() => setFocusedField('tglMulai')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
              <div>
                <label style={labelSt}>
                  <CalendarDays size={14} style={{ marginRight:4 }} />
                  Tanggal Target
                </label>
                <input 
                  type="date" 
                  style={{
                    ...inputFull,
                    borderColor: focusedField === 'tglTarget' ? '#0F6E56' : '#e5e7eb',
                    transition:'all .3s ease'
                  }} 
                  value={fTglTarget} 
                  onChange={e => setFTglTarget(e.target.value)}
                  onFocus={() => setFocusedField('tglTarget')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            <label style={{ 
              display:'flex', 
              alignItems:'center', 
              gap:10, 
              marginBottom:18, 
              cursor:'pointer', 
              fontSize:13,
              padding:'8px 12px',
              borderRadius:8,
              background:'#f9fafb',
              transition:'all .2s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#f9fafb';
            }}
            >
              <input 
                type="checkbox" 
                checked={fPublik} 
                onChange={e => setFPublik(e.target.checked)} 
                style={{ 
                  accentColor:'#0F6E56', 
                  width:18, 
                  height:18,
                  cursor:'pointer'
                }} 
              />
              <Globe size={16} style={{ color: fPublik ? '#0F6E56' : '#9ca3af' }} />
              <span style={{ color: '#374151' }}>
                Tampilkan di halaman publik "Akan Datang" (mitra bisa mendaftar)
              </span>
            </label>

            <div style={{ display:'flex', gap:8 }}>
              <button 
                onClick={() => setShowForm(false)} 
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
                onClick={simpan} 
                disabled={submitting} 
                style={{ 
                  ...btnPrimary, 
                  flex:2,
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:6,
                  fontSize:13,
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition:'all .3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,110,86,.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,110,86,.2)';
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
                    {editId ? 'Simpan Perubahan' : 'Buat Kegiatan'}
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
  maxWidth:540, 
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

const chip = (active: boolean, color: string): React.CSSProperties => ({
  padding:'6px 16px', 
  borderRadius:20, 
  border:'1px solid', 
  fontSize:12, 
  cursor:'pointer', 
  fontFamily:'sans-serif',
  fontWeight: active ? 600 : 400,
  background: active ? color : '#fff',
  color: active ? '#fff' : '#374151',
  borderColor: active ? 'transparent' : '#e5e7eb',
  transition:'all .2s ease'
});