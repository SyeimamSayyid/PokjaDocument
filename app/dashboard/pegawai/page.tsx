'use client';

import { useEffect, useState } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import { FiGrid, FiClipboard, FiTrendingUp, FiMapPin, FiArrowUpRight } from 'react-icons/fi';
import { FaBalanceScale } from 'react-icons/fa';

const INDIGO = '#1E3A5F';
const CREAM = '#FAF8F0';
const GOLD = '#B5813F';
const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";

interface PegawaiUser {
  role: string;
  nip: string;
  lokasi?: string;
}

export default function DashboardPegawaiPage() {
  const [user, setUser] = useState<PegawaiUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (u.role !== 'pegawai_bnn') { window.location.href = '/login'; return; }
    setUser(u);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('paktasign_user');
    window.location.href = '/login';
  };

  if (!user) return null;

  // Sidebar pegawai — cuma yang relevan: Dashboard, Pendampingan/Pengajuan,
  // dan Tindak Lanjut (BACA SAJA — pegawai boleh tau progres lengkap kasusnya,
  // tapi TIDAK boleh menambah catatan; itu wewenang admin). TIDAK ADA Arsip —
  // itu murni internal admin (Arsip Penanganan lintas semua kasus).
  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/pegawai', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/pegawai/pendampingan', icon: <FiClipboard size={17} />, label: 'Pendampingan / Pengajuan' },
    { href: '/dashboard/pegawai/tindak-lanjut', icon: <FiTrendingUp size={17} />, label: 'Tindak Lanjut' },
  ];

  const cards = [
    { icon: <FiClipboard size={19} />, label: 'Pendampingan / Pengajuan', href: '/dashboard/pegawai/pendampingan', desc: 'Ajukan permohonan & lihat riwayat pengajuan Anda', active: true },
    { icon: <FiTrendingUp size={19} />, label: 'Tindak Lanjut', href: '/dashboard/pegawai/tindak-lanjut', desc: 'Lihat progres lengkap penanganan kasus Anda', active: true },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily: FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); filter: blur(4px); } to { opacity: 1; transform: none; filter: blur(0); } }
        .fld { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
        .card-hover { transition: all 0.4s cubic-bezier(0.32,0.72,0,1); }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 30px 60px -30px rgba(30,58,95,0.3) !important; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover { transform: translateY(-1px); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/pegawai"
        brandLabel="SI-POKJA HUMKER"
        brandSub="Modul Penegak Hukum"
        navSectionTitle="Menu"
        userName={`Pegawai ${user.nip}`}
        userTag={user.lokasi || 'Pegawai BNN'}
        accent="#2C5580"
        onLogout={handleLogout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <div style={{ marginBottom: 28 }} className="fld">
          <span style={{ fontSize: 9.5, color: INDIGO, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, background: 'rgba(30,58,95,0.08)', padding: '6px 14px', borderRadius: 100 }}>
            Modul Penegak Hukum
          </span>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: INDIGO, letterSpacing: '-0.03em', margin: '12px 0 6px' }}>
            Selamat datang, {user.nip}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(30,58,95,0.55)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {user.lokasi ? (<><FiMapPin size={13} /> {user.lokasi}</>) : 'Sistem Pengajuan/Pendampingan Hukum Pokja'}
          </p>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(30,58,95,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }} className="fld">
          Silakan pilih apa yang ingin Anda lakukan
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          {cards.map((c, i) => (
            <a
              key={c.label}
              href={c.href}
              className="card-hover fld"
              style={{
                animationDelay: `${0.1 + i * 0.08}s`,
                display: 'block', textDecoration: 'none', padding: '1.6rem 1.5rem', borderRadius: 22,
                background: '#fff', border: '1px solid rgba(30,58,95,0.07)',
                boxShadow: '0 20px 45px -30px rgba(30,58,95,0.25)', position: 'relative',
              }}
            >
              <FiArrowUpRight size={16} style={{ position: 'absolute', top: 20, right: 20, color: GOLD }} />
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(30,58,95,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INDIGO, marginBottom: 14 }}>
                {c.icon}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: INDIGO, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(30,58,95,0.55)', lineHeight: 1.5 }}>{c.desc}</div>
            </a>
          ))}
        </div>

        <p style={{ fontSize: 11.5, color: 'rgba(30,58,95,0.35)', marginTop: 40, textAlign: 'center' }} className="fld">
          Fitur lain sedang dalam tahap pengembangan bertahap.
        </p>
      </div>
    </div>
  );
}