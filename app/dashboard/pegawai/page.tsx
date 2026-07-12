'use client';

import { useEffect, useState } from 'react';
import { FaBalanceScale, FaSignOutAlt } from 'react-icons/fa';
import { FiClipboard, FiTrendingUp, FiArchive, FiMapPin } from 'react-icons/fi';

const INDIGO = '#00416A';
const INDIGO_DEEP = '#002E4D';
const EGGSHELL = '#F0EAD6';
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

  return (
    <div style={{ minHeight: '100vh', background: EGGSHELL, fontFamily: FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes floatSlow { 0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); } 50% { transform: translateY(-8px) rotate(var(--rot, 0deg)); } }
        .fld { animation: fadeUp 0.7s cubic-bezier(0.32,0.72,0,1) both; }
        .cascade-card { transition: all 0.5s cubic-bezier(0.32,0.72,0,1); animation: floatSlow 6s ease-in-out infinite; }
        .cascade-card:hover { transform: translateY(-5px) rotate(0deg) !important; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover { transform: translateY(-2px); }
        @media (max-width: 768px) {
          .cascade-card { animation: none !important; transform: none !important; }
        }
      `}</style>

      {/* ── Hero — Indigo Dye ── */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(160deg, ${INDIGO} 0%, ${INDIGO_DEEP} 100%)`,
        paddingBottom: 90,
      }}>
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.2rem 2rem', maxWidth: 900, margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: EGGSHELL, fontWeight: 800, fontSize: 14 }}>
            <FaBalanceScale size={17} />
            Pokja Hukum
          </div>
          <button onClick={handleLogout} className="btn-hover" style={{
            display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: EGGSHELL,
            background: 'rgba(240,234,214,0.1)', border: '1px solid rgba(240,234,214,0.2)',
            borderRadius: 100, padding: '9px 18px', cursor: 'pointer', fontFamily: FONT,
          }}>
            <FaSignOutAlt size={12} /> Keluar
          </button>
        </nav>

        <div style={{
          maxWidth: 640, margin: '0 auto', padding: '3rem 2rem 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-block', fontSize: 10, color: EGGSHELL, textTransform: 'uppercase',
            letterSpacing: '0.26em', fontWeight: 700, background: 'rgba(240,234,214,0.12)',
            padding: '7px 18px', borderRadius: 100, marginBottom: 26,
          }} className="fld">
            Modul Penegak Hukum
          </div>

          <h1 style={{
            fontSize: 42, fontWeight: 900, color: EGGSHELL, margin: '0 0 14px',
            letterSpacing: '-0.03em', lineHeight: 1.05,
          }} className="fld">
            Selamat datang,<br />{user.nip}
          </h1>
          <p style={{ fontSize: 14.5, color: 'rgba(240,234,214,0.65)', margin: '0 0 18px', maxWidth: 420, lineHeight: 1.7 }} className="fld">
            ke dalam sistem Pengajuan/Pendampingan Hukum Pokja
          </p>
          {user.lokasi ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 12, color: EGGSHELL, background: 'rgba(240,234,214,0.1)',
              padding: '8px 18px', borderRadius: 100, border: '1px solid rgba(240,234,214,0.18)',
              fontWeight: 600,
            }} className="fld">
              <FiMapPin size={12} /> {user.lokasi}
            </div>
          ) : null}
        </div>

        {/* Transisi lengkung ke eggshell */}
        <svg
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          style={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: 90, display: 'block' }}
        >
          <path d="M0,90 C360,10 1080,10 1440,90 L1440,90 L0,90 Z" fill={EGGSHELL} />
        </svg>
      </div>

      {/* ── Konten — Eggshell ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 2rem 6rem' }}>

        <div style={{
          textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: INDIGO,
          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 28,
        }} className="fld">
          Silakan pilih apa yang ingin Anda lakukan
        </div>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: <FiClipboard size={19} />, label: 'Pendampingan / Pengajuan', rot: -3 },
            { icon: <FiTrendingUp size={19} />, label: 'Tindak Lanjut', rot: 2 },
            { icon: <FiArchive size={19} />, label: 'Arsip Penanganan', rot: -1.5 },
          ].map((c, i) => (
            <div
              key={c.label}
              className="cascade-card fld"
              style={{
                ['--rot' as any]: `${c.rot}deg`,
                transform: `rotate(${c.rot}deg)`,
                animationDelay: `${0.15 + i * 0.1}s`,
                width: 196, padding: '1.8rem 1.4rem', borderRadius: 24,
                background: '#fff',
                border: '1px solid rgba(0,65,106,0.08)',
                boxShadow: '0 30px 60px -40px rgba(0,65,106,0.35)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 14, background: 'rgba(0,65,106,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: INDIGO,
              }}>
                {c.icon}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INDIGO, textAlign: 'center', lineHeight: 1.4 }}>{c.label}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#B5813F', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Segera Hadir</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11.5, color: 'rgba(0,65,106,0.4)', marginTop: 48, textAlign: 'center' }} className="fld">
          Modul ini sedang dalam tahap pengembangan bertahap.
        </p>
      </div>
    </div>
  );
}