'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiMessageSquare, FiStar, FiCheck, FiInbox, FiCalendar, FiKey, FiFolder,
  FiActivity, FiUsers, FiList, FiArchive, FiFileText, FiShield, FiMessageCircle, FiDroplet,
} from 'react-icons/fi';

interface MasukanItem {
  id: string; sumber: string; identitas: string; kategori: string; isi: string;
  tglKirim: string; dibaca: boolean; dibacaOleh: string; rating: number;
}
interface Ringkasan { total: number; belumDibaca: number; rataRataRating: number; totalRating: number; }

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';
const CREAM = '#FAF8F0';
const GOLD = '#B5813F';

const KATEGORI_WARNA: Record<string, { bg: string; color: string }> = {
  'Kepuasan Layanan': { bg: '#DCFCE7', color: '#166534' },
  'Saran Perbaikan': { bg: '#DBEAFE', color: '#1D4ED8' },
  'Keluhan': { bg: '#FEE2E2', color: '#991B1B' },
  'Lainnya': { bg: '#F1F5F9', color: '#475569' },
};

function BintangTampil({ rating }: { rating: number }) {
  if (!rating) return <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Tanpa rating</span>;
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(b => (
        <FiStar key={b} size={13} fill={rating >= b ? GOLD : 'none'} style={{ color: rating >= b ? GOLD : '#e2e8f0' }} />
      ))}
    </div>
  );
}

export default function KotakSaranAdminPage() {
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [level, setLevel] = useState('');
  const [checking, setChecking] = useState(true);
  const [chatbotMenunggu, setChatbotMenunggu] = useState(0);
  const [data, setData] = useState<MasukanItem[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan>({ total: 0, belumDibaca: 0, rataRataRating: 0, totalRating: 0 });
  const [loading, setLoading] = useState(true);
  const [filterKategori, setFilterKategori] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/masukan-saran')
      .then(r => r.json())
      .then(d => { setData(d.data || []); setRingkasan(d.ringkasan || { total: 0, belumDibaca: 0, rataRataRating: 0, totalRating: 0 }); })
      .catch(() => setError('Gagal memuat data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setNamaAdmin(u.nama || u.email || 'Admin');
        setLevel(String(u.level || 'bnnp_bnnk'));
        setChecking(false);
        load();
        fetch('/api/chatbot/pertanyaan-masuk')
          .then(r => r.json())
          .then(d => setChatbotMenunggu((d.data || []).filter((p: { status: string }) => p.status === 'Menunggu').length))
          .catch(() => {});
      })
      .catch(() => { window.location.href = '/login'; });
  }, [load]);

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  const tandaiDibaca = async (id: string) => {
    try {
      await fetch('/api/masukan-saran', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, dibacaOleh: namaAdmin }),
      });
      load();
    } catch { setError('Gagal menandai dibaca.'); }
  };

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/dokumen-basah', icon: <FiDroplet size={17} />, label: 'Dokumen Basah' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiList size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/laporan', icon: <FiFileText size={17} />, label: 'Laporan' },
    { href: '/dashboard/kelola-chatbot', icon: <FiMessageCircle size={17} />, label: 'Kelola Chatbot', notifCount: chatbotMenunggu },
    { href: '/dashboard/kotak-saran', icon: <FiMessageSquare size={17} />, label: 'Kotak Saran', notifCount: ringkasan.belumDibaca },
    ...(level === 'bnnp_bnnk' ? [{ href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' }] : []),
  ];

  if (checking) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily: FONT, color: '#64748b', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(30,58,95,0.1)', borderTop: `3px solid ${INDIGO}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13 }}>Memuat...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const dataFiltered = filterKategori ? data.filter(d => d.kategori === filterKategori) : data;

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/kotak-saran"
        brandLabel="E-POKJA HUKER"
        brandSub="Admin BNNP/BNNK"
        navSectionTitle="Navigasi"
        userName={namaAdmin}
        userTag="Admin"
        accent={INDIGO}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 900, margin: '0 auto', padding: '1.4rem 1.5rem 3rem' }}>
        <div style={{ marginBottom: 20 }} className="fld">
          <h1 style={{ fontSize: 22, fontWeight: 800, color: INDIGO, margin: 0 }}>Kotak Saran & Kepuasan</h1>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 0' }}>Masukan dari mitra kerja sama untuk Pokja Kerja Sama BNN</p>
        </div>

        {error && <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', padding: '10px 14px', borderRadius: 10, marginBottom: 14 }} className="fld">{error}</div>}

        {/* Kartu ringkasan */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }} className="fld">
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(30,58,95,0.06)' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: INDIGO }}>{ringkasan.total}</div>
            <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Total Masukan</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(30,58,95,0.06)' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#B5813F' }}>{ringkasan.belumDibaca}</div>
            <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Belum Dibaca</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(30,58,95,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0a5c47' }}>{ringkasan.rataRataRating || '—'}</div>
              {ringkasan.rataRataRating > 0 && <FiStar size={18} fill={GOLD} style={{ color: GOLD }} />}
            </div>
            <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Rata-rata Kepuasan ({ringkasan.totalRating} rating)</div>
          </div>
        </div>

        {/* Filter kategori */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }} className="fld">
          <button onClick={() => setFilterKategori('')} style={{
            padding: '8px 15px', borderRadius: 100, border: !filterKategori ? 'none' : '1px solid rgba(30,58,95,0.1)',
            background: !filterKategori ? INDIGO : '#fff', color: !filterKategori ? CREAM : '#334155',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
          }}>
            Semua
          </button>
          {Object.keys(KATEGORI_WARNA).map(k => (
            <button key={k} onClick={() => setFilterKategori(k)} style={{
              padding: '8px 15px', borderRadius: 100, border: filterKategori === k ? 'none' : '1px solid rgba(30,58,95,0.1)',
              background: filterKategori === k ? INDIGO : '#fff', color: filterKategori === k ? CREAM : '#334155',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
            }}>
              {k}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: 13 }}>Memuat masukan...</div>
        ) : dataFiltered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 18, padding: '3rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }}>
            <FiMessageSquare size={28} style={{ color: '#cbd5e1', marginBottom: 10 }} />
            <div style={{ fontSize: 13, color: '#64748b' }}>Belum ada masukan dari mitra.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dataFiltered.map(item => {
              const warna = KATEGORI_WARNA[item.kategori] || KATEGORI_WARNA['Lainnya'];
              return (
                <div key={item.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: item.dibaca ? '1px solid rgba(30,58,95,0.06)' : '1.5px solid rgba(181,129,63,0.3)' }} className="fld">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: INDIGO }}>{item.identitas}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: warna.bg, color: warna.color }}>{item.kategori}</span>
                      {!item.dibaca && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#FEF3C7', color: '#92400E' }}>Baru</span>}
                    </div>
                    <BintangTampil rating={item.rating} />
                  </div>
                  <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6, marginBottom: 8 }}>{item.isi}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                      {item.tglKirim}
                      {item.dibaca && item.dibacaOleh && ` · Dibaca oleh ${item.dibacaOleh}`}
                    </div>
                    {!item.dibaca && (
                      <button onClick={() => tandaiDibaca(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 9, border: 'none', background: '#0a5c47', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }} className="btn-hover">
                        <FiCheck size={11} /> Tandai Dibaca
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}