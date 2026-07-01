'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Search, Mail, Phone, UserCheck, Building2,
  GraduationCap, Copy, Check, MessageCircle, Users, Filter
} from 'lucide-react';

interface Kontak {
  namaInstitusi: string; jenis: string; email: string; noWa: string;
  status: string; tglSubmit: string; jurusan: string;
  divisi: string; divisiLabel: string; namaPIC: string;
}

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";

const JENIS_FILTER = ['Semua', 'MOU', 'PKS'];

function waLink(no: string) {
  let d = (no || '').replace(/\D/g, '');
  if (d.startsWith('62')) {
    // sudah benar
  } else if (d.startsWith('0')) {
    d = '62' + d.slice(1);        // 0812… → 62812…
  } else if (d.startsWith('8')) {
    d = '62' + d;                 // 812…  → 62812…
  } else {
    d = '62' + d.replace(/^62/, '');
  }
  return `https://wa.me/${d}`;
}

// Tampilkan nomor mulai dari 0 (mis. 81243241465 → 081243241465, 6281.. → 081..)
function formatNoWa(no: string) {
  let d = (no || '').replace(/\D/g, '');
  if (!d) return '—';
  if (d.startsWith('62')) d = '0' + d.slice(2);
  else if (!d.startsWith('0')) d = '0' + d;
  return d;
}

// Warna status — Ditolak merah
function statusColor(s: string): { c: string; bg: string } {
  const k = (s || '').toLowerCase();
  if (k === 'ditolak') return { c: '#b91c1c', bg: '#fbe9e9' };
  if (k === 'disetujui') return { c: '#0a5c47', bg: '#e9f7f1' };
  if (k === 'ditinjau') return { c: '#854F0B', bg: '#fbf2e3' };
  return { c: '#5b6b66', bg: '#eef1f0' };
}

export default function KontakMitraPage() {
  const [role, setRole]     = useState('');
  const [data, setData]     = useState<Kontak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');
  const [jenisF, setJenisF] = useState('Semua');
  const [copied, setCopied] = useState('');
  const [mounted, setMounted] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/kontak-mitra')
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat data kontak.'); setLoading(false); });
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    setMounted(true);
    load();
  }, [load]);

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

  const filtered = useMemo(() => data.filter(k => {
    const mJenis = jenisF === 'Semua' || k.jenis === jenisF;
    const q = search.toLowerCase();
    const mSearch = !q ||
      k.namaInstitusi.toLowerCase().includes(q) ||
      k.namaPIC.toLowerCase().includes(q) ||
      k.email.toLowerCase().includes(q) ||
      k.noWa.includes(q);
    return mJenis && mSearch;
  }), [data, jenisF, search]);

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

  return (
    <div style={{ minHeight:'100dvh', fontFamily:FONT, background:'radial-gradient(1000px 500px at 80% -10%, #e6f4ee 0%, rgba(230,244,238,0) 55%), linear-gradient(180deg,#f7f9f8,#eef2f0)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px);filter:blur(3px)} to{opacity:1;transform:none;filter:blur(0)} }
        .row { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        .chip { transition: all 0.4s cubic-bezier(0.32,0.72,0,1); }
        .chip:hover { transform: translateY(-1px); }
        .kbtn { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
        .kbtn:hover { transform: translateY(-1px); }
        .kbtn:active { transform: scale(0.96); }
        input::placeholder { color:#aab4b0; }
      `}</style>

      {/* Nav floating */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:1040, margin:'0 auto', padding:'1.5rem 1.5rem 0' }}>
        <a href={backUrl} style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13, color:'#3a4742', textDecoration:'none', fontWeight:600, background:'#fff', padding:'9px 16px', borderRadius:100, border:'1px solid rgba(10,46,36,0.08)', boxShadow:'0 1px 2px rgba(10,46,36,0.04)' }}>
          <ArrowLeft size={15} strokeWidth={1.8} /> Dashboard
        </a>
        <div style={{ fontSize:12, color:'#5b6b66', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
          <Users size={14} strokeWidth={1.7} /> Pencatatan Kontak
        </div>
      </nav>

      <div style={{ maxWidth:1040, margin:'0 auto', padding:'1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom:22 }}>
          <div style={{ display:'inline-block', fontSize:9.5, color:'#0F6E56', textTransform:'uppercase', letterSpacing:'0.22em', fontWeight:700, background:'#eef9f4', padding:'6px 14px', borderRadius:100, marginBottom:12 }}>
            Direktori Mitra Kerja Sama
          </div>
          <h1 style={{ fontSize:30, fontWeight:800, color:'#0a2e24', letterSpacing:'-0.035em', margin:'0 0 6px', lineHeight:1.05 }}>
            Kontak MOU & PKS
          </h1>
          <p style={{ fontSize:13.5, color:'#5b6b66', margin:0 }}>Email, WhatsApp, dan PIC seluruh mitra yang mengajukan kerja sama</p>
        </div>

        {/* Stat bento */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
          {[
            { lbl:'Total Mitra', val:stat.total, c:'#0F6E56' },
            { lbl:'MOU', val:stat.mou, c:'#0C447C' },
            { lbl:'PKS', val:stat.pks, c:'#854F0B' },
            { lbl:'PIC Tercatat', val:stat.pic, c:'#5B21B6' },
          ].map(s => (
            <div key={s.lbl} style={statShell}>
              <div style={statCore}>
                <div style={{ fontSize:30, fontWeight:800, color:s.c, letterSpacing:'-0.03em' }}>{s.val}</div>
                <div style={{ fontSize:11.5, color:'#5b6b66', marginTop:2, fontWeight:600 }}>{s.lbl}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, minWidth:220 }}>
            <Search size={15} strokeWidth={1.8} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#9aa5a1' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Cari institusi, PIC, email, atau nomor…"
              style={{ width:'100%', padding:'12px 14px 12px 40px', borderRadius:100, border:'1.5px solid rgba(10,46,36,0.10)', background:'#fff', fontSize:13, fontFamily:FONT, outline:'none', color:'#0a2e24', boxSizing:'border-box' }} />
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <Filter size={14} strokeWidth={1.7} style={{ color:'#9aa5a1' }} />
            {JENIS_FILTER.map(j => {
              const on = jenisF === j;
              return (
                <button key={j} onClick={()=>setJenisF(j)} className="chip"
                  style={{ padding:'9px 16px', borderRadius:100, border:`1.5px solid ${on?'#0F6E56':'rgba(10,46,36,0.10)'}`, cursor:'pointer', fontFamily:FONT, fontSize:12.5, fontWeight: on?700:600,
                    background: on ? 'linear-gradient(135deg,#13987a,#0F6E56)' : '#fff', color: on ? '#fff' : '#54635e',
                    boxShadow: on ? '0 8px 18px -8px rgba(15,110,86,0.5)' : 'none' }}>
                  {j}
                </button>
              );
            })}
          </div>
        </div>

        {error && <div style={{ fontSize:13, color:'#b91c1c', background:'rgba(220,38,38,0.06)', padding:'12px 16px', borderRadius:13, marginBottom:14, border:'1px solid rgba(220,38,38,0.18)' }}>{error}</div>}

        {/* List */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'4rem', color:'#9aa5a1', fontSize:13 }}>Memuat kontak…</div>
        ) : filtered.length === 0 ? (
          <div style={shell}>
            <div style={{ ...core, textAlign:'center', padding:'3rem', color:'#9aa5a1' }}>
              <Users size={36} strokeWidth={1.3} style={{ opacity:0.4, marginBottom:10 }} />
              <div style={{ fontSize:14, fontWeight:600 }}>Belum ada kontak ditemukan</div>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map((k, i) => (
              <div key={i} style={shell} className={mounted ? 'row' : ''} >
                <div style={{ ...core, padding:'1.1rem 1.3rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:14, flexWrap:'wrap' }}>
                    {/* Kiri: identitas */}
                    <div style={{ flex:1, minWidth:200 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                        <span style={tag(k.jenis==='MOU'?'#0C447C':'#854F0B', k.jenis==='MOU'?'#e9f1fb':'#fbf2e3')}>{k.jenis}</span>
                        {k.divisiLabel && <span style={tag('#5B21B6','#f0ecfb')}>{k.divisiLabel}</span>}
                        {k.jurusan && <span style={{ ...tag('#0a5c47','#e9f7f1'), display:'inline-flex', alignItems:'center', gap:4 }}><GraduationCap size={11} strokeWidth={1.8} />{k.jurusan}</span>}
                      </div>
                      <div style={{ fontSize:15.5, fontWeight:700, color:'#0a2e24', letterSpacing:'-0.02em', display:'flex', alignItems:'center', gap:7 }}>
                        <Building2 size={16} strokeWidth={1.7} style={{ color:'#0F6E56', flexShrink:0 }} /> {k.namaInstitusi}
                      </div>
                      {k.namaPIC && (
                        <div style={{ fontSize:12.5, color:'#5b6b66', marginTop:5, display:'flex', alignItems:'center', gap:6 }}>
                          <UserCheck size={13} strokeWidth={1.7} /> PIC: <strong style={{ color:'#3a4742', fontWeight:600 }}>{k.namaPIC}</strong>
                        </div>
                      )}
                    </div>

                    {/* Kanan: aksi kontak */}
                    <div style={{ display:'flex', flexDirection:'column', gap:7, minWidth:180 }}>
                      {/* Email */}
                      <div style={contactRow}>
                        <Mail size={13} strokeWidth={1.7} style={{ color:'#0C447C', flexShrink:0 }} />
                        <span style={{ flex:1, fontSize:12, color:'#3a4742', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.email || '—'}</span>
                        {k.email && (
                          <button onClick={()=>doCopy(k.email, `e${i}`)} className="kbtn" style={miniBtn} title="Salin email">
                            {copied===`e${i}` ? <Check size={13} strokeWidth={2} color="#0F6E56" /> : <Copy size={13} strokeWidth={1.7} />}
                          </button>
                        )}
                      </div>
                      {/* WA */}
                      <div style={contactRow}>
                        <Phone size={13} strokeWidth={1.7} style={{ color:'#0F6E56', flexShrink:0 }} />
                        <span style={{ flex:1, fontSize:12, color:'#3a4742', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.noWa ? formatNoWa(k.noWa) : '—'}</span>
                        {k.noWa && (
                          <>
                            <a href={waLink(k.noWa)} target="_blank" rel="noopener noreferrer" className="kbtn" style={{ ...miniBtn, color:'#0F6E56', borderColor:'rgba(15,110,86,0.25)' }} title="Buka WhatsApp">
                              <MessageCircle size={13} strokeWidth={1.7} />
                            </a>
                            <button onClick={()=>doCopy(formatNoWa(k.noWa), `w${i}`)} className="kbtn" style={miniBtn} title="Salin nomor">
                              {copied===`w${i}` ? <Check size={13} strokeWidth={2} color="#0F6E56" /> : <Copy size={13} strokeWidth={1.7} />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(10,46,36,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'#9aa5a1' }}>
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
    </div>
  );
}

const shell: React.CSSProperties = { background:'rgba(255,255,255,0.5)', border:'1px solid rgba(10,46,36,0.06)', borderRadius:22, padding:6, boxShadow:'0 1px 2px rgba(10,46,36,0.04), 0 24px 48px -32px rgba(10,46,36,0.18)' };
const core: React.CSSProperties = { background:'#fff', borderRadius:17, boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const statShell: React.CSSProperties = { ...shell, borderRadius:20, padding:5 };
const statCore: React.CSSProperties = { ...core, borderRadius:16, padding:'1.1rem 1.2rem' };
const contactRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, background:'#fafcfb', border:'1px solid rgba(10,46,36,0.06)', borderRadius:10, padding:'7px 10px' };
const miniBtn: React.CSSProperties = { width:28, height:28, borderRadius:8, border:'1px solid rgba(10,46,36,0.10)', background:'#fff', color:'#5b6b66', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:FONT, textDecoration:'none' };
const tag = (color: string, bg: string): React.CSSProperties => ({ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:100, background:bg, color, letterSpacing:'0.02em' });