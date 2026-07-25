'use client';

import { useEffect, useState } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import { FiGrid, FiFileText, FiBell, FiClock, FiMessageSquare, FiStar, FiCheck, FiArrowLeft } from 'react-icons/fi';

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

interface UserMitra { namaMitra: string; judul: string; idDokumen: string; }

export default function KotakSaranMitraPage() {
  const [user, setUser] = useState<UserMitra | null>(null);
  const [checking, setChecking] = useState(true);
  const [belumDibaca, setBelumDibaca] = useState(0);

  const [kategori, setKategori] = useState('Kepuasan Layanan');
  const [isi, setIsi] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sukses, setSukses] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('paktasign_mitra');
      if (!raw) { window.location.href = '/login-mitra'; return; }
      setUser(JSON.parse(raw));
      setChecking(false);
    } catch { window.location.href = '/login-mitra'; }
  }, []);

  const logout = () => { localStorage.removeItem('paktasign_mitra'); window.location.href = '/login-mitra'; };

  const submitSaran = async () => {
    setError(''); setSukses('');
    if (!isi.trim()) { setError('Isi masukan wajib diisi.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/masukan-saran', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategori, isi: isi.trim(), rating: rating || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengirim masukan.'); return; }
      setSukses(d.message);
      setIsi(''); setRating(0);
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setSubmitting(false); }
  };

  if (checking || !user) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily: FONT, color: '#64748b' }}>
      Memuat...
    </div>
  );

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/mitra', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: `/mitra/dokumen/${user.idDokumen}`, icon: <FiFileText size={17} />, label: 'Dokumen' },
    { href: '/dashboard/mitra/notifikasi', icon: <FiBell size={17} />, label: 'Notifikasi', notifCount: belumDibaca },
    { href: '/dashboard/mitra/riwayat', icon: <FiClock size={17} />, label: 'Riwayat' },
    { href: '/dashboard/mitra/saran', icon: <FiMessageSquare size={17} />, label: 'Kotak Saran' },
  ];

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1000px 500px at 80% -10%, #dbeafe 0%, rgba(219,234,254,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/mitra/saran"
        brandLabel="E-POKJA HUKER"
        brandSub="Akses Mitra"
        userName={user.namaMitra}
        userTag={user.judul || user.namaMitra}
        accent={GOLD}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
        <a href="/dashboard/mitra" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: 16 }} className="fld">
          <FiArrowLeft size={13} /> Kembali ke Dashboard
        </a>
        <div style={{ marginBottom: 20 }} className="fld">
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f1f3d', letterSpacing: '-0.03em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiMessageSquare size={20} style={{ color: GOLD }} /> Kotak Saran & Kepuasan
          </h1>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '6px 0 0' }}>Masukan Anda membantu Pokja Kerja Sama BNN meningkatkan kualitas pelayanan.</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', border: '1px solid rgba(29,78,216,0.08)', boxShadow: '0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' }} className="fld">
          {sukses ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <FiCheck size={36} style={{ color: '#0a5c47', marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: '#0f1f3d', fontWeight: 700, marginBottom: 6 }}>Terima Kasih!</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>{sukses}</div>
              <button onClick={() => setSukses('')} style={{ padding: '11px 24px', borderRadius: 11, border: 'none', background: `linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }} className="btn-hover">
                Kirim Masukan Lain
              </button>
            </div>
          ) : (
            <>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 10 }}>Seberapa puas Anda dengan pelayanan Pokja Kerja Sama? (opsional)</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[1, 2, 3, 4, 5].map(bintang => (
                  <button key={bintang} type="button"
                    onClick={() => setRating(bintang === rating ? 0 : bintang)}
                    onMouseEnter={() => setHoverRating(bintang)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
                    <FiStar size={30} fill={(hoverRating || rating) >= bintang ? GOLD : 'none'} style={{ color: (hoverRating || rating) >= bintang ? GOLD : '#e2e8f0' }} />
                  </button>
                ))}
              </div>

              <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 7 }}>Kategori</label>
              <select value={kategori} onChange={e => setKategori(e.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1.5px solid rgba(29,78,216,0.10)', fontSize: 13, fontFamily: FONT, marginBottom: 16, boxSizing: 'border-box', outline: 'none', background: '#f8fafc' }}>
                <option value="Kepuasan Layanan">Kepuasan Layanan</option>
                <option value="Saran Perbaikan">Saran Perbaikan</option>
                <option value="Keluhan">Keluhan</option>
                <option value="Lainnya">Lainnya</option>
              </select>

              <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 7 }}>Masukan Anda</label>
              <textarea value={isi} onChange={e => setIsi(e.target.value)} rows={5} placeholder="Tuliskan saran, kepuasan, atau keluhan Anda di sini..."
                style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1.5px solid rgba(29,78,216,0.10)', fontSize: 13, fontFamily: FONT, marginBottom: 16, boxSizing: 'border-box', outline: 'none', background: '#f8fafc', resize: 'vertical' }} />

              {error && <div style={{ fontSize: 12, color: '#DC2626', background: 'rgba(220,38,38,0.06)', padding: '10px 14px', borderRadius: 11, marginBottom: 14, border: '1px solid rgba(220,38,38,0.18)' }}>{error}</div>}

              <button onClick={submitSaran} disabled={submitting} style={{ width: '100%', padding: '12px', borderRadius: 11, border: 'none', background: `linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, boxShadow: `0 8px 20px -8px ${BLUE}60` }} className="btn-hover">
                {submitting ? 'Mengirim...' : 'Kirim Masukan'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}