'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiCalendar as FiCalendarNav, FiInbox, FiKey, FiFolder, FiActivity, FiFileText,
  FiUsers, FiList as FiListSidebar, FiArchive, FiShield, FiDroplet, FiMessageCircle, FiMessageSquare,
} from 'react-icons/fi';
import {
  ArrowLeft, Eye, Check, X, Search, Users, FileText, Tag,
  Mail, Phone, MessageSquare, Clipboard, Calendar, Building,
  GraduationCap, CheckCircle, AlertCircle, Clock, ExternalLink,
  Copy, List, LayoutDashboard, Key, ChevronDown, ChevronUp, Info,
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

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#212842';
const CREAM = '#F0E7D5';
const GOLD_ACCENT = '#B5813F';
const SAGE = '#5C7A5E';
const RED = '#A32D2D';

const FILTER = [
  { key:'semua',  label:'Semua',        statuses:[] as string[], icon: List },
  { key:'baru',   label:'Perlu Review', statuses:['Diajukan','Ditinjau'], icon: Clock },
  { key:'acc',    label:'Disetujui',    statuses:['Disetujui'], icon: CheckCircle },
  { key:'tolak',  label:'Ditolak',      statuses:['Ditolak'], icon: X },
];

const STATUS_COLOR: Record<string, { bg:string; color:string; icon: any }> = {
  'Diajukan': { bg:'rgba(30,58,95,0.08)', color: INDIGO, icon: Clock },
  'Ditinjau': { bg:'#FBF3E7', color: GOLD_ACCENT, icon: Eye },
  'Disetujui':{ bg:'rgba(92,122,94,0.12)', color: SAGE, icon: CheckCircle },
  'Ditolak':  { bg:'#FCEBEB', color: RED, icon: X },
};

export default function KelolaPendaftaranPage() {
  const [role, setRole]       = useState('');
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [level, setLevel] = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [data, setData]       = useState<Pendaftaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('baru');
  const [search, setSearch]   = useState('');
  const [mitraList, setMitraList] = useState<{id:string;nama:string}[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [accItem, setAccItem]   = useState<Pendaftaran | null>(null);
  const [judulDok, setJudulDok] = useState('');
  const [durasiDok, setDurasiDok] = useState(5);
  const [idMitra, setIdMitra]   = useState('');
  const [generating, setGenerating] = useState(false);
  const [hasil, setHasil]       = useState<HasilGenerate | null>(null);
  const [copied, setCopied] = useState(false);

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
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setRole(u.role);
        setNamaAdmin(u.nama || u.email || 'Admin');
        setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
        load();
        fetch('/api/superadmin/mitra').then(r => r.json()).then(d => setMitraList(d.data || [])).catch(()=>{});
      })
      .catch(() => { window.location.href = '/login'; });
  }, [load]);

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendarNav size={17} />, label: 'E-Planning' },
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
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipeKode: 'dokumen', idMitra: idMitra || '', namaMitra,
          jenis: accItem.jenis, judul: judulDok.trim(),
          durasiTahun: durasiDok, dibuatOleh: namaAdmin,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal generate.'); return; }

      await fetch('/api/rencana/daftar', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: accItem.id, statusBaru: 'Disetujui', idDokumen: d.idDokumen,
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
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tolakItem.id, statusBaru: 'Ditolak', catatan: alasanTolak.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return; }
      setMsg('Pendaftaran ditolak. Kuota dikembalikan.');
      setTolakItem(null); setAlasanTolak(''); load();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #eef2f6', borderTop:`3px solid ${INDIGO}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat pendaftaran kegiatan...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', fontFamily: FONT, background:'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <GlobalStyle />

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/rencana"
        brandLabel="E-POKJA HUKER"
        brandSub={level === 'utama' ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        userName={namaAdmin}
        userTag={level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={INDIGO}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth:960, margin:'0 auto', padding:'1.4rem 1.25rem 0' }}>
        <nav style={navStyle} className="fld">
          <div style={{ fontWeight:800, fontSize:14, display:'flex', alignItems:'center', gap:8, color: INDIGO }}>
            <Users size={16} /> Kelola Pendaftaran Kegiatan
          </div>
          <a href={backUrl} style={btnOutline} className="btn-hover">
            <LayoutDashboard size={13} /> Dashboard
          </a>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth:960, margin:'0 auto', padding:'1.25rem 1.25rem 3rem' }}>
        {msg && (
          <div style={{ ...msgBox(SAGE, 'rgba(92,122,94,0.12)'), display:'flex', alignItems:'center', gap:8 }} className="fld">
            <CheckCircle size={16} /> {msg}
          </div>
        )}
        {error && !accItem && !tolakItem && (
          <div style={{ ...msgBox(RED, '#FCEBEB'), display:'flex', alignItems:'center', gap:8 }} className="fld">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div style={{ ...shellStyle, marginBottom:14 }} className="fld">
          <div style={{ ...coreStyle, padding:'0.5rem 0.65rem' }}>
            <div style={{ position:'relative' }}>
              <Search size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
              <input
                style={searchInput}
                placeholder="Cari institusi, kode, kegiatan..."
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

        <div style={{ display:'flex', gap:6, marginBottom:18, flexWrap:'wrap' }} className="fld">
          {FILTER.map(f => {
            const count = f.key === 'semua' ? data.length : data.filter(d => f.statuses.includes(d.status)).length;
            const Icon = f.icon;
            const isActive = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding:'9px 16px', borderRadius:100, borderWidth:1.5, borderStyle:'solid',
                fontSize:12, cursor:'pointer', fontFamily:FONT,
                fontWeight: isActive ? 700 : 500,
                background: isActive ? INDIGO : '#fff',
                color: isActive ? CREAM : '#334155',
                borderColor: isActive ? 'transparent' : 'rgba(30,58,95,0.1)',
                boxShadow: isActive ? '0 8px 20px -10px rgba(30,58,95,0.5)' : 'none',
                display:'flex', alignItems:'center', gap:6,
              }} className="btn-hover">
                <Icon size={13} /> {f.label}
                <span style={{ marginLeft:2, fontSize:10, background: isActive ? 'rgba(240,231,213,0.2)' : 'rgba(30,58,95,0.06)', padding:'1px 8px', borderRadius:100, color: isActive ? CREAM : '#64748b', fontWeight:700 }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={shellStyle} className="fld">
            <div style={{ ...coreStyle, textAlign:'center', padding:'3rem', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, border:'3px solid rgba(30,58,95,0.08)', borderTopColor: INDIGO, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              <span style={{ color:'#94a3b8', fontSize:13 }}>Memuat data pendaftaran...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={shellStyle} className="fld">
            <div style={{ ...coreStyle, textAlign:'center', padding:'3rem', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <FileText size={40} style={{ color:'#cbd5e1' }} />
              <div style={{ fontSize:13.5, color:'#64748b', fontWeight:500 }}>Tidak ada pendaftaran pada filter ini.</div>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map((item, index) => {
              const sc = STATUS_COLOR[item.status] || { bg:'#f1f5f9', color:'#64748b', icon: FileText };
              const StatusIcon = sc.icon;
              const isExpanded = expandedItems.has(item.id);
              return (
                <div key={item.id} style={{ ...shellStyle, animation:`fadeInUp 0.4s ease-out ${index*0.03}s both` }}>
                  <div style={{ ...coreStyle, padding:'1.1rem 1.3rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                          <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:100, background: item.jenis==='MOU' ? 'rgba(30,58,95,0.08)' : '#FBF3E7', color: item.jenis==='MOU' ? INDIGO : GOLD_ACCENT, display:'flex', alignItems:'center', gap:4 }}>
                            <FileText size={11} /> {item.jenis}
                          </span>
                          <span style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:100, background:sc.bg, color:sc.color, display:'flex', alignItems:'center', gap:4 }}>
                            <StatusIcon size={11} /> {item.status}
                          </span>
                          {item.jurusan && (
                            <span style={{ fontSize:10, padding:'3px 10px', borderRadius:100, background:'#EDE9FE', color:'#5B21B6', display:'flex', alignItems:'center', gap:4 }}>
                              <GraduationCap size={11} /> {item.jurusan}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize:15, fontWeight:800, color: INDIGO, display:'flex', alignItems:'center', gap:8, letterSpacing:'-0.01em' }}>
                          <Building size={16} style={{ color:'#94a3b8' }} /> {item.namaInstitusi}
                        </div>
                        <div style={{ fontSize:12, color: GOLD_ACCENT, marginTop:4, display:'flex', alignItems:'center', gap:5, fontWeight:600 }}>
                          <FileText size={12} /> {item.judulKegiatan}
                        </div>

                        {isExpanded && (
                          <div style={{ marginTop:10 }} className="fld">
                            {item.deskripsi && (
                              <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6, background:'rgba(30,58,95,0.03)', padding:'9px 12px', borderRadius:10, marginBottom:8, display:'flex', gap:6 }}>
                                <MessageSquare size={13} style={{ color:'#94a3b8', flexShrink:0, marginTop:1 }} /> {item.deskripsi}
                              </div>
                            )}
                            <div style={{ fontSize:11, color:'#94a3b8', display:'flex', gap:14, flexWrap:'wrap' }}>
                              <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clipboard size={12} /> Kode: <strong style={{ color: INDIGO }}>{item.kodeTracking}</strong></span>
                              <span style={{ display:'flex', alignItems:'center', gap:4 }}><Calendar size={12} /> Daftar: {item.tglDaftar}</span>
                            </div>
                            {(item.email || item.noWa) && (
                              <div style={{ fontSize:11, color:'#64748b', marginTop:6, display:'flex', gap:14, flexWrap:'wrap' }}>
                                {item.email && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Mail size={12} /> {item.email}</span>}
                                {item.noWa && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Phone size={12} /> {item.noWa}</span>}
                              </div>
                            )}
                            {item.catatan && (
                              <div style={{ fontSize:11, color: GOLD_ACCENT, background:'#FBF3E7', padding:'7px 11px', borderRadius:9, marginTop:8, display:'flex', gap:5 }}>
                                <Info size={12} style={{ flexShrink:0, marginTop:1 }} /> {item.catatan}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0, minWidth:130 }}>
                        {!['Disetujui','Ditolak'].includes(item.status) && (
                          <>
                            <button onClick={() => openAcc(item)} style={{ ...btnSm, background:'rgba(92,122,94,0.12)', color: SAGE, borderColor:'rgba(92,122,94,0.3)', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }} className="btn-hover">
                              <Check size={14} /> Acc & Generate
                            </button>
                            <button onClick={() => { setTolakItem(item); setAlasanTolak(''); setError(''); }} style={{ ...btnSm, background:'#FCEBEB', color: RED, borderColor:'#F3B8B8', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }} className="btn-hover">
                              <X size={14} /> Tolak
                            </button>
                          </>
                        )}
                        {item.status === 'Disetujui' && item.idDokumen && (
                          <a href={`/dashboard/dokumen/${item.idDokumen}`} style={{ ...btnSm, textDecoration:'none', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:5, background:'rgba(30,58,95,0.06)', color: INDIGO, borderColor:'rgba(30,58,95,0.12)' }} className="btn-hover">
                            <Eye size={14} /> Lihat Dokumen
                          </a>
                        )}
                        <button onClick={() => toggleExpand(item.id)} style={{ ...btnSm, fontSize:10.5, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }} className="btn-hover">
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {isExpanded ? 'Sembunyikan' : 'Detail'}
                        </button>
                      </div>
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
          <div style={{ ...modalBox, animation:'scaleIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            {hasil ? (
              <div className="fld">
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:64, height:64, borderRadius:'50%', background: INDIGO, marginBottom:12, boxShadow:'0 10px 30px -8px rgba(30,58,95,0.5)' }}>
                    <CheckCircle size={32} style={{ color: CREAM }} />
                  </div>
                  <div style={{ fontSize:18, fontWeight:800, color: INDIGO }}>Dokumen Berhasil Dibuat!</div>
                </div>

                <div style={{ background:'#F5FAF8', border:`1.5px solid ${SAGE}55`, borderRadius:16, padding:'1.5rem', marginBottom:16, textAlign:'center' }}>
                  <div style={{ fontSize:10, color: SAGE, marginBottom:6, textTransform:'uppercase', letterSpacing:1.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <Key size={14} /> Kode Akses
                  </div>
                  <div style={{ fontSize:28, fontWeight:800, letterSpacing:4, color: SAGE, marginBottom:12, fontFamily:'monospace', background:'rgba(255,255,255,.7)', padding:'8px 16px', borderRadius:10, display:'inline-block' }}>
                    {hasil.kodeAkses}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(hasil.kodeAkses); setCopied(true); setTimeout(()=>setCopied(false),1500); }} style={{ ...btnPrimary, display:'inline-flex', alignItems:'center', gap:6, padding:'9px 22px' }} className="btn-hover">
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Tersalin!' : 'Salin Kode'}
                  </button>
                </div>

                <div style={{ background:'#FBF3E7', borderRadius:12, padding:'10px 14px', fontSize:12, color: GOLD_ACCENT, marginBottom:16, display:'flex', gap:8 }}>
                  <Info size={14} style={{ flexShrink:0, marginTop:1 }} />
                  <span>Sampaikan kode <strong>{hasil.kodeAkses}</strong> ke {accItem.email || accItem.noWa}. Pendaftaran kini masuk alur pengajuan biasa.</span>
                </div>

                {hasil.docsUrl && (
                  <a href={hasil.docsUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, display:'flex', alignItems:'center', justifyContent:'center', gap:6, textDecoration:'none', marginBottom:10 }} className="btn-hover">
                    <ExternalLink size={14} /> Buka Docs
                  </a>
                )}
                <button onClick={() => setAccItem(null)} style={{ ...btnSm, width:'100%' }} className="btn-hover">Tutup</button>
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color: INDIGO }}>Setujui & Generate Kode</div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{accItem.namaInstitusi} · {accItem.jenis}</div>
                  </div>
                  <button onClick={() => setAccItem(null)} style={{ ...btnSm, padding:'4px 8px' }} className="btn-hover"><X size={16} /></button>
                </div>

                {error && (
                  <div style={{ ...msgBox(RED, '#FCEBEB'), display:'flex', alignItems:'center', gap:6 }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <div style={{ background:'rgba(30,58,95,0.03)', borderRadius:12, padding:'10px 14px', marginBottom:14, fontSize:12 }}>
                  <div style={{ color:'#64748b', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}><FileText size={12} /> Kegiatan: <strong style={{ color: INDIGO }}>{accItem.judulKegiatan}</strong></div>
                  <div style={{ color:'#64748b', display:'flex', alignItems:'center', gap:5 }}><Tag size={12} /> Jenis dokumen <strong style={{ color: INDIGO }}>{accItem.jenis}</strong> (dari E-Planning)</div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}><Building size={13} style={{ marginRight:4 }} /> Mitra (dari sistem)</label>
                  <select style={inputFull} value={idMitra} onChange={e => setIdMitra(e.target.value)}>
                    <option value="">-- Belum terdaftar (dibuat otomatis) --</option>
                    {mitraList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}><FileText size={13} style={{ marginRight:4 }} /> Judul Dokumen <span style={{ color: RED }}>*</span></label>
                  <input style={inputFull} value={judulDok} onChange={e => setJudulDok(e.target.value)} />
                </div>

                <div style={{ marginBottom:18 }}>
                  <label style={labelSt}><Clock size={13} style={{ marginRight:4 }} /> Durasi Berlaku</label>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {[5,6,7,8,9,10].map(d => (
                      <button key={d} onClick={() => setDurasiDok(d)} style={{
                        padding:'7px 15px', borderRadius:100, cursor:'pointer', fontFamily:FONT, fontSize:12,
                        borderWidth:1.5, borderStyle:'solid',
                        borderColor: durasiDok===d ? INDIGO : 'rgba(30,58,95,0.1)',
                        background: durasiDok===d ? INDIGO : '#fff',
                        color: durasiDok===d ? CREAM : '#374151',
                        fontWeight: durasiDok===d ? 700 : 500,
                      }} className="btn-hover">
                        {d} th
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleAcc} disabled={generating} style={{ ...btnPrimary, width:'100%', height:48, display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:14, opacity: generating ? 0.7 : 1 }} className="btn-hover">
                  {generating ? (
                    <>
                      <div style={{ width:18, height:18, border:'2px solid rgba(240,231,213,.4)', borderTopColor: CREAM, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                      Membuat dokumen...
                    </>
                  ) : (
                    <><Key size={18} /> Setujui & Generate Kode</>
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
          <div style={{ ...modalBox, maxWidth:460, animation:'scaleIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color: INDIGO }}>Tolak Pendaftaran</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{tolakItem.namaInstitusi} · {tolakItem.judulKegiatan}</div>
              </div>
              <button onClick={() => setTolakItem(null)} style={{ ...btnSm, padding:'4px 8px' }} className="btn-hover"><X size={16} /></button>
            </div>

            {error && (
              <div style={{ ...msgBox(RED, '#FCEBEB'), display:'flex', alignItems:'center', gap:6 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div style={{ background:'#FBF3E7', borderRadius:12, padding:'10px 14px', fontSize:12, color: GOLD_ACCENT, marginBottom:14, display:'flex', gap:8 }}>
              <Info size={14} style={{ flexShrink:0, marginTop:1 }} />
              <span>Menolak pendaftaran akan mengembalikan kuota slot kegiatan (+1).</span>
            </div>

            <label style={labelSt}><MessageSquare size={13} style={{ marginRight:4 }} /> Alasan Penolakan <span style={{ color: RED }}>*</span></label>
            <textarea style={{ ...inputFull, height:80, resize:'none', marginBottom:16 }} value={alasanTolak} onChange={e => setAlasanTolak(e.target.value)} placeholder="Jelaskan alasan penolakan dengan jelas..." autoFocus />

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setTolakItem(null)} style={{ ...btnSm, flex:1 }} className="btn-hover">Batal</button>
              <button onClick={handleTolak} disabled={submitting} style={{ ...btnPrimary, background: RED, flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity: submitting ? 0.7 : 1 }} className="btn-hover">
                {submitting ? (
                  <>
                    <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                    Memproses...
                  </>
                ) : (
                  <><X size={16} /> Konfirmasi Tolak</>
                )}
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
      @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
      @keyframes spin { to{transform:rotate(360deg)} }
      .fld { animation: fadeInUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all .3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { filter:brightness(1.05); transform:translateY(-1px); }
      @media (min-width: 901px) {
        .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
      }
    `}</style>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(240,231,213,0.75)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1px solid rgba(30,58,95,0.1)', borderRadius:100, padding:'10px 14px 10px 18px', boxShadow:'0 10px 30px -18px rgba(30,58,95,0.25)' };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#64748b', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:6 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.7)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(30,58,95,0.08)', borderRadius:20, padding:6, boxShadow:'0 1px 2px rgba(30,58,95,0.04), 0 20px 40px -30px rgba(30,58,95,0.2)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const searchInput: React.CSSProperties = { width:'100%', padding:'10px 12px 10px 36px', borderRadius:11, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(30,58,95,0.1)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', background:'#f8fafc', outline:'none' };
const labelSt: React.CSSProperties = { display:'flex', alignItems:'center', fontSize:11, fontWeight:700, color:'#334155', marginBottom:5 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(30,58,95,0.1)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', background:'#f8fafc', outline:'none' };
const btnPrimary: React.CSSProperties = { padding:'9px 18px', borderRadius:11, border:'none', background: INDIGO, color: CREAM, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:'0 8px 18px -8px rgba(30,58,95,0.5)' };
const btnSm: React.CSSProperties = { padding:'8px 14px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(30,58,95,0.1)', background:'#fff', color:'#334155', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap' };
const btnOutline: React.CSSProperties = { fontSize:12, padding:'8px 15px', borderRadius:100, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(30,58,95,0.1)', textDecoration:'none', color:'#334155', background:'#fff', display:'flex', alignItems:'center', gap:5, fontWeight:600 };
const overlay: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(30,58,95,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'1rem', backdropFilter:'blur(4px)' };
const modalBox: React.CSSProperties = { background:'#fff', borderRadius:20, padding:'1.75rem', width:'100%', maxWidth:500, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 30px 70px -20px rgba(30,58,95,0.35)' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:12, marginBottom:12 });