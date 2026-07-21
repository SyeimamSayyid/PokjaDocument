'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import { FiGrid, FiFileText, FiBell, FiClock, FiCheckCircle, FiAlertCircle, FiInfo, FiInbox } from 'react-icons/fi';

interface MitraUser { idDokumen: string; namaMitra: string; judul: string; jenis: string; }
interface Notif { id: string; tipe: string; judul: string; pesan: string; dibaca: boolean; tglDibuat: string; }

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const GOLD = '#D97706';

const TIPE_ICON: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  info:    { icon: <FiInfo size={15} />, color: BLUE, bg: '#DBEAFE' },
  sukses:  { icon: <FiCheckCircle size={15} />, color: '#0a5c47', bg: '#e9f7f1' },
  peringatan: { icon: <FiAlertCircle size={15} />, color: GOLD, bg: '#FEF3C7' },
  default: { icon: <FiBell size={15} />, color: '#64748b', bg: '#f1f5f9' },
};

function fmt(t: string) {
  if (!t) return '';
  try { return new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return t; }
}

export default function NotifikasiMitraPage() {
  const [user, setUser] = useState<MitraUser | null>(null);
  const [notif, setNotif] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotif = useCallback((idDokumen: string) => {
    fetch(`/api/notifikasi?idDokumen=${idDokumen}`)
      .then(r => r.json())
      .then(d => setNotif(d.notifikasi || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_mitra');
    if (!raw) { window.location.href = '/login-mitra'; return; }
    try {
      const u = JSON.parse(raw);
      setUser(u);
      loadNotif(u.idDokumen);
      // Tandai semua terbaca begitu halaman ini dibuka
      fetch('/api/notifikasi', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: u.idDokumen, semua: true }),
      }).then(() => setNotif(prev => prev.map(n => ({ ...n, dibaca: true })))).catch(() => {});
      setLoading(false);
    } catch { window.location.href = '/login-mitra'; }
  }, [loadNotif]);

  const logout = () => {
    localStorage.removeItem('paktasign_mitra');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login-mitra';
  };

  if (loading || !user) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily: FONT, color: '#64748b', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #eef2f6', borderTop: `3px solid ${BLUE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13 }}>Memuat notifikasi...</div>
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
        activeHref="/dashboard/mitra/notifikasi"
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
            <FiBell size={20} style={{ color: BLUE }} /> Notifikasi
          </h1>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 0' }}>Semua pemberitahuan terkait dokumen kerja sama Anda.</p>
        </div>

        {notif.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '3rem', textAlign: 'center', border: '1px solid rgba(29,78,216,0.06)' }} className="fld">
            <FiInbox size={32} style={{ color: '#cbd5e1', marginBottom: 10 }} />
            <div style={{ fontSize: 13.5, color: '#64748b' }}>Belum ada notifikasi.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notif.map((n, i) => {
              const info = TIPE_ICON[n.tipe] || TIPE_ICON.default;
              return (
                <div key={n.id} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(29,78,216,0.06)', display: 'flex', gap: 12, animationDelay: `${i * 0.03}s` }} className="fld">
                  <div style={{ width: 34, height: 34, borderRadius: 11, background: info.bg, color: info.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {info.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1f3d' }}>{n.judul}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>{n.pesan}</div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 6 }}>{fmt(n.tglDibuat)}</div>
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