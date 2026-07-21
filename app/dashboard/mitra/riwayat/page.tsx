'use client';

import { useEffect, useState } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import { FiGrid, FiFileText, FiBell, FiClock, FiInbox, FiMessageSquare, FiUser, FiShield } from 'react-icons/fi';

interface MitraUser {
  idDokumen: string; namaMitra: string; judul: string; jenis: string;
  status: string; tglBerlaku: string; tglBerakhir: string;
}
interface KomentarItem {
  id: string; pengirim: 'admin' | 'mitra' | 'bnn_utama'; nama: string;
  isi: string; tglDibuat: string;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const PENGIRIM_INFO: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  admin:     { label: 'Admin Pokja', color: BLUE_DARK, bg: '#DBEAFE', icon: <FiShield size={13} /> },
  bnn_utama: { label: 'BNN Utama', color: '#2F5449', bg: '#E9F5F1', icon: <FiShield size={13} /> },
  mitra:     { label: 'Anda', color: '#334155', bg: '#f1f5f9', icon: <FiUser size={13} /> },
};

function fmt(t: string) {
  if (!t) return '';
  try { return new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return t; }
}

export default function RiwayatMitraPage() {
  const [user, setUser] = useState<MitraUser | null>(null);
  const [komentar, setKomentar] = useState<KomentarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_mitra');
    if (!raw) { window.location.href = '/login-mitra'; return; }
    try {
      const u = JSON.parse(raw);
      setUser(u);
      fetch(`/api/komentar-revisi?idDokumen=${u.idDokumen}`)
        .then(r => r.json())
        .then(d => setKomentar(d.komentar || d.data || []))
        .catch(() => setError('Gagal memuat riwayat.'))
        .finally(() => setLoading(false));
    } catch { window.location.href = '/login-mitra'; }
  }, []);

  const logout = () => {
    localStorage.removeItem('paktasign_mitra');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login-mitra';
  };

  if (loading || !user) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily: FONT, color: '#64748b', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #eef2f6', borderTop: `3px solid ${BLUE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13 }}>Memuat riwayat...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/mitra', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: `/mitra/dokumen/${user.idDokumen}`, icon: <FiFileText size={17} />, label: 'Dokumen' },
    { href: '/dashboard/mitra/notifikasi', icon: <FiBell size={17} />, label: 'Notifikasi' },
    { href: '/dashboard/mitra/riwayat', icon: <FiClock size={17} />, label: 'Riwayat' },
  ];

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1000px 500px at 80% -10%, #dbeafe 0%, rgba(219,234,254,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/mitra/riwayat"
        brandLabel="SI-POKJA HUMKER"
        brandSub="Akses Mitra"
        userName={user.namaMitra}
        userTag={user.judul || user.namaMitra}
        accent={GOLD}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
        <div style={{ marginBottom: 20 }} className="fld">
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f1f3d', letterSpacing: '-0.03em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiClock size={20} style={{ color: BLUE }} /> Riwayat Aktivitas
          </h1>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 0' }}>
            Riwayat diskusi &amp; komentar revisi pada dokumen {user.jenis} Anda — {user.judul || user.namaMitra}.
          </p>
        </div>

        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 10, fontSize: 12.5, marginBottom: 14 }} className="fld">{error}</div>
        )}

        {komentar.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '3rem', textAlign: 'center', border: '1px solid rgba(29,78,216,0.06)' }} className="fld">
            <FiInbox size={32} style={{ color: '#cbd5e1', marginBottom: 10 }} />
            <div style={{ fontSize: 13.5, color: '#64748b' }}>Belum ada riwayat aktivitas pada dokumen ini.</div>
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: 'rgba(29,78,216,0.12)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {komentar.map((k, i) => {
                const info = PENGIRIM_INFO[k.pengirim] || PENGIRIM_INFO.admin;
                return (
                  <div key={k.id || i} style={{ position: 'relative' }} className="fld">
                    <div style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: info.color, border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(29,78,216,0.1)' }} />
                    <div style={{ background: '#fff', borderRadius: 14, padding: '12px 15px', border: '1px solid rgba(29,78,216,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: info.bg, color: info.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {info.icon} {info.label}
                        </span>
                        <span style={{ fontSize: 10.5, color: '#94a3b8' }}>{fmt(k.tglDibuat)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>{k.isi}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}