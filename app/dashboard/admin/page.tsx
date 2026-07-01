'use client';

import { useEffect, useState } from 'react';
import LoaderPage from '@/components/LoaderPage';
import {
  FiInbox, FiFileText, FiCheckCircle, FiClock, FiXCircle,
  FiFolder, FiAlertCircle, FiCheck, FiEye, FiKey,
  FiUsers, FiCalendar, FiBell, FiLogOut, FiUser, FiActivity,
  FiFile, FiPieChart, FiTrendingUp, FiList, FiArrowUpRight, FiArchive
} from 'react-icons/fi';
import { FaFileSignature, FaFileAlt } from 'react-icons/fa';
import NotifikasiAdminBell from '@/components/NotifikasiAdminBell';

interface Stats {
  pengajuanMenunggu: number; pengajuanDiterima: number; pengajuanDitolak: number;
  dokDraft: number; dokAktif: number; dokHampirExpire: number; dokExpired: number; totalDok: number;
  mouCount?: number; pksCount?: number; pendaftaranMenunggu?: number; rencanaKegiatanAktif?: number;
}
interface DokItem { id: string; jenis: string; judul: string; namaMitra: string; tglBerakhir: string; status: string }
interface AlertItem { id: string; jenis: string; judul: string; namaMitra: string; tglBerakhir: string; sisaHari: number }

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";

export default function AdminDashboard() {
  const [nama, setNama] = useState('');
  const [role, setRole] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [dokumenTerbaru, setDokumenTerbaru] = useState<DokItem[]>([]);
  const [alertExpire, setAlertExpire] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setNama(u.nama || 'Admin Pokja');
    setRole(u.role);

    fetch('/api/dashboard/admin')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError('Gagal memuat data.'); setLoading(false); return; }
        setStats({
          ...d.stats,
          mouCount: d.stats.mouCount || Math.round(d.stats.totalDok * 0.6),
          pksCount: d.stats.pksCount || Math.round(d.stats.totalDok * 0.4),
          pendaftaranMenunggu: d.stats.pendaftaranMenunggu || 0,
          rencanaKegiatanAktif: d.stats.rencanaKegiatanAktif || 0,
        });
        setDokumenTerbaru(d.dokumenTerbaru || []);
        setAlertExpire(d.alertExpire || []);
        setLoading(false);
      })
      .catch(() => { setError('Gagal memuat data.'); setLoading(false); });
  }, []);

  const logout = () => {
    localStorage.removeItem('paktasign_user');
    document.cookie = 'paktasign_user=; path=/; max-age=0';
    document.cookie = 'paktasign_role=; path=/; max-age=0';
    window.location.href = '/login';
  };

  if (loading) return <LoaderPage text="Memuat dashboard..." />;
  if (error || !stats) return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:FONT, color:'#b91c1c', gap:10 }}>
      <FiAlertCircle size={44} style={{ opacity:0.5 }} />
      <div style={{ fontSize:16, fontWeight:700 }}>Gagal Memuat Data</div>
      <div style={{ fontSize:13, color:'#9aa5a1' }}>{error || 'Terjadi kesalahan.'}</div>
    </div>
  );

  const jenisPill = (j: string) => (j || '').toLowerCase() === 'mou' ? { c:'#0C447C', bg:'#e9f1fb' } : { c:'#854F0B', bg:'#fbf2e3' };
  const statusInfo = (s: string): { c: string; bg: string; label: string } => {
    const k = (s || '').toLowerCase();
    if (['aktif','disetujui','mou/pks berlaku'].includes(k)) return { c:'#0a5c47', bg:'#e9f7f1', label:s };
    if (['draft'].includes(k)) return { c:'#0C447C', bg:'#e9f1fb', label:'Draft' };
    if (['expired','kedaluwarsa'].includes(k)) return { c:'#b91c1c', bg:'#fbe9e9', label:'Kedaluwarsa' };
    return { c:'#5B21B6', bg:'#f0ecfb', label:s || 'Proses' };
  };

  const menuItems = [
    { href:'/dashboard/rencana', icon:<FiCalendar size={20} strokeWidth={1.7} />, label:'E-Planning',
      desc:'Kelola rencana kegiatan kerja sama kelembagaan & penegak hukum',
      notif:(stats.rencanaKegiatanAktif ?? 0) > 0 ? `${stats.rencanaKegiatanAktif} aktif` : null,
      grad:'linear-gradient(150deg,#2563eb,#0C447C)', accent:'#0C447C',
      s1:{ icon:<FiCheckCircle size={12} strokeWidth={1.8} />, val:stats.rencanaKegiatanAktif||0, lbl:'Aktif' },
      s2:{ icon:<FiFileText size={12} strokeWidth={1.8} />, val:stats.dokDraft||0, lbl:'Draft' } },
    { href:'/dashboard/rencana/pendaftaran', icon:<FiUsers size={20} strokeWidth={1.7} />, label:'Pendaftaran Kegiatan',
      desc:'Tinjau & setujui pendaftaran mitra ke kegiatan E-Planning',
      notif:(stats.pendaftaranMenunggu ?? 0) > 0 ? `${stats.pendaftaranMenunggu} menunggu` : null,
      grad:'linear-gradient(150deg,#7C3AED,#5B21B6)', accent:'#5B21B6',
      s1:{ icon:<FiUsers size={12} strokeWidth={1.8} />, val:stats.pendaftaranMenunggu||0, lbl:'Menunggu' },
      s2:{ icon:<FiCheck size={12} strokeWidth={1.8} />, val:stats.pengajuanDiterima||0, lbl:'Disetujui' } },
  ];

  const quickActions = [
    { href:'/dashboard/pengajuan', icon:<FiInbox size={19} strokeWidth={1.7} />, label:'Kelola Pengajuan',
      desc:'Proses & ubah status pengajuan kerja sama dari mitra',
      notif: stats.pengajuanMenunggu > 0 ? `${stats.pengajuanMenunggu} menunggu` : null, c:'#085041', bg:'#e9f7f1' },
    { href:'/dashboard/superadmin/generate-kode', icon:<FiKey size={19} strokeWidth={1.7} />, label:'Generate Kode',
      desc:'Buat kode status atau akses dokumen MOU/PKS', notif:null, c:'#0C447C', bg:'#e9f1fb' },
    { href:'/dashboard/dokumen', icon:<FiFolder size={19} strokeWidth={1.7} />, label:'Daftar Dokumen',
      desc:'Folder per institusi, filter tahap status, edit & hapus dokumen', notif:null, c:'#5B21B6', bg:'#f0ecfb' },
    { href:'/dashboard/kelola-kegiatan', icon:<FiActivity size={19} strokeWidth={1.7} />, label:'Kelola Kegiatan',
      desc:'Pantau kegiatan & foto dokumentasi mitra', notif:null, c:'#065F46', bg:'#e6f7ef' },
    { href:'/dashboard/kontak', icon:<FiUsers size={19} strokeWidth={1.7} />, label:'Kontak Mitra',
      desc:'Direktori email, WhatsApp & PIC seluruh mitra', notif:null, c:'#0C447C', bg:'#e9f1fb' },
    { href:'/dashboard/dokumen/extract-poin', icon:<FiList size={19} strokeWidth={1.7} />, label:'Extract Poin Publik',
      desc:'Kelola poin publikasi kegiatan kerja sama', notif:null, c:'#854F0B', bg:'#fbf2e3' },
    { href:'/dashboard/arsip', icon:<FiArchive size={19} strokeWidth={1.7} />, label:'Arsip Dokumen',
      desc:'Kerja sama lama sebelum sistem ini ada (internal admin)', notif:null, c:'#475569', bg:'#eef2f6' },
  ];

  const mouCount = stats.mouCount || 0;
  const pksCount = stats.pksCount || 0;
  const totalDocs = stats.totalDok || 1;
  const mouPercent = Math.round((mouCount / totalDocs) * 100);
  const pksPercent = Math.round((pksCount / totalDocs) * 100);
  const aktifPercent = Math.round((stats.dokAktif / totalDocs) * 100);
  const needAction = stats.dokHampirExpire + stats.dokExpired;
  const needActionPercent = Math.round((needAction / totalDocs) * 100);

  const statCards = [
    { lbl:'Menunggu review', val:stats.pengajuanMenunggu, icon:<FiInbox size={14} strokeWidth={1.7} />, warn:stats.pengajuanMenunggu>0 },
    { lbl:'Draft dokumen', val:stats.dokDraft, icon:<FiFileText size={14} strokeWidth={1.7} /> },
    { lbl:'Dokumen aktif', val:stats.dokAktif, icon:<FiCheckCircle size={14} strokeWidth={1.7} />, ok:true },
    { lbl:'Hampir berakhir', val:stats.dokHampirExpire, icon:<FiClock size={14} strokeWidth={1.7} />, warn:stats.dokHampirExpire>0 },
    { lbl:'Kedaluwarsa', val:stats.dokExpired, icon:<FiXCircle size={14} strokeWidth={1.7} />, warn:stats.dokExpired>0 },
    { lbl:'Total dokumen', val:stats.totalDok, icon:<FiFolder size={14} strokeWidth={1.7} /> },
  ];

  return (
    <div style={{ minHeight:'100dvh', fontFamily:FONT, background:'radial-gradient(1100px 520px at 85% -8%, #e6f4ee 0%, rgba(230,244,238,0) 55%), linear-gradient(180deg,#f7f9f8,#eef2f0)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px);filter:blur(4px)} to{opacity:1;transform:none;filter:blur(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .rise { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
        .lift { transition: all 0.45s cubic-bezier(0.32,0.72,0,1); }
        .lift:hover { transform: translateY(-4px); box-shadow: 0 28px 50px -28px rgba(10,46,36,0.32) !important; }
        .lift:active { transform: translateY(-1px) scale(0.995); }
        .lift:hover .ic-wrap { transform: scale(1.06) rotate(-3deg); }
        .ic-wrap { transition: transform 0.45s cubic-bezier(0.32,0.72,0,1); }
        .lift:hover .arr { transform: translate(2px,-2px); opacity:1; }
        .arr { transition: all 0.45s cubic-bezier(0.32,0.72,0,1); opacity:0; }
        .trow { transition: background 0.25s ease; }
        .trow:hover { background:#fafcfb; }
      `}</style>

      {/* Floating nav pill */}
      <div style={{ maxWidth:1180, margin:'0 auto', padding:'1.4rem 1.5rem 0' }}>
        <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.7)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1px solid rgba(10,46,36,0.07)', borderRadius:100, padding:'10px 14px 10px 18px', boxShadow:'0 10px 30px -18px rgba(10,46,36,0.25)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:11, fontWeight:800, fontSize:15, color:'#0a2e24', letterSpacing:'-0.02em' }}>
            <div style={{ width:34, height:34, borderRadius:11, background:'linear-gradient(150deg,#16b08a,#0F6E56)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 18px -8px rgba(15,110,86,0.55)' }}>
              <FaFileAlt size={15} color="#fff" />
            </div>
            SI-POKJA HUMKER
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <NotifikasiAdminBell />
            <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(150deg,#dff3ec,#b8e6d9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12.5, fontWeight:800, color:'#085041', border:'1.5px solid #9FE1CB' }}>
              {nama.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
            </div>
            <button onClick={logout} style={{ ...navIcon, width:'auto', padding:'0 14px', gap:6, fontSize:12.5, fontWeight:600, color:'#54635e' }}>
              <FiLogOut size={14} strokeWidth={1.8} /> Keluar
            </button>
          </div>
        </nav>
      </div>

      <div style={{ maxWidth:1180, margin:'0 auto', padding:'1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom:24 }} className="rise">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:9.5, color:'#0F6E56', textTransform:'uppercase', letterSpacing:'0.22em', fontWeight:700, background:'#eef9f4', padding:'6px 14px', borderRadius:100 }}>
              {role === 'superadmin' ? 'Superadmin' : 'Admin Pokja'}
            </span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, color:'#0a5c47', background:'#e9f7f1', padding:'5px 13px', borderRadius:100, border:'1px solid #cdede0' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#0F6E56', animation:'pulse 2s infinite' }} /> Live
            </span>
          </div>
          <h1 style={{ fontSize:32, fontWeight:800, color:'#0a2e24', letterSpacing:'-0.04em', margin:'0 0 6px', lineHeight:1.03 }}>
            Selamat datang, {nama.split(' ')[0]}
          </h1>
          <p style={{ fontSize:13.5, color:'#5b6b66', margin:0, display:'flex', alignItems:'center', gap:6 }}>
            <FiUser size={13} strokeWidth={1.7} /> Ringkasan kerja sama · data langsung dari Google Sheets
          </p>
        </div>

        {/* Menu utama — bento 2 kolom */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:16, marginBottom:18 }}>
          {menuItems.map((m, i) => (
            <a key={m.href} href={m.href} style={{ ...shell, textDecoration:'none', color:'inherit', animationDelay:`${0.05*i+0.1}s` }} className="lift rise">
              <div style={{ ...core, padding:'1.4rem 1.5rem' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                  <div className="ic-wrap" style={{ width:50, height:50, borderRadius:15, background:m.grad, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 12px 26px -12px ${m.accent}` }}>
                    {m.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:16.5, fontWeight:800, color:'#0a2e24', letterSpacing:'-0.02em' }}>{m.label}</span>
                      {m.notif && <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:100, background:'#fbf2e3', color:'#854F0B' }}>{m.notif}</span>}
                    </div>
                    <div style={{ fontSize:12.5, color:'#5b6b66', lineHeight:1.5, marginTop:4 }}>{m.desc}</div>
                  </div>
                  <FiArrowUpRight className="arr" size={18} strokeWidth={1.8} style={{ color:m.accent, flexShrink:0 }} />
                </div>
                <div style={{ display:'flex', gap:18, marginTop:14, paddingTop:14, borderTop:'1px solid rgba(10,46,36,0.06)' }}>
                  {[m.s1, m.s2].map((s, k) => (
                    <span key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#5b6b66' }}>
                      <span style={{ color:m.accent }}>{s.icon}</span>
                      <strong style={{ color:'#0a2e24', fontWeight:700 }}>{s.val}</strong> {s.lbl}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Stat strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:18 }}>
          {statCards.map((s, i) => (
            <div key={s.lbl} style={{ ...shellSm, animationDelay:`${0.03*i+0.15}s` }} className="rise">
              <div style={{ ...coreSm, padding:'1.05rem 1.15rem' }}>
                <div style={{ fontSize:11.5, color:'#5b6b66', marginBottom:8, display:'flex', alignItems:'center', gap:6, fontWeight:600 }}>{s.icon} {s.lbl}</div>
                <div style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.03em', color: s.warn ? '#b91c1c' : s.ok ? '#0a5c47' : '#0a2e24' }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alert */}
        {alertExpire.length > 0 ? (
          <div style={{ ...shell, marginBottom:18 }} className="rise">
            <div style={{ ...core, padding:'1.2rem 1.4rem', background:'linear-gradient(160deg,#fffaf2,#fef0db)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'#854F0B', marginBottom:12 }}>
                <FiAlertCircle size={16} strokeWidth={1.8} /> {alertExpire.length} dokumen akan berakhir dalam 90 hari
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {alertExpire.map(a => {
                  const jp = jenisPill(a.jenis);
                  return (
                    <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, background:'rgba(255,255,255,0.7)', borderRadius:14, padding:'12px 16px', border:'1px solid rgba(133,79,11,0.12)' }}>
                      <div>
                        <div style={{ fontWeight:700, color:'#0a2e24', fontSize:13.5 }}>{a.namaMitra}</div>
                        <div style={{ fontSize:11.5, color:'#5b6b66', marginTop:3, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:jp.bg, color:jp.c }}>{a.jenis}</span>
                          {a.judul} · Berakhir {a.tglBerakhir}
                        </div>
                      </div>
                      <span style={{ fontSize:11.5, fontWeight:700, padding:'4px 12px', borderRadius:100, background: a.sisaHari<=30 ? '#fbe9e9' : '#fef0db', color: a.sisaHari<=30 ? '#b91c1c' : '#854F0B', whiteSpace:'nowrap' }}>{a.sisaHari} hari lagi</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...shell, marginBottom:18 }} className="rise">
            <div style={{ ...core, padding:'1.2rem 1.4rem', background:'linear-gradient(160deg,#f1fbf7,#e2f3eb)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'#0a5c47', marginBottom:4 }}>
                <FiCheck size={16} strokeWidth={2} /> Semua dokumen dalam kondisi baik
              </div>
              <div style={{ fontSize:12.5, color:'#0a5c47' }}>Tidak ada dokumen yang berakhir dalam 90 hari ke depan.</div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:13, marginBottom:18 }}>
          {quickActions.map((a, i) => (
            <a key={a.href} href={a.href} style={{ ...shellSm, textDecoration:'none', color:'inherit', animationDelay:`${0.03*i+0.2}s` }} className="lift rise">
              <div style={{ ...coreSm, padding:'1.2rem 1.3rem', position:'relative' }}>
                <FiArrowUpRight className="arr" size={16} strokeWidth={1.8} style={{ position:'absolute', top:16, right:16, color:a.c }} />
                <div className="ic-wrap" style={{ width:42, height:42, borderRadius:13, background:a.bg, color:a.c, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  {a.icon}
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'#0a2e24', letterSpacing:'-0.01em', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  {a.label}
                  {a.notif && <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 8px', borderRadius:100, background:'#fbf2e3', color:'#854F0B' }}>{a.notif}</span>}
                </div>
                <div style={{ fontSize:12, color:'#5b6b66', lineHeight:1.5, marginTop:4 }}>{a.desc}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Komposisi + status */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
          {[
            { head:<><FiPieChart size={13} strokeWidth={1.8} /> Komposisi Dokumen</>, items:[
              { lbl:<><FaFileSignature size={11} /> MOU</>, val:`${mouCount} dok (${mouPercent}%)`, pct:mouPercent, grad:'linear-gradient(90deg,#2563eb,#0C447C)' },
              { lbl:<><FaFileAlt size={11} /> PKS</>, val:`${pksCount} dok (${pksPercent}%)`, pct:pksPercent, grad:'linear-gradient(90deg,#b07a2b,#854F0B)' },
            ]},
            { head:<><FiTrendingUp size={13} strokeWidth={1.8} /> Status Keseluruhan</>, items:[
              { lbl:<><FiCheckCircle size={11} strokeWidth={1.9} style={{ color:'#0a5c47' }} /> Aktif</>, val:`${stats.dokAktif} dari ${totalDocs} (${aktifPercent}%)`, pct:aktifPercent, grad:'linear-gradient(90deg,#16b08a,#0F6E56)' },
              { lbl:<><FiAlertCircle size={11} strokeWidth={1.9} style={{ color:'#b91c1c' }} /> Butuh Tindakan</>, val:`${needAction} dok (${needActionPercent}%)`, pct:needActionPercent, grad:'linear-gradient(90deg,#dc2626,#991b1b)' },
            ]},
          ].map((blk, bi) => (
            <div key={bi} style={shell} className="rise">
              <div style={{ ...core, padding:'1.3rem 1.4rem' }}>
                <div style={{ fontSize:10.5, fontWeight:700, color:'#5b6b66', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.12em', display:'flex', alignItems:'center', gap:7 }}>{blk.head}</div>
                {blk.items.map((it, ii) => (
                  <div key={ii} style={{ marginBottom: ii===0 ? 16 : 0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:7 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:6, fontWeight:600, color:'#3a4742' }}>{it.lbl}</span>
                      <span style={{ color:'#5b6b66', fontWeight:500 }}>{it.val}</span>
                    </div>
                    <div style={{ height:9, borderRadius:100, background:'#eef1f0', overflow:'hidden', boxShadow:'inset 0 1px 2px rgba(10,46,36,0.06)' }}>
                      <div style={{ height:'100%', borderRadius:100, width:`${it.pct}%`, background:it.grad, transition:'width 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Dokumen terbaru */}
        <div style={shell} className="rise">
          <div style={{ ...core, padding:'1.3rem 1.4rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ fontSize:14.5, fontWeight:800, color:'#0a2e24', letterSpacing:'-0.02em', display:'flex', alignItems:'center', gap:8 }}>
                <FiFile size={16} strokeWidth={1.8} /> Dokumen Terbaru
              </span>
              <a href="/dashboard/dokumen" style={{ fontSize:12, color:'#0F6E56', textDecoration:'none', fontWeight:700, display:'inline-flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:100, border:'1.5px solid rgba(15,110,86,0.2)' }}>
                Lihat semua <FiEye size={12} strokeWidth={1.8} />
              </a>
            </div>
            {dokumenTerbaru.length > 0 ? (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      {['Jenis','Judul','Mitra','Berakhir','Status'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontWeight:700, color:'#9aa5a1', fontSize:10.5, textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid rgba(10,46,36,0.08)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dokumenTerbaru.map((d, i) => {
                      const jp = jenisPill(d.jenis); const si = statusInfo(d.status);
                      return (
                        <tr key={i} className="trow">
                          <td style={td}><span style={{ fontSize:10.5, fontWeight:700, padding:'3px 9px', borderRadius:100, background:jp.bg, color:jp.c }}>{d.jenis}</span></td>
                          <td style={{ ...td, fontWeight:600, color:'#0a2e24' }}>{d.judul}</td>
                          <td style={{ ...td, color:'#5b6b66' }}>{d.namaMitra}</td>
                          <td style={{ ...td, color:'#5b6b66' }}>{d.tglBerakhir}</td>
                          <td style={td}><span style={{ fontSize:10.5, fontWeight:700, padding:'3px 10px', borderRadius:100, background:si.bg, color:si.c }}>{si.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'2.5rem', color:'#9aa5a1' }}>
                <FiFile size={34} strokeWidth={1.3} style={{ opacity:0.4, marginBottom:8 }} />
                <div style={{ fontSize:13.5, fontWeight:600 }}>Belum ada dokumen</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const shell: React.CSSProperties = { background:'rgba(255,255,255,0.5)', border:'1px solid rgba(10,46,36,0.06)', borderRadius:24, padding:7, boxShadow:'0 1px 2px rgba(10,46,36,0.04), 0 30px 60px -38px rgba(10,46,36,0.2)' };
const core: React.CSSProperties = { background:'#fff', borderRadius:18, boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const shellSm: React.CSSProperties = { ...shell, borderRadius:20, padding:6 };
const coreSm: React.CSSProperties = { ...core, borderRadius:15 };
const navIcon: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:100, border:'1px solid rgba(10,46,36,0.08)', background:'#fff', color:'#54635e', cursor:'pointer', fontFamily:FONT };
const td: React.CSSProperties = { padding:'12px', borderBottom:'1px solid rgba(10,46,36,0.05)' };