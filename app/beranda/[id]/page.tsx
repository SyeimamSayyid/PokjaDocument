'use client';

import { useEffect, useState, use } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Building,
  FileText,
  Tag,
  Clock,
  PlayCircle,
  CheckCircle,
  Image,
  X,
  Info,
  Check,
  List,
  CalendarDays,
  Eye,
  FileCheck,
  Home,
  Users,
  Award,
  Download,
  ZoomIn,
  Maximize2,
  Minimize2,
  Grid,
  List as ListIcon,
  FolderOpen,
  ChevronLeft,
  Pause,
  Play
} from 'lucide-react';

interface KegiatanDetail {
  id: string; idDokumen: string; jenis: string; judul: string;
  namaMitra: string; statusPublikasi: string;
  tanggalKegiatan: string; tempatKegiatan: string;
  poinDipilih: string[]; narasi: string; tglDibuat: string;
  divisi?: string; divisiLabel?: string;
  foto: { fileId: string; thumbnailUrl: string; nama: string; ukuran: number }[];
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'akan-berlangsung': { 
    label: 'Akan Berlangsung', 
    color: '#0C447C', 
    bg: '#E6F1FB',
    icon: Clock
  },
  'berlangsung': { 
    label: 'Sedang Berlangsung', 
    color: '#065F46', 
    bg: '#D1FAE5',
    icon: PlayCircle
  },
  'telah-berlangsung': {
    label: 'Telah Berlangsung', 
    color: '#065F46', 
    bg: '#A7F3D0',
    icon: CheckCircle
  },
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
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null);
  
  // State untuk slideshow
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSlideshowActive, setIsSlideshowActive] = useState(true);
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

  // Auto-slide effect
  useEffect(() => {
    if (!item || item.foto.length === 0 || isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % item.foto.length);
    }, 3000); // Ganti setiap 3 detik

    return () => clearInterval(interval);
  }, [item, isPaused]);

  // Reset slide index when item changes
  useEffect(() => {
    setCurrentSlideIndex(0);
    setIsPaused(false);
  }, [item]);

  const goToSlide = (index: number) => {
    if (item) {
      setCurrentSlideIndex(index);
      setIsPaused(true);
      // Resume setelah 5 detik tidak ada interaksi
      setTimeout(() => {
        setIsPaused(false);
      }, 5000);
    }
  };

  const goToPrevSlide = () => {
    if (item) {
      setCurrentSlideIndex((prev) => (prev - 1 + item.foto.length) % item.foto.length);
      setIsPaused(true);
      setTimeout(() => {
        setIsPaused(false);
      }, 5000);
    }
  };

  const goToNextSlide = () => {
    if (item) {
      setCurrentSlideIndex((prev) => (prev + 1) % item.foto.length);
      setIsPaused(true);
      setTimeout(() => {
        setIsPaused(false);
      }, 5000);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  if (loading) return (
    <div style={{ 
      minHeight:'100vh', 
      display:'flex', 
      flexDirection:'column',
      alignItems:'center', 
      justifyContent:'center', 
      fontFamily:'sans-serif', 
      color:'#6b7280',
      gap:16
    }}>
      <div style={{
        width:40,
        height:40,
        border:'3px solid #f3f4f6',
        borderTop:'3px solid #0F6E56',
        borderRadius:'50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <div style={{ fontSize:14 }}>Memuat detail kegiatan...</div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (error || !item) return (
    <div style={{ 
      minHeight:'100vh', 
      display:'flex', 
      flexDirection:'column', 
      alignItems:'center', 
      justifyContent:'center', 
      fontFamily:'sans-serif', 
      color:'#A32D2D',
      padding:'2rem'
    }}>
      <div style={{ 
        fontSize:56, 
        marginBottom:16,
        opacity:0.7
      }}>
        <FileText size={56} style={{ color:'#fca5a5' }} />
      </div>
      <div style={{ fontSize:16, fontWeight:600 }}>{error || 'Kegiatan tidak ditemukan.'}</div>
      <a 
        href="/beranda" 
        style={{ 
          marginTop:16, 
          color:'#0F6E56', 
          textDecoration:'none', 
          fontSize:13,
          display:'flex',
          alignItems:'center',
          gap:6,
          padding:'8px 16px',
          borderRadius:8,
          background:'#F0FDF4',
          transition: 'all .2s ease'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#D1FAE5';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#F0FDF4';
        }}
      >
        <ArrowLeft size={16} />
        Kembali ke Beranda
      </a>
    </div>
  );

  const st = STATUS_LABEL[item.statusPublikasi] || STATUS_LABEL['berlangsung'];
  const StatusIcon = st.icon;
  const hasPhotos = item.foto.length > 0;

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafb', fontFamily:'sans-serif' }}>

      {/* Navbar */}
      <nav style={{ 
        background:'#fff', 
        borderBottom:'1px solid #e5e7eb', 
        padding:'12px 24px', 
        display:'flex', 
        alignItems:'center', 
        gap:12, 
        position:'sticky', 
        top:0, 
        zIndex:100,
        boxShadow:'0 1px 3px rgba(0,0,0,.04)'
      }}>
        <a 
          href="/beranda" 
          style={{ 
            fontSize:12, 
            color:'#6b7280', 
            textDecoration:'none',
            display:'flex',
            alignItems:'center',
            gap:6,
            padding:'4px 8px',
            borderRadius:6,
            transition: 'all .2s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <ArrowLeft size={14} />
          Beranda
        </a>
        <span style={{ color:'#e5e7eb' }}>|</span>
        <span style={{ fontSize:12, color:'#9ca3af', display:'flex', alignItems:'center', gap:6 }}>
          <FileText size={14} />
          Detail Kegiatan
        </span>
        <span style={{ flex:1 }} />
        <span style={{ 
          fontSize:10, 
          color:'#9ca3af',
          display:'flex',
          alignItems:'center',
          gap:4
        }}>
          <Eye size={12} />
          Publik
        </span>
      </nav>

      <div style={{ maxWidth:760, margin:'0 auto', padding:'1.5rem 1.25rem' }}>

        {/* Header dengan animasi */}
        <div style={{ 
          marginBottom:24,
          animation: 'fadeInUp 0.5s ease-out'
        }}>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <span style={{ 
              fontSize:11, 
              fontWeight:600, 
              padding:'4px 14px', 
              borderRadius:100, 
              background:item.jenis==='MOU'?'#E6F1FB':'#FAEEDA', 
              color:item.jenis==='MOU'?'#0C447C':'#854F0B',
              display:'flex',
              alignItems:'center',
              gap:4
            }}>
              <FileCheck size={12} />
              {item.jenis}
            </span>
            {item.divisi && (
              <span style={{ 
                fontSize:11, 
                fontWeight:600, 
                padding:'4px 14px', 
                borderRadius:100, 
                background:'#EDE9FE', 
                color:'#5B21B6',
                display:'flex',
                alignItems:'center',
                gap:4
              }}>
                <Tag size={12} />
                {item.divisiLabel || item.divisi}
              </span>
            )}
            <span style={{ 
              fontSize:11, 
              fontWeight:600, 
              padding:'4px 14px', 
              borderRadius:100, 
              background:st.bg, 
              color:st.color,
              display:'flex',
              alignItems:'center',
              gap:4
            }}>
              <StatusIcon size={12} />
              {st.label}
            </span>
          </div>

          <h1 style={{ 
            fontSize:24, 
            fontWeight:700, 
            lineHeight:1.3, 
            marginBottom:10, 
            color:'#1a1a2e'
          }}>
            Kerja Sama {item.jenis}: {item.namaMitra}
          </h1>

          <div style={{ 
            display:'flex', 
            gap:16, 
            fontSize:13, 
            color:'#6b7280', 
            flexWrap:'wrap',
            background:'#fff',
            padding:'10px 16px',
            borderRadius:10,
            border:'1px solid #e5e7eb'
          }}>
            {item.tanggalKegiatan && (
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <CalendarDays size={16} />
                {formatTanggal(item.tanggalKegiatan)}
              </span>
            )}
            {item.tempatKegiatan && (
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <MapPin size={16} />
                {item.tempatKegiatan}
              </span>
            )}
            <span style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Building size={16} />
              {item.namaMitra}
            </span>
          </div>
        </div>

        {/* Narasi */}
        <div style={{ 
          background:'#fff', 
          borderRadius:14, 
          padding:'1.5rem', 
          border:'1px solid #e5e7eb', 
          marginBottom:18,
          boxShadow:'0 1px 4px rgba(0,0,0,.04)',
          transition: 'all .3s ease',
          animation: 'fadeInUp 0.5s ease-out 0.05s both'
        }}>
          <div style={{ 
            fontSize:11, 
            fontWeight:600, 
            color:'#6b7280', 
            textTransform:'uppercase', 
            letterSpacing:0.8, 
            marginBottom:12,
            display:'flex',
            alignItems:'center',
            gap:8
          }}>
            <FileText size={16} />
            Narasi Kegiatan
          </div>
          <p style={{ 
            fontSize:14, 
            lineHeight:1.8, 
            color:'#374151', 
            margin:0
          }}>
            {item.narasi}
          </p>
        </div>

        {/* Poin */}
        <div style={{ 
          background:'#fff', 
          borderRadius:14, 
          padding:'1.5rem', 
          border:'1px solid #e5e7eb', 
          marginBottom:18,
          boxShadow:'0 1px 4px rgba(0,0,0,.04)',
          animation: 'fadeInUp 0.5s ease-out 0.1s both'
        }}>
          <div style={{ 
            fontSize:11, 
            fontWeight:600, 
            color:'#6b7280', 
            textTransform:'uppercase', 
            letterSpacing:0.8, 
            marginBottom:12,
            display:'flex',
            alignItems:'center',
            gap:8
          }}>
            <List size={16} />
            {item.statusPublikasi === 'telah-berlangsung' ? 'Kegiatan yang Terlaksana' : 'Rangkaian Kegiatan'}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {item.poinDipilih.map((p, i) => (
              <div 
                key={i} 
                style={{ 
                  display:'flex', 
                  gap:12, 
                  fontSize:14, 
                  color:'#374151', 
                  lineHeight:1.6, 
                  padding:'10px 14px', 
                  background:'#f9fafb', 
                  borderRadius:8,
                  transition: 'all .2s ease',
                  animation: `fadeInUp 0.3s ease-out ${0.1 + i * 0.05}s both`
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                }}
              >
                <span style={{ 
                  color:'#0F6E56', 
                  fontWeight:700, 
                  flexShrink:0,
                  marginTop:2
                }}>
                  <Check size={16} />
                </span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Foto kegiatan dengan Slideshow */}
        {hasPhotos && (
          <div style={{ 
            background:'#fff', 
            borderRadius:14, 
            padding:'1.5rem', 
            border:'1px solid #e5e7eb', 
            marginBottom:18,
            boxShadow:'0 1px 4px rgba(0,0,0,.04)',
            animation: 'fadeInUp 0.5s ease-out 0.15s both',
            overflow:'hidden'
          }}>
            <div style={{ 
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center',
              marginBottom:14
            }}>
              <div style={{ 
                fontSize:11, 
                fontWeight:600, 
                color:'#6b7280', 
                textTransform:'uppercase', 
                letterSpacing:0.8,
                display:'flex',
                alignItems:'center',
                gap:8
              }}>
                <Image size={16} />
                Dokumentasi Kegiatan
                <span style={{ 
                  fontSize:10, 
                  background:'#f3f4f6', 
                  padding:'2px 8px', 
                  borderRadius:100,
                  color:'#6b7280'
                }}>
                  {item.foto.length} foto
                </span>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button
                  onClick={togglePause}
                  style={{
                    padding:'4px 10px',
                    borderRadius:6,
                    border:'1px solid #e5e7eb',
                    background:'#fff',
                    fontSize:11,
                    color:'#6b7280',
                    cursor:'pointer',
                    display:'flex',
                    alignItems:'center',
                    gap:4,
                    transition: 'all .2s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#fff';
                  }}
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  {isPaused ? 'Lanjut' : 'Jeda'}
                </button>
                <span style={{ 
                  fontSize:10, 
                  color:'#9ca3af',
                  display:'flex',
                  alignItems:'center',
                  background:'#f9fafb',
                  padding:'4px 10px',
                  borderRadius:6
                }}>
                  {currentSlideIndex + 1} / {item.foto.length}
                </span>
              </div>
            </div>

            {/* Slideshow Container */}
            <div style={{ 
              position:'relative',
              borderRadius:10,
              overflow:'hidden',
              background:'#f3f4f6',
              marginBottom:12
            }}>
              <div style={{
                position:'relative',
                width:'100%',
                paddingBottom:'66.67%', // 3:2 aspect ratio
                overflow:'hidden'
              }}>
                {item.foto.map((f, index) => (
                  <div
                    key={f.fileId}
                    style={{
                      position:'absolute',
                      top:0,
                      left:0,
                      width:'100%',
                      height:'100%',
                      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: index === currentSlideIndex ? 'translateX(0)' : index < currentSlideIndex ? 'translateX(-100%)' : 'translateX(100%)',
                      opacity: index === currentSlideIndex ? 1 : 0,
                      cursor: 'pointer'
                    }}
                    onClick={() => setLightbox(`/api/foto/${f.fileId}`)}
                  >
                    <img
                      src={f.thumbnailUrl}
                      alt={f.nama}
                      style={{
                        width:'100%',
                        height:'100%',
                        objectFit:'cover',
                        display:'block'
                      }}
                    />
                    <div style={{
                      position:'absolute',
                      bottom:0,
                      left:0,
                      right:0,
                      padding:'12px 16px',
                      background:'linear-gradient(transparent, rgba(0,0,0,0.6))',
                      color:'#fff',
                      fontSize:12,
                      display:'flex',
                      justifyContent:'space-between',
                      alignItems:'center'
                    }}>
                      <span style={{ 
                        maxWidth:'70%',
                        overflow:'hidden',
                        textOverflow:'ellipsis',
                        whiteSpace:'nowrap'
                      }}>
                        {f.nama}
                      </span>
                      <span style={{ 
                        background:'rgba(255,255,255,0.2)',
                        padding:'2px 10px',
                        borderRadius:4,
                        fontSize:10,
                        backdropFilter:'blur(4px)'
                      }}>
                        {formatBytes(f.ukuran)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              {item.foto.length > 1 && (
                <>
                  <button
                    onClick={goToPrevSlide}
                    style={{
                      position:'absolute',
                      left:12,
                      top:'50%',
                      transform:'translateY(-50%)',
                      width:36,
                      height:36,
                      borderRadius:'50%',
                      background:'rgba(255,255,255,0.9)',
                      border:'none',
                      cursor:'pointer',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
                      transition: 'all .2s ease',
                      backdropFilter:'blur(4px)',
                      zIndex:2
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#fff';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.9)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1)';
                    }}
                  >
                    <ChevronLeft size={18} style={{ color:'#374151' }} />
                  </button>
                  <button
                    onClick={goToNextSlide}
                    style={{
                      position:'absolute',
                      right:12,
                      top:'50%',
                      transform:'translateY(-50%)',
                      width:36,
                      height:36,
                      borderRadius:'50%',
                      background:'rgba(255,255,255,0.9)',
                      border:'none',
                      cursor:'pointer',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
                      transition: 'all .2s ease',
                      backdropFilter:'blur(4px)',
                      zIndex:2
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#fff';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.9)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1)';
                    }}
                  >
                    <ChevronRight size={18} style={{ color:'#374151' }} />
                  </button>
                </>
              )}

              {/* Progress Indicators */}
              {item.foto.length > 1 && (
                <div style={{
                  position:'absolute',
                  bottom:48,
                  left:'50%',
                  transform:'translateX(-50%)',
                  display:'flex',
                  gap:6,
                  zIndex:2
                }}>
                  {item.foto.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      style={{
                        width: index === currentSlideIndex ? 24 : 8,
                        height:8,
                        borderRadius:4,
                        border:'none',
                        background: index === currentSlideIndex ? '#0F6E56' : 'rgba(255,255,255,0.5)',
                        cursor:'pointer',
                        transition: 'all 0.4s ease',
                        padding:0
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail Grid */}
            <div style={{
              display:'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
              gap:6,
              maxHeight:120,
              overflowY:'auto',
              padding:'4px 0'
            }}>
              {item.foto.map((f, index) => (
                <div
                  key={f.fileId}
                  onClick={() => goToSlide(index)}
                  style={{
                    borderRadius:6,
                    overflow:'hidden',
                    border: index === currentSlideIndex ? '2px solid #0F6E56' : '2px solid transparent',
                    cursor:'pointer',
                    transition: 'all .2s ease',
                    opacity: index === currentSlideIndex ? 1 : 0.6,
                    position:'relative',
                    aspectRatio:'1/1'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = index === currentSlideIndex ? '1' : '0.6';
                  }}
                >
                  <img
                    src={f.thumbnailUrl}
                    alt={f.nama}
                    style={{
                      width:'100%',
                      height:'100%',
                      objectFit:'cover',
                      display:'block'
                    }}
                  />
                  {index === currentSlideIndex && (
                    <div style={{
                      position:'absolute',
                      top:2,
                      right:2,
                      background:'#0F6E56',
                      color:'#fff',
                      fontSize:8,
                      padding:'1px 6px',
                      borderRadius:4
                    }}>
                      aktif
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div style={{ 
          fontSize:12, 
          color:'#9ca3af', 
          textAlign:'center', 
          padding:'1.5rem', 
          borderTop:'1px solid #e5e7eb',
          lineHeight:1.8,
          animation: 'fadeInUp 0.5s ease-out 0.2s both'
        }}>
          <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:4 }}>
            <Info size={14} />
            <span>Informasi ini dipublikasikan sebagai bentuk transparansi kegiatan kerja sama</span>
          </div>
          <div style={{ fontWeight:500, color:'#6b7280' }}>
            BNN Provinsi Sulawesi Selatan — SI-POKJA HUMKER
          </div>
        </div>
      </div>

      {/* Lightbox dengan animasi */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ 
            position:'fixed', 
            inset:0, 
            background:'rgba(0,0,0,.92)', 
            display:'flex', 
            alignItems:'center', 
            justifyContent:'center', 
            zIndex:999, 
            padding:'1.5rem',
            animation: 'fadeIn 0.25s ease-out',
            backdropFilter:'blur(8px)'
          }}
        >
          <img 
            src={lightbox} 
            alt="foto" 
            style={{ 
              maxWidth:'100%', 
              maxHeight:'90vh', 
              borderRadius:12, 
              objectFit:'contain',
              boxShadow:'0 20px 60px rgba(0,0,0,.5)',
              animation: 'scaleIn 0.3s ease-out'
            }} 
          />
          <button 
            onClick={() => setLightbox(null)} 
            style={{ 
              position:'fixed', 
              top:20, 
              right:20, 
              width:44, 
              height:44, 
              borderRadius:'50%', 
              background:'rgba(255,255,255,.15)', 
              color:'#fff', 
              border:'1px solid rgba(255,255,255,.2)',
              cursor:'pointer', 
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              transition: 'all .2s ease',
              backdropFilter:'blur(4px)'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.15)';
            }}
          >
            <X size={20} />
          </button>
          <div style={{
            position:'fixed',
            bottom:20,
            left:'50%',
            transform:'translateX(-50%)',
            color:'rgba(255,255,255,.5)',
            fontSize:11,
            background:'rgba(0,0,0,.4)',
            padding:'6px 16px',
            borderRadius:100,
            backdropFilter:'blur(4px)'
          }}>
            Klik di luar gambar untuk menutup
          </div>
        </div>
      )}

      {/* Animasi CSS */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
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
      `}</style>
    </div>
  );
}