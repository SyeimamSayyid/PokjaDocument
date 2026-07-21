'use client';

import { useState } from 'react';
import { FaUserTie, FaUserShield, FaBuilding } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';

type Tab = 'admin' | 'pegawai_bnn';
type ActualRole = 'admin' | 'superadmin' | 'pegawai_bnn';

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'admin',       label: 'Admin', icon: <FaUserTie size={16} /> },
  { value: 'pegawai_bnn', label: 'Pegawai BNN', icon: <FaUserShield size={16} /> },
];

const REDIRECT: Record<ActualRole, string> = {
  superadmin:  '/dashboard/superadmin',
  admin:       '/dashboard/admin',
  pegawai_bnn: '/dashboard/pegawai',
};

const CREAM = '#FBF9E4';
const BLUE  = '#C8D9E6';
const INK   = '#1E293B';

export default function LoginPage() {
  const [tab, setTab]           = useState<Tab>('admin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const isPegawai = tab === 'pegawai_bnn';

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body = isPegawai
        ? { role: 'pegawai_bnn', nip: identifier.trim() }
        : { role: 'admin', username: identifier.trim(), password };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Login gagal. Periksa kembali data Anda.');
        setLoading(false);
        return;
      }

      localStorage.setItem('paktasign_user', JSON.stringify(data.user));
      window.location.href = REDIRECT[data.user.role as ActualRole];
    } catch {
      setError('Terjadi kesalahan koneksi. Coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <style>{`
        @keyframes glowDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.1); }
          66% { transform: translate(-30px, 20px) scale(0.95); }
        }
        @keyframes glowDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-35px, 25px) scale(1.08); }
          66% { transform: translate(30px, -20px) scale(0.92); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes iconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes spinDot {
          to { transform: rotate(360deg); }
        }
        @keyframes fieldIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes footerIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cubeBounce {
          50% { transform: scale(0.9); }
        }

        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
          position: relative;
          overflow: hidden;
        }
        .auth-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
        }
        .auth-glow-1 {
          width: 460px; height: 460px;
          top: -140px; left: -110px;
          background: radial-gradient(circle, ${BLUE} 0%, transparent 70%);
          opacity: 0.16;
          animation: glowDrift1 15s ease-in-out infinite;
        }
        .auth-glow-2 {
          width: 500px; height: 500px;
          bottom: -170px; right: -130px;
          background: radial-gradient(circle, ${CREAM} 0%, transparent 70%);
          opacity: 0.14;
          animation: glowDrift2 18s ease-in-out infinite;
        }
        .auth-glow-3 {
          width: 280px; height: 280px;
          top: 55%; right: 10%;
          background: radial-gradient(circle, #A9C3D8 0%, transparent 70%);
          opacity: 0.12;
          animation: glowDrift1 21s ease-in-out infinite reverse;
        }

        .auth-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
          padding: 2.4rem 2rem 2.2rem;
          border-radius: 22px;
          background: ${CREAM};
          box-shadow: 0 30px 70px rgba(0,0,0,0.5), 20px 20px 44px #d9d6c0, -10px -10px 28px #ffffff;
          animation: cardIn 0.55s cubic-bezier(0.32,0.72,0,1) both;
        }
        .auth-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .auth-brand-icon {
          width: 46px; height: 46px; border-radius: 14px;
          background: linear-gradient(135deg, ${BLUE}, #A9C3D8);
          display: flex; align-items: center; justify-content: center;
          color: ${INK};
          box-shadow: 6px 6px 14px #d9d6c0, -6px -6px 14px #ffffff;
          animation: iconFloat 3.5s ease-in-out infinite;
        }
        .auth-title {
          font-size: 17px; font-weight: 800; letter-spacing: 0.06em;
          text-transform: uppercase; color: ${INK}; text-align: center;
        }
        .auth-subtitle {
          font-size: 11.5px; color: #64748b; text-align: center; margin-top: -6px;
        }
        .auth-role-row {
          display: flex; width: 100%; gap: 6px;
        }
        .auth-role-btn {
          flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;
          padding: 10px 6px; border-radius: 12px; border: none; cursor: pointer;
          background: ${CREAM};
          box-shadow: inset 3px 3px 7px #d9d6c0, inset -3px -3px 7px #ffffff;
          color: #7c8794; font-family: inherit;
          transition: background 0.3s cubic-bezier(0.32,0.72,0,1), color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease;
        }
        .auth-role-btn:hover:not(.active) { transform: translateY(-1px); color: #4b5563; }
        .auth-role-btn:active { transform: scale(0.96); }
        .auth-role-btn.active {
          background: linear-gradient(135deg, ${BLUE}, #A9C3D8);
          color: ${INK};
          box-shadow: 4px 4px 10px #d9d6c0, -2px -2px 8px #ffffff;
        }
        .auth-role-label { font-size: 10px; font-weight: 700; letter-spacing: 0.02em; text-align: center; }

        .auth-field { position: relative; width: 100%; margin-top: 14px; animation: fieldIn 0.35s ease-out both; }
        .auth-field input {
          width: 100%; padding: 12px 10px 10px; font-size: 14px; font-family: inherit;
          color: ${INK}; background: transparent; outline: none;
          border: none; border-left: 2px solid ${INK}; border-bottom: 2px solid ${INK};
          border-bottom-left-radius: 10px; box-sizing: border-box;
          transition: border-color 0.3s cubic-bezier(0.32,0.72,0,1);
        }
        .auth-field input:focus, .auth-field input:valid { border-color: #2563EB; }
        .auth-field label {
          position: absolute; left: 10px; top: 12px;
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em;
          color: #94a3b8; pointer-events: none;
          transition: transform 0.35s cubic-bezier(0.32,0.72,0,1), font-size 0.35s ease, padding 0.35s ease, background 0.35s ease, color 0.35s ease;
        }
        .auth-field input:focus ~ label, .auth-field input:valid ~ label {
          transform: translate(2px, -26px);
          font-size: 9.5px; padding: 4px 9px; border-radius: 7px;
          background: ${INK}; color: #fff; letter-spacing: 0.16em;
        }

        .auth-error {
          width: 100%; font-size: 11.5px; color: #b91c1c;
          background: rgba(185,28,28,0.08); border-left: 3px solid #b91c1c;
          padding: 9px 12px; border-radius: 8px; line-height: 1.4;
          animation: shakeError 0.4s ease-out;
        }

        .auth-submit {
          margin-top: 8px; height: 46px; width: 140px; border-radius: 10px;
          border: 2px solid ${INK}; background: transparent; color: ${INK};
          cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.16em;
          transition: background 0.3s cubic-bezier(0.32,0.72,0,1), color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .auth-submit:hover:not(:disabled) {
          background: ${INK}; color: #fff;
          box-shadow: 6px 6px 14px #d9d6c0, -4px -4px 10px #ffffff;
        }
        .auth-submit:active:not(:disabled) { transform: scale(0.96); }
        .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-spinner {
          width: 12px; height: 12px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
          animation: spinDot 0.7s linear infinite;
        }

        .auth-footer {
          font-size: 11px; color: #94a3b8; text-align: center; margin-top: 4px; line-height: 1.8;
        }
        .auth-footer a {
          color: #2563EB; text-decoration: none; font-weight: 600;
          transition: color 0.25s ease;
        }
        .auth-footer a:hover { color: #1E3A8A; text-decoration: underline; }

        .cek-nip-toggle {
          display: inline-flex; align-items: center; gap: 8px;
          margin-top: 4px; padding: 10px 18px; border-radius: 100px;
          border: 1.5px solid rgba(37,99,235,0.25); background: rgba(37,99,235,0.05);
          color: #1E3A8A; font-size: 11.5px; font-weight: 700; font-family: inherit;
          text-decoration: none; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.32,0.72,0,1);
          animation: footerIn 0.35s ease-out both;
        }
        .cek-nip-toggle:hover { background: rgba(37,99,235,0.1); transform: translateY(-1px); }
        .cek-nip-toggle:active { transform: scale(0.96); }

        /* ── Tombol "Lupa Password?" — gaya kubus 3D, diadaptasi dari desain
           yang diminta (aslinya styled-components, di sini disamakan ke pola
           className plus tag style yang sudah dipakai di seluruh halaman ini) ── */
        .lupa-pass-btn {
          display: block;
          position: relative;
          padding: 0.55em 1.1em;
          background: transparent;
          outline: none;
          border: 0;
          color: #d4af37;
          letter-spacing: 0.08em;
          font-family: monospace;
          font-size: 11.5px;
          font-weight: bold;
          cursor: pointer;
          z-index: 1;
          text-decoration: none;
          margin-top: 6px;
          transition: all 0.5s;
          animation: footerIn 0.4s ease-out both;
        }
        .lupa-pass-btn .bg-top {
          position: absolute;
          height: 7px;
          background: #d4af37;
          bottom: 100%;
          left: 4px;
          right: -4px;
          transform: skew(-45deg, 0);
          margin: 0;
          transition: all 0.4s;
        }
        .lupa-pass-btn .bg {
          position: absolute;
          left: 0; bottom: 0; top: 0; right: 0;
          background: #d4af37;
          transition: all 0.4s;
        }
        .lupa-pass-btn .bg-right {
          position: absolute;
          background: #d4af37;
          top: -4px;
          z-index: 0;
          bottom: 4px;
          width: 7px;
          left: 100%;
          transform: skew(0, -45deg);
          transition: all 0.4s;
        }
        .lupa-pass-btn .bg-inner {
          background: ${CREAM};
          position: absolute;
          left: 1.5px; right: 1.5px; top: 1.5px; bottom: 1.5px;
        }
        .lupa-pass-btn .text {
          position: relative;
          transition: all 0.4s;
        }
        .lupa-pass-btn:hover .bg-inner { background: #d4af37; }
        .lupa-pass-btn:hover .text { color: ${CREAM}; }
        .lupa-pass-btn:hover .bg-right,
        .lupa-pass-btn:hover .bg,
        .lupa-pass-btn:hover .bg-top { background: ${INK}; }
        .lupa-pass-btn:active { z-index: 9999; animation: cubeBounce 0.1s linear; }
      `}</style>

      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />
      <div className="auth-glow auth-glow-3" />

      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="auth-brand">
          <div className="auth-brand-icon"><FaBuilding size={20} /></div>
          <div className="auth-title">SI-POKJA HUMKER</div>
          <div className="auth-subtitle">
            {isPegawai ? 'Pengajuan/Pendampingan Hukum' : 'Sistem Manajemen Kerja Sama'}
          </div>
        </div>

        <div className="auth-role-row">
          {TABS.map(t => (
            <button
              key={t.value}
              type="button"
              suppressHydrationWarning
              className={`auth-role-btn ${tab === t.value ? 'active' : ''}`}
              onClick={() => handleTabChange(t.value)}
            >
              {t.icon}
              <span className="auth-role-label">{t.label}</span>
            </button>
          ))}
        </div>

        <div style={{ width: '100%' }}>
          <div className="auth-field" key={isPegawai ? 'nip' : 'email'}>
            <input suppressHydrationWarning
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              autoFocus
            />
            <label>{isPegawai ? 'NIP / NRP' : 'Email'}</label>
          </div>

          {!isPegawai && (
            <div className="auth-field">
              <input suppressHydrationWarning
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <label>Password</label>
            </div>
          )}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-submit" type="submit" disabled={loading} suppressHydrationWarning>
          {loading && <span className="auth-spinner" />}
          {loading ? 'Memproses' : 'Masuk'}
        </button>

        {!isPegawai && (
          <a href="/lupa-password" className="lupa-pass-btn">
            <div className="bg-top"><div className="bg-inner" /></div>
            <div className="bg-right"><div className="bg-inner" /></div>
            <div className="bg"><div className="bg-inner" /></div>
            <div className="text">Lupa Password?</div>
          </a>
        )}

        {isPegawai ? (
          <>
            <a href="/cek-nip" className="cek-nip-toggle">
              <FiSearch size={13} /> Cek NIP / NRP
            </a>
            <div className="auth-footer" style={{ marginTop: 6 }}>
              Belum punya akun?{' '}
              <a href="/pengajuan-akun-pegawai">Ajukan akun di sini</a>
            </div>
          </>
        ) : (
          <div className="auth-footer">
            Anda mitra kerja sama?{' '}
            <a href="/login-mitra">Akses dokumen Anda di sini</a>
          </div>
        )}
      </form>
    </div>
  );
}