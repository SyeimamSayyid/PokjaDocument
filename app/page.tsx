'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiHome, FiBookOpen, FiSearch, FiFileText, FiShield,
  FiKey, FiCloud, FiClock, FiEye, FiLock,
  FiGrid, FiUsers, FiArrowRight, FiInfo, FiLogIn,
  FiActivity, FiAlertCircle, FiChevronDown, FiChevronUp,
  FiTarget, FiCheckCircle,
} from 'react-icons/fi';
import { FaBuilding, FaGoogleDrive, FaHandshake, FaFileSignature, FaFileAlt } from 'react-icons/fa';
import { SiGoogledocs } from 'react-icons/si';

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

interface Stats { totalMitra: number; totalDokumen: number; totalMOU: number; totalPKS: number; }

const mitraSteps = [
  { title: 'Ajukan Kerja Sama', desc: 'Kunjungi halaman "Ajukan Kerja Sama", isi form dengan lengkap (nama institusi, jenis MOU/PKS, kontak PIC), dan kirim pengajuan.', tip: 'Pastikan data institusi dan kontak terisi dengan benar' },
  { title: 'Dapatkan Kode Tracking', desc: 'Setelah pengajuan dikirim, Anda akan menerima kode tracking untuk melacak status pengajuan Anda.', tip: 'Simpan kode tracking baik-baik' },
  { title: 'Cek Status Pengajuan', desc: 'Gunakan kode tracking di halaman "Status Pengajuan" untuk memantau tahap peninjauan oleh Pokja.', tip: 'Status ter-update sesuai progres admin' },
  { title: 'Isi & Tanda Tangani Dokumen', desc: 'Setelah disetujui, Anda mendapat akses ke dashboard mitra untuk melengkapi dan menandatangani dokumen MOU/PKS.', tip: 'TTD bisa online atau basah, pilih sesuai kebutuhan' },
];

const faqs = [
  { q: 'Bagaimana cara mengajukan kerja sama?', a: 'Kunjungi halaman "Ajukan Kerja Sama" di menu utama, isi form pengajuan, lalu kirim. Anda akan menerima kode tracking untuk memantau statusnya.' },
  { q: 'Berapa lama proses pengajuan kerja sama?', a: 'Umumnya 3-5 hari kerja setelah dokumen dan data yang diperlukan lengkap diterima Pokja.' },
  { q: 'Apa saja jenis kerja sama yang tersedia?', a: 'Ada dua jenis: MOU (Memorandum of Understanding) dan PKS (Perjanjian Kerja Sama), tergantung kebutuhan institusi Anda.' },
  { q: 'Bagaimana cara melacak status pengajuan?', a: 'Gunakan kode tracking yang Anda terima saat mendaftar, masukkan di halaman "Status Pengajuan".' },
  { q: 'Apa yang harus dilakukan jika pengajuan perlu direvisi?', a: 'Anda akan menerima catatan perbaikan dari Pokja lewat sistem. Perbaiki sesuai catatan tersebut, lalu ajukan kembali.' },
];

export default function HomePage() {
  const router = useRouter();
  const [activePage, setActivePage] = useState<'beranda' | 'panduan'>('beranda');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>({ totalMitra: 0, totalDokumen: 0, totalMOU: 0, totalPKS: 0 });

  useEffect(() => {
    fetch('/api/stats-publik').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const navigateTo = (path: string) => router.push(path);
  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  return (
    <div style={{ minHeight:'100vh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -10%, #dbeafe 0%, rgba(219,234,254,0) 55%), linear-gradient(180deg,#f7f9fc,#eef2f8)' }}>
      <GlobalStyle />

      {/* Nav */}
      <div style={{ maxWidth:1080, margin:'0 auto', padding:'1.3rem 1.25rem 0' }}>
        <nav style={navPill} className="fld">
          <div style={{ display:'flex', alignItems:'center', gap:10, fontWeight:800, fontSize:14.5, color:'#0f1f3d' }}>
            <div style={{ width:34, height:34, borderRadius:11, background:`linear-gradient(150deg,${BLUE_LIGHT},${BLUE_DARK})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 8px 18px -8px ${BLUE}70` }}>
              <FiFileText size={16} color="#fff" />
            </div>
            SI-POKJA HUMKER
          </div>
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={() => setActivePage('beranda')} style={{ ...tabBtn, ...(activePage==='beranda'?tabBtnActive:{}) }} className="btn-hover"><FiHome size={13} /> Beranda</button>
            <button onClick={() => setActivePage('panduan')} style={{ ...tabBtn, ...(activePage==='panduan'?tabBtnActive:{}) }} className="btn-hover"><FiBookOpen size={13} /> Panduan</button>
            <button onClick={() => router.push('/beranda')} style={tabBtn} className="btn-hover"><FiActivity size={13} /> Kegiatan</button>
            <button onClick={() => navigateTo('/cek-pengajuan')} style={tabBtn} className="btn-hover"><FiSearch size={13} /> Status</button>
          </div>
        </nav>
      </div>

      <div style={{ maxWidth:1080, margin:'0 auto', padding:'1.5rem 1.25rem 3rem' }}>

        {activePage === 'beranda' ? (
          <>
            {/* Hero */}
            <div style={heroWrap} className="fld">
              <div style={{ position:'relative', zIndex:1, textAlign:'center', padding:'3.2rem 1.5rem' }}>
                <div style={heroChip}><FiShield size={13} /> Manajemen Perjanjian Digital</div>
                <h1 style={{ fontSize:'clamp(28px,4.5vw,46px)', fontWeight:800, lineHeight:1.15, margin:'0 0 14px', letterSpacing:'-0.03em', color:'#0f1f3d' }}>
                  Kelola Kerja Sama & Dokumen<br/>Hukum dengan <span style={{ color: BLUE }}>Aman</span>
                </h1>
                <p style={{ fontSize:15, color:'#64748b', maxWidth:560, margin:'0 auto 28px', lineHeight:1.8 }}>
                  Sistem terintegrasi untuk mengelola MOU, PKS, dan dokumen kerja sama antar institusi —
                  <strong style={{ color: BLUE_DARK }}> aman, terstruktur, dan transparan</strong> untuk mendukung program P4GN.
                </p>
                <div style={{ display:'flex', gap:11, justifyContent:'center', flexWrap:'wrap', marginBottom:22 }}>
                  <button onClick={() => setActivePage('panduan')} style={btnMain} className="btn-hover"><FiBookOpen size={15} /> Lihat Panduan</button>
                  <button onClick={() => navigateTo('/pengajuan')} style={btnGhost} className="btn-hover"><FiFileText size={15} /> Ajukan Kerja Sama</button>
                  <button onClick={() => navigateTo('/login')} style={btnGhost} className="btn-hover"><FiLogIn size={15} /> Masuk ke Sistem</button>
                </div>
                <div style={{ display:'flex', gap:9, justifyContent:'center', flexWrap:'wrap' }}>
                  {[{i:FiShield,l:'Akses terenkripsi'},{i:FiKey,l:'Verifikasi kode tracking'},{i:FiCloud,l:'Tersimpan di Google Cloud'},{i:FiClock,l:'Log aktivitas lengkap'}].map((t,i) => (
                    <span key={i} style={trustItem}><t.i size={12} style={{ color: BLUE }} /> {t.l}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Statistik nyata */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, margin:'20px 0' }}>
              {[
                { icon: FiUsers, val: stats.totalMitra, lbl:'Total Mitra Kerja Sama' },
                { icon: FaHandshake, val: stats.totalDokumen, lbl:'Total Dokumen Kerja Sama' },
                { icon: FaFileSignature, val: stats.totalMOU, lbl:'Dokumen MOU' },
                { icon: FaFileAlt, val: stats.totalPKS, lbl:'Dokumen PKS' },
              ].map((s, i) => (
                <div key={i} style={{ ...shellStyle, animationDelay:`${i*0.05}s` }} className="fld">
                  <div style={{ ...coreStyle, textAlign:'center', padding:'1.4rem 1rem' }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:'#EFF6FF', color: BLUE, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                      <s.icon size={19} />
                    </div>
                    <div style={{ fontSize:28, fontWeight:800, color: BLUE_DARK, letterSpacing:'-0.02em' }}>{s.val}</div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{s.lbl}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Apa itu Pokja Humker */}
            <div style={{ ...shellStyle, margin:'20px 0' }} className="fld">
              <div style={{ ...coreStyle, padding:'2rem 1.75rem' }}>
                <div style={eyebrow}>Tentang Kami</div>
                <h2 style={{ fontSize:22, fontWeight:800, color:'#0f1f3d', margin:'10px 0 12px', letterSpacing:'-0.02em' }}>Apa itu Pokja Humker?</h2>
                <p style={{ fontSize:14, color:'#475569', lineHeight:1.85, margin:'0 0 14px' }}>
                  <strong>Pokja Humker</strong> (Kelompok Kerja Hukum dan Kerja Sama) adalah unit di lingkungan
                  BNN Provinsi Sulawesi Selatan yang bertanggung jawab menangani aspek hukum serta membangun
                  dan mengelola kerja sama kelembagaan dengan berbagai institusi — kampus, sekolah, organisasi
                  masyarakat, hingga instansi pemerintah — sebagai bagian dari program P4GN
                  (Pencegahan, Pemberantasan, Penyalahgunaan, dan Peredaran Gelap Narkotika).
                </p>
                <p style={{ fontSize:14, color:'#475569', lineHeight:1.85, margin:0 }}>
                  <strong>SI-POKJA HUMKER</strong> adalah sistem informasi digital yang dibangun untuk mendukung
                  tugas tersebut — mengelola pengajuan, penyusunan, dan pemantauan dokumen MOU/PKS secara
                  terstruktur, transparan, dan dapat dipertanggungjawabkan.
                </p>
              </div>
            </div>

            {/* Fitur unggulan */}
            <SectionTitle icon={<FiTarget size={18} />}>Fitur Unggulan</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:14, marginBottom:20 }}>
              {[
                { icon: FiFileText, title:'Pengajuan Kerja Sama', desc:'Ajukan MOU atau PKS secara online dengan mudah dan cepat.', badge:'Online 24/7', onClick: () => navigateTo('/pengajuan') },
                { icon: FiEye, title:'Cek Status Real-time', desc:'Pantau status pengajuan Anda dengan kode tracking yang diberikan.', badge:'Update Langsung', onClick: () => navigateTo('/cek-pengajuan') },
                { icon: FiLock, title:'Akses Terkontrol', desc:'Dokumen hanya dapat diakses pihak berwenang dengan verifikasi.', badge:'Aman & Terpercaya' },
                { icon: FiClock, title:'Monitoring Masa Berlaku', desc:'Pantau masa berlaku MOU/PKS supaya tidak ada yang terlewat.', badge:'Termonitor' },
              ].map((f, i) => (
                <div key={i} onClick={f.onClick} style={{ ...shellStyle, cursor: f.onClick ? 'pointer' : 'default', animationDelay:`${i*0.04}s` }} className="fld lift">
                  <div style={{ ...coreStyle, textAlign:'center', padding:'1.6rem 1.3rem' }}>
                    <div style={{ width:52, height:52, borderRadius:14, background:'#EFF6FF', color: BLUE, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }} className="ic-wrap">
                      <f.icon size={22} />
                    </div>
                    <div style={{ fontSize:14.5, fontWeight:700, color:'#0f1f3d', marginBottom:5 }}>{f.title}</div>
                    <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6 }}>{f.desc}</div>
                    <span style={{ display:'inline-block', marginTop:10, padding:'3px 12px', borderRadius:100, background:'#FEF3C7', color: GOLD, fontSize:10, fontWeight:700 }}>{f.badge}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Integrasi */}
            <SectionTitle icon={<FiGrid size={18} />}>Terintegrasi Dengan</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:14, marginBottom:20 }}>
              {[
                { icon: SiGoogledocs, name:'Google Docs', desc:'Template dokumen otomatis' },
                { icon: FiGrid, name:'Google Sheets', desc:'Database & log akses' },
                { icon: FaGoogleDrive, name:'Google Drive', desc:'Arsip folder otomatis' },
              ].map((it, i) => (
                <div key={i} style={{ ...shellStyle, animationDelay:`${i*0.04}s` }} className="fld lift">
                  <div style={{ ...coreStyle, textAlign:'center', padding:'1.5rem 1.3rem' }}>
                    <div style={{ width:52, height:52, borderRadius:15, background:'#EFF6FF', color: BLUE, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }} className="ic-wrap">
                      <it.icon size={24} />
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#0f1f3d', marginBottom:3 }}>{it.name}</div>
                    <div style={{ fontSize:11.5, color:'#94a3b8' }}>{it.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={ctaSection} className="fld">
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ fontSize:24, fontWeight:800, color:'#fff', marginBottom:8, letterSpacing:'-0.02em' }}>Siap Mengelola Kerja Sama?</div>
                <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.85)', maxWidth:480, margin:'0 auto 20px', lineHeight:1.7 }}>
                  Bergabunglah dengan SI-POKJA HUMKER dan rasakan kemudahan mengelola dokumen hukum dan kerja sama secara digital.
                </div>
                <button onClick={() => navigateTo('/pengajuan')} style={ctaBtn} className="btn-hover">
                  Ajukan Kerja Sama Sekarang <FiArrowRight size={17} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Panduan — khusus Mitra */}
            <div style={{ ...shellStyle, marginBottom:20 }} className="fld">
              <div style={{ ...coreStyle, textAlign:'center', padding:'2rem 1.5rem' }}>
                <div style={heroChip}><FaHandshake size={13} /> Panduan Mitra</div>
                <h1 style={{ fontSize:24, fontWeight:800, color:'#0f1f3d', margin:'12px 0 8px', letterSpacing:'-0.02em' }}>Cara Menggunakan SI-POKJA HUMKER</h1>
                <p style={{ fontSize:13.5, color:'#64748b', maxWidth:480, margin:'0 auto' }}>Panduan lengkap untuk mitra dalam mengajukan dan mengelola kerja sama dengan BNN Provinsi Sulawesi Selatan.</p>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))', gap:14, marginBottom:28 }}>
              {mitraSteps.map((step, i) => (
                <div key={i} style={{ ...shellStyle, animationDelay:`${i*0.05}s` }} className="fld lift">
                  <div style={{ ...coreStyle, padding:'1.4rem 1.3rem' }}>
                    <div style={stepNumber}>{String(i+1).padStart(2,'0')}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#0f1f3d', marginBottom:6 }}>{step.title}</div>
                    <div style={{ fontSize:12.5, color:'#64748b', lineHeight:1.65 }}>{step.desc}</div>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:11, padding:'4px 12px', background:'#EFF6FF', borderRadius:100, fontSize:11, color: BLUE_DARK, fontWeight:600 }}>
                      <FiInfo size={11} /> {step.tip}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* FAQ */}
            <SectionTitle icon={<FiAlertCircle size={18} />}>Pertanyaan yang Sering Diajukan</SectionTitle>
            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
              {faqs.map((faq, i) => (
                <div key={i} style={{ ...shellStyle, animationDelay:`${i*0.03}s` }} className="fld">
                  <div style={{ background:'#fff', borderRadius:15, overflow:'hidden' }}>
                    <button onClick={() => toggleFaq(i)} style={faqQ}>
                      <span style={{ display:'flex', alignItems:'center', gap:9, fontSize:13.5, fontWeight:600, color:'#0f1f3d', textAlign:'left' }}>
                        <FiInfo size={15} style={{ color: BLUE, flexShrink:0 }} /> {faq.q}
                      </span>
                      {openFaq === i ? <FiChevronUp size={17} style={{ color:'#94a3b8', flexShrink:0 }} /> : <FiChevronDown size={17} style={{ color:'#94a3b8', flexShrink:0 }} />}
                    </button>
                    {openFaq === i && (
                      <div style={{ padding:'0 18px 16px 42px', fontSize:12.5, color:'#64748b', lineHeight:1.7 }} className="fld">{faq.a}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign:'center', padding:'2rem', borderTop:'1px solid rgba(29,78,216,0.08)', background:'#fff' }}>
        <div style={{ fontWeight:700, fontSize:15, color: BLUE_DARK, marginBottom:4 }}>SI-POKJA HUMKER</div>
        <div style={{ fontSize:11.5, color:'#94a3b8' }}>Sistem Manajemen Data Hukum & Kerja Sama | BNN Provinsi Sulawesi Selatan</div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:15.5, fontWeight:800, color:'#0f1f3d', margin:'6px 0 14px', letterSpacing:'-0.01em' }} className="fld">
      <span style={{ color: GOLD }}>{icon}</span> {children}
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      @keyframes fadeUp { from { opacity:0; transform: translateY(14px); filter: blur(3px);} to { opacity:1; transform: translateY(0); filter: blur(0);} }
      .fld { animation: fadeUp 0.55s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
      .lift { transition: all 0.4s cubic-bezier(0.32,0.72,0,1); }
      .lift:hover { transform: translateY(-4px); box-shadow: 0 24px 44px -26px rgba(29,78,216,0.3) !important; }
      .lift:hover .ic-wrap { transform: scale(1.08) rotate(-3deg); }
      .ic-wrap { transition: transform 0.4s cubic-bezier(0.32,0.72,0,1); }
    `}</style>
  );
}

const navPill: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.72)', backdropFilter:'blur(12px)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:100, padding:'9px 10px 9px 18px', boxShadow:'0 10px 26px -18px rgba(15,23,42,0.25)', flexWrap:'wrap', gap:8 };
const tabBtn: React.CSSProperties = { padding:'8px 15px', borderRadius:100, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT, background:'transparent', color:'#64748b', display:'flex', alignItems:'center', gap:6 };
const tabBtnActive: React.CSSProperties = { background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff' };
const heroWrap: React.CSSProperties = { background:`linear-gradient(135deg, rgba(29,78,216,0.05), rgba(37,99,235,0.08))`, border:'1px solid rgba(29,78,216,0.08)', borderRadius:28, overflow:'hidden', position:'relative', marginBottom:20 };
const heroChip: React.CSSProperties = { display:'inline-flex', alignItems:'center', gap:7, background:'linear-gradient(135deg,#DBEAFE,#EFF6FF)', border:'1px solid rgba(29,78,216,0.14)', borderRadius:100, padding:'6px 16px', fontSize:11.5, fontWeight:600, color: BLUE_DARK };
const btnMain: React.CSSProperties = { padding:'13px 26px', fontSize:13.5, fontWeight:700, borderRadius:100, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, fontFamily:FONT, background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', border:'none', boxShadow:`0 10px 26px -8px ${BLUE}60` };
const btnGhost: React.CSSProperties = { padding:'13px 26px', fontSize:13.5, fontWeight:600, borderRadius:100, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, fontFamily:FONT, background:'rgba(255,255,255,0.85)', color:'#334155', border:'1.5px solid rgba(29,78,216,0.10)' };
const trustItem: React.CSSProperties = { display:'flex', alignItems:'center', gap:7, fontSize:11.5, color:'#64748b', background:'rgba(255,255,255,0.6)', padding:'6px 14px', borderRadius:100, border:'1px solid rgba(29,78,216,0.06)' };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:19, padding:5, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const eyebrow: React.CSSProperties = { display:'inline-block', fontSize:9.5, color: GOLD, textTransform:'uppercase', letterSpacing:'0.16em', fontWeight:700, background:'#FEF3C7', padding:'4px 12px', borderRadius:100 };
const ctaSection: React.CSSProperties = { background:`linear-gradient(135deg,${BLUE_DARK},${BLUE})`, borderRadius:26, padding:'2.8rem 1.75rem', textAlign:'center', position:'relative', overflow:'hidden' };
const ctaBtn: React.CSSProperties = { padding:'13px 30px', borderRadius:100, border:'none', background:'#fff', color: BLUE_DARK, fontSize:13.5, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, fontFamily:FONT };
const stepNumber: React.CSSProperties = { display:'inline-flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:'50%', background:'#EFF6FF', color: BLUE, fontWeight:800, fontSize:11.5, marginBottom:11 };
const faqQ: React.CSSProperties = { width:'100%', padding:'14px 18px', border:'none', background:'transparent', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, fontFamily:FONT };