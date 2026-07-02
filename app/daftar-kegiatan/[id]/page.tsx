'use client';

import { useEffect, useState, use } from 'react';
import {
  ArrowLeft, CheckCircle, Copy, Check, AlertCircle, Calendar, MapPin,
  Users, Building, Mail, Phone, FileText, Tag, Clipboard, Home, Search,
  GraduationCap, MessageSquare, Send, Info, FileCheck,
} from 'lucide-react';

interface Kegiatan {
  id: string; kategori: string; divisi: string[]; divisiLabel: string[]; judul: string;
  deskripsi: string; jenis: string; target: number; terisi: number;
  wilayah: string; biaya: string; tglMulai: string; tglTarget: string;
  tglDitetapkan: string; tglBerakhirMou: string;
  status: string; tampilPublik: boolean; sisaKuota: number;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const DIVISI_COLOR: Record<string, string> = {
  pencegahan: BLUE_DARK, pemberantasan: '#A32D2D', rehabilitasi: '#5B21B6', pemberdayaan: GOLD,
};

function formatTanggal(t: string) {
  if (!t) return '';
  try { return new Date(t).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return t; }
}

export default function DaftarKegiatanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }              = use(params);
  const [keg, setKeg]       = useState<Kegiatan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const [step, setStep]     = useState<'form'|'sukses'>('form');
  const [hasil, setHasil]   = useState<{ kodeTracking:string; jenis:string; judulKegiatan:string; namaInstitusi:string; sisaKuota:number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [namaInstitusi, setNamaInstitusi] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [email, setEmail]     = useState('');
  const [noWa, setNoWa]       = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  useEffect(() => {
    fetch(`/api/rencana/publik?id=${id}`)
      .then(r => r.json())
      .then(d => {
        const k = d.data;
        if (!k) { setError('Kegiatan tidak ditemukan.'); return; }
        if (!k.tampilPublik) { setError('Kegiatan ini tidak menerima pendaftaran.'); return; }
        setKeg(k);
      })
      .catch(() => setError('Gagal memuat kegiatan.'))
      .finally(() => setLoading(false));
  }, [id]);

  const daftar = async () => {
    if (!namaInstitusi.trim()) { setError('Nama institusi wajib diisi.'); return; }
    if (!email.trim() && !noWa.trim()) { setError('Email atau WhatsApp wajib diisi.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/rencana/daftar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idKegiatan: id, namaInstitusi, jurusan, email, noWa, deskripsi }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mendaftar.'); return; }
      setHasil(d); setStep('sukses');
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:38, height:38, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13.5 }}>Memuat kegiatan...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error && !keg) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:FONT, color:'#A32D2D', padding:'1.5rem', textAlign:'center' }}>
      <AlertCircle size={52} style={{ color:'#f7b4b4', marginBottom:16 }} />
      <div style={{ fontSize:16, fontWeight:700 }}>{error}</div>
      <a href="/beranda" style={{ marginTop:16, color: BLUE, textDecoration:'none', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:100, background:'#EFF6FF', fontWeight:600 }} className="btn-hover">
        <ArrowLeft size={15} /> Kembali ke Beranda
      </a>
      <style>{`.btn-hover{transition:all .25s ease}.btn-hover:hover{filter:brightness(1.05)}`}</style>
    </div>
  );

  if (step === 'sukses' && hasil) {
    return (
      <div style={pageStyle}>
        <GlobalStyle />
        <div style={{ ...containerStyle }} className="fld">
          <div style={{ textAlign:'center', marginBottom:26 }}>
            <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:72, height:72, borderRadius:'50%', background:`linear-gradient(135deg, ${BLUE_LIGHT}, ${BLUE_DARK})`, marginBottom:14, boxShadow:`0 10px 26px -8px ${BLUE}60` }}>
              <CheckCircle size={36} style={{ color:'#fff' }} />
            </div>
            <div style={{ fontSize:22, fontWeight:800, color: BLUE_DARK, letterSpacing:'-0.02em' }}>Pendaftaran Berhasil!</div>
            <div style={{ fontSize:13.5, color:'#64748b', marginTop:4 }}>{hasil.namaInstitusi} · {hasil.jenis}</div>
          </div>

          <div style={{ background:'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border:'2px solid #93C5FD', borderRadius:16, padding:'1.9rem', marginBottom:20, textAlign:'center', boxShadow:`0 4px 20px ${BLUE}15` }}>
            <div style={{ fontSize:10.5, color: BLUE_DARK, marginBottom:8, textTransform:'uppercase', letterSpacing:2, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Clipboard size={14} /> Kode Tracking
            </div>
            <div style={{ fontSize:30, fontWeight:800, letterSpacing:5, color: BLUE_DARK, marginBottom:16, fontFamily:'monospace', background:'rgba(255,255,255,.7)', padding:'9px 18px', borderRadius:10, display:'inline-block' }}>
              {hasil.kodeTracking}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(hasil.kodeTracking); setCopied(true); setTimeout(()=>setCopied(false),1500); }} style={{ ...btnPrimary, display:'inline-flex', alignItems:'center', gap:8, padding:'11px 26px' }} className="btn-hover">
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Tersalin!' : 'Salin Kode'}
            </button>
          </div>

          <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'15px 19px', marginBottom:20, fontSize:13, color:'#78350F', display:'flex', alignItems:'flex-start', gap:9 }}>
            <AlertCircle size={16} style={{ flexShrink:0, marginTop:2, color: GOLD }} />
            <div><strong>Simpan kode ini!</strong> Gunakan untuk melacak status pendaftaran Anda. Tim Pokja akan meninjau pendaftaran dan menghubungi Anda.</div>
          </div>

          <div style={{ display:'flex', gap:9 }}>
            <a href="/cek-pengajuan" style={{ ...btnPrimary, flex:1, textAlign:'center', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }} className="btn-hover">
              <Search size={16} /> Cek Status
            </a>
            <a href="/beranda" style={{ ...btnSm, flex:1, textAlign:'center', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }} className="btn-hover">
              <Home size={16} /> Ke Beranda
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!keg) return null;

  const kuotaPenuh = keg.sisaKuota <= 0;

  return (
    <div style={pageStyle}>
      <GlobalStyle />
      <div style={containerStyle} className="fld">

        <a href="/beranda" style={{ fontSize:12, color:'#64748b', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6, marginBottom:18, padding:'5px 10px', borderRadius:8, fontWeight:600 }} className="btn-hover">
          <ArrowLeft size={14} /> Kembali
        </a>

        {/* Info kegiatan */}
        <div style={{ ...shellStyle, marginBottom:16 }}>
          <div style={coreStyle}>
            <div style={{ display:'flex', gap:6, marginBottom:11, flexWrap:'wrap' }}>
              {keg.divisi.map((dv, i) => {
                const color = DIVISI_COLOR[dv] || BLUE;
                return <span key={dv} style={pillTag(`${color}15`, color)}><Tag size={11} />{keg.divisiLabel[i] || dv}</span>;
              })}
              <span style={pillTag(keg.jenis==='MOU'?'#DBEAFE':'#FEF3C7', keg.jenis==='MOU'?BLUE_DARK:'#92400E')}><FileText size={11} />{keg.jenis}</span>
              {keg.sisaKuota > 0 && <span style={pillTag('#DBEAFE', BLUE_DARK)}><Users size={11} />Slot Tersedia</span>}
            </div>
            <div style={{ fontSize:18.5, fontWeight:800, marginBottom:6, color:'#0f1f3d', letterSpacing:'-0.01em' }}>{keg.judul}</div>
            {keg.deskripsi && <div style={{ fontSize:13, color:'#64748b', marginBottom:12, lineHeight:1.7 }}>{keg.deskripsi}</div>}

            <div style={{ fontSize:12, color:'#64748b', display:'flex', gap:14, flexWrap:'wrap', background:'#f8fafc', padding:'8px 13px', borderRadius:10 }}>
              {keg.wilayah && <span style={{ display:'flex', alignItems:'center', gap:5 }}><MapPin size={13} /> {keg.wilayah}</span>}
              {keg.tglMulai && <span style={{ display:'flex', alignItems:'center', gap:5 }}><Calendar size={13} /> {formatTanggal(keg.tglMulai)}{keg.tglTarget && ` – ${formatTanggal(keg.tglTarget)}`}</span>}
            </div>

            {/* Masa berlaku MOU/PKS */}
            {(keg.tglDitetapkan || keg.tglBerakhirMou) && (
              <div style={mouBox}>
                <div style={{ fontSize:10.5, fontWeight:700, color: GOLD, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em', display:'flex', alignItems:'center', gap:6 }}>
                  <FileCheck size={13} /> Masa Berlaku {keg.jenis}
                </div>
                <div style={{ fontSize:13, color:'#78350F', fontWeight:600 }}>
                  {keg.tglDitetapkan ? formatTanggal(keg.tglDitetapkan) : 'Belum ditetapkan'}
                  {' — '}
                  {keg.tglBerakhirMou ? formatTanggal(keg.tglBerakhirMou) : 'Belum ditetapkan'}
                </div>
                <div style={{ fontSize:11, color:'#92400E', marginTop:4, lineHeight:1.5 }}>
                  Ini periode resmi dokumen {keg.jenis} yang akan berlaku jika pendaftaran Anda disetujui — bukan tanggal pelaksanaan kegiatan.
                </div>
              </div>
            )}

            {/* Kuota */}
            <div style={{ marginTop:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:7 }}>
                <span style={{ color:'#64748b', display:'flex', alignItems:'center', gap:5 }}><Users size={13} /> Slot Mitra Tersedia</span>
                <span style={{ fontWeight:700, color: kuotaPenuh ? '#A32D2D' : BLUE, display:'flex', alignItems:'center', gap:5 }}>
                  {keg.sisaKuota} dari {keg.target} slot {kuotaPenuh && <AlertCircle size={13} />}
                </span>
              </div>
              <div style={{ height:8, background:'#eef2f6', borderRadius:100, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${keg.target > 0 ? Math.round((keg.terisi/keg.target)*100) : 0}%`, background: kuotaPenuh ? '#DC2626' : `linear-gradient(90deg,${BLUE_LIGHT},${BLUE_DARK})`, borderRadius:100, transition:'width .8s cubic-bezier(0.32,0.72,0,1)' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ background:'#EFF6FF', borderRadius:12, padding:'11px 15px', marginBottom:20, fontSize:12, color: BLUE_DARK, display:'flex', alignItems:'flex-start', gap:9 }}>
          <Info size={16} style={{ flexShrink:0, marginTop:2 }} />
          <span>Jenis dokumen untuk kegiatan ini adalah <strong>{keg.jenis}</strong>, telah ditentukan oleh BNN Provinsi.</span>
        </div>

        {kuotaPenuh ? (
          <div style={{ textAlign:'center', padding:'2.6rem 1.5rem', background:'#FCEBEB', borderRadius:16, color:'#991B1B', border:'1px solid #F7C1C1' }}>
            <AlertCircle size={44} style={{ margin:'0 auto 12px', opacity:0.8 }} />
            <div style={{ fontSize:16, fontWeight:700 }}>Kuota Penuh</div>
            <div style={{ fontSize:13, marginTop:4, color:'#7F1D1D' }}>Maaf, slot pendaftaran untuk kegiatan ini sudah penuh.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:16, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
              <Send size={18} style={{ color: BLUE }} /> Form Pendaftaran
            </div>

            {error && <div style={{ ...msgBox('#991B1B','#FEF2F2'), display:'flex', alignItems:'flex-start', gap:8 }}><AlertCircle size={16} style={{ flexShrink:0, marginTop:1 }} /><span>{error}</span></div>}

            <div style={{ marginBottom:14 }}>
              <label style={labelSt}><Building size={14} style={{ marginRight:4 }} />Nama Institusi <span style={{ color:'#DC2626' }}>*</span></label>
              <input style={{ ...inputFull, borderColor: focusedField === 'namaInstitusi' ? BLUE : 'rgba(29,78,216,0.10)' }} value={namaInstitusi} onChange={e => setNamaInstitusi(e.target.value)} placeholder="Contoh: Universitas Hasanuddin" onFocus={() => setFocusedField('namaInstitusi')} onBlur={() => setFocusedField(null)} />
            </div>

            {keg.jenis === 'PKS' && (
              <div style={{ marginBottom:14 }}>
                <label style={labelSt}><GraduationCap size={14} style={{ marginRight:4 }} />Jurusan / Program Studi</label>
                <input style={{ ...inputFull, borderColor: focusedField === 'jurusan' ? BLUE : 'rgba(29,78,216,0.10)' }} value={jurusan} onChange={e => setJurusan(e.target.value)} placeholder="Contoh: Teknik Informatika" onFocus={() => setFocusedField('jurusan')} onBlur={() => setFocusedField(null)} />
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:8 }}>
              <div>
                <label style={labelSt}><Mail size={14} style={{ marginRight:4 }} />Email</label>
                <input type="email" style={{ ...inputFull, borderColor: focusedField === 'email' ? BLUE : 'rgba(29,78,216,0.10)' }} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@institusi.id" onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
              </div>
              <div>
                <label style={labelSt}><Phone size={14} style={{ marginRight:4 }} />No. WhatsApp</label>
                <input type="tel" style={{ ...inputFull, borderColor: focusedField === 'noWa' ? BLUE : 'rgba(29,78,216,0.10)' }} value={noWa} onChange={e => setNoWa(e.target.value)} placeholder="08xxx" onFocus={() => setFocusedField('noWa')} onBlur={() => setFocusedField(null)} />
              </div>
            </div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:-6, marginBottom:14, display:'flex', alignItems:'center', gap:5 }}>
              <AlertCircle size={12} /> Isi minimal salah satu kontak
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={labelSt}><MessageSquare size={14} style={{ marginRight:4 }} />Tujuan / Catatan (opsional)</label>
              <textarea style={{ ...inputFull, height:82, resize:'none', borderColor: focusedField === 'deskripsi' ? BLUE : 'rgba(29,78,216,0.10)' }} value={deskripsi} onChange={e => setDeskripsi(e.target.value)} placeholder="Jelaskan tujuan bergabung dan kontribusi yang dapat diberikan..." onFocus={() => setFocusedField('deskripsi')} onBlur={() => setFocusedField(null)} />
            </div>

            <button onClick={daftar} disabled={submitting} style={{ ...btnPrimary, width:'100%', height:50, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: submitting ? 0.7 : 1 }} className="btn-hover">
              {submitting ? (
                <>
                  <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                  Mendaftar...
                </>
              ) : (
                <><Send size={18} /> Daftar Sekarang</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      @keyframes fadeUp { from { opacity:0; transform: translateY(16px); filter: blur(3px);} to { opacity:1; transform: translateY(0); filter: blur(0);} }
      @keyframes spin { to { transform: rotate(360deg); } }
      .fld { animation: fadeUp 0.55s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
    `}</style>
  );
}

const pageStyle: React.CSSProperties = { minHeight:'100vh', background:'linear-gradient(180deg,#f7f9fc,#eef2f8)', fontFamily:FONT, padding:'1.5rem', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'2.5rem' };
const containerStyle: React.CSSProperties = { width:'100%', maxWidth:560, background:'#fff', borderRadius:24, padding:'1.9rem', border:'1px solid rgba(29,78,216,0.08)', boxShadow:'0 20px 60px -30px rgba(15,23,42,0.25)' };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:18, padding:5 };
const coreStyle: React.CSSProperties = { background:'#f8fafc', borderRadius:14, padding:'1.15rem 1.3rem' };
const pillTag = (bg: string, color: string): React.CSSProperties => ({ fontSize:10, fontWeight:700, padding:'4px 12px', borderRadius:100, background:bg, color, display:'flex', alignItems:'center', gap:5 });
const labelSt: React.CSSProperties = { display:'flex', alignItems:'center', fontSize:12, fontWeight:600, color:'#334155', marginBottom:6 };
const inputFull: React.CSSProperties = { width:'100%', padding:'11px 14px', borderRadius:11, borderWidth:1.5, borderStyle:'solid', fontSize:14, fontFamily:FONT, boxSizing:'border-box', background:'#f8fafc', outline:'none' };
const btnPrimary: React.CSSProperties = { padding:'11px 22px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:`0 8px 20px -8px ${BLUE}60` };
const btnSm: React.CSSProperties = { padding:'11px 18px', borderRadius:12, border:'1.5px solid rgba(29,78,216,0.10)', background:'#fff', color:'#334155', fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:FONT };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:13, color, background:bg, padding:'11px 15px', borderRadius:11, marginBottom:15 });
const mouBox: React.CSSProperties = { marginTop:14, background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'12px 15px' };