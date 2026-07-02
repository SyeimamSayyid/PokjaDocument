'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FiArrowLeft, FiSearch, FiUser, FiMail, FiPhone, FiFileText,
  FiChevronDown, FiChevronRight, FiZap, FiBookOpen, FiCheckCircle,
} from 'react-icons/fi';
import { FaBuilding, FaFileSignature, FaFileAlt } from 'react-icons/fa';

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const DIVISI_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pencegahan:    { label: 'Pencegahan',    color: BLUE_DARK, bg: '#DBEAFE' },
  pemberantasan: { label: 'Pemberantasan', color: '#A32D2D', bg: '#FEE2E2' },
  rehabilitasi:  { label: 'Rehabilitasi',  color: '#5B21B6', bg: '#EDE9FE' },
  pemberdayaan:  { label: 'Pemberdayaan',  color: '#92400E', bg: '#FEF3C7' },
};

interface JurusanEntry { jurusan: string; namaPIC: string; }
interface Profile {
  key: string; nama: string; idMitra?: string; terdaftar: boolean;
  singkatan?: string; emailUtama?: string; picUtama?: string; teleponUtama?: string;
  statusMitra?: string; tglDaftar?: string; totalMOU: number; totalPKS: number; totalDokumen: number;
  divisiSet: Set<string>; jurusanList: JurusanEntry[]; pengajuanCount: number;
  belumPernahMengajukan: boolean; mitraBaru: boolean;
}

function normNama(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function parseDivisi(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

export default function TataKelolaInstansiPage() {
  const [role, setRole] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [mitraRes, kontakRes, dokRes] = await Promise.all([
        fetch('/api/superadmin/mitra').then(r => r.json()),
        fetch('/api/kontak-mitra').then(r => r.json()),
        fetch('/api/superadmin/generate-kode').then(r => r.json()),
      ]);

      const map = new Map<string, Profile>();

      const getOrCreate = (namaRaw: string): Profile => {
        const key = normNama(namaRaw);
        let p = map.get(key);
        if (!p) {
          p = {
            key, nama: namaRaw, terdaftar: false, totalMOU: 0, totalPKS: 0,
            totalDokumen: 0, divisiSet: new Set(), jurusanList: [], pengajuanCount: 0,
            belumPernahMengajukan: false, mitraBaru: false,
          };
          map.set(key, p);
        }
        return p;
      };

      // 1) Mitra resmi terdaftar
      (mitraRes.data || []).forEach((m: any) => {
        const p = getOrCreate(m.nama);
        p.nama = m.nama; // nama resmi jadi prioritas
        p.idMitra = m.id;
        p.terdaftar = true;
        p.singkatan = m.singkatan;
        p.emailUtama = m.email || p.emailUtama;
        p.picUtama = m.pic || p.picUtama;
        p.statusMitra = m.status;
        p.tglDaftar = m.tglDaftar || '';
      });

      // 2) Riwayat pengajuan + arsip (kontak-mitra)
      (kontakRes.data || []).forEach((k: any) => {
        if (!k.namaInstitusi) return;
        const p = getOrCreate(k.namaInstitusi);
        p.pengajuanCount += 1;
        if (!p.emailUtama && k.email) p.emailUtama = k.email;
        if (!p.picUtama && k.namaPIC) p.picUtama = k.namaPIC;
        if (!p.teleponUtama && k.noWa) p.teleponUtama = k.noWa;
        parseDivisi(k.divisi).forEach((d: string) => p.divisiSet.add(d));
        if (k.jenis === 'PKS' && k.jurusan) {
          const exists = p.jurusanList.some(j => j.jurusan === k.jurusan && j.namaPIC === (k.namaPIC || ''));
          if (!exists) p.jurusanList.push({ jurusan: k.jurusan, namaPIC: k.namaPIC || '—' });
        }
      });

      // 3) Dokumen kerja sama — hitung MOU/PKS aktif
      (dokRes.data || []).forEach((d: any) => {
        if (!d.namaMitra) return;
        const p = getOrCreate(d.namaMitra);
        p.totalDokumen += 1;
        if (d.jenis === 'MOU') p.totalMOU += 1;
        else if (d.jenis === 'PKS') p.totalPKS += 1;
        parseDivisi(d.divisi).forEach((dv: string) => p.divisiSet.add(dv));
      });

      // "Mitra Baru" = terdaftar resmi, belum pernah mengajukan sama sekali,
      // DAN belum lewat 7 hari sejak tanggal daftar. Lewat 7 hari → jadi "Mitra Kerja Sama".
      const HARI_MASA_BARU = 7;
      map.forEach(p => {
        p.belumPernahMengajukan = p.terdaftar && p.pengajuanCount === 0 && p.totalDokumen === 0;
        let hariSejakDaftar = Infinity;
        if (p.tglDaftar) {
          const parsed = new Date(p.tglDaftar.replace(' ', 'T'));
          if (!isNaN(parsed.getTime())) {
            hariSejakDaftar = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
          }
        }
        p.mitraBaru = p.belumPernahMengajukan && hariSejakDaftar <= HARI_MASA_BARU;
      });

      const list = Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
      setProfiles(list);
    } catch {
      setError('Gagal memuat data institusi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    load();
  }, [load]);

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filtered = profiles.filter(p => {
    const matchSearch = !search || p.nama.toLowerCase().includes(search.toLowerCase()) || (p.picUtama || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === '' ? true :
      filterStatus === 'baru' ? p.mitraBaru :
      filterStatus === 'kerjasama' ? !p.mitraBaru : true;
    return matchSearch && matchStatus;
  });

  const countBaru = profiles.filter(p => p.mitraBaru).length;
  const countKerjaSama = profiles.length - countBaru;

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat profil institusi...</div>
      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', fontFamily: FONT, background: 'radial-gradient(1000px 480px at 85% -10%, #dbeafe 0%, rgba(219,234,254,0) 55%), linear-gradient(180deg,#f7f9fc,#eef2f8)' }}>
      <GlobalStyle />

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'1.4rem 1.25rem 0' }}>
        <nav style={navPill} className="fld">
          <a href={backUrl} style={backLink}><FiArrowLeft size={13} /> Dashboard</a>
          <div style={{ fontWeight:800, fontSize:14, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
            <FaBuilding size={15} style={{ color: BLUE }} />
            Tata Kelola Instansi Kerja Sama
          </div>
          <div style={{ width:34 }} />
        </nav>
      </div>

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'1.25rem 1.25rem 3rem' }}>

        {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), marginBottom:14 }} className="fld">{error}</div>}

        <div style={{ ...eyebrow, marginBottom:6 }} className="fld">Profil Mitra</div>
        <p style={{ fontSize:12, color:'#64748b', marginTop:0, marginBottom:18, lineHeight:1.6 }} className="fld">
          Daftar semua institusi — yang sudah resmi terdaftar maupun yang baru dikenal dari pengajuan/dokumen. Untuk PKS, anak cabang per jurusan ditampilkan di dalam profil masing-masing.
        </p>

        {/* Toolbar */}
        <div style={{ ...shellStyle, marginBottom:12 }} className="fld">
          <div style={{ ...coreStyle, padding:'0.9rem 1.1rem', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <FiSearch size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
              <input style={searchInput} placeholder="Cari nama institusi atau PIC..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ fontSize:11.5, color:'#94a3b8', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
              <FaBuilding size={11} /> {filtered.length} institusi
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }} className="fld">
          <button onClick={() => setFilterStatus('')} style={{ ...pillBtn, ...(filterStatus === '' ? pillBtnActive : {}) }} className="btn-hover">
            Semua ({profiles.length})
          </button>
          <button onClick={() => setFilterStatus('baru')} style={{ ...pillBtn, ...(filterStatus === 'baru' ? pillBtnActiveGold : {}) }} className="btn-hover">
            <FiZap size={11} style={{ marginRight:4, verticalAlign:'middle' }} /> Mitra Baru ({countBaru})
          </button>
          <button onClick={() => setFilterStatus('kerjasama')} style={{ ...pillBtn, ...(filterStatus === 'kerjasama' ? pillBtnActive : {}) }} className="btn-hover">
            Mitra Kerja Sama ({countKerjaSama})
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={shellStyle} className="fld">
            <div style={{ ...coreStyle, textAlign:'center', padding:'3rem 2rem' }}>
              <FaBuilding size={30} style={{ color:'#cbd5e1', marginBottom:10 }} />
              <div style={{ fontSize:13.5, color:'#64748b' }}>Tidak ada institusi pada filter ini.</div>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map((p, i) => {
              const isOpen = expanded.has(p.key);
              return (
                <div key={p.key} style={{ ...shellStyle, animationDelay:`${i * 0.02}s` }} className="fld">
                  <div style={coreStyle}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:220 }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                          <span style={{ ...pill, background: p.mitraBaru ? '#FEF3C7' : '#DBEAFE', color: p.mitraBaru ? GOLD : BLUE_DARK }}>
                            {p.mitraBaru ? <><FiZap size={10} style={{ marginRight:4, verticalAlign:'middle' }} />Mitra Baru</> : 'Mitra Kerja Sama'}
                          </span>
                          {Array.from(p.divisiSet).map(dv => {
                            const info = DIVISI_LABEL[dv] || { label: dv, color:'#64748b', bg:'#f1f5f9' };
                            return <span key={dv} style={{ ...pill, background: info.bg, color: info.color }}>{info.label}</span>;
                          })}
                        </div>
                        <div style={{ fontSize:15, fontWeight:800, color:'#0f1f3d' }}>{p.nama}{p.singkatan ? ` (${p.singkatan})` : ''}</div>
                        <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginTop:6 }}>
                          {p.picUtama && <span style={{ fontSize:11.5, color:'#64748b', display:'flex', alignItems:'center', gap:5 }}><FiUser size={11} /> {p.picUtama}</span>}
                          {p.emailUtama && <span style={{ fontSize:11.5, color:'#64748b', display:'flex', alignItems:'center', gap:5 }}><FiMail size={11} /> {p.emailUtama}</span>}
                          {p.teleponUtama && <span style={{ fontSize:11.5, color:'#64748b', display:'flex', alignItems:'center', gap:5 }}><FiPhone size={11} /> {p.teleponUtama}</span>}
                        </div>
                      </div>

                      <div style={{ display:'flex', gap:6, flexShrink:0, alignItems:'flex-start' }}>
                        <span style={statChip('#DBEAFE', BLUE_DARK)}><FaFileSignature size={10} /> {p.totalMOU} MOU</span>
                        <span style={statChip('#FEF3C7', '#92400E')}><FaFileAlt size={10} /> {p.totalPKS} PKS</span>
                      </div>
                    </div>

                    {p.jurusanList.length > 0 && (
                      <div style={{ marginTop:10 }}>
                        <button onClick={() => toggleExpand(p.key)} style={{ ...actBtn }} className="btn-hover">
                          {isOpen ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}
                          <FiBookOpen size={11} /> Anak Cabang / Jurusan ({p.jurusanList.length})
                        </button>
                        {isOpen && (
                          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }} className="fld">
                            {p.jurusanList.map((j, ji) => (
                              <div key={ji} style={jurusanRow}>
                                <FiBookOpen size={12} style={{ color: GOLD, flexShrink:0 }} />
                                <span style={{ fontSize:11.5, fontWeight:600, color:'#334155', flex:1 }}>{j.jurusan}</span>
                                <span style={{ fontSize:11, color:'#94a3b8', display:'flex', alignItems:'center', gap:4 }}>
                                  <FiUser size={10} /> {j.namaPIC}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
    `}</style>
  );
}

const navPill: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.72)', backdropFilter:'blur(12px)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:100, padding:'9px 10px 9px 18px', boxShadow:'0 10px 26px -18px rgba(15,23,42,0.25)' };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#64748b', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:6 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', borderRadius:20, padding:6, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, padding:'1.1rem 1.2rem', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const searchInput: React.CSSProperties = { padding:'9px 12px 9px 34px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', fontSize:12, fontFamily:FONT, width:'100%', outline:'none', background:'#f8fafc', boxSizing:'border-box' };
const pillBtn: React.CSSProperties = { padding:'8px 14px', borderRadius:100, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', fontSize:11.5, cursor:'pointer', fontFamily:FONT, background:'#fff', color:'#334155', fontWeight:500 };
const pillBtnActive: React.CSSProperties = { background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', borderColor:'transparent', fontWeight:700 };
const pillBtnActiveGold: React.CSSProperties = { background: GOLD, color:'#fff', borderColor:'transparent', fontWeight:700 };
const pill: React.CSSProperties = { fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:100 };
const eyebrow: React.CSSProperties = { display:'inline-block', fontSize:9.5, color: BLUE, textTransform:'uppercase', letterSpacing:'0.14em', fontWeight:700, background:'#DBEAFE', padding:'4px 11px', borderRadius:100 };
const actBtn: React.CSSProperties = { fontSize:10.5, padding:'6px 11px', borderRadius:8, borderWidth:1, borderStyle:'solid', borderColor:'rgba(217,119,6,0.2)', background:'#FFFBEB', color:'#92400E', cursor:'pointer', fontFamily:FONT, display:'inline-flex', alignItems:'center', gap:5, fontWeight:600 };
const jurusanRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, padding:'7px 11px', background:'#f8fafc', borderRadius:9, border:'1px solid rgba(29,78,216,0.06)' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12.5, color, background:bg, padding:'10px 14px', borderRadius:10 });
const statChip = (bg: string, color: string): React.CSSProperties => ({ fontSize:10, fontWeight:700, padding:'5px 11px', borderRadius:100, background:bg, color, display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' });