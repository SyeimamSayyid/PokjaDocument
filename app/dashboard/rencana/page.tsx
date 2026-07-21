'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiCalendar, FiInbox, FiKey, FiFolder, FiActivity, FiFileText,
  FiUsers, FiList as FiListSidebar, FiArchive, FiShield,
} from 'react-icons/fi';
import {
  ArrowLeft, Plus, Edit, Trash2, Users, FileText, Tag, MapPin, Calendar,
  Globe, CheckCircle, AlertCircle, Clock, X, Save, List, Building,
  Handshake, FileCheck, CalendarDays, ChevronDown, ChevronUp, Unlock, Lock,
} from 'lucide-react';

interface Kegiatan {
  id: string; divisi: string[]; judul: string;
  deskripsi: string; jenis: string; target: number; terisi: number;
  wilayah: string; tglMulai: string; tglTarget: string;
  tglDitetapkan: string; tglBerakhirMou: string;
  status: string; tampilPublik: boolean; dibuatOleh: string; tglDibuat: string;
  sisaKuota: number;
}

const DIVISI_LIST = [
  { key: 'pencegahan',    label: 'Pencegahan' },
  { key: 'pemberantasan', label: 'Pemberantasan' },
  { key: 'rehabilitasi',  label: 'Rehabilitasi' },
  { key: 'pemberdayaan',  label: 'Pemberdayaan' },
];
const MAKS_DIVISI = 4;

const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const STATUS_COLOR: Record<string, { bg: string; color: string; icon: any }> = {
  'Rencana': { bg: '#f1f3f2', color: '#5b6b66', icon: Clock },
  'Dibuka':  { bg: '#FEF3C7', color: GOLD, icon: Unlock },
  'Penuh':   { bg: '#FEE2E2', color: '#991B1B', icon: X },
  'Ditutup': { bg: '#eef2f6', color: '#475569', icon: Lock },
  'Selesai': { bg: '#DBEAFE', color: BLUE_DARK, icon: CheckCircle },
};

export default function EplanningPage() {
  const [role, setRole]         = useState('');
  const [level, setLevel]       = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [divisiAktif, setDivisiAktif] = useState<string>('semua');
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [msg, setMsg]           = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [fJudul, setFJudul]       = useState('');
  const [fDeskripsi, setFDeskripsi] = useState('');
  const [fDivisi, setFDivisi]     = useState<string[]>([]);
  const [fJenis, setFJenis]       = useState<'MOU'|'PKS'>('PKS');
  const [fTarget, setFTarget]     = useState(5);
  const [fWilayah, setFWilayah]   = useState('');
  const [fTglMulai, setFTglMulai] = useState('');
  const [fTglTarget, setFTglTarget] = useState('');
  const [fTglDitetapkan, setFTglDitetapkan] = useState('');
  const [fTglBerakhirMou, setFTglBerakhirMou] = useState('');
  const [fPublik, setFPublik]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/rencana`)
      .then(r => r.json())
      .then(d => { setKegiatan(d.data || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat.'); setLoading(false); });
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
      })
      .catch(() => { window.location.href = '/login'; });
  }, [load]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedItems(newSet);
  };

  const toggleDivisiForm = (key: string) => {
    setFDivisi(prev => prev.includes(key) ? prev.filter(k => k !== key) : (prev.length < MAKS_DIVISI ? [...prev, key] : prev));
  };

  const openCreate = () => {
    setEditId(null);
    setFJudul(''); setFDeskripsi(''); setFDivisi([]);
    setFJenis('PKS'); setFTarget(5); setFWilayah('');
    setFTglMulai(''); setFTglTarget('');
    setFTglDitetapkan(''); setFTglBerakhirMou('');
    setFPublik(true);
    setShowForm(true); setError('');
    setFocusedField(null);
  };

  const openEdit = (k: Kegiatan) => {
    setEditId(k.id);
    setFJudul(k.judul); setFDeskripsi(k.deskripsi); setFDivisi(k.divisi);
    setFJenis((k.jenis as any) || 'PKS'); setFTarget(k.target); setFWilayah(k.wilayah);
    setFTglMulai(k.tglMulai); setFTglTarget(k.tglTarget);
    setFTglDitetapkan(k.tglDitetapkan || ''); setFTglBerakhirMou(k.tglBerakhirMou || '');
    setFPublik(k.tampilPublik);
    setShowForm(true); setError('');
    setFocusedField(null);
  };

  const simpan = async () => {
    if (!fJudul.trim()) { setError('Judul wajib diisi.'); return; }
    if (fDivisi.length === 0) { setError('Pilih minimal 1 divisi.'); return; }
    setSubmitting(true); setError('');
    try {
      if (editId) {
        const res = await fetch('/api/rencana', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, fields: {
            judul: fJudul, deskripsi: fDeskripsi, jenis: fJenis, target: fTarget,
            wilayah: fWilayah, tglMulai: fTglMulai, tglTarget: fTglTarget,
            tglDitetapkan: fTglDitetapkan, tglBerakhirMou: fTglBerakhirMou,
            tampilPublik: fPublik, divisi: fDivisi,
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
            divisi: fDivisi, judul: fJudul, deskripsi: fDeskripsi,
            jenis: fJenis, target: fTarget, wilayah: fWilayah,
            tglMulai: fTglMulai, tglTarget: fTglTarget,
            tglDitetapkan: fTglDitetapkan, tglBerakhirMou: fTglBerakhirMou,
            tampilPublik: fPublik, dibuatOleh: role,
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

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiListSidebar size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/laporan', icon: <FiFileText size={17} />, label: 'Laporan' },
    ...(level === 'bnnp_bnnk' ? [{ href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' }] : []),
  ];

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  const filtered = divisiAktif === 'semua' ? kegiatan : kegiatan.filter(k => k.divisi.includes(divisiAktif));
  const divisiLabel = (key: string) => DIVISI_LIST.find(d => d.key === key)?.label || key;

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily:'sans-serif', color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat E-Planning...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily:'sans-serif' }}>
      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/rencana"
        brandLabel="SI-POKJA HUMKER"
        brandSub={level === 'utama' ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        userName={namaAdmin}
        userTag={level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={BLUE}
        onLogout={logout}
      />

      <nav className="main-content-wrap" style={navStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
            <Handshake size={18} style={{ color: BLUE }} />
            E-Planning · Kerja Sama Kelembagaan
          </div>
        </div>
        <a href="/dashboard/rencana/pendaftaran" style={btnOutline}>
          <Users size={14} style={{ marginRight:4 }} />
          Kelola Pendaftaran
        </a>
      </nav>

      <div className="main-content-wrap" style={{ maxWidth:1000, margin:'0 auto', padding:'1.25rem' }}>
        {msg && (
          <div style={{ ...msgBox(BLUE_DARK,'#DBEAFE'), display:'flex', alignItems:'center', gap:8, animation:'fadeInDown 0.4s ease-out' }}>
            <CheckCircle size={16} />
            {msg}
          </div>
        )}
        {error && !showForm && (
          <div style={{ ...msgBox('#991B1B','#FEE2E2'), display:'flex', alignItems:'center', gap:8, animation:'shake 0.4s ease-out' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={{ animation:'fadeInUp 0.5s ease-out' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button onClick={() => setDivisiAktif('semua')} style={{ ...chip(divisiAktif==='semua'), display:'flex', alignItems:'center', gap:4 }}>
                <List size={12} />
                Semua ({kegiatan.length})
              </button>
              {DIVISI_LIST.map(d => {
                const count = kegiatan.filter(k => k.divisi.includes(d.key)).length;
                return (
                  <button key={d.key} onClick={() => setDivisiAktif(d.key)} style={{ ...chip(divisiAktif===d.key), display:'flex', alignItems:'center', gap:4 }}>
                    {d.label} ({count})
                  </button>
                );
              })}
            </div>
            <button onClick={openCreate} style={{ ...btnPrimary, display:'flex', alignItems:'center', gap:6, padding:'10px 20px' }} className="btn-hover">
              <Plus size={16} />
              Kegiatan Baru
            </button>
          </div>

          {loading ? (
            <div style={{ ...card, textAlign:'center', padding:'3rem', color:'#94a3b8', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              Memuat kegiatan...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ ...card, textAlign:'center', padding:'3rem', color:'#94a3b8', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'#eef2f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <FileText size={32} style={{ color:'#cbd5e1' }} />
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
                  <div key={k.id} style={{ ...card, animation:`fadeInUp 0.4s ease-out ${index * 0.04}s both` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:240 }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                          {k.divisi.map(dv => (
                            <span key={dv} style={{ fontSize:10, fontWeight:600, padding:'3px 12px', borderRadius:100, background:'#DBEAFE', color:BLUE_DARK, display:'flex', alignItems:'center', gap:4 }}>
                              <Tag size={11} />
                              {divisiLabel(dv)}
                            </span>
                          ))}
                          <span style={{ fontSize:10, fontWeight:600, padding:'3px 12px', borderRadius:100, background:k.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:k.jenis==='MOU'?BLUE_DARK:'#92400E', display:'flex', alignItems:'center', gap:4 }}>
                            <FileText size={11} />
                            {k.jenis}
                          </span>
                          <span style={{ fontSize:10, fontWeight:600, padding:'3px 12px', borderRadius:100, background:sc.bg, color:sc.color, display:'flex', alignItems:'center', gap:4 }}>
                            <StatusIcon size={11} />
                            {k.status}
                          </span>
                          {k.tampilPublik && (
                            <span style={{ fontSize:10, padding:'3px 12px', borderRadius:100, background:'#FEF3C7', color:GOLD, display:'flex', alignItems:'center', gap:4 }}>
                              <Globe size={11} />
                              Publik
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize:16, fontWeight:700, marginBottom:4, color:'#0f1f3d' }}>{k.judul}</div>

                        {isExpanded && (
                          <div style={{ marginTop:8, animation:'fadeInUp 0.3s ease-out' }}>
                            {k.deskripsi && (
                              <div style={{ fontSize:13, color:'#64748b', marginBottom:8, lineHeight:1.7, background:'#F5F1E8', padding:'8px 12px', borderRadius:8 }}>
                                {k.deskripsi}
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ fontSize:11, color:'#94a3b8', display:'flex', gap:14, flexWrap:'wrap', background:'#F5F1E8', padding:'4px 10px', borderRadius:8, marginTop:4 }}>
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
                        </div>

                        {(k.tglDitetapkan || k.tglBerakhirMou) && (
                          <div style={{ fontSize:11, color:BLUE_DARK, display:'flex', alignItems:'center', gap:6, background:'#EFF6FF', padding:'5px 10px', borderRadius:8, marginTop:6 }}>
                            <FileCheck size={13} />
                            MOU/PKS: {k.tglDitetapkan || '—'} s.d. {k.tglBerakhirMou || '—'}
                          </div>
                        )}

                        <div style={{ marginTop:10, maxWidth:320 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#64748b', marginBottom:4 }}>
                            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                              <Users size={13} />
                              Kuota Mitra
                            </span>
                            <span style={{ fontWeight:600, color: k.sisaKuota === 0 ? '#DC2626' : BLUE }}>
                              {k.terisi} / {k.target} terisi
                            </span>
                          </div>
                          <div style={{ height:6, background:'#eef2f6', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${persen}%`, background: persen >= 100 ? 'linear-gradient(90deg,#DC2626,#EF4444)' : `linear-gradient(90deg,${BLUE_LIGHT},${BLUE_DARK})`, borderRadius:3, transition:'width .8s cubic-bezier(0.4,0,0.2,1)' }} />
                          </div>
                        </div>

                        <button onClick={() => toggleExpand(k.id)} style={{ ...btnSm, fontSize:10, marginTop:8, display:'flex', alignItems:'center', gap:4, padding:'4px 10px' }}>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {isExpanded ? 'Sembunyikan Detail' : 'Lihat Detail'}
                        </button>
                      </div>

                      <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
                        <button onClick={() => openEdit(k)} style={{ ...btnSm, display:'flex', alignItems:'center', gap:4 }} className="btn-hover">
                          <Edit size={14} />
                          Edit
                        </button>
                        <select value={k.status} onChange={e => ubahStatus(k.id, e.target.value)} style={{ ...btnSm, cursor:'pointer', padding:'6px 10px', fontSize:11 }}>
                          {['Rencana','Dibuka','Penuh','Ditutup','Selesai'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => hapus(k.id)} style={{ ...btnSm, color:'#991B1B', borderColor:'#FCA5A5', display:'flex', alignItems:'center', gap:4 }} className="btn-hover">
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
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={overlay} onClick={() => !submitting && setShowForm(false)}>
          <div style={{ ...modalBox, animation:'scaleIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:'#0f1f3d' }}>
                  {editId ? 'Edit Kegiatan' : 'Kegiatan Baru'}
                </div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>Kerja Sama Kelembagaan</div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ ...btnSm, padding:'4px 8px' }} className="btn-hover">
                <X size={16} />
              </button>
            </div>

            {error && (
              <div style={{ ...msgBox('#991B1B','#FEE2E2'), display:'flex', alignItems:'center', gap:6, animation:'shake 0.4s ease-out' }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div style={{ marginBottom:12 }}>
              <label style={labelSt}>
                <Building size={14} style={{ marginRight:4 }} />
                Divisi <span style={{ color:'#DC2626' }}>✱</span>
                <span style={{ fontWeight:400, color:'#94a3b8', marginLeft:6, fontSize:10.5 }}>(pilih 1–{MAKS_DIVISI})</span>
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {DIVISI_LIST.map(d => {
                  const active = fDivisi.includes(d.key);
                  const disabled = !active && fDivisi.length >= MAKS_DIVISI;
                  return (
                    <button key={d.key} type="button" onClick={() => toggleDivisiForm(d.key)} disabled={disabled}
                      style={{
                        padding:'9px 10px', borderRadius:9, cursor: disabled ? 'not-allowed' : 'pointer',
                        fontFamily:'sans-serif', fontSize:12, textAlign:'left',
                        border:`2px solid ${active ? BLUE : '#e2e8f0'}`,
                        background: active ? '#EFF6FF' : '#fff',
                        color: active ? BLUE_DARK : '#334155',
                        fontWeight: active ? 600 : 400,
                        opacity: disabled ? 0.4 : 1,
                        transition:'all .2s ease',
                      }}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={labelSt}>
                <FileText size={14} style={{ marginRight:4 }} />
                Judul Kegiatan <span style={{ color:'#DC2626' }}>✱</span>
              </label>
              <input style={{ ...inputFull, borderColor: focusedField === 'judul' ? BLUE : '#e2e8f0' }} value={fJudul} onChange={e => setFJudul(e.target.value)}
                placeholder="Contoh: Sosialisasi P4GN di Kampus" onFocus={() => setFocusedField('judul')} onBlur={() => setFocusedField(null)} />
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={labelSt}>
                <FileText size={14} style={{ marginRight:4 }} />
                Deskripsi
              </label>
              <textarea style={{ ...inputFull, height:70, resize:'none', borderColor: focusedField === 'deskripsi' ? BLUE : '#e2e8f0', fontFamily:'sans-serif' }} value={fDeskripsi} onChange={e => setFDeskripsi(e.target.value)}
                placeholder="Jelaskan kegiatan secara singkat..." onFocus={() => setFocusedField('deskripsi')} onBlur={() => setFocusedField(null)} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <label style={labelSt}>
                  <FileCheck size={14} style={{ marginRight:4 }} />
                  Jenis Dokumen <span style={{ color:'#DC2626' }}>✱</span>
                </label>
                <div style={{ display:'flex', gap:6 }}>
                  {(['MOU','PKS'] as const).map(j => (
                    <button key={j} type="button" onClick={() => setFJenis(j)}
                      style={{ flex:1, padding:'8px', borderRadius:8, cursor:'pointer', fontFamily:'sans-serif', fontSize:12,
                        border:`2px solid ${fJenis===j?BLUE:'#e2e8f0'}`, background: fJenis===j?'#EFF6FF':'#fff',
                        color: fJenis===j?BLUE_DARK:'#334155', fontWeight: fJenis===j?600:400 }}>
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
                <input type="number" min={1} style={{ ...inputFull, borderColor: focusedField === 'target' ? BLUE : '#e2e8f0' }} value={fTarget}
                  onChange={e => setFTarget(parseInt(e.target.value) || 1)} onFocus={() => setFocusedField('target')} onBlur={() => setFocusedField(null)} />
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={labelSt}>
                <MapPin size={14} style={{ marginRight:4 }} />
                Wilayah/Lokasi
              </label>
              <input style={{ ...inputFull, borderColor: focusedField === 'wilayah' ? BLUE : '#e2e8f0' }} value={fWilayah} onChange={e => setFWilayah(e.target.value)}
                placeholder="Contoh: Makassar" onFocus={() => setFocusedField('wilayah')} onBlur={() => setFocusedField(null)} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <label style={labelSt}>
                  <Calendar size={14} style={{ marginRight:4 }} />
                  Tanggal Mulai Kegiatan
                </label>
                <input type="date" style={{ ...inputFull, borderColor: focusedField === 'tglMulai' ? BLUE : '#e2e8f0' }} value={fTglMulai}
                  onChange={e => setFTglMulai(e.target.value)} onFocus={() => setFocusedField('tglMulai')} onBlur={() => setFocusedField(null)} />
              </div>
              <div>
                <label style={labelSt}>
                  <CalendarDays size={14} style={{ marginRight:4 }} />
                  Tanggal Target Kegiatan
                </label>
                <input type="date" style={{ ...inputFull, borderColor: focusedField === 'tglTarget' ? BLUE : '#e2e8f0' }} value={fTglTarget}
                  onChange={e => setFTglTarget(e.target.value)} onFocus={() => setFocusedField('tglTarget')} onBlur={() => setFocusedField(null)} />
              </div>
            </div>

            <div style={mouBox}>
              <div style={{ fontSize:11, fontWeight:700, color:GOLD, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <FileCheck size={13} /> Masa Berlaku MOU/PKS
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={labelSt}>Tanggal Ditetapkan</label>
                  <input type="date" style={{ ...inputFull, borderColor: focusedField === 'tglDitetapkan' ? BLUE : '#e2e8f0' }} value={fTglDitetapkan}
                    onChange={e => setFTglDitetapkan(e.target.value)} onFocus={() => setFocusedField('tglDitetapkan')} onBlur={() => setFocusedField(null)} />
                </div>
                <div>
                  <label style={labelSt}>Tanggal Berakhir</label>
                  <input type="date" style={{ ...inputFull, borderColor: focusedField === 'tglBerakhirMou' ? BLUE : '#e2e8f0' }} value={fTglBerakhirMou}
                    onChange={e => setFTglBerakhirMou(e.target.value)} onFocus={() => setFocusedField('tglBerakhirMou')} onBlur={() => setFocusedField(null)} />
                </div>
              </div>
            </div>

            <label style={publikToggle}>
              <input type="checkbox" checked={fPublik} onChange={e => setFPublik(e.target.checked)} style={{ accentColor: BLUE, width:18, height:18, cursor:'pointer' }} />
              <Globe size={16} style={{ color: fPublik ? BLUE : '#94a3b8' }} />
              <span style={{ color:'#334155' }}>Tampilkan di halaman publik &quot;Akan Datang&quot; (mitra bisa mendaftar)</span>
            </label>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowForm(false)} style={{ ...btnSm, flex:1 }} className="btn-hover">Batal</button>
              <button onClick={simpan} disabled={submitting} style={{ ...btnPrimary, flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:13, opacity: submitting?0.7:1 }} className="btn-hover">
                {submitting ? (
                  <>
                    <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
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

      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeInDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        .btn-hover { transition: all .25s ease; }
        .btn-hover:hover:not(:disabled) { filter:brightness(1.05); transform:translateY(-1px); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>
    </div>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 1.5rem', background:'#fff', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:100, flexWrap:'wrap', gap:8, boxShadow:'0 1px 3px rgba(15,23,42,.04)' };
const backLink: React.CSSProperties = { fontSize:12, color:'#64748b', textDecoration:'none', display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:6 };
const card: React.CSSProperties = { background:'#fff', borderRadius:14, padding:'1rem 1.25rem', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(15,23,42,.04)' };
const labelSt: React.CSSProperties = { display:'flex', alignItems:'center', fontSize:11, fontWeight:600, color:'#334155', marginBottom:5 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:9, borderWidth:2, borderStyle:'solid', borderColor:'#e2e8f0', fontSize:12, fontFamily:'sans-serif', boxSizing:'border-box', background:'#f8fafc' };
const btnPrimary: React.CSSProperties = { padding:'8px 16px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'sans-serif', boxShadow:`0 2px 8px ${BLUE}30` };
const btnSm: React.CSSProperties = { padding:'6px 12px', borderRadius:9, borderWidth:1, borderStyle:'solid', borderColor:'#e2e8f0', background:'#fff', color:'#334155', fontSize:12, cursor:'pointer', fontFamily:'sans-serif', whiteSpace:'nowrap' };
const btnOutline: React.CSSProperties = { fontSize:12, padding:'6px 14px', borderRadius:9, border:'1px solid #e2e8f0', textDecoration:'none', color:'#334155', background:'#fff', display:'flex', alignItems:'center', gap:4 };
const overlay: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(15,23,42,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'1rem', backdropFilter:'blur(4px)' };
const modalBox: React.CSSProperties = { background:'#fff', borderRadius:16, padding:'1.75rem', width:'100%', maxWidth:540, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(15,23,42,.2)' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:10, marginBottom:12 });
const chip = (active: boolean): React.CSSProperties => ({ padding:'6px 16px', borderRadius:100, borderWidth:1, borderStyle:'solid', fontSize:12, cursor:'pointer', fontFamily:'sans-serif', fontWeight: active?600:400, background: active?BLUE:'#fff', color: active?'#fff':'#334155', borderColor: active?'transparent':'#e2e8f0' });
const mouBox: React.CSSProperties = { background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'12px 14px', marginBottom:14 };
const publikToggle: React.CSSProperties = { display:'flex', alignItems:'center', gap:10, marginBottom:18, cursor:'pointer', fontSize:13, padding:'8px 12px', borderRadius:9, background:'#f8fafc' };