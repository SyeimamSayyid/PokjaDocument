'use client';

import { useEffect, useState, useRef } from 'react';
import LoaderPage from '@/components/LoaderPage';

interface Metrics {
  adminAktif: number; totalMitra: number; dokAktif: number;
  dokHampir: number; dokDraft: number; totalDok: number;
}
interface Status { aktif: number; draft: number; review: number; kedaluwarsa: number }
interface GrafikItem { label: string; mou: number; pks: number; exp: number }
interface AdminItem { id: string; nama: string; status: string; jumlahDok: number }
interface MitraItem { id: string; nama: string; singkatan: string; jumlahDok: number; index: number }
interface Implementasi { totalAudiens: number; totalKegiatan: number; totalFoto: number }

interface DashData {
  metrics: Metrics; status: Status; grafik: GrafikItem[];
  adminData: AdminItem[]; mitraData: MitraItem[]; implementasi: Implementasi;
}

const AVATAR_COLORS = [
  ['#E1F5EE','#085041'], ['#EEEDFE','#3C3489'], ['#FAEEDA','#633806'],
  ['#E6F1FB','#0C447C'], ['#EAF3DE','#27500A'], ['#FAECE7','#712B13'],
];

export default function SuperadminDashboard() {
  const [nama, setNama]     = useState('');
  const [data, setData]     = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [period, setPeriod] = useState<'bulan'|'tahun'>('bulan');
  const chartRef            = useRef<HTMLCanvasElement>(null);
  const chartInstance       = useRef<unknown>(null);

  // Auth check
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

  // Render chart
  useEffect(() => {
    if (!data || !chartRef.current) return;
    const win = window as unknown as { Chart?: unknown };

    const renderChart = () => {
      if (!win.Chart) { setTimeout(renderChart, 200); return; }
      const C = win.Chart as new (...args: unknown[]) => unknown;
      if (chartInstance.current) (chartInstance.current as { destroy: () => void }).destroy();

      const labels = period === 'tahun'
        ? ['2021','2022','2023','2024','2025']
        : data.grafik.map(g => g.label);
      const mouData = period === 'tahun'
        ? [8,12,15,18, data.grafik.reduce((s,g) => s+g.mou, 0)]
        : data.grafik.map(g => g.mou);
      const pksData = period === 'tahun'
        ? [5,9,11,14, data.grafik.reduce((s,g) => s+g.pks, 0)]
        : data.grafik.map(g => g.pks);
      const expData = period === 'tahun'
        ? [1,2,3,4, data.grafik.reduce((s,g) => s+g.exp, 0)]
        : data.grafik.map(g => g.exp);

      chartInstance.current = new C(chartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label:'MOU baru', data:mouData, backgroundColor:'#0F6E56', borderRadius:3, barPercentage:.55 },
            { label:'PKS baru', data:pksData, backgroundColor:'#185FA5', borderRadius:3, barPercentage:.55 },
            { label:'Berakhir', data:expData, backgroundColor:'#EF9F27', borderRadius:3, barPercentage:.55 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid:{display:false}, ticks:{font:{size:10}, color:'#888780', autoSkip:false, maxRotation:0} },
            y: { grid:{color:'rgba(0,0,0,.06)'}, ticks:{font:{size:10}, color:'#888780', stepSize:1} }
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
  }, [data, period]);

  const logout = () => {
    localStorage.removeItem('paktasign_user');
    document.cookie = 'paktasign_user=; path=/; max-age=0';
    document.cookie = 'paktasign_role=; path=/; max-age=0';
    window.location.href = '/login';
  };

  if (loading) return <LoaderPage text="Memuat dashboard..." />;
  if (error || !data) return (
    <div style={{...centerStyle, color:'#f87171'}}>{error || 'Terjadi kesalahan.'}</div>
  );

  const { metrics, status, adminData, mitraData, implementasi } = data;
  const totalStatus = (status.aktif + status.draft + status.review + status.kedaluwarsa) || 1;

  const metricCards = [
    { label:'Admin Pokja aktif', val:metrics.adminAktif, icon:'👥', warn:false },
    { label:'Total mitra',       val:metrics.totalMitra, icon:'🏢', warn:false },
    { label:'MOU/PKS aktif',     val:metrics.dokAktif,   icon:'📄', warn:false },
    { label:'Hampir berakhir',   val:metrics.dokHampir,  icon:'⚠️', warn:metrics.dokHampir > 0 },
    { label:'Draft/menunggu',    val:metrics.dokDraft,   icon:'🕐', warn:false },
    { label:'Total dokumen',     val:metrics.totalDok,   icon:'📁', warn:false },
  ];

  const statusItems = [
    { label:'Aktif',       val:status.aktif,       color:'#0F6E56' },
    { label:'Draft',       val:status.draft,       color:'#185FA5' },
    { label:'Review',      val:status.review,      color:'#EF9F27' },
    { label:'Kedaluwarsa', val:status.kedaluwarsa, color:'#A32D2D' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:'sans-serif' }}>

      {/* Navbar */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 1.5rem', background:'#fff', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontWeight:600, fontSize:15 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'#0F6E56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#fff' }}>📋</div>
          SI-POKJA HUMKER
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href="/dashboard/superadmin/kelola-admin" style={{ fontSize:11, padding:'5px 12px', borderRadius:8, border:'1px solid #e5e7eb', textDecoration:'none', color:'#374151', background:'transparent' }}>
            👥 Kelola Admin
          </a>
          <a href="/dashboard/superadmin/generate-kode" style={{ fontSize:11, padding:'5px 12px', borderRadius:8, border:'1px solid #e5e7eb', textDecoration:'none', color:'#374151', background:'transparent' }}>
            🔑 Generate Kode
          </a>
          <a href="/dashboard/superadmin/laporan" style={{ fontSize:11, padding:'5px 12px', borderRadius:8, border:'1px solid #e5e7eb', textDecoration:'none', color:'#374151', background:'transparent' }}>
            📊 Laporan
          </a>
          <a href="/dashboard/rencana" style={{ fontSize:11, padding:'5px 12px', borderRadius:8, border:'1px solid #e5e7eb', textDecoration:'none', color:'#374151', background:'#fff' }}>
  🗓 E-Planning
</a>
          <span style={{ fontSize:12, color:'#6b7280' }}>👑 {nama}</span>
          <button onClick={logout} style={{ fontSize:12, padding:'6px 14px', borderRadius:8, border:'1px solid #e5e7eb', cursor:'pointer', background:'transparent', color:'#374151' }}>Keluar</button>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'1.25rem' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:600 }}>Dashboard Superadmin</div>
            <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Data real-time dari Google Sheets</div>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <div style={{ display:'flex', gap:4 }}>
              {(['bulan','tahun'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{ fontSize:11, padding:'4px 12px', borderRadius:100, border:'1px solid #e5e7eb', cursor:'pointer', background: period===p ? '#0F6E56' : 'transparent', color: period===p ? '#fff' : '#6b7280', fontFamily:'sans-serif' }}>
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => window.location.reload()} style={{ fontSize:11, padding:'5px 12px', borderRadius:8, border:'1px solid #e5e7eb', cursor:'pointer', background:'transparent', color:'#374151', fontFamily:'sans-serif' }}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:'1rem' }}>
          {metricCards.map((m,i) => (
            <div key={i} style={{ background:'#fff', borderRadius:12, padding:'1rem', border:'1px solid #e5e7eb' }}>
              <div style={{ fontSize:12, color:'#6b7280', marginBottom:6 }}>{m.icon} {m.label}</div>
              <div style={{ fontSize:28, fontWeight:600, color: m.warn ? '#A32D2D' : '#111827' }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Grafik */}
        <div style={{ background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'1px solid #e5e7eb', marginBottom:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Perkembangan MOU/PKS</div>
            <div style={{ display:'flex', gap:12, fontSize:11, color:'#6b7280' }}>
              <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#0F6E56', marginRight:4 }}></span>MOU</span>
              <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#185FA5', marginRight:4 }}></span>PKS</span>
              <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#EF9F27', marginRight:4 }}></span>Berakhir</span>
            </div>
          </div>
          <div style={{ position:'relative', height:200 }}>
            <canvas ref={chartRef} role="img" aria-label="Grafik perkembangan MOU dan PKS">Grafik perkembangan MOU/PKS</canvas>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1rem' }}>

          {/* Status */}
          <div style={{ background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'1px solid #e5e7eb' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Status MOU/PKS</div>
            {statusItems.map((s,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ fontSize:12, color:'#6b7280', minWidth:90 }}>{s.label}</div>
                <div style={{ flex:1, height:6, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:3, background:s.color, width:`${Math.round((s.val/totalStatus)*100)}%`, transition:'width .4s' }}></div>
                </div>
                <div style={{ fontSize:12, fontWeight:600, minWidth:20, textAlign:'right' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Implementasi */}
          <div style={{ background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'1px solid #e5e7eb' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Implementasi & Capaian</div>
            {[
              { icon:'👥', label:'Total audiens terjangkau', val: implementasi.totalAudiens.toLocaleString('id-ID')+' orang' },
              { icon:'📅', label:'Kegiatan P4GN terlaksana', val: implementasi.totalKegiatan+' kegiatan' },
              { icon:'📷', label:'Laporan foto diupload',    val: implementasi.totalFoto+' foto' },
            ].map((item,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'0.6rem 0.75rem', background:'#f9fafb', borderRadius:8, marginBottom:6 }}>
                <div style={{ fontSize:20 }}>{item.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:'#6b7280' }}>{item.label}</div>
                  <div style={{ fontSize:13, fontWeight:600, marginTop:1 }}>{item.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1rem' }}>

          {/* Admin list */}
          <div style={{ background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'1px solid #e5e7eb' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Admin Pokja</div>
            {adminData.length === 0 && <p style={{ fontSize:12, color:'#9ca3af' }}>Belum ada admin terdaftar.</p>}
            {adminData.map((a,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'0.55rem 0.75rem', background:'#f9fafb', borderRadius:8, marginBottom:6 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#085041', flexShrink:0 }}>
                  {a.nama.substring(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500 }}>{a.nama}</div>
                  <div style={{ fontSize:11, color:'#9ca3af' }}>{a.jumlahDok} dokumen</div>
                </div>
                <span style={{ fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:100, background: a.status.toLowerCase()==='aktif' ? '#E1F5EE' : '#f3f4f6', color: a.status.toLowerCase()==='aktif' ? '#085041' : '#6b7280' }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>

          {/* Mitra grid */}
          <div style={{ background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'1px solid #e5e7eb' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Mitra terdaftar</div>
            {mitraData.length === 0 && <p style={{ fontSize:12, color:'#9ca3af' }}>Belum ada mitra terdaftar.</p>}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:8 }}>
              {mitraData.map((m) => {
                const [bg, fg] = AVATAR_COLORS[m.index % AVATAR_COLORS.length];
                return (
                  <div key={m.id} style={{ background:'#f9fafb', borderRadius:8, padding:'0.65rem', textAlign:'center' }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:bg, margin:'0 auto 5px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:fg }}>
                      {m.singkatan}
                    </div>
                    <div style={{ fontSize:10, fontWeight:500, lineHeight:1.3 }}>{m.nama}</div>
                    <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>{m.jumlahDok} dok</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Laporan */}
        <div style={{ background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'1px solid #e5e7eb' }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Generate Laporan Performa</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { icon:'📅', title:'Laporan Bulanan', desc:'Statistik MOU/PKS, mitra baru, kegiatan implementasi per bulan', btn:'Generate bulan ini' },
              { icon:'📊', title:'Laporan Tahunan',  desc:'Ringkasan tahunan dokumen aktif, capaian, dan tren kerja sama', btn:'Generate tahun ini' },
            ].map((l,i) => (
              <div key={i} style={{ background:'#f9fafb', borderRadius:8, padding:'1rem', textAlign:'center', border:'1px solid #e5e7eb' }}>
                <div style={{ fontSize:28, marginBottom:6 }}>{l.icon}</div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{l.title}</div>
                <div style={{ fontSize:11, color:'#6b7280', lineHeight:1.4, marginBottom:10 }}>{l.desc}</div>
                <button
                  onClick={() => alert(`Fitur generate ${l.title} akan segera tersedia`)}
                  style={{ width:'100%', padding:'7px', borderRadius:8, border:'1px solid #e5e7eb', cursor:'pointer', background:'transparent', color:'#374151', fontFamily:'sans-serif', fontSize:11 }}
                >
                  {l.btn}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

}

const centerStyle: React.CSSProperties = {
  minHeight:'100vh', display:'flex', alignItems:'center',
  justifyContent:'center', fontFamily:'sans-serif',
  color:'#6b7280', fontSize:14,
};