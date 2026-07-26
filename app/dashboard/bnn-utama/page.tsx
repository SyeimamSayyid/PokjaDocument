'use client';

import { useEffect, useState } from 'react';
import LoaderPage from '@/components/LoaderPage';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import { DonutChart, BarChart } from '@/components/DashboardCharts';
import EditPencilIndicator from '@/components/EditPencilIndicator';
import {
  FiFolder, FiFileText, FiCheckCircle, FiClock, FiAlertCircle, FiCheck,
  FiArrowUpRight, FiInbox, FiClipboard, FiGrid, FiArchive, FiUsers, FiShield,
  FiBell, FiDownload, FiDroplet,
} from 'react-icons/fi';

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const JADE = '#ABD1C6';
const JADE_DEEP = '#2F5449';
const JADE_DARKER = '#1F3B33';
const INDIGO = '#212842';
const GOLD = '#B5813F';
const CLOUD = '#FAFAFA';
const INK = '#1E2A27';
const RED = '#A32D2D';

interface Ringkasan {
  totalInstitusi: number;
  totalDokumen: number;
  mouCount: number;
  pksCount: number;
  statusCount: Record<string, number>;
  menungguReview: number;
}
interface ChartSumber { sistem: number; arsip: number; }
interface ChartMitra { totalInstitusi: number; mitraTerdaftar: number; }
interface DokAntrian {
  id: string; jenis: string; judul: string; namaMitra: string;
  tglBerlaku: string; tglBerakhir: string; tglDibuat: string;
  manualLog?: string;
}
interface DokDisetujui {
  id: string; jenis: string; judul: string; namaMitra: string;
  tglDisetujui: string; disetujuiOleh: string;
}
interface DokBaru {
  id: string; jenis: string; judul: string; namaMitra: string;
  status: string; tglDibuat: string;
}
interface Riwayat {
  idDokumen: string; pesan: string; tglDibuat: string; judul: string; namaMitra: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { href: '/dashboard/bnn-utama', icon: <FiGrid size={17} />, label: 'Dashboard' },
  { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Dokumen & Tata Kelola' },
  { href: '/dashboard/dokumen-basah', icon: <FiDroplet size={17} />, label: 'Dokumen Basah' },
  { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
  { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
  { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Daftar Admin' },
];

export default function BnnUtamaDashboard() {
  const [nama, setNama] = useState('');
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [chartSumber, setChartSumber] = useState<ChartSumber>({ sistem: 0, arsip: 0 });
  const [chartMitra, setChartMitra] = useState<ChartMitra>({ totalInstitusi: 0, mitraTerdaftar: 0 });
  const [antrian, setAntrian] = useState<DokAntrian[]>([]);
  const [dokumenSelesaiList, setDokumenSelesaiList] = useState<DokAntrian[]>([]);
  const [dokumenDisetujuiList, setDokumenDisetujuiList] = useState<DokDisetujui[]>([]);
  const [dokumenBaru, setDokumenBaru] = useState<DokBaru[]>([]);
  const [dokumenBasahMenunggu, setDokumenBasahMenunggu] = useState(0);
  const [cardBaruTerbuka, setCardBaruTerbuka] = useState(false);
  const [selesaiTerbuka, setSelesaiTerbuka] = useState(false);
  const [disetujuiTerbuka, setDisetujuiTerbuka] = useState(false);
  const [idTerakhirDilihat, setIdTerakhirDilihat] = useState<string>('');
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin', 'superadmin'].includes(u.role) || u.level !== 'utama') {
          window.location.href = u.level === 'bnnp_bnnk' ? '/dashboard/admin' : '/login';
          return;
        }
        setNama(u.nama || 'Admin BNN Utama');
        return fetch('/api/dashboard/bnn-utama').then(r => r.json());
      })
      .then(d => {
        if (!d) return;
        if (d.message || d.error) { setError(d.message || 'Gagal memuat data.'); setLoading(false); return; }
        setRingkasan(d.ringkasan);
        setChartSumber(d.chartSumber || { sistem: 0, arsip: 0 });
        setChartMitra(d.chartMitra || { totalInstitusi: 0, mitraTerdaftar: 0 });
        setAntrian(d.antrianReview || []);
        setDokumenSelesaiList(d.dokumenSelesai || []);
        setDokumenDisetujuiList(d.dokumenDisetujui || []);
        setDokumenBaru(d.dokumenBaru || []);
        try { setIdTerakhirDilihat(localStorage.getItem('bnnUtama_dokBaru_dilihat') || ''); } catch {}
        setRiwayat(d.riwayatKeputusan || []);
        setLoading(false);

        fetch('/api/dokumen/dokumen-basah')
          .then(r => r.json())
          .then(dd => setDokumenBasahMenunggu((dd.data || []).filter((x: { ttdStatus: string }) => x.ttdStatus === 'Menunggu Basah').length))
          .catch(() => {});
      })
      .catch(() => { setError('Gagal memuat data.'); setLoading(false); });
  }, []);

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  if (loading) return <LoaderPage text="Memuat dashboard BNN Utama..." />;
  if (error || !ringkasan) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: RED, gap: 10 }}>
        <FiAlertCircle size={44} style={{ opacity: 0.5 }} />
        <div style={{ fontSize: 16, fontWeight: 700 }}>Gagal Memuat Data</div>
        <div style={{ fontSize: 13, color: '#9aa5a1' }}>{error}</div>
      </div>
    );
  }

  const totalSumber = chartSumber.sistem + chartSumber.arsip || 1;
  const persenSistem = Math.round((chartSumber.sistem / totalSumber) * 100);

  // Jumlah dokumen "belum dilihat" — dihitung dari posisi idTerakhirDilihat di
  // list (dokumenBaru sudah di-sort terbaru dulu). Kalau id itu tidak ketemu
  // (belum pernah buka / ada dokumen jauh lebih baru), semua dianggap belum dilihat.
  const idxTerakhirDilihat = dokumenBaru.findIndex(d => d.id === idTerakhirDilihat);
  const jumlahBelumDilihat = idxTerakhirDilihat === -1 ? dokumenBaru.length : idxTerakhirDilihat;

  const toggleCardBaru = () => {
    const buka = !cardBaruTerbuka;
    setCardBaruTerbuka(buka);
    if (buka && dokumenBaru.length > 0) {
      try { localStorage.setItem('bnnUtama_dokBaru_dilihat', dokumenBaru[0].id); } catch {}
      setIdTerakhirDilihat(dokumenBaru[0].id);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: `linear-gradient(180deg,${CLOUD},#F2F6F4)` }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .rise { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        .lift { transition: all 0.4s cubic-bezier(0.32,0.72,0,1); }
        .lift:hover { transform: translateY(-3px); box-shadow: 0 24px 46px -26px rgba(47,84,73,0.28) !important; }
        .btn-hover { transition: all 0.25s ease; }
        .btn-hover:hover { filter: brightness(1.05); }
        .notif-item { transition: background 0.2s ease; }
        .notif-item:hover { background: rgba(171,209,198,0.15); }
        @media (min-width: 901px) {
          .main-content { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={SIDEBAR_ITEMS.map(item => item.label === 'Dokumen Basah' ? { ...item, notifCount: dokumenBasahMenunggu } : item)}
        activeHref="/dashboard/bnn-utama"
        brandLabel="E-POKJA HUKER"
        brandSub="BNN Utama"
        userName={nama}
        userTag="Admin BNN Utama"
        accent={JADE}
        onLogout={logout}
      />

      <div className="main-content" style={{ padding: '1.75rem 2rem 3rem', maxWidth: 1180 }}>
        <div style={{ marginBottom: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', position: 'relative' }} className="rise">
          <div>
            <span style={{ fontSize: 9.5, color: JADE_DEEP, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, background: 'rgba(171,209,198,0.25)', padding: '6px 14px', borderRadius: 100 }}>
              Pengawasan Lintas Wilayah
            </span>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: JADE_DEEP, letterSpacing: '-0.03em', margin: '10px 0 4px' }}>
              Selamat datang, {nama.split(' ')[0]}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(47,84,73,0.6)', margin: 0 }}>
              Data langsung dari Google Sheets — seluruh institusi BNNP/BNNK
            </p>
          </div>
          <a href="https://drive.google.com/uc?export=download&id=14Pl55nm_IgSn_spHvGphU4y7cyFGKs7P" target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 100,
            background: '#fff', border: '1px solid rgba(47,84,73,0.12)', color: JADE_DEEP,
            fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            boxShadow: '0 6px 18px -10px rgba(47,84,73,0.25)',
          }} className="btn-hover">
            <FiDownload size={14} /> Unduh Panduan
          </a>
        </div>

        {/* Card Dokumen Baru — bagian tetap di layout dashboard, bisa dibuka/tutup */}
        {dokumenBaru.length > 0 && (
          <div style={{ ...shell, marginBottom: 18 }} className="rise">
            <div style={{ ...core, padding: 0, overflow: 'hidden' }}>
              <button onClick={toggleCardBaru} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '1.1rem 1.3rem',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
              }}>
                <FiBell size={15} style={{ color: JADE_DEEP, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: JADE_DEEP, flex: 1 }}>Dokumen Baru dari Sistem</span>
                {jumlahBelumDilihat > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 800, background: '#DC2626', color: '#fff', borderRadius: 100, padding: '1px 8px' }}>{jumlahBelumDilihat}</span>
                )}
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{cardBaruTerbuka ? 'Tutup' : 'Buka'}</span>
              </button>

              {cardBaruTerbuka && (
                <div style={{ padding: '0 1.3rem 1.1rem' }} className="rise">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                    {dokumenBaru.map(d => (
                      <a key={d.id} href={`/dashboard/dokumen/${d.id}`} style={{
                        display: 'block', padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                        background: 'rgba(171,209,198,0.08)', border: '1px solid rgba(171,209,198,0.25)',
                      }} className="notif-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 8px', borderRadius: 100, background: d.jenis === 'MOU' ? '#DBEAFE' : '#FEF3C7', color: d.jenis === 'MOU' ? '#1D4ED8' : '#92400E' }}>{d.jenis}</span>
                          <span style={{ fontSize: 9.5, color: '#94a3b8' }}>{d.status}</span>
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f1f3d', marginBottom: 2 }}>{d.judul}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{d.namaMitra} · {d.tglDibuat}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ringkasan stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
          {[
            { lbl: 'Total Institusi', val: ringkasan.totalInstitusi, icon: <FiFolder size={14} /> },
            { lbl: 'Total Dokumen', val: ringkasan.totalDokumen, icon: <FiFileText size={14} /> },
            { lbl: 'MOU', val: ringkasan.mouCount, icon: <FiCheckCircle size={14} /> },
            { lbl: 'PKS', val: ringkasan.pksCount, icon: <FiClipboard size={14} /> },
            { lbl: 'Menunggu Draft', val: ringkasan.menungguReview, icon: <FiInbox size={14} />, warn: ringkasan.menungguReview > 0 },
          ].map((s, i) => (
            <div key={s.lbl} style={{ ...shellSm, animationDelay: `${0.03 * i}s` }} className="rise">
              <div style={{ ...coreSm, padding: '1rem 1.1rem' }}>
                <div style={{ fontSize: 10.5, color: 'rgba(47,84,73,0.6)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>{s.icon} {s.lbl}</div>
                <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em', color: s.warn ? RED : JADE_DEEP }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Visualisasi: Sistem vs Arsip, Mitra terdaftar, MOU/PKS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: 14, marginBottom: 18 }}>
          <div style={shell} className="rise">
            <div style={{ ...core, padding: '1.1rem 1.2rem' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: JADE_DEEP, marginBottom: 14 }}>Dokumen: Sistem vs Arsip</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <DonutChart
                  size={110} thickness={14}
                  segments={[
                    { label: 'Sistem', value: chartSumber.sistem, color: JADE_DEEP },
                    { label: 'Arsip', value: chartSumber.arsip, color: GOLD },
                  ]}
                  centerLabel={`${persenSistem}%`}
                  centerSub="Sistem"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: JADE_DEEP, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: '#334155' }}>Sistem: <strong>{chartSumber.sistem}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: GOLD, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: '#334155' }}>Arsip: <strong>{chartSumber.arsip}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={shell} className="rise">
            <div style={{ ...core, padding: '1.1rem 1.2rem' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: JADE_DEEP, marginBottom: 14 }}>Institusi vs Mitra Terdaftar</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <DonutChart
                  size={110} thickness={14}
                  segments={[
                    { label: 'Terdaftar', value: chartMitra.mitraTerdaftar, color: INDIGO },
                    { label: 'Belum', value: Math.max(0, chartMitra.totalInstitusi - chartMitra.mitraTerdaftar), color: 'rgba(33,40,66,0.12)' },
                  ]}
                  centerLabel={String(chartMitra.mitraTerdaftar)}
                  centerSub="Terdaftar"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: INDIGO, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: '#334155' }}>Terdaftar: <strong>{chartMitra.mitraTerdaftar}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: 'rgba(33,40,66,0.25)', flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: '#334155' }}>Total institusi: <strong>{chartMitra.totalInstitusi}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={shell} className="rise">
            <div style={{ ...core, padding: '1.1rem 1.2rem' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: JADE_DEEP, marginBottom: 6 }}>Jenis Dokumen</div>
              <BarChart height={130} groups={[
                { label: 'MOU', values: [{ value: ringkasan.mouCount, color: JADE_DEEP }] },
                { label: 'PKS', values: [{ value: ringkasan.pksCount, color: GOLD }] },
                { label: 'Sistem', values: [{ value: chartSumber.sistem, color: '#7BA396' }] },
                { label: 'Arsip', values: [{ value: chartSumber.arsip, color: '#D4B483' }] },
              ]} />
            </div>
          </div>
        </div>

        {/* Antrian Draft */}
        <div style={shell} className="rise">
          <div style={{ ...core, padding: '1.3rem 1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <FiClipboard size={16} style={{ color: JADE_DEEP }} />
              <span style={{ fontSize: 14.5, fontWeight: 800, color: JADE_DEEP }}>Antrian Draft ({antrian.length})</span>
            </div>
            {antrian.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(47,84,73,0.35)' }}>
                <FiCheckCircle size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Tidak ada dokumen berstatus draft saat ini</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {antrian.map(d => (
                  <a key={d.id} href={`/dashboard/dokumen/${d.id}`} style={{ textDecoration: 'none', color: 'inherit' }} className="lift">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#F5FAF8', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(171,209,198,0.45)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: d.jenis === 'MOU' ? '#DBEAFE' : '#FEF3C7', color: d.jenis === 'MOU' ? '#1D4ED8' : '#92400E' }}>{d.jenis}</span>
                          <span style={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>{d.judul}</span>
                          <EditPencilIndicator manualLog={d.manualLog} size={20} />
                        </div>
                        <div style={{ fontSize: 11.5, color: 'rgba(47,84,73,0.6)' }}>{d.namaMitra} · Dibuat {d.tglDibuat}</div>
                      </div>
                      <FiArrowUpRight size={16} style={{ color: JADE_DEEP, flexShrink: 0 }} />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dokumen Selesai — lintas provinsi, collapsible karena bisa panjang */}
        <div style={{ ...shell, marginTop: 18 }} className="rise">
          <div style={{ ...core, padding: 0, overflow: 'hidden' }}>
            <button onClick={() => setSelesaiTerbuka(v => !v)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '1.3rem 1.4rem',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
            }}>
              <FiCheckCircle size={16} style={{ color: JADE_DEEP, flexShrink: 0 }} />
              <span style={{ fontSize: 14.5, fontWeight: 800, color: JADE_DEEP, flex: 1 }}>Dokumen Selesai ({dokumenSelesaiList.length})</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{selesaiTerbuka ? 'Tutup' : 'Buka'}</span>
            </button>

            {selesaiTerbuka && (
              <div style={{ padding: '0 1.4rem 1.3rem' }} className="rise">
                {dokumenSelesaiList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(47,84,73,0.35)' }}>
                    <FiFileText size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Belum ada dokumen berstatus Selesai</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dokumenSelesaiList.map(d => (
                      <a key={d.id} href={`/dashboard/dokumen/${d.id}`} style={{ textDecoration: 'none', color: 'inherit' }} className="lift">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#F5FAF8', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(171,209,198,0.45)' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: d.jenis === 'MOU' ? '#DBEAFE' : '#FEF3C7', color: d.jenis === 'MOU' ? '#1D4ED8' : '#92400E' }}>{d.jenis}</span>
                              <span style={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>{d.judul}</span>
                              <EditPencilIndicator manualLog={d.manualLog} size={20} />
                            </div>
                            <div style={{ fontSize: 11.5, color: 'rgba(47,84,73,0.6)' }}>
                              {d.namaMitra}{d.tglBerlaku ? ` · Berlaku ${d.tglBerlaku}` : ''}{d.tglBerakhir ? ` s.d. ${d.tglBerakhir}` : ''}
                            </div>
                          </div>
                          <FiArrowUpRight size={16} style={{ color: JADE_DEEP, flexShrink: 0 }} />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dokumen Disetujui — sudah di-ACC final oleh BNN Utama sendiri */}
        <div style={{ ...shell, marginTop: 18 }} className="rise">
          <div style={{ ...core, padding: 0, overflow: 'hidden' }}>
            <button onClick={() => setDisetujuiTerbuka(v => !v)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '1.3rem 1.4rem',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
            }}>
              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:20, height:20, borderRadius:'50%', background:'#1D4ED8', color:'#fff', flexShrink:0 }}>
                <FiCheck size={12} strokeWidth={3} />
              </span>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: JADE_DEEP, flex: 1 }}>Dokumen Disetujui ({dokumenDisetujuiList.length})</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{disetujuiTerbuka ? 'Tutup' : 'Buka'}</span>
            </button>

            {disetujuiTerbuka && (
              <div style={{ padding: '0 1.4rem 1.3rem' }} className="rise">
                {dokumenDisetujuiList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(47,84,73,0.35)' }}>
                    <FiFileText size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Belum ada dokumen yang di-ACC final</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dokumenDisetujuiList.map(d => (
                      <a key={d.id} href={`/dashboard/dokumen/${d.id}`} style={{ textDecoration: 'none', color: 'inherit' }} className="lift">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#F5FAF8', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(171,209,198,0.45)' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: d.jenis === 'MOU' ? '#DBEAFE' : '#FEF3C7', color: d.jenis === 'MOU' ? '#1D4ED8' : '#92400E' }}>{d.jenis}</span>
                              <span style={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>{d.judul}</span>
                              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:16, height:16, borderRadius:'50%', background:'#1D4ED8', color:'#fff', flexShrink:0 }}>
                                <FiCheck size={9} strokeWidth={3} />
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: 'rgba(47,84,73,0.6)' }}>
                              {d.namaMitra}{d.disetujuiOleh ? ` · disetujui oleh ${d.disetujuiOleh}` : ''}{d.tglDisetujui ? ` · ${d.tglDisetujui}` : ''}
                            </div>
                          </div>
                          <FiArrowUpRight size={16} style={{ color: JADE_DEEP, flexShrink: 0 }} />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Riwayat Keputusan */}
        <div style={{ ...shell, marginTop: 18 }} className="rise">
          <div style={{ ...core, padding: '1.3rem 1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <FiFileText size={16} style={{ color: JADE_DEEP }} />
              <span style={{ fontSize: 14.5, fontWeight: 800, color: JADE_DEEP }}>Riwayat Keputusan Terbaru</span>
            </div>
            {riwayat.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(47,84,73,0.35)' }}>
                <FiClock size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Belum ada keputusan yang tercatat</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {riwayat.map((r, i) => (
                  <a key={i} href={`/dashboard/dokumen/${r.idDokumen}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(171,209,198,0.12)', borderLeft: `3px solid ${JADE}` }}>
                      <div style={{ fontSize: 12.5, color: INK, fontWeight: 600, marginBottom: 2 }}>{r.judul} {r.namaMitra ? `· ${r.namaMitra}` : ''}</div>
                      <div style={{ fontSize: 11.5, color: 'rgba(47,84,73,0.65)' }}>{r.pesan}</div>
                      <div style={{ fontSize: 10, color: 'rgba(47,84,73,0.5)', marginTop: 3 }}>{r.tglDibuat}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const shell: React.CSSProperties = { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(47,84,73,0.1)', borderRadius: 24, padding: 7, boxShadow: '0 1px 2px rgba(47,84,73,0.05), 0 30px 60px -38px rgba(47,84,73,0.15)' };
const core: React.CSSProperties = { background: '#fff', borderRadius: 18, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)' };
const shellSm: React.CSSProperties = { ...shell, borderRadius: 20, padding: 6 };
const coreSm: React.CSSProperties = { ...core, borderRadius: 15 };