'use client';

import { useEffect, useState, useRef } from 'react';
import LoaderPage from '@/components/LoaderPage';
import {
  FiFolder, FiRefreshCw, FiLogOut, FiPieChart, FiTrendingUp, FiBarChart2,
} from 'react-icons/fi';
import { FaBuilding, FaFileAlt } from 'react-icons/fa';

interface Metrics {
  totalMitra: number; dokAktif: number;
  dokHampir: number; dokDraft: number; totalDok: number;
}
interface Status { aktif: number; draft: number; review: number; kedaluwarsa: number }
interface GrafikItem { label: string; mou: number; pks: number; exp: number }
interface MitraItem { id: string; nama: string; singkatan: string; jumlahDok: number; index: number }

interface DashData {
  metrics: Metrics; status: Status; grafik: GrafikItem[];
  mitraData: MitraItem[];
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#212842';
const CREAM = '#F0E7D5';
const GOLD_ACCENT = '#B5813F';
const SAGE = '#5C7A5E';
const ESPRESSO = '#6B4A32';
const RED = '#A32D2D';
const PURPLE = '#5B4B8A';

const AVATAR_PALETTE: { bg: string; fg: string }[] = [
  { bg: 'rgba(33,40,66,0.08)',  fg: INDIGO },
  { bg: '#FBF3E7',              fg: GOLD_ACCENT },
  { bg: '#EDE9FE',              fg: PURPLE },
  { bg: '#E6EDE6',              fg: SAGE },
  { bg: '#EFE5DB',              fg: ESPRESSO },
  { bg: '#FCEBEB',              fg: RED },
];

export default function SuperadminDashboard() {
  const [nama, setNama]     = useState('');
  const [data, setData]     = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const chartRef            = useRef<HTMLCanvasElement>(null);
  const chartInstance       = useRef<unknown>(null);

  useEffect(() => {
    const getCookie = (n: string) => {
      const m = document.cookie.match(new RegExp('(^| )' + n + '=([^;]+)'));
      return m ? decodeURIComponent(m[2]) : null;
    };
    let raw = localStorage.getItem('paktasign_user') || getCookie('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    try {
      const u = JSON.parse(raw);
      if (u.role !== 'superadmin') { window.location.href = '/login'; return; }
      setNama(u.nama || 'Superadmin');
    } catch { window.location.href = '/login'; return; }

    fetch('/api/dashboard/superadmin')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Gagal memuat data dari Spreadsheet.'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!data || !chartRef.current) return;
    const win = window as unknown as { Chart?: unknown };

    const renderChart = () => {
      if (!win.Chart) { setTimeout(renderChart, 200); return; }
      const C = win.Chart as new (...args: unknown[]) => unknown;
      if (chartInstance.current) (chartInstance.current as { destroy: () => void }).destroy();

      const labels = data.grafik.map(g => g.label);
      const mouData = data.grafik.map(g => g.mou);
      const pksData = data.grafik.map(g => g.pks);
      const expData = data.grafik.map(g => g.exp);

      chartInstance.current = new C(chartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label:'MOU baru', data:mouData, borderColor:INDIGO, backgroundColor:'rgba(33,40,66,0.08)', tension:0.35, fill:true, pointRadius:3, pointBackgroundColor:INDIGO, borderWidth:2.5 },
            { label:'PKS baru', data:pksData, borderColor:GOLD_ACCENT, backgroundColor:'rgba(181,129,63,0.08)', tension:0.35, fill:true, pointRadius:3, pointBackgroundColor:GOLD_ACCENT, borderWidth:2.5 },
            { label:'Berakhir', data:expData, borderColor:RED, backgroundColor:'rgba(163,45,45,0.06)', tension:0.35, fill:true, pointRadius:3, pointBackgroundColor:RED, borderWidth:2.5 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false } },
          scales: {
            x: { grid:{display:false}, ticks:{font:{size:10, family:FONT}, color:'rgba(33,40,66,0.5)', autoSkip:false, maxRotation:0} },
            y: { grid:{color:'rgba(33,40,66,0.06)'}, ticks:{font:{size:10, family:FONT}, color:'rgba(33,40,66,0.5)', stepSize:1}, beginAtZero:true }
          }
        }
      });
    };

    const script = document.getElementById('chartjs-cdn');
    if (!script) {
      const s = document.createElement('script');
      s.id = 'chartjs-cdn';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = renderChart;
      document.head.appendChild(s);
    } else {
      renderChart();
    }
  }, [data]);

  const logout = () => {
    localStorage.removeItem('paktasign_user');
    document.cookie = 'paktasign_user=; path=/; max-age=0';
    document.cookie = 'paktasign_role=; path=/; max-age=0';
    window.location.href = '/login';
  };

  const doRefresh = () => {
    setRefreshing(true);
    window.location.reload();
  };

  if (loading) return <LoaderPage text="Memuat dashboard..." />;
  if (error || !data) return (
    <div style={centerStyle}>{error || 'Terjadi kesalahan.'}</div>
  );

  const { metrics, status, mitraData } = data;
  const totalStatus = (status.aktif + status.draft + status.review + status.kedaluwarsa) || 1;

  const metricCards = [
    { label:'Total Mitra',   val:metrics.totalMitra, icon:<FaBuilding size={15} />, c: GOLD_ACCENT, bg:'#FBF3E7' },
    { label:'Total Dokumen', val:metrics.totalDok,   icon:<FiFolder size={16} />, c: ESPRESSO, bg:'#EFE5DB' },
  ];

  const statusItems = [
    { label:'Aktif',       val:status.aktif,       color: INDIGO },
    { label:'Draft',       val:status.draft,       color: PURPLE },
    { label:'Review',      val:status.review,      color: GOLD_ACCENT },
    { label:'Kedaluwarsa', val:status.kedaluwarsa, color: RED },
  ];

  return (
    <div style={{ minHeight:'100dvh', fontFamily: FONT, background:'radial-gradient(1100px 520px at 85% -8%, rgba(33,40,66,0.05) 0%, rgba(33,40,66,0) 55%), linear-gradient(180deg,#F3ECDD,#EDE4D0)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); filter:blur(4px); } to { opacity:1; transform:none; filter:blur(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .rise { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
        .lift { transition: all 0.45s cubic-bezier(0.32,0.72,0,1); }
        .lift:hover { transform: translateY(-4px); box-shadow: 0 28px 50px -28px rgba(33,40,66,0.28) !important; }
        .lift:active { transform: translateY(-1px) scale(0.995); }
        .lift:hover .ic-wrap { transform: scale(1.08) rotate(-4deg); }
        .ic-wrap { transition: transform 0.45s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover { transform: translateY(-1px); filter: brightness(1.05); }
        .btn-hover:active { transform: scale(0.96); }
        .refresh-spin { animation: spin 0.8s linear infinite; }
      `}</style>

      {/* Navbar */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '1.4rem 1.5rem 0' }}>
        <nav style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(240,231,213,0.75)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          border:'1px solid rgba(33,40,66,0.1)', borderRadius:100, padding:'10px 14px 10px 18px',
          boxShadow:'0 10px 30px -18px rgba(33,40,66,0.3)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:11, fontWeight:800, fontSize:15, color: INDIGO, letterSpacing:'-0.02em' }}>
            <div style={{ width:34, height:34, borderRadius:11, background: INDIGO, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 18px -8px rgba(33,40,66,0.5)' }}>
              <FaFileAlt size={15} color={CREAM} />
            </div>
            SI-POKJA HUMKER
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <a href="/dashboard/superadmin/laporan" className="btn-hover" style={navBtn}>
              <FiBarChart2 size={13} /> Laporan
            </a>
            <div style={{ width:34, height:34, borderRadius:'50%', background:`linear-gradient(150deg,${INDIGO},#0b1420)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12.5, fontWeight:800, color:'#fff', boxShadow:'0 4px 10px -3px rgba(33,40,66,0.5)' }}>
              {nama.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
            </div>
            <button onClick={logout} className="btn-hover" style={{ ...navBtn, background:'#fff' }}>
              <FiLogOut size={13} /> Keluar
            </button>
          </div>
        </nav>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '1.5rem' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:14 }} className="rise">
          <div>
            <div style={{ display:'inline-block', fontSize:9.5, color: INDIGO, textTransform:'uppercase', letterSpacing:'0.22em', fontWeight:700, background:'rgba(33,40,66,0.06)', padding:'6px 14px', borderRadius:100, marginBottom:12 }}>
              Superadmin
            </div>
            <h1 style={{ fontSize:30, fontWeight:800, color: INDIGO, letterSpacing:'-0.03em', margin:'0 0 4px' }}>
              Selamat datang, {nama.split(' ')[0]}
            </h1>
            <p style={{ fontSize:13, color:'rgba(33,40,66,0.55)', margin:0 }}>Ringkasan performa sistem · data langsung dari Google Sheets</p>
          </div>
          <button onClick={doRefresh} className="btn-hover" style={{ ...navBtn, background:'#fff' }}>
            <FiRefreshCw size={13} className={refreshing ? 'refresh-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Metric cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:13, marginBottom:18 }}>
          {metricCards.map((m, i) => (
            <div key={m.label} style={{ ...shellSm, animationDelay:`${0.03*i+0.05}s` }} className="lift rise">
              <div style={{ ...coreSm, padding:'1.1rem 1.2rem' }}>
                <div className="ic-wrap" style={{ width:36, height:36, borderRadius:11, background:m.bg, color:m.c, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  {m.icon}
                </div>
                <div style={{ fontSize:11.5, color:'rgba(33,40,66,0.55)', marginBottom:4, fontWeight:600 }}>{m.label}</div>
                <div style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.03em', color: INDIGO }}>{m.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Grafik */}
        <div style={{ ...shell, marginBottom:18 }} className="rise">
          <div style={{ ...core, padding:'1.4rem 1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <span style={{ fontSize:14, fontWeight:800, color: INDIGO, display:'flex', alignItems:'center', gap:8 }}>
                <FiTrendingUp size={16} /> Perkembangan MOU/PKS
              </span>
              <div style={{ display:'flex', gap:14, fontSize:11, color:'rgba(33,40,66,0.55)', fontWeight:600 }}>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:9, height:9, borderRadius:3, background:INDIGO }} />MOU</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:9, height:9, borderRadius:3, background:GOLD_ACCENT }} />PKS</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:9, height:9, borderRadius:3, background:RED }} />Berakhir</span>
              </div>
            </div>
            <div style={{ position:'relative', height:220 }}>
              <canvas ref={chartRef} role="img" aria-label="Grafik perkembangan MOU dan PKS">Grafik perkembangan MOU/PKS</canvas>
            </div>
          </div>
        </div>

        {/* Status MOU/PKS */}
        <div style={{ marginBottom:18 }}>
          <div style={shell} className="rise">
            <div style={{ ...core, padding:'1.3rem 1.4rem' }}>
              <div style={{ fontSize:13, fontWeight:800, color: INDIGO, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <FiPieChart size={15} /> Status MOU/PKS
              </div>
              {statusItems.map((s, i) => (
                <div key={i} style={{ marginBottom: i === statusItems.length - 1 ? 0 : 12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
                    <span style={{ color:'#3a3f4d', fontWeight:600 }}>{s.label}</span>
                    <span style={{ color:'rgba(33,40,66,0.55)', fontWeight:700 }}>{s.val}</span>
                  </div>
                  <div style={{ height:8, background:'rgba(33,40,66,0.06)', borderRadius:100, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:100, background:s.color, width:`${Math.round((s.val/totalStatus)*100)}%`, transition:'width 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mitra grid */}
        <div style={shell} className="rise">
          <div style={{ ...core, padding:'1.3rem 1.4rem' }}>
            <div style={{ fontSize:13, fontWeight:800, color: INDIGO, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <FaBuilding size={13} /> Mitra Terdaftar
            </div>
            {mitraData.length === 0 && <p style={{ fontSize:12, color:'rgba(33,40,66,0.4)' }}>Belum ada mitra terdaftar.</p>}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(104px,1fr))', gap:9 }}>
              {mitraData.map(m => {
                const pal = AVATAR_PALETTE[m.index % AVATAR_PALETTE.length];
                return (
                  <div key={m.id} style={{ background:'rgba(33,40,66,0.02)', borderRadius:13, padding:'0.75rem', textAlign:'center' }}>
                    <div style={{ width:36, height:36, borderRadius:11, background:pal.bg, margin:'0 auto 6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:pal.fg }}>
                      {m.singkatan}
                    </div>
                    <div style={{ fontSize:10.5, fontWeight:700, lineHeight:1.3, color: INDIGO }}>{m.nama}</div>
                    <div style={{ fontSize:10, color:'rgba(33,40,66,0.4)', marginTop:2 }}>{m.jumlahDok} dok</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const shell: React.CSSProperties = { background:'rgba(255,255,255,0.55)', border:'1px solid rgba(33,40,66,0.07)', borderRadius:24, padding:7, boxShadow:'0 1px 2px rgba(33,40,66,0.04), 0 30px 60px -38px rgba(33,40,66,0.18)' };
const core: React.CSSProperties = { background:'#fff', borderRadius:18, boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const shellSm: React.CSSProperties = { ...shell, borderRadius:20, padding:6 };
const coreSm: React.CSSProperties = { ...core, borderRadius:15 };
const navBtn: React.CSSProperties = { display:'flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:700, padding:'8px 15px', borderRadius:100, border:'1px solid rgba(33,40,66,0.1)', background:'rgba(33,40,66,0.03)', color: INDIGO, textDecoration:'none', cursor:'pointer', fontFamily:FONT };
const centerStyle: React.CSSProperties = {
  minHeight:'100dvh', display:'flex', alignItems:'center',
  justifyContent:'center', fontFamily:FONT,
  color: RED, fontSize:14, background:'linear-gradient(180deg,#F3ECDD,#EDE4D0)',
};