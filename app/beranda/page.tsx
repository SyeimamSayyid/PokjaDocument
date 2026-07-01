'use client';

import { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  PlayCircle,
  CheckCircle,
  Filter,
  Users,
  MapPin,
  CalendarDays,
  DollarSign,
  Tag,
  FileText,
  Image,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  Activity,
  Briefcase,
  Layers,
  PlusCircle,
  FileCheck,
  LogIn,
  Menu,
  X as XIcon
} from 'lucide-react';

interface KegiatanPublik {
  id: string; idDokumen: string; jenis: string; judul: string;
  namaMitra: string; statusPublikasi: string; tanggalKegiatan: string;
  tempatKegiatan: string; poinDipilih: string[]; narasi: string;
  divisi: string; divisiLabel: string;
  foto: { fileId: string; thumbnailUrl: string; nama: string }[];
}

interface AkanDatang {
  id: string; divisi: string; divisiLabel: string; judul: string;
  deskripsi: string; jenis: string; target: number; terisi: number;
  sisaKuota: number; wilayah: string; biaya: string;
  tglMulai: string; tglTarget: string; status: string; kuotaPenuh: boolean;
}

const TABS = [
  { key: 'akan-datang',       label: 'Akan Datang',      icon: Calendar, color: '#5B21B6', bg: '#EDE9FE' },
  { key: 'akan-berlangsung',  label: 'Akan Berlangsung', icon: Clock, color: '#0C447C', bg: '#E6F1FB' },
  { key: 'berlangsung',       label: 'Berlangsung',      icon: PlayCircle, color: '#065F46', bg: '#D1FAE5' },
  { key: 'telah-berlangsung', label: 'Telah Selesai',    icon: CheckCircle, color: '#065F46', bg: '#A7F3D0' },
];

const DIVISI_LIST = [
  { key: 'pencegahan',    label: 'Pencegahan',    color: '#0C447C' },
  { key: 'pemberantasan', label: 'Pemberantasan', color: '#A32D2D' },
  { key: 'rehabilitasi',  label: 'Rehabilitasi',  color: '#5B21B6' },
  { key: 'pemberdayaan',  label: 'Pemberdayaan',  color: '#085041' },
];

function formatTanggal(t: string) {
  if (!t) return '';
  try { return new Date(t).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return t; }
}

export default function BerandaPage() {
  const [akanDatang, setAkanDatang]   = useState<AkanDatang[]>([]);
  const [data, setData]               = useState<Record<string, KegiatanPublik[]>>({});
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('akan-datang');
  const [filterDivisi, setFilterDivisi] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/beranda')
      .then(r => r.json())
      .then(d => {
        setAkanDatang(d.akanDatang || []);
        setData({
          'akan-berlangsung':  d.akanBerlangsung || [],
          'berlangsung':       d.berlangsung || [],
          'telah-berlangsung': d.telahBerlangsung || [],
        });
        if ((d.akanDatang||[]).length > 0) setActiveTab('akan-datang');
        else if ((d.berlangsung||[]).length > 0) setActiveTab('berlangsung');
        else if ((d.akanBerlangsung||[]).length > 0) setActiveTab('akan-berlangsung');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const matchDivisi = (dv: string) => !filterDivisi || dv === filterDivisi;
  const akanDatangFiltered = akanDatang.filter(k => matchDivisi(k.divisi));
  const tabListFiltered = (data[activeTab] || []).filter(item => matchDivisi(item.divisi));

  const counts: Record<string, number> = {
    'akan-datang': akanDatang.filter(k => matchDivisi(k.divisi)).length,
    'akan-berlangsung': (data['akan-berlangsung']||[]).filter(i => matchDivisi(i.divisi)).length,
    'berlangsung': (data['berlangsung']||[]).filter(i => matchDivisi(i.divisi)).length,
    'telah-berlangsung': (data['telah-berlangsung']||[]).filter(i => matchDivisi(i.divisi)).length,
  };

  const totalCount = Object.values(counts).reduce((a,b) => a + b, 0);

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafb', fontFamily:'sans-serif' }}>

      {/* Header dengan gradien dan animasi */}
      <div style={{ 
        background:'linear-gradient(135deg, #0F6E56 0%, #1a8f70 50%, #22a67e 100%)', 
        color:'#fff', 
        padding:'2.5rem 1.5rem 0', 
        textAlign:'center',
        position:'relative',
        overflow:'hidden'
      }}>
        {/* Dekorasi latar */}
        <div style={{
          position:'absolute',
          top:'-50%',
          right:'-20%',
          width:'60%',
          height:'200%',
          background:'rgba(255,255,255,0.05)',
          borderRadius:'50%',
          transform:'rotate(15deg)'
        }} />
        <div style={{
          position:'absolute',
          bottom:'-30%',
          left:'-10%',
          width:'40%',
          height:'150%',
          background:'rgba(255,255,255,0.03)',
          borderRadius:'50%'
        }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ 
            fontSize:11, 
            fontWeight:600, 
            opacity:.8, 
            marginBottom:6, 
            letterSpacing:2, 
            textTransform:'uppercase',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            gap:8
          }}>
            <Briefcase size={14} />
            BNN Provinsi Sulawesi Selatan
          </div>
          <h1 style={{ 
            fontSize:26, 
            fontWeight:800, 
            margin:'0 0 8px',
            background:'linear-gradient(to right, #fff, #e0f2ef)',
            WebkitBackgroundClip:'text',
            WebkitTextFillColor:'transparent'
          }}>
            Transparansi Kegiatan Kerja Sama
          </h1>
          <p style={{ fontSize:13, opacity:.85, maxWidth:480, margin:'0 auto 24px' }}>
            Informasi terkini program kerja sama P4GN bersama mitra institusi
          </p>

          {/* Statistik ringkas */}
          <div style={{ 
            display:'flex', 
            justifyContent:'center', 
            gap:24, 
            marginBottom:20,
            flexWrap:'wrap'
          }}>
            <div style={{ 
              background:'rgba(255,255,255,0.12)',
              backdropFilter:'blur(8px)',
              borderRadius:12,
              padding:'8px 16px',
              display:'flex',
              alignItems:'center',
              gap:8
            }}>
              <Layers size={16} opacity={0.8} />
              <span style={{ fontSize:13, fontWeight:500 }}>{totalCount} Total Kegiatan</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ 
            display:'flex', 
            justifyContent:'center', 
            gap:4, 
            padding:'4px', 
            background:'rgba(0,0,0,.15)', 
            borderRadius:14, 
            maxWidth:680, 
            margin:'0 auto', 
            width:'fit-content', 
            flexWrap:'wrap',
            backdropFilter:'blur(4px)'
          }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.key} 
                  onClick={() => setActiveTab(tab.key)} 
                  style={{
                    padding:'10px 18px', 
                    borderRadius:10, 
                    border:'none', 
                    cursor:'pointer', 
                    fontFamily:'sans-serif',
                    fontSize:13, 
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? '#fff' : 'transparent',
                    color: isActive ? '#0F6E56' : 'rgba(255,255,255,.85)',
                    display:'flex', 
                    alignItems:'center', 
                    gap:8, 
                    whiteSpace:'nowrap', 
                    transition:'all .3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,.15)' : 'none',
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span style={{ 
                      fontSize:10, 
                      padding:'1px 8px', 
                      borderRadius:100, 
                      background: isActive ? '#E1F5EE' : 'rgba(255,255,255,.2)', 
                      color: isActive ? '#0F6E56' : '#fff',
                      transition: 'all .3s'
                    }}>
                      {counts[tab.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ height:16 }}></div>
        </div>
      </div>

      {/* Filter Divisi dengan animasi */}
      <div style={{ 
        maxWidth:860, 
        margin:'0 auto', 
        padding:'1.25rem 1.25rem 0',
        animation: 'slideDown 0.4s ease-out'
      }}>
        <div style={{ 
          display:'flex', 
          gap:8, 
          flexWrap:'wrap', 
          alignItems:'center',
          padding:'8px 12px',
          background:'#fff',
          borderRadius:12,
          border:'1px solid #e5e7eb',
          boxShadow:'0 1px 3px rgba(0,0,0,.04)'
        }}>
          <Filter size={16} style={{ color:'#6b7280', marginRight:4 }} />
          <span style={{ fontSize:12, color:'#6b7280', fontWeight:500 }}>Divisi:</span>
          <button 
            onClick={() => setFilterDivisi('')} 
            style={{
              ...chip(filterDivisi === '', '#374151'),
              transition: 'all .2s ease'
            }}
          >
            Semua
          </button>
          {DIVISI_LIST.map(dv => (
            <button 
              key={dv.key} 
              onClick={() => setFilterDivisi(dv.key)} 
              style={{
                ...chip(filterDivisi === dv.key, dv.color),
                transition: 'all .2s ease'
              }}
            >
              {dv.label}
            </button>
          ))}
        </div>
      </div>

      {/* Konten Utama */}
      <div style={{ maxWidth:860, margin:'0 auto', padding:'1rem 1.25rem' }}>
        {loading ? (
          <div style={{ 
            textAlign:'center', 
            padding:'3rem', 
            color:'#9ca3af',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
            <div style={{ fontSize:14, fontWeight:500 }}>Memuat data...</div>
          </div>
        ) : activeTab === 'akan-datang' ? (
          akanDatangFiltered.length === 0 ? (
            <div style={{ 
              textAlign:'center', 
              padding:'3.5rem 2rem',
              background:'#fff',
              borderRadius:16,
              border:'1px solid #e5e7eb',
              boxShadow:'0 1px 4px rgba(0,0,0,.04)'
            }}>
              <div style={{ 
                fontSize:48, 
                marginBottom:16,
                opacity:0.6
              }}>
                <Calendar size={48} style={{ margin:'0 auto', color:'#d1d5db' }} />
              </div>
              <div style={{ fontSize:16, fontWeight:600, color:'#374151', marginBottom:4 }}>Belum ada kegiatan terbuka</div>
              <div style={{ fontSize:13, color:'#9ca3af' }}>Kegiatan yang membuka pendaftaran mitra akan ditampilkan di sini.</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {akanDatangFiltered.map((k, index) => (
                <div 
                  key={k.id} 
                  style={{
                    ...beritaCard,
                    animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
                  }}
                  onMouseEnter={() => setHoveredCard(k.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                    <span style={{ 
                      fontSize:10, 
                      fontWeight:600, 
                      padding:'4px 12px', 
                      borderRadius:100, 
                      background:'#EDE9FE', 
                      color:'#5B21B6',
                      display:'flex',
                      alignItems:'center',
                      gap:4
                    }}>
                      <Tag size={12} />
                      {k.divisiLabel}
                    </span>
                    <span style={{ 
                      fontSize:10, 
                      fontWeight:600, 
                      padding:'4px 12px', 
                      borderRadius:100, 
                      background:k.jenis==='MOU'?'#E6F1FB':'#FAEEDA', 
                      color:k.jenis==='MOU'?'#0C447C':'#854F0B',
                      display:'flex',
                      alignItems:'center',
                      gap:4
                    }}>
                      <FileText size={12} />
                      {k.jenis}
                    </span>
                    <span style={{ 
                      fontSize:10, 
                      fontWeight:600, 
                      padding:'4px 12px', 
                      borderRadius:100, 
                      background:'#D1FAE5', 
                      color:'#065F46',
                      display:'flex',
                      alignItems:'center',
                      gap:4
                    }}>
                      <Calendar size={12} />
                      Pendaftaran Terbuka
                    </span>
                  </div>

                  <div style={{ fontSize:18, fontWeight:700, marginBottom:6, lineHeight:1.4, color:'#1a1a2e' }}>{k.judul}</div>
                  {k.deskripsi && (
                    <p style={{ 
                      fontSize:13, 
                      color:'#6b7280', 
                      lineHeight:1.7, 
                      margin:'0 0 12px',
                      display:'-webkit-box',
                      WebkitLineClamp:2,
                      WebkitBoxOrient:'vertical',
                      overflow:'hidden'
                    }}>
                      {k.deskripsi}
                    </p>
                  )}

                  <div style={{ 
                    display:'flex', 
                    gap:16, 
                    fontSize:12, 
                    color:'#6b7280', 
                    marginBottom:14, 
                    flexWrap:'wrap',
                    background:'#f9fafb',
                    padding:'8px 12px',
                    borderRadius:8
                  }}>
                    {k.wilayah && (
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <MapPin size={14} /> {k.wilayah}
                      </span>
                    )}
                    {k.tglMulai && (
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <CalendarDays size={14} /> {formatTanggal(k.tglMulai)}{k.tglTarget && ` – ${formatTanggal(k.tglTarget)}`}
                      </span>
                    )}
                    {k.biaya && (
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <DollarSign size={14} /> Rp {k.biaya}
                      </span>
                    )}
                  </div>

                  <div style={{ marginBottom:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
                      <span style={{ color:'#6b7280', display:'flex', alignItems:'center', gap:4 }}>
                        <Users size={14} /> Slot Tersedia
                      </span>
                      <span style={{ 
                        fontWeight:700, 
                        color: k.kuotaPenuh ? '#A32D2D' : '#0F6E56',
                        display:'flex',
                        alignItems:'center',
                        gap:4
                      }}>
                        {k.sisaKuota} dari {k.target} slot
                        {k.kuotaPenuh && <X size={14} />}
                      </span>
                    </div>
                    <div style={{ height:8, background:'#f3f4f6', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ 
                        height:'100%', 
                        width:`${k.target>0?Math.round((k.terisi/k.target)*100):0}%`, 
                        background: k.kuotaPenuh ? '#A32D2D' : '#0F6E56', 
                        borderRadius:4,
                        transition: 'width 0.8s ease'
                      }} />
                    </div>
                  </div>

                  {k.kuotaPenuh ? (
                    <div style={{ 
                      textAlign:'center', 
                      padding:'12px', 
                      background:'#FEF2F2', 
                      borderRadius:10, 
                      fontSize:13, 
                      color:'#A32D2D', 
                      fontWeight:600,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:8
                    }}>
                      <AlertCircle size={18} />
                      Kuota Penuh
                    </div>
                  ) : (
                    <a href={`/daftar-kegiatan/${k.id}`} style={{
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:8,
                      padding:'12px',
                      borderRadius:10,
                      background:'#0F6E56',
                      color:'#fff',
                      textDecoration:'none',
                      fontSize:14,
                      fontWeight:600,
                      transition: 'all .3s ease',
                      boxShadow: hoveredCard === k.id ? '0 4px 14px rgba(15,110,86,.35)' : 'none',
                      transform: hoveredCard === k.id ? 'translateY(-1px)' : 'none'
                    }}
                    onMouseEnter={() => setHoveredCard(k.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    >
                      <Check size={18} />
                      Daftar Sekarang
                      <ChevronRight size={16} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          (() => {
            const currentTab = TABS.find(t => t.key === activeTab);
            const Icon = currentTab?.icon || Calendar;
            
            if (tabListFiltered.length === 0) {
              return (
                <div style={{ 
                  textAlign:'center', 
                  padding:'3.5rem 2rem',
                  background:'#fff',
                  borderRadius:16,
                  border:'1px solid #e5e7eb',
                  boxShadow:'0 1px 4px rgba(0,0,0,.04)'
                }}>
                  <div style={{ 
                    fontSize:48, 
                    marginBottom:16,
                    opacity:0.6
                  }}>
                    <Icon size={48} style={{ margin:'0 auto', color:'#d1d5db' }} />
                  </div>
                  <div style={{ fontSize:16, fontWeight:600, color:'#374151' }}>Belum ada kegiatan</div>
                  <div style={{ fontSize:13, color:'#9ca3af' }}>Belum ada kegiatan untuk tab ini</div>
                </div>
              );
            }
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {tabListFiltered.map((item, index) => {
                  const tab = TABS.find(t => t.key === item.statusPublikasi);
                  const hasFoto = item.foto.length > 0;
                  const TabIcon = tab?.icon || Calendar;
                  
                  return (
                    <a 
                      key={item.id} 
                      href={`/beranda/${item.id}`} 
                      style={{ textDecoration:'none', color:'inherit', display:'block' }}
                    >
                      <div 
                        style={{ 
                          ...beritaCard, 
                          overflow:'hidden', 
                          padding:0, 
                          cursor:'pointer',
                          transition: 'all .35s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: hoveredCard === item.id ? '0 8px 30px rgba(0,0,0,.12)' : '0 1px 4px rgba(0,0,0,.04)',
                          transform: hoveredCard === item.id ? 'translateY(-4px)' : 'none'
                        }}
                        onMouseEnter={() => setHoveredCard(item.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        {hasFoto && (
                          <div style={{ 
                            display:'grid', 
                            gridTemplateColumns: item.foto.length>=3?'1fr 1fr 1fr':item.foto.length===2?'1fr 1fr':'1fr', 
                            height:200, 
                            background:'#e5e7eb', 
                            flexShrink:0,
                            overflow:'hidden'
                          }}>
                            {item.foto.slice(0,3).map((f,fi) => (
                              <div key={f.fileId} style={{ 
                                width:'100%', 
                                height:200, 
                                overflow:'hidden', 
                                borderRight: fi < Math.min(item.foto.length,3)-1 ? '2px solid #fff' : 'none',
                                position:'relative'
                              }}>
                                <img 
                                  src={f.thumbnailUrl} 
                                  alt={f.nama}
                                  style={{ 
                                    width:'100%', 
                                    height:'100%', 
                                    objectFit:'cover', 
                                    display:'block',
                                    transition: 'transform .5s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)';
                                  }}
                                />
                              </div>
                            ))}
                            {item.foto.length > 3 && (
                              <div style={{
                                position:'absolute',
                                bottom:8,
                                right:8,
                                background:'rgba(0,0,0,0.7)',
                                color:'#fff',
                                padding:'2px 10px',
                                borderRadius:100,
                                fontSize:11,
                                fontWeight:600
                              }}>
                                +{item.foto.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ padding:'1.25rem 1.5rem', background:'#fff', position:'relative' }}>
                          <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                            <span style={{ 
                              fontSize:10, 
                              fontWeight:600, 
                              padding:'4px 12px', 
                              borderRadius:100, 
                              background:item.jenis==='MOU'?'#E6F1FB':'#FAEEDA', 
                              color:item.jenis==='MOU'?'#0C447C':'#854F0B',
                              display:'flex',
                              alignItems:'center',
                              gap:4
                            }}>
                              <FileText size={12} />
                              {item.jenis}
                            </span>
                            {item.divisi && (
                              <span style={{ 
                                fontSize:10, 
                                fontWeight:600, 
                                padding:'4px 12px', 
                                borderRadius:100, 
                                background:'#EDE9FE', 
                                color:'#5B21B6',
                                display:'flex',
                                alignItems:'center',
                                gap:4
                              }}>
                                <Tag size={12} />
                                {item.divisiLabel}
                              </span>
                            )}
                            {tab && (
                              <span style={{ 
                                fontSize:10, 
                                fontWeight:600, 
                                padding:'4px 12px', 
                                borderRadius:100, 
                                background:tab.bg, 
                                color:tab.color,
                                display:'flex',
                                alignItems:'center',
                                gap:4
                              }}>
                                <TabIcon size={12} />
                                {tab.label}
                              </span>
                            )}
                          </div>
                          <div style={{ 
                            fontSize:17, 
                            fontWeight:700, 
                            marginBottom:6, 
                            lineHeight:1.4, 
                            color:'#1a1a2e'
                          }}>
                            Kerja Sama {item.jenis} dengan {item.namaMitra}
                          </div>
                          <div style={{ 
                            display:'flex', 
                            gap:16, 
                            fontSize:12, 
                            color:'#6b7280', 
                            marginBottom:12, 
                            flexWrap:'wrap',
                            background:'#f9fafb',
                            padding:'6px 12px',
                            borderRadius:6
                          }}>
                            {item.tanggalKegiatan && (
                              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <CalendarDays size={14} /> {formatTanggal(item.tanggalKegiatan)}
                              </span>
                            )}
                            {item.tempatKegiatan && (
                              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <MapPin size={14} /> {item.tempatKegiatan}
                              </span>
                            )}
                          </div>
                          <p style={{ 
                            fontSize:13, 
                            color:'#6b7280', 
                            lineHeight:1.7, 
                            margin:'0 0 12px', 
                            display:'-webkit-box', 
                            WebkitLineClamp:2, 
                            WebkitBoxOrient:'vertical', 
                            overflow:'hidden'
                          }}>
                            {item.narasi}
                          </p>
                          <div style={{ 
                            display:'flex', 
                            justifyContent:'flex-end',
                            alignItems:'center',
                            gap:6,
                            color:'#0F6E56',
                            fontWeight:600,
                            fontSize:13
                          }}>
                            Baca selengkapnya
                            <ChevronRight size={16} style={{ 
                              transition: 'transform .3s ease',
                              transform: hoveredCard === item.id ? 'translateX(4px)' : 'none'
                            }} />
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign:'center', 
        padding:'2rem', 
        fontSize:11, 
        color:'#9ca3af', 
        borderTop:'1px solid #e5e7eb', 
        marginTop:'2rem',
        background:'#fff'
      }}>
        <div style={{ fontWeight:500, marginBottom:4 }}>SI-POKJA HUMKER — BNN Provinsi Sulawesi Selatan</div>
        <div style={{ display:'flex', justifyContent:'center', gap:20, marginTop:10, flexWrap:'wrap' }}>
          <a href="/pengajuan" style={{ 
            color:'#0F6E56', 
            textDecoration:'none',
            display:'flex',
            alignItems:'center',
            gap:6,
            fontSize:12,
            fontWeight:500,
            padding:'4px 12px',
            borderRadius:6,
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
            <PlusCircle size={14} />
            Ajukan Kerja Sama
          </a>
          <a href="/cek-pengajuan" style={{ 
            color:'#0F6E56', 
            textDecoration:'none',
            display:'flex',
            alignItems:'center',
            gap:6,
            fontSize:12,
            fontWeight:500,
            padding:'4px 12px',
            borderRadius:6,
            background:'#EFF6FF',
            transition: 'all .2s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#DBEAFE';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#EFF6FF';
          }}
          >
            <FileCheck size={14} />
            Cek Status
          </a>
          <a href="/login" style={{ 
            color:'#6b7280', 
            textDecoration:'none',
            display:'flex',
            alignItems:'center',
            gap:6,
            fontSize:12,
            padding:'4px 12px',
            borderRadius:6,
            transition: 'all .2s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
          >
            <LogIn size={14} />
            Login Admin
          </a>
        </div>
      </div>

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
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

const beritaCard: React.CSSProperties = { 
  background:'#fff', 
  borderRadius:16, 
  padding:'1.25rem 1.5rem', 
  border:'1px solid #e5e7eb', 
  boxShadow:'0 1px 4px rgba(0,0,0,.04)', 
  transition:'all .35s cubic-bezier(0.4, 0, 0.2, 1)' 
};

const chip = (active: boolean, color: string): React.CSSProperties => ({
  padding:'5px 14px', 
  borderRadius:20, 
  border:'1px solid', 
  fontSize:11, 
  cursor:'pointer', 
  fontFamily:'sans-serif',
  fontWeight: active ? 600 : 400,
  background: active ? color : '#fff',
  color: active ? '#fff' : '#374151',
  borderColor: active ? 'transparent' : '#e5e7eb',
  display:'flex',
  alignItems:'center',
  gap:4,
});