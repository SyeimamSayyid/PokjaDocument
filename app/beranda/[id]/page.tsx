'use client';

import { useEffect, useState, use } from 'react';
import {
  ArrowLeft, ChevronRight, MapPin, Building, FileText, Tag, Clock,
  PlayCircle, CheckCircle, Image as ImageIcon, X, Info, Check, List,
  CalendarDays, Eye, FileCheck, ChevronLeft, Pause, Play,
} from 'lucide-react';

interface KegiatanDetail {
  id: string; idDokumen: string; jenis: string; judul: string;
  namaMitra: string; statusPublikasi: string;
  tanggalKegiatan: string; tglKegiatanSelesai?: string; tempatKegiatan: string;
  poinDipilih: string[]; narasi: string; tglDibuat: string;
  divisi?: string; divisiLabel?: string;
  foto: { fileId: string; thumbnailUrl: string; nama: string; ukuran: number }[];
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'akan-berlangsung': { label: 'Akan Berlangsung', color: BLUE_DARK, bg: '#DBEAFE', icon: Clock },
  'berlangsung':       { label: 'Sedang Berlangsung', color: BLUE, bg: '#DBEAFE', icon: PlayCircle },
  'telah-berlangsung': { label: 'Telah Berlangsung', color: '#334155', bg: '#eef2f6', icon: CheckCircle },
};

function formatTanggal(tgl: string) {
  if (!tgl) return '';
  try { return new Date(tgl).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return tgl; }
}
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1024/1024).toFixed(2)} MB`;
}

export default function BeritaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }           = use(params);
  const [item, setItem]  = useState<KegiatanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetch(`/api/beranda?id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.message) { setError(d.message); return; }
        setItem(d.item);
      })
      .catch(() => setError('Gagal memuat data.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!item || item.foto.length === 0 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % item.foto.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [item, isPaused]);

  useEffect(() => { setCurrentSlideIndex(0); setIsPaused(false); }, [item]);

  const goToSlide = (index: number) => {
    if (!item) return;
    setCurrentSlideIndex(index); setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };
  const goToPrevSlide = () => {
    if (!item) return;
    setCurrentSlideIndex((prev) => (prev - 1 + item.foto.length) % item.foto.length);
    setIsPaused(true); setTimeout(() => setIsPaused(false), 5000);
  };
  const goToNextSlide = () => {
    if (!item) return;
    setCurrentSlideIndex((prev) => (prev + 1) % item.foto.length);
    setIsPaused(true); setTimeout(() => setIsPaused(false), 5000);
  };
  const togglePause = () => setIsPaused(!isPaused);

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:38, height:38, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13.5 }}>Memuat detail kegiatan...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !item) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:FONT, color:'#A32D2D', padding:'2rem', textAlign:'center' }}>
      <FileText size={52} style={{ color:'#f7b4b4', marginBottom:16 }} />
      <div style={{ fontSize:16, fontWeight:700 }}>{error || 'Kegiatan tidak ditemukan.'}</div>
      <a href="/beranda" style={{ marginTop:16, color: BLUE, textDecoration:'none', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:100, background:'#EFF6FF', fontWeight:600 }} className="btn-hover">
        <ArrowLeft size={15} /> Kembali ke Beranda
      </a>
      <style>{`.btn-hover{transition:all .25s ease}.btn-hover:hover{filter:brightness(1.05)}`}</style>
    </div>
  );

  const st = STATUS_LABEL[item.statusPublikasi] || STATUS_LABEL['berlangsung'];
  const StatusIcon = st.icon;
  const hasPhotos = item.foto.length > 0;

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#f7f9fc,#eef2f8)', fontFamily: FONT }}>
      <GlobalStyle />

      <nav style={{ background:'rgba(255,255,255,0.75)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(29,78,216,0.06)', padding:'13px 22px', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:100 }}>
        <a href="/beranda" style={{ fontSize:12.5, color:'#64748b', textDecoration:'none', display:'flex', alignItems:'center', gap:6, fontWeight:600, padding:'5px 10px', borderRadius:8 }} className="btn-hover">
          <ArrowLeft size={14} /> Beranda
        </a>
        <span style={{ color:'rgba(29,78,216,0.15)' }}>|</span>
        <span style={{ fontSize:12, color:'#94a3b8', display:'flex', alignItems:'center', gap:6, fontWeight:500 }}>
          <FileText size={13} /> Detail Kegiatan
        </span>
        <span style={{ flex:1 }} />
        <span style={{ fontSize:10.5, color:'#94a3b8', display:'flex', alignItems:'center', gap:4, fontWeight:600 }}>
          <Eye size={12} /> Publik
        </span>
      </nav>

      <div style={{ maxWidth:760, margin:'0 auto', padding:'1.75rem 1.25rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom:20 }} className="fld">
          <div style={{ display:'flex', gap:7, marginBottom:13, flexWrap:'wrap' }}>
            <span style={pillTag(item.jenis==='MOU'?'#DBEAFE':'#FEF3C7', item.jenis==='MOU'?BLUE_DARK:'#92400E')}><FileCheck size={12} />{item.jenis}</span>
            {item.divisi && <span style={pillTag('#EDE9FE', '#5B21B6')}><Tag size={12} />{item.divisiLabel || item.divisi}</span>}
            <span style={pillTag(st.bg, st.color)}><StatusIcon size={12} />{st.label}</span>
          </div>

          <h1 style={{ fontSize:25, fontWeight:800, lineHeight:1.3, marginBottom:12, color:'#0f1f3d', letterSpacing:'-0.02em' }}>
            Kerja Sama {item.jenis}: {item.namaMitra}
          </h1>

          <div style={{ ...shellStyle }}>
            <div style={{ ...coreStyle, padding:'11px 17px', display:'flex', gap:16, fontSize:13, color:'#64748b', flexWrap:'wrap' }}>
              {item.tanggalKegiatan && (
                <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <CalendarDays size={15} style={{ color: BLUE }} />
                  {formatTanggal(item.tanggalKegiatan)}
                  {item.tglKegiatanSelesai && item.tglKegiatanSelesai !== item.tanggalKegiatan && <> – {formatTanggal(item.tglKegiatanSelesai)}</>}
                </span>
              )}
              {item.tempatKegiatan && <span style={{ display:'flex', alignItems:'center', gap:7 }}><MapPin size={15} style={{ color: BLUE }} />{item.tempatKegiatan}</span>}
              <span style={{ display:'flex', alignItems:'center', gap:7 }}><Building size={15} style={{ color: BLUE }} />{item.namaMitra}</span>
            </div>
          </div>
        </div>

        {/* Narasi */}
        <div style={{ ...shellStyle, marginBottom:16, animationDelay:'0.05s' }} className="fld">
          <div style={coreStyle}>
            <div style={sectionLabel}><FileText size={14} /> Narasi Kegiatan</div>
            <p style={{ fontSize:14, lineHeight:1.85, color:'#334155', margin:0 }}>{item.narasi}</p>
          </div>
        </div>

        {/* Poin */}
        <div style={{ ...shellStyle, marginBottom:16, animationDelay:'0.1s' }} className="fld">
          <div style={coreStyle}>
            <div style={sectionLabel}><List size={14} /> {item.statusPublikasi === 'telah-berlangsung' ? 'Kegiatan yang Terlaksana' : 'Rangkaian Kegiatan'}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {item.poinDipilih.map((p, i) => (
                <div key={i} style={{ display:'flex', gap:11, fontSize:13.5, color:'#334155', lineHeight:1.6, padding:'11px 14px', background:'#f8fafc', borderRadius:11 }}>
                  <Check size={16} style={{ color: BLUE, flexShrink:0, marginTop:1 }} />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Foto kegiatan — slideshow */}
        {hasPhotos && (
          <div style={{ ...shellStyle, marginBottom:16, animationDelay:'0.15s' }} className="fld">
            <div style={{ ...coreStyle, overflow:'hidden' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
                <div style={sectionLabel}>
                  <ImageIcon size={14} /> Dokumentasi Kegiatan
                  <span style={{ fontSize:10, background:'#eef2f6', padding:'2px 9px', borderRadius:100, color:'#64748b', textTransform:'none', letterSpacing:0, fontWeight:600 }}>{item.foto.length} foto</span>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={togglePause} style={miniBtn} className="btn-hover">
                    {isPaused ? <Play size={13} /> : <Pause size={13} />} {isPaused ? 'Lanjut' : 'Jeda'}
                  </button>
                  <span style={{ fontSize:10.5, color:'#94a3b8', display:'flex', alignItems:'center', background:'#f8fafc', padding:'5px 11px', borderRadius:8, fontWeight:600 }}>
                    {currentSlideIndex + 1} / {item.foto.length}
                  </span>
                </div>
              </div>

              <div style={{ position:'relative', borderRadius:14, overflow:'hidden', background:'#eef2f6', marginBottom:12 }}>
                <div style={{ position:'relative', width:'100%', paddingBottom:'66.67%', overflow:'hidden' }}>
                  {item.foto.map((f, index) => (
                    <div key={f.fileId}
                      style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', transition:'all 0.6s cubic-bezier(0.32,0.72,0,1)',
                        transform: index === currentSlideIndex ? 'translateX(0)' : index < currentSlideIndex ? 'translateX(-100%)' : 'translateX(100%)',
                        opacity: index === currentSlideIndex ? 1 : 0, cursor:'pointer' }}
                      onClick={() => setLightbox(`/api/foto/${f.fileId}`)}>
                      <img src={f.thumbnailUrl} alt={f.nama} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'13px 17px', background:'linear-gradient(transparent, rgba(15,23,42,0.7))', color:'#fff', fontSize:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ maxWidth:'70%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.nama}</span>
                        <span style={{ background:'rgba(255,255,255,0.22)', padding:'2px 10px', borderRadius:6, fontSize:10, backdropFilter:'blur(4px)' }}>{formatBytes(f.ukuran)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {item.foto.length > 1 && (
                  <>
                    <button onClick={goToPrevSlide} style={{ ...navArrow, left:12 }} className="btn-hover"><ChevronLeft size={18} style={{ color: BLUE_DARK }} /></button>
                    <button onClick={goToNextSlide} style={{ ...navArrow, right:12 }} className="btn-hover"><ChevronRight size={18} style={{ color: BLUE_DARK }} /></button>
                  </>
                )}

                {item.foto.length > 1 && (
                  <div style={{ position:'absolute', bottom:50, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, zIndex:2 }}>
                    {item.foto.map((_, index) => (
                      <button key={index} onClick={() => goToSlide(index)}
                        style={{ width: index === currentSlideIndex ? 24 : 8, height:8, borderRadius:4, border:'none', background: index === currentSlideIndex ? '#fff' : 'rgba(255,255,255,0.5)', cursor:'pointer', transition:'all 0.4s cubic-bezier(0.32,0.72,0,1)', padding:0 }} />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(68px, 1fr))', gap:7, maxHeight:120, overflowY:'auto', padding:'2px' }}>
                {item.foto.map((f, index) => (
                  <div key={f.fileId} onClick={() => goToSlide(index)}
                    style={{ borderRadius:9, overflow:'hidden', border: index === currentSlideIndex ? `2px solid ${BLUE}` : '2px solid transparent', cursor:'pointer', transition:'all .25s ease', opacity: index === currentSlideIndex ? 1 : 0.55, position:'relative', aspectRatio:'1/1' }}
                    className="thumb-hover">
                    <img src={f.thumbnailUrl} alt={f.nama} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                    {index === currentSlideIndex && (
                      <div style={{ position:'absolute', top:3, right:3, background: BLUE, color:'#fff', fontSize:8, padding:'1px 6px', borderRadius:5, fontWeight:700 }}>aktif</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div style={{ fontSize:11.5, color:'#94a3b8', textAlign:'center', padding:'1.5rem 1rem', borderTop:'1px solid rgba(29,78,216,0.08)', lineHeight:1.8 }} className="fld">
          <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:5 }}>
            <Info size={13} />
            <span>Informasi ini dipublikasikan sebagai bentuk transparansi kegiatan kerja sama</span>
          </div>
          <div style={{ fontWeight:600, color:'#64748b' }}>BNN Provinsi Sulawesi Selatan — E-POKJA HUKER</div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position:'fixed', inset:0, background:'rgba(10,15,25,.94)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:'1.5rem', backdropFilter:'blur(8px)' }} className="fadein">
          <img src={lightbox} alt="foto" style={{ maxWidth:'100%', maxHeight:'90vh', borderRadius:14, objectFit:'contain', boxShadow:'0 24px 70px rgba(0,0,0,.5)' }} className="scalein" />
          <button onClick={() => setLightbox(null)} style={{ position:'fixed', top:20, right:20, width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,.14)', color:'#fff', border:'1px solid rgba(255,255,255,.2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }} className="btn-hover">
            <X size={20} />
          </button>
          <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,.55)', fontSize:11, background:'rgba(0,0,0,.4)', padding:'6px 16px', borderRadius:100, backdropFilter:'blur(4px)' }}>
            Klik di luar gambar untuk menutup
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
      @keyframes fadeUp { from { opacity:0; transform: translateY(16px); filter: blur(3px);} to { opacity:1; transform: translateY(0); filter: blur(0);} }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      @keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
      @keyframes spin { to { transform: rotate(360deg); } }
      .fld { animation: fadeUp 0.55s cubic-bezier(0.32,0.72,0,1) both; }
      .fadein { animation: fadeIn 0.25s ease-out; }
      .scalein { animation: scaleIn 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
      .thumb-hover:hover { opacity: 1 !important; }
    `}</style>
  );
}

const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:19, padding:5, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, padding:'1.35rem 1.5rem', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const pillTag = (bg: string, color: string): React.CSSProperties => ({ fontSize:11, fontWeight:700, padding:'5px 14px', borderRadius:100, background:bg, color, display:'flex', alignItems:'center', gap:5 });
const sectionLabel: React.CSSProperties = { fontSize:10.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:13, display:'flex', alignItems:'center', gap:8 };
const miniBtn: React.CSSProperties = { padding:'5px 11px', borderRadius:8, border:'1px solid rgba(29,78,216,0.10)', background:'#fff', fontSize:11, color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:FONT, fontWeight:600 };
const navArrow: React.CSSProperties = { position:'absolute', top:'50%', transform:'translateY(-50%)', width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,0.92)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(15,23,42,0.15)', backdropFilter:'blur(4px)', zIndex:2 };