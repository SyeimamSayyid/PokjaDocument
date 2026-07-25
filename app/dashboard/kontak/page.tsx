'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiSearch, FiMail, FiPhone, FiCopy, FiCheck,
  FiMessageCircle, FiUsers, FiFilter, FiChevronDown, FiEdit2, FiX,
  FiGrid, FiCalendar, FiInbox, FiKey, FiFolder, FiActivity, FiFileText,
  FiList, FiArchive, FiShield, FiMessageSquare, FiDroplet,
} from 'react-icons/fi';
import { FaBuilding, FaGraduationCap, FaUserCheck } from 'react-icons/fa';

interface Kontak {
  id: string;
  sumber: 'pengajuan' | 'arsip';
  namaInstitusi: string; jenis: string; email: string; noWa: string;
  status: string; tglSubmit: string; jurusan: string;
  divisi: string; divisiLabel: string; namaPIC: string;
}

interface InstansiOpt { key: string; label: string; }

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const JENIS_FILTER = ['Semua', 'MOU', 'PKS'];

const DIVISI_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pencegahan:    { label: 'Pencegahan',    color: BLUE_DARK, bg: '#DBEAFE' },
  pemberantasan: { label: 'Pemberantasan', color: '#A32D2D', bg: '#FEE2E2' },
  rehabilitasi:  { label: 'Rehabilitasi',  color: '#5B21B6', bg: '#EDE9FE' },
  pemberdayaan:  { label: 'Pemberdayaan',  color: '#92400E', bg: '#FEF3C7' },
};

function normNama(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseDivisi(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function waLink(no: string) {
  let d = (no || '').replace(/\D/g, '');
  if (d.startsWith('62')) {
    // sudah benar
  } else if (d.startsWith('0')) {
    d = '62' + d.slice(1);
  } else if (d.startsWith('8')) {
    d = '62' + d;
  } else {
    d = '62' + d.replace(/^62/, '');
  }
  return `https://wa.me/${d}`;
}

function formatNoWa(no: string) {
  let d = (no || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('62')) d = '0' + d.slice(2);
  else if (!d.startsWith('0')) d = '0' + d;
  return d;
}

function statusColor(s: string): { c: string; bg: string } {
  const k = (s || '').toLowerCase();
  if (k === 'ditolak') return { c: '#A32D2D', bg: '#FCEBEB' };
  if (k === 'disetujui') return { c: '#0a5c47', bg: '#e9f7f1' };
  if (k === 'ditinjau') return { c: '#92400E', bg: '#FEF3C7' };
  return { c: '#64748b', bg: '#f1f5f9' };
}

export default function KontakMitraPage() {
  const [role, setRole]     = useState('');
  const [level, setLevel]   = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [data, setData]     = useState<Kontak[]>([]);
  const [instansiOptions, setInstansiOptions] = useState<InstansiOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');
  const [jenisF, setJenisF] = useState('Semua');
  const [instansiF, setInstansiF] = useState('');
  const [copied, setCopied] = useState('');
  const [mounted, setMounted] = useState(false);

  const [editItem, setEditItem] = useState<Kontak | null>(null);
  const [form, setForm] = useState({ namaPIC: '', email: '', noWa: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/kontak-mitra').then(r => r.json()),
      fetch('/api/superadmin/mitra').then(r => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([kontakRes, mitraRes]) => {
        const kontakData: Kontak[] = kontakRes.data || [];
        setData(kontakData);

        const map = new Map<string, string>();
        (mitraRes.data || []).forEach((m: any) => {
          if (m.nama) map.set(normNama(m.nama), m.nama);
        });
        kontakData.forEach(k => {
          if (k.namaInstitusi) {
            const key = normNama(k.namaInstitusi);
            if (!map.has(key)) map.set(key, k.namaInstitusi);
          }
        });
        const opts = Array.from(map.entries())
          .map(([key, label]) => ({ key, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setInstansiOptions(opts);

        setLoading(false);
      })
      .catch(() => { setError('Gagal memuat data kontak.'); setLoading(false); });
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setRole(u.role);
        setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
        setNamaAdmin(u.nama || u.email || 'Admin');
        setMounted(true);
        load();
      })
      .catch(() => { window.location.href = '/login'; });
  }, [load]);

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

  const filtered = useMemo(() => data.filter(k => {
    const mJenis = jenisF === 'Semua' || k.jenis === jenisF;
    const mInstansi = !instansiF || normNama(k.namaInstitusi) === instansiF;
    const q = search.toLowerCase();
    const mSearch = !q ||
      k.namaInstitusi.toLowerCase().includes(q) ||
      k.namaPIC.toLowerCase().includes(q) ||
      k.email.toLowerCase().includes(q) ||
      k.noWa.includes(q);
    return mJenis && mInstansi && mSearch;
  }), [data, jenisF, instansiF, search]);

  const doCopy = (txt: string, key: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(key); setTimeout(() => setCopied(''), 1400);
  };

  const stat = useMemo(() => ({
    total: data.length,
    mou: data.filter(k => k.jenis === 'MOU').length,
    pks: data.filter(k => k.jenis === 'PKS').length,
    pic: data.filter(k => k.namaPIC).length,
  }), [data]);

  const openEdit = (k: Kontak) => {
    setEditItem(k);
    setForm({ namaPIC: k.namaPIC, email: k.email, noWa: k.noWa ? formatNoWa(k.noWa) : '' });
    setSaveError('');
  };

  const closeEdit = () => { if (!saving) { setEditItem(null); setSaveError(''); } };

  const submitEdit = async () => {
    if (!editItem) return;
    const digit = form.noWa.replace(/\D/g, '');
    if (digit && (digit.length < 10 || digit.length > 12)) {
      setSaveError('Nomor WhatsApp harus 10-12 digit angka.'); return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setSaveError('Format email tidak valid.'); return;
    }
    setSaving(true); setSaveError('');
    try {
      const res = await fetch('/api/kontak-mitra', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editItem.id, sumber: editItem.sumber,
          namaPIC: form.namaPIC.trim(), email: form.email.trim(), noWa: digit,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || 'Gagal menyimpan perubahan.');
      setEditItem(null);
      load();
    } catch (e: any) {
      setSaveError(e.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F5F1E8', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat kontak mitra...</div>
      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100dvh', fontFamily:FONT, background:'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <GlobalStyle />

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/kontak"
        brandLabel="E-POKJA HUKER"
        brandSub={level === 'utama' ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        userName={namaAdmin}
        userTag={level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={level === 'utama' ? '#ABD1C6' : BLUE}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth:1040, margin:'0 auto', padding:'1.4rem 1.25rem 0' }}>
        <nav style={navPill} className="fld">
          <div style={{ fontWeight:800, fontSize:14, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d', margin:'0 auto' }}>
            <FiUsers size={15} style={{ color: BLUE }} />
            Pencatatan Kontak
          </div>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth:1040, margin:'0 auto', padding:'1.25rem 1.25rem 3rem' }}>

        <div style={{ marginBottom:20 }} className="fld">
          <div style={eyebrow}>Direktori Mitra Kerja Sama</div>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.035em', margin:'12px 0 6px', lineHeight:1.05 }}>
            Kontak MOU & PKS
          </h1>
          <p style={{ fontSize:13, color:'#64748b', margin:0 }}>Email, WhatsApp, dan PIC seluruh mitra yang mengajukan kerja sama. Admin dapat mengoreksi data yang salah input.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }} className="fld">
          {[
            { lbl:'Total Mitra', val:stat.total, c: BLUE },
            { lbl:'MOU', val:stat.mou, c: BLUE_DARK },
            { lbl:'PKS', val:stat.pks, c:'#92400E' },
            { lbl:'PIC Tercatat', val:stat.pic, c:'#5B21B6' },
          ].map(s => (
            <div key={s.lbl} style={statShell}>
              <div style={statCore}>
                <div style={{ fontSize:28, fontWeight:800, color:s.c, letterSpacing:'-0.03em' }}>{s.val}</div>
                <div style={{ fontSize:11.5, color:'#64748b', marginTop:2, fontWeight:600 }}>{s.lbl}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap', alignItems:'center' }} className="fld">
          <div style={{ position:'relative', flex:2, minWidth:220 }}>
            <FiSearch size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Cari institusi, PIC, email, atau nomor…"
              style={searchInput} />
          </div>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <FaBuilding size={13} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
            <select value={instansiF} onChange={e => setInstansiF(e.target.value)} style={selectInput}>
              <option value="">Semua Instansi</option>
              {instansiOptions.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <FiChevronDown size={13} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
          </div>
        </div>

        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:18, flexWrap:'wrap' }} className="fld">
          <FiFilter size={13} style={{ color:'#94a3b8' }} />
          {JENIS_FILTER.map(j => {
            const on = jenisF === j;
            return (
              <button key={j} onClick={()=>setJenisF(j)} className="btn-hover"
                style={{ ...pillBtn, ...(on ? pillBtnActive : {}) }}>
                {j}
              </button>
            );
          })}
          {(instansiF || jenisF !== 'Semua' || search) && (
            <button
              onClick={() => { setInstansiF(''); setJenisF('Semua'); setSearch(''); }}
              className="btn-hover"
              style={{ ...pillBtn, color:'#94a3b8', marginLeft:4 }}
            >
              Reset filter
            </button>
          )}
        </div>

        {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), marginBottom:14 }} className="fld">{error}</div>}

        {filtered.length === 0 ? (
          <div style={shellStyle} className="fld">
            <div style={{ ...coreStyle, textAlign:'center', padding:'3rem' }}>
              <FiUsers size={32} style={{ color:'#cbd5e1', marginBottom:10 }} />
              <div style={{ fontSize:13.5, color:'#64748b' }}>Belum ada kontak ditemukan pada filter ini.</div>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map((k, i) => (
              <div key={`${k.sumber}-${k.id}-${i}`} style={{ ...shellStyle, animationDelay: mounted ? `${i * 0.02}s` : undefined }} className="fld">
                <div style={{ ...coreStyle, padding:'1.1rem 1.3rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:14, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:200 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                        <span style={pill(k.jenis==='MOU'?BLUE_DARK:'#92400E', k.jenis==='MOU'?'#DBEAFE':'#FEF3C7')}>{k.jenis}</span>
                        {parseDivisi(k.divisi).map(dv => {
                          const info = DIVISI_LABEL[dv] || { label: dv, color:'#64748b', bg:'#f1f5f9' };
                          return <span key={dv} style={pill(info.color, info.bg)}>{info.label}</span>;
                        })}
                        {k.jurusan && (
                          <span style={{ ...pill('#0a5c47','#e9f7f1'), display:'inline-flex', alignItems:'center', gap:4 }}>
                            <FaGraduationCap size={10} />{k.jurusan}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:15, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.02em', display:'flex', alignItems:'center', gap:7 }}>
                        <FaBuilding size={14} style={{ color: BLUE, flexShrink:0 }} /> {k.namaInstitusi}
                      </div>
                      {k.namaPIC && (
                        <div style={{ fontSize:12, color:'#64748b', marginTop:5, display:'flex', alignItems:'center', gap:6 }}>
                          <FaUserCheck size={11} /> PIC: <strong style={{ color:'#334155', fontWeight:600 }}>{k.namaPIC}</strong>
                        </div>
                      )}
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:7, minWidth:180 }}>
                      <button onClick={() => openEdit(k)} className="btn-hover" style={editBtnSmall}>
                        <FiEdit2 size={11} /> Edit
                      </button>
                      <div style={contactRow}>
                        <FiMail size={13} style={{ color: BLUE_DARK, flexShrink:0 }} />
                        <span style={{ flex:1, fontSize:12, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.email || '—'}</span>
                        {k.email && (
                          <button onClick={()=>doCopy(k.email, `e${i}`)} className="btn-hover" style={miniBtn} title="Salin email">
                            {copied===`e${i}` ? <FiCheck size={13} color={BLUE} /> : <FiCopy size={13} />}
                          </button>
                        )}
                      </div>
                      <div style={contactRow}>
                        <FiPhone size={13} style={{ color: BLUE, flexShrink:0 }} />
                        <span style={{ flex:1, fontSize:12, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.noWa ? formatNoWa(k.noWa) : '—'}</span>
                        {k.noWa && (
                          <>
                            <a href={waLink(k.noWa)} target="_blank" rel="noopener noreferrer" className="btn-hover" style={{ ...miniBtn, color: BLUE, borderColor:'rgba(29,78,216,0.25)' }} title="Buka WhatsApp">
                              <FiMessageCircle size={13} />
                            </a>
                            <button onClick={()=>doCopy(formatNoWa(k.noWa), `w${i}`)} className="btn-hover" style={miniBtn} title="Salin nomor">
                              {copied===`w${i}` ? <FiCheck size={13} color={BLUE} /> : <FiCopy size={13} />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(29,78,216,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'#94a3b8' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                      Status:
                      <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 10px', borderRadius:100, ...statusColor(k.status) }}>{k.status || '—'}</span>
                    </span>
                    <span>{k.tglSubmit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editItem && (
        <div style={modalOverlay} onClick={closeEdit}>
          <div style={modalBox} className="fld" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:'#0f1f3d' }}>Edit Kontak Mitra</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{editItem.namaInstitusi}</div>
              </div>
              <button onClick={closeEdit} style={closeBtn} className="btn-hover"><FiX size={16} /></button>
            </div>

            <label style={fieldLabel}>Nama PIC</label>
            <input style={fieldInput} value={form.namaPIC} onChange={e => setForm(f => ({ ...f, namaPIC: e.target.value }))} placeholder="Nama penanggung jawab" />

            <label style={fieldLabel}>Email</label>
            <input style={fieldInput} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="nama@email.com" />

            <label style={fieldLabel}>No. WhatsApp</label>
            <input style={fieldInput} value={form.noWa} onChange={e => setForm(f => ({ ...f, noWa: e.target.value }))} placeholder="08xxxxxxxxxx (10-12 digit)" />

            {saveError && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), marginTop:12 }}>{saveError}</div>}

            <div style={{ display:'flex', gap:8, marginTop:18 }}>
              <button onClick={closeEdit} disabled={saving} style={{ ...pillBtn, flex:1, textAlign:'center' }} className="btn-hover">Batal</button>
              <button onClick={submitEdit} disabled={saving} style={{ ...pillBtn, ...pillBtnActive, flex:1, textAlign:'center' }} className="btn-hover">
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
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
      @keyframes fadeUp { from{opacity:0;transform:translateY(12px);filter:blur(3px)} to{opacity:1;transform:none;filter:blur(0)} }
      .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
      .btn-hover:active { transform: scale(0.96); }
      input::placeholder { color:#aab4b0; }
      @media (min-width: 901px) {
        .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
      }
    `}</style>
  );
}

const navPill: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.72)', backdropFilter:'blur(12px)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:100, padding:'9px 10px 9px 18px', boxShadow:'0 10px 26px -18px rgba(15,23,42,0.25)' };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#64748b', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:6 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', borderRadius:20, padding:6, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const statShell: React.CSSProperties = { ...shellStyle, borderRadius:18, padding:5 };
const statCore: React.CSSProperties = { ...coreStyle, borderRadius:13, padding:'1rem 1.1rem' };
const contactRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, background:'#F5F1E8', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.06)', borderRadius:10, padding:'7px 10px' };
const miniBtn: React.CSSProperties = { width:28, height:28, borderRadius:8, borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:FONT, textDecoration:'none' };
const editBtnSmall: React.CSSProperties = { alignSelf:'flex-end', display:'inline-flex', alignItems:'center', gap:5, fontSize:10.5, fontWeight:700, padding:'5px 10px', borderRadius:100, border:'1px solid rgba(29,78,216,0.15)', background:'#EFF6FF', color: BLUE_DARK, cursor:'pointer', fontFamily:FONT };
const eyebrow: React.CSSProperties = { display:'inline-block', fontSize:9.5, color: BLUE, textTransform:'uppercase', letterSpacing:'0.14em', fontWeight:700, background:'#DBEAFE', padding:'4px 11px', borderRadius:100 };
const searchInput: React.CSSProperties = { width:'100%', padding:'11px 14px 11px 40px', borderRadius:100, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', fontSize:13, fontFamily:FONT, outline:'none', color:'#0f1f3d', boxSizing:'border-box' };
const selectInput: React.CSSProperties = { width:'100%', padding:'11px 34px 11px 36px', borderRadius:100, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', fontSize:12.5, fontFamily:FONT, outline:'none', color:'#0f1f3d', boxSizing:'border-box', appearance:'none', cursor:'pointer' };
const pillBtn: React.CSSProperties = { padding:'8px 15px', borderRadius:100, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', cursor:'pointer', fontFamily:FONT, fontSize:12, fontWeight:600, background:'#fff', color:'#54635e' };
const pillBtnActive: React.CSSProperties = { background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', borderColor:'transparent', fontWeight:700, boxShadow:'0 8px 18px -8px rgba(29,78,216,0.5)' };
const pill = (color: string, bg: string): React.CSSProperties => ({ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:100, background:bg, color, letterSpacing:'0.02em' });
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12.5, color, background:bg, padding:'10px 14px', borderRadius:10 });
const modalOverlay: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 };
const modalBox: React.CSSProperties = { background:'#fff', borderRadius:20, padding:'1.5rem', width:'100%', maxWidth:380, boxShadow:'0 30px 60px -20px rgba(15,23,42,0.35)' };
const closeBtn: React.CSSProperties = { width:28, height:28, borderRadius:8, border:'1px solid rgba(29,78,216,0.10)', background:'#fff', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const fieldLabel: React.CSSProperties = { display:'block', fontSize:11, fontWeight:700, color:'#334155', marginBottom:5, marginTop:12 };
const fieldInput: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#F5F1E8', fontSize:13, fontFamily:FONT, outline:'none', color:'#0f1f3d', boxSizing:'border-box' };