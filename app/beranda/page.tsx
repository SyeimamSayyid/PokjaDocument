'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatbotWidget from '@/components/ChatbotWidget';
import {
  Calendar, Clock, PlayCircle, CheckCircle, Filter, Users, MapPin,
  CalendarDays, Tag, FileText, ChevronRight, AlertCircle, Check, X,
  Briefcase, Layers, PlusCircle, FileCheck, LogIn, Zap,
  ArrowLeft, UserCheck2, ArrowRight,
} from 'lucide-react';

interface KegiatanPublik {
  id: string; idDokumen: string; jenis: string; judul: string;
  namaMitra: string; statusPublikasi: string; tanggalKegiatan: string;
  tempatKegiatan: string; poinDipilih: string[]; narasi: string;
  divisi: string; divisiLabel: string;
  foto: { fileId: string; thumbnailUrl: string; nama: string }[];
}

interface AkanDatang {
  id: string; divisi: string[]; divisiLabel: string[]; judul: string;
  deskripsi: string; jenis: string; target: number; terisi: number;
  sisaKuota: number; wilayah: string; biaya: string;
  tglMulai: string; tglTarget: string; tglDitetapkan: string; tglBerakhirMou: string;
  status: string; kuotaPenuh: boolean;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const TABS = [
  { key: 'akan-datang',       label: 'Rencana PKS',         icon: Calendar,   color: BLUE_DARK, bg: '#DBEAFE' },
  { key: 'akan-berlangsung',  label: 'Aktif',                icon: Zap,        color: GOLD,      bg: '#FEF3C7' },
  { key: 'berlangsung',       label: 'Proses Implementasi',  icon: PlayCircle, color: BLUE,      bg: '#DBEAFE' },
  { key: 'telah-berlangsung', label: 'Telah Selesai',        icon: CheckCircle,color: '#334155', bg: '#eef2f6' },
];

const DIVISI_LIST = [
  { key: 'pencegahan',    label: 'Pencegahan',    color: BLUE_DARK },
  { key: 'pemberantasan', label: 'Pemberantasan', color: '#A32D2D' },
  { key: 'rehabilitasi',  label: 'Rehabilitasi',  color: '#5B21B6' },
  { key: 'pemberdayaan',  label: 'Pemberdayaan',  color: GOLD },
];

function formatTanggal(t: string) {
  if (!t) return '';
  try { return new Date(t).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return t; }
}

export default function BerandaPage() {
  const router = useRouter();
  const [akanDatang, setAkanDatang]   = useState<AkanDatang[]>([]);
  const [data, setData]               = useState<Record<string, KegiatanPublik[]>>({});
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('akan-datang');
  const [filterDivisi, setFilterDivisi] = useState('');
  const [showLoginPicker, setShowLoginPicker] = useState(false);

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
  const matchDivisi = (dv: string[] | string) => !filterDivisi || (Array.isArray(dv) ? dv.includes(filterDivisi) : dv === filterDivisi);
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
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#f7f9fc,#eef2f8)', fontFamily: FONT }}>
      <GlobalStyle />

      {/* Header — gradien biru-emas */}
      <div style={{
        background:`linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 55%, ${BLUE_LIGHT} 100%)`,
        color:'#fff', padding:'1.3rem 1.5rem 0', textAlign:'center', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:'-45%', right:'-15%', width:'55%', height:'190%', background:'rgba(255,255,255,0.05)', borderRadius:'50%', transform:'rotate(15deg)' }} />
        <div style={{ position:'absolute', bottom:'-20%', left:'-40px', width:220, height:220, background:`radial-gradient(circle, ${GOLD}33, transparent 70%)`, borderRadius:'50%' }} />

        {/* Tombol kembali ke dashboard */}
        <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'flex-start', marginBottom:'1.5rem' }} className="fld">
          <button onClick={() => router.back()} style={{
            display:'flex', alignItems:'center', gap:7, background:'rgba(255,255,255,0.14)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.18)', borderRadius:100, padding:'8px 16px', color:'#fff',
            fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT,
          }} className="btn-hover">
            <ArrowLeft size={14} /> Kembali ke Dashboard
          </button>
        </div>

        <div style={{ position:'relative', zIndex:1, paddingBottom:'1.7rem' }} className="fld">
          <div style={{ fontSize:10.5, fontWeight:700, opacity:.85, marginBottom:10, letterSpacing:'0.2em', textTransform:'uppercase', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <Briefcase size={13} />
            BNN Provinsi Sulawesi Selatan
          </div>
          <h1 style={{ fontSize:30, fontWeight:800, margin:'0 0 10px', letterSpacing:'-0.03em', lineHeight:1.15 }}>
            Transparansi Kegiatan<br/>Kerja Sama
          </h1>
          <p style={{ fontSize:13.5, opacity:.85, maxWidth:480, margin:'0 auto 26px', lineHeight:1.6 }}>
            Informasi terkini program kerja sama P4GN bersama mitra institusi
          </p>

          <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:22, flexWrap:'wrap' }}>
            <div style={{ background:'rgba(255,255,255,0.14)', backdropFilter:'blur(8px)', borderRadius:100, padding:'9px 18px', display:'flex', alignItems:'center', gap:8, border:'1px solid rgba(255,255,255,0.18)' }}>
              <Layers size={15} opacity={0.85} />
              <span style={{ fontSize:12.5, fontWeight:600 }}>{totalCount} Total Kegiatan</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display:'flex', justifyContent:'center', gap:4, padding:'5px', background:'rgba(0,0,0,.18)', borderRadius:100, maxWidth:720, margin:'0 auto', width:'fit-content', flexWrap:'wrap', backdropFilter:'blur(4px)' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  padding:'10px 18px', borderRadius:100, border:'none', cursor:'pointer', fontFamily: FONT,
                  fontSize:12.5, fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#fff' : 'transparent',
                  color: isActive ? BLUE_DARK : 'rgba(255,255,255,.9)',
                  display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap',
                  transition:'all .3s cubic-bezier(0.32,0.72,0,1)',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isActive ? '0 6px 16px -4px rgba(0,0,0,.25)' : 'none',
                }} className="btn-hover">
                  <Icon size={15} />
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span style={{ fontSize:10, padding:'1px 8px', borderRadius:100, background: isActive ? '#DBEAFE' : 'rgba(255,255,255,.2)', color: isActive ? BLUE_DARK : '#fff' }}>
                      {counts[tab.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ height:20 }} />
        </div>
      </div>

      {/* Filter Divisi */}
      <div style={{ maxWidth:880, margin:'-16px auto 0', padding:'0 1.25rem', position:'relative', zIndex:2 }} className="fld">
        <div style={{ ...shellStyle, background:'rgba(255,255,255,0.9)' }}>
          <div style={{ ...coreStyle, padding:'0.7rem 1rem', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <Filter size={14} style={{ color:'#94a3b8', marginRight:2 }} />
            <span style={{ fontSize:11.5, color:'#64748b', fontWeight:600 }}>Divisi:</span>
            <button onClick={() => setFilterDivisi('')} style={{ ...chip(filterDivisi === '', '#334155') }} className="btn-hover">Semua</button>
            {DIVISI_LIST.map(dv => (
              <button key={dv.key} onClick={() => setFilterDivisi(dv.key)} style={chip(filterDivisi === dv.key, dv.color)} className="btn-hover">
                {dv.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Konten Utama */}
      <div style={{ maxWidth:880, margin:'0 auto', padding:'1.5rem 1.25rem 2rem' }}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[0,1,2].map(i => <SkeletonCard key={i} delay={i * 0.08} />)}
          </div>
        ) : activeTab === 'akan-datang' ? (
          akanDatangFiltered.length === 0 ? (
            <EmptyState icon={Calendar} title="Belum ada rencana PKS terbuka" desc="Kegiatan yang membuka pendaftaran mitra akan ditampilkan di sini." />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {akanDatangFiltered.map((k, index) => (
                <div key={k.id} style={{ ...shellStyle, animationDelay:`${index * 0.05}s` }} className="fld lift">
                  <div style={{ ...coreStyle, display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ width:50, height:50, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#DBEAFE,#EFF6FF)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {k.jenis === 'MOU' ? <FileText size={20} style={{ color: BLUE_DARK }} /> : <FileCheck size={20} style={{ color: BLUE_DARK }} />}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                      {(k.divisiLabel.length > 0 ? k.divisiLabel : ['—']).map((lbl, di) => (
                        <span key={di} style={pillTag('#EDE9FE', '#5B21B6')}><Tag size={11} />{lbl}</span>
                      ))}
                      <span style={pillTag(k.jenis==='MOU'?'#DBEAFE':'#FEF3C7', k.jenis==='MOU'?BLUE_DARK:'#92400E')}><FileText size={11} />{k.jenis}</span>
                      <span style={pillTag('#DBEAFE', BLUE_DARK)}><Calendar size={11} />Pendaftaran Terbuka</span>
                    </div>

                    <div style={{ fontSize:18, fontWeight:800, marginBottom:6, lineHeight:1.4, color:'#0f1f3d', letterSpacing:'-0.01em' }}>{k.judul}</div>
                    {k.deskripsi && (
                      <p style={{ fontSize:13, color:'#64748b', lineHeight:1.7, margin:'0 0 14px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any, overflow:'hidden' }}>
                        {k.deskripsi}
                      </p>
                    )}

                    <div style={{ display:'flex', gap:16, fontSize:12, color:'#64748b', marginBottom:16, flexWrap:'wrap', background:'#f8fafc', padding:'9px 13px', borderRadius:11 }}>
                      {k.wilayah && <span style={{ display:'flex', alignItems:'center', gap:5 }}><MapPin size={13} /> {k.wilayah}</span>}
                      {k.tglMulai && <span style={{ display:'flex', alignItems:'center', gap:5 }}><CalendarDays size={13} /> {formatTanggal(k.tglMulai)}{k.tglTarget && ` – ${formatTanggal(k.tglTarget)}`}</span>}
                    </div>

                    {(k.tglDitetapkan || k.tglBerakhirMou) && (
                      <div style={mouBox}>
                        <div style={{ fontSize:10, fontWeight:700, color: GOLD, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.08em', display:'flex', alignItems:'center', gap:5 }}>
                          <FileCheck size={12} /> Masa Berlaku {k.jenis}
                        </div>
                        <div style={{ fontSize:12.5, color:'#78350F', fontWeight:600 }}>
                          {k.tglDitetapkan ? formatTanggal(k.tglDitetapkan) : 'Belum ditetapkan'} — {k.tglBerakhirMou ? formatTanggal(k.tglBerakhirMou) : 'Belum ditetapkan'}
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom:18, marginTop: (k.tglDitetapkan || k.tglBerakhirMou) ? 16 : 0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:7 }}>
                        <span style={{ color:'#64748b', display:'flex', alignItems:'center', gap:5 }}><Users size={13} /> Slot Tersedia</span>
                        <span style={{ fontWeight:700, color: k.kuotaPenuh ? '#A32D2D' : BLUE, display:'flex', alignItems:'center', gap:4 }}>
                          {k.sisaKuota} dari {k.target} slot {k.kuotaPenuh && <X size={13} />}
                        </span>
                      </div>
                      <div style={{ height:8, background:'#eef2f6', borderRadius:100, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${k.target>0?Math.round((k.terisi/k.target)*100):0}%`, background: k.kuotaPenuh ? '#A32D2D' : `linear-gradient(90deg,${BLUE_LIGHT},${BLUE_DARK})`, borderRadius:100, transition:'width 0.8s cubic-bezier(0.32,0.72,0,1)' }} />
                      </div>
                    </div>

                    {k.kuotaPenuh ? (
                      <div style={{ textAlign:'center', padding:'13px', background:'#FCEBEB', borderRadius:12, fontSize:13, color:'#A32D2D', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                        <AlertCircle size={17} /> Kuota Penuh
                      </div>
                    ) : (
                      <a href={`/daftar-kegiatan/${k.id}`} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', borderRadius:12, background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', textDecoration:'none', fontSize:13.5, fontWeight:700, boxShadow:`0 8px 20px -8px ${BLUE}60` }} className="btn-hover">
                        <Check size={17} /> Daftar Sekarang <ChevronRight size={15} />
                      </a>
                    )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          (() => {
            const currentTab = TABS.find(t => t.key === activeTab);
            const Icon = currentTab?.icon || Calendar;

            if (tabListFiltered.length === 0) {
              return <EmptyState icon={Icon} title="Belum ada kegiatan" desc="Belum ada kegiatan untuk tab ini." />;
            }
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {tabListFiltered.map((item, index) => {
                  const tab = TABS.find(t => t.key === item.statusPublikasi);
                  const hasFoto = item.foto.length > 0;
                  const TabIcon = tab?.icon || Calendar;

                  return (
                    <a key={item.id} href={`/beranda/${item.id}`} style={{ textDecoration:'none', color:'inherit', display:'block', animationDelay:`${index * 0.04}s` }} className="fld lift">
                      <div style={{ ...shellStyle, overflow:'hidden' }}>
                        {hasFoto && (
                          <div style={{ display:'grid', gridTemplateColumns: item.foto.length>=3?'1fr 1fr 1fr':item.foto.length===2?'1fr 1fr':'1fr', height:190, borderRadius:16, overflow:'hidden' }}>
                            {item.foto.slice(0,3).map((f, fi) => (
                              <div key={f.fileId} style={{ width:'100%', height:190, overflow:'hidden', position:'relative' }} className="img-zoom">
                                <img src={f.thumbnailUrl} alt={f.nama} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                              </div>
                           ))}
                            {item.foto.length > 3 && (
                              <div style={{ position:'absolute', bottom:14, right:14, background:'rgba(15,23,42,0.75)', color:'#fff', padding:'3px 11px', borderRadius:100, fontSize:11, fontWeight:700 }}>
                                +{item.foto.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ ...coreStyle, position:'relative', borderRadius: hasFoto ? '0 0 15px 15px' : 15 }}>
                          <div style={{ display:'flex', gap:8, marginBottom:11, flexWrap:'wrap' }}>
                            <span style={pillTag(item.jenis==='MOU'?'#DBEAFE':'#FEF3C7', item.jenis==='MOU'?BLUE_DARK:'#92400E')}><FileText size={11} />{item.jenis}</span>
                            {item.divisi && <span style={pillTag('#EDE9FE', '#5B21B6')}><Tag size={11} />{item.divisiLabel}</span>}
                            {tab && <span style={pillTag(tab.bg, tab.color)}><TabIcon size={11} />{tab.label}</span>}
                          </div>
                          <div style={{ fontSize:16.5, fontWeight:800, marginBottom:6, lineHeight:1.4, color:'#0f1f3d', letterSpacing:'-0.01em' }}>
                            Kerja Sama {item.jenis} dengan {item.namaMitra}
                          </div>
                          <div style={{ display:'flex', gap:16, fontSize:12, color:'#64748b', marginBottom:12, flexWrap:'wrap', background:'#f8fafc', padding:'7px 12px', borderRadius:9 }}>
                            {item.tanggalKegiatan && <span style={{ display:'flex', alignItems:'center', gap:5 }}><CalendarDays size={13} /> {formatTanggal(item.tanggalKegiatan)}</span>}
                            {item.tempatKegiatan && <span style={{ display:'flex', alignItems:'center', gap:5 }}><MapPin size={13} /> {item.tempatKegiatan}</span>}
                          </div>
                          <p style={{ fontSize:13, color:'#64748b', lineHeight:1.7, margin:'0 0 12px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any, overflow:'hidden' }}>
                            {item.narasi}
                          </p>
                          <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:6, color: BLUE, fontWeight:700, fontSize:13 }} className="read-more">
                            Baca selengkapnya <ChevronRight size={15} className="arr" />
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
     <div style={{ textAlign:'center', padding:'2.2rem 1.5rem', fontSize:11, color:'#94a3b8', borderTop:'1px solid rgba(29,78,216,0.08)', marginTop:'1.5rem', background:'#fff' }}>
        <div style={{ fontWeight:600, marginBottom:4, color:'#334155' }}>E-POKJA HUKER — BNN Provinsi Sulawesi Selatan</div>
        <div style={{ display:'flex', justifyContent:'center', gap:12, marginTop:14, flexWrap:'wrap' }}>
          <a href="/pengajuan" style={footerLink('#EFF6FF', BLUE_DARK)} className="btn-hover"><PlusCircle size={13} /> Ajukan Kerja Sama</a>
          <a href="/cek-pengajuan" style={footerLink('#FFFBEB', GOLD)} className="btn-hover"><FileCheck size={13} /> Cek Status</a>
          <button onClick={() => setShowLoginPicker(true)} style={{ ...footerLink('#f8fafc', '#64748b'), border:'none', cursor:'pointer', fontFamily:FONT }} className="btn-hover"><LogIn size={13} /> Masuk ke Sistem</button>
        </div>
      </div>

      {/* Modal pilihan login — Admin atau Mitra */}
      {showLoginPicker && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'1.5rem' }}
          onClick={() => setShowLoginPicker(false)}
        >
          <div
            style={{ background:'#fff', borderRadius:24, padding:'1.8rem', width:'100%', maxWidth:420, boxShadow:'0 40px 90px -30px rgba(15,23,42,0.4)', animation:'scaleIn 0.3s cubic-bezier(0.32,0.72,0,1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#0f1f3d' }}>Masuk Sebagai</div>
              <button onClick={() => setShowLoginPicker(false)} style={{ background:'rgba(15,23,42,0.05)', border:'none', borderRadius:100, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#64748b' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ fontSize:12.5, color:'#64748b', marginBottom:18 }}>Pilih jenis akses sesuai peran Anda di sistem.</div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <a href="/login" style={loginPickBtn} className="btn-hover lift">
                <div style={{ width:44, height:44, borderRadius:13, background:`linear-gradient(150deg,${BLUE_LIGHT},${BLUE_DARK})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} className="ic-wrap">
                  <Briefcase size={18} color="#fff" />
                </div>
                <div style={{ flex:1, textAlign:'left' }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'#0f1f3d' }}>Login sebagai Admin</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>Untuk pegawai Pokja Kerja Sama & BNN</div>
                </div>
                <ArrowRight size={16} style={{ color:'#94a3b8', flexShrink:0 }} />
              </a>

              <a href="/login-mitra" style={loginPickBtn} className="btn-hover lift">
                <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(150deg,#D97706,#92400E)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} className="ic-wrap">
                  <UserCheck2 size={20} color="#fff" />
                </div>
                <div style={{ flex:1, textAlign:'left' }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'#0f1f3d' }}>Login sebagai Mitra</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>Untuk institusi yang bekerja sama dengan BNN</div>
                </div>
                <ArrowRight size={16} style={{ color:'#94a3b8', flexShrink:0 }} />
              </a>
            </div>
          </div>
        </div>
      )}

      <ChatbotWidget tema="hijau" sumberLabel="Halaman Kegiatan (Beranda)" />
    </div>
  );
}

// Skeleton shimmer — bentuknya sengaja meniru layout kartu asli (lingkaran ikon + baris judul/meta)
// biar transisi loading -> konten tidak berasa "loncat" bentuknya.
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div style={{ ...shellStyle, animationDelay: `${delay}s` }} className="fld">
      <div style={{ ...coreStyle, position:'relative', overflow:'hidden' }}>
        <div className="skeleton-shimmer" />
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
          <div className="sk-block" style={{ width:50, height:50, borderRadius:'50%', flexShrink:0 }} />
          <div style={{ flex:1, paddingTop:2 }}>
            <div className="sk-block" style={{ height:12, width:'42%', borderRadius:6, marginBottom:10 }} />
            <div className="sk-block" style={{ height:10, width:'62%', borderRadius:6, marginBottom:16 }} />
            <div className="sk-block" style={{ height:9, width:'100%', borderRadius:6, marginBottom:8 }} />
            <div className="sk-block" style={{ height:9, width:'92%', borderRadius:6 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div style={shellStyle} className="fld">
      <div style={{ ...coreStyle, textAlign:'center', padding:'3rem 2rem' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#eef2f6', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Icon size={28} style={{ color:'#cbd5e1' }} />
        </div>
        <div style={{ fontSize:15, fontWeight:700, color:'#334155', marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:12.5, color:'#94a3b8' }}>{desc}</div>
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
      @keyframes scaleIn { from { opacity:0; transform: scale(0.95) translateY(6px); } to { opacity:1; transform: scale(1) translateY(0); } }
      .fld { animation: fadeUp 0.55s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover { filter: brightness(1.06); transform: translateY(-1px); }
      .lift { transition: all 0.4s cubic-bezier(0.32,0.72,0,1); }
      .lift:hover { transform: translateY(-3px); }
      .lift:hover .read-more .arr { transform: translateX(4px); }
      .arr { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
      .img-zoom img { transition: transform 0.5s cubic-bezier(0.32,0.72,0,1); }
      .lift:hover .img-zoom img { transform: scale(1.06); }
      .lift:hover .ic-wrap { transform: scale(1.08) rotate(-3deg); }
      .ic-wrap { transition: transform 0.4s cubic-bezier(0.32,0.72,0,1); }
      .sk-block { background: #e7ecf3; }
      .skeleton-shimmer { position:absolute; inset:0; background: linear-gradient(110deg, rgba(231,236,243,0) 0%, rgba(231,236,243,0) 40%, rgba(219,234,254,0.7) 50%, rgba(231,236,243,0) 60%, rgba(231,236,243,0) 100%); animation: shimmerMove 1.3s linear infinite; }
      @keyframes shimmerMove { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
    `}</style>
  );
}

const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', borderRadius:20, padding:6, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)', marginBottom:0 };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, padding:'1.25rem 1.4rem', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const pillTag = (bg: string, color: string): React.CSSProperties => ({ fontSize:10, fontWeight:700, padding:'4px 12px', borderRadius:100, background:bg, color, display:'flex', alignItems:'center', gap:5 });
const footerLink = (bg: string, color: string): React.CSSProperties => ({ color, textDecoration:'none', display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:100, background:bg });
const mouBox: React.CSSProperties = { background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:11, padding:'10px 13px' };
const loginPickBtn: React.CSSProperties = { display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, border:'1.5px solid rgba(29,78,216,0.1)', background:'#fff', cursor:'pointer', fontFamily:FONT, textAlign:'left', width:'100%', textDecoration:'none' };

const chip = (active: boolean, color: string): React.CSSProperties => ({
  padding:'6px 15px', borderRadius:100, borderWidth:1.5, borderStyle:'solid', fontSize:11, cursor:'pointer', fontFamily:FONT,
  fontWeight: active ? 700 : 500, background: active ? color : '#fff', color: active ? '#fff' : '#334155',
  borderColor: active ? 'transparent' : 'rgba(29,78,216,0.10)', display:'flex', alignItems:'center', gap:4,
});