'use client';

import { useState } from 'react';
import { FaBuilding } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';

const CREAM = '#FBF9E4';
const BLUE  = '#C8D9E6';
const INK   = '#1E293B';

export default function LoginMitraPage() {
  const [metode, setMetode]   = useState<'kode' | 'email'>('kode');
  const [kode, setKode]       = useState('');
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isiKosong = metode === 'kode' ? !kode.trim() : !email.trim();
    if (isiKosong) return;

    setLoading(true); setError('');
    try {
      const body = metode === 'kode'
        ? { kode: kode.trim() }
        : { email: email.trim(), ...(kode.trim() ? { kode: kode.trim() } : {}) };
      const res = await fetch('/api/auth/login-mitra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();

      if (!res.ok) { setError(d.message || 'Login gagal.'); setLoading(false); return; }

      // Cookie sesi (httpOnly, JWT) sudah di-set otomatis oleh server.
      // localStorage HANYA untuk kebutuhan tampilan di halaman mitra.
      localStorage.setItem('paktasign_mitra', JSON.stringify(d.user));
      window.location.href = '/dashboard/mitra';
    } catch {
      setError('Terjadi kesalahan koneksi.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <a href="/" style={{
        position: 'fixed', top: 20, left: 20, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.18)', borderRadius: 100,
        padding: '9px 16px', color: '#fff', fontSize: 12, fontWeight: 600,
        textDecoration: 'none', fontFamily: 'inherit',
      }} className="back-home-btn">
        <FiArrowLeft size={14} /> Kembali ke Beranda
      </a>
      <style>{`
        .back-home-btn { transition: all 0.25s ease; }
        .back-home-btn:hover { background: rgba(255,255,255,0.2); transform: translateY(-1px); }
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
          50% { transform: translateY(-6px); }
        }
        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes spinDot {
          to { transform: rotate(360deg); }
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
          top: -140px; right: -110px;
          background: radial-gradient(circle, ${BLUE} 0%, transparent 70%);
          opacity: 0.16;
          animation: glowDrift1 16s ease-in-out infinite;
        }
        .auth-glow-2 {
          width: 500px; height: 500px;
          bottom: -170px; left: -130px;
          background: radial-gradient(circle, ${CREAM} 0%, transparent 70%);
          opacity: 0.14;
          animation: glowDrift2 19s ease-in-out infinite;
        }
        .auth-glow-3 {
          width: 280px; height: 280px;
          top: 58%; left: 8%;
          background: radial-gradient(circle, #A9C3D8 0%, transparent 70%);
          opacity: 0.12;
          animation: glowDrift1 22s ease-in-out infinite reverse;
        }

        .auth-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 2.4rem 2rem 2.2rem;
          border-radius: 22px;
          background: ${CREAM};
          box-shadow: 0 30px 70px rgba(0,0,0,0.5), 20px 20px 44px #d9d6c0, -10px -10px 28px #ffffff;
          animation: cardIn 0.55s cubic-bezier(0.32,0.72,0,1) both;
        }
        .auth-brand-icon {
          width: 60px; height: 60px; border-radius: 50%;
          background: linear-gradient(135deg, ${BLUE}, #A9C3D8);
          display: flex; align-items: center; justify-content: center;
          color: ${INK};
          box-shadow: 6px 6px 14px #d9d6c0, -6px -6px 14px #ffffff;
          animation: iconFloat 3.5s ease-in-out infinite;
        }
        .auth-title { font-size: 17px; font-weight: 800; letter-spacing: 0.04em; color: ${INK}; text-align: center; }
        .auth-subtitle { font-size: 11px; color: #94a3b8; letter-spacing: 0.12em; text-transform: uppercase; }

        .auth-field { position: relative; width: 100%; margin-top: 8px; }
        .auth-field input {
          width: 100%; padding: 13px 10px 11px; font-size: 15px; font-family: monospace;
          font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
          color: ${INK}; background: transparent; outline: none;
          border: none; border-left: 2px solid ${INK}; border-bottom: 2px solid ${INK};
          border-bottom-left-radius: 10px; box-sizing: border-box;
          transition: border-color 0.3s cubic-bezier(0.32,0.72,0,1);
        }
        .auth-field input:focus, .auth-field input:valid { border-color: #2563EB; }
        .auth-field label {
          position: absolute; left: 10px; top: 13px;
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em;
          color: #94a3b8; pointer-events: none; font-family: 'Plus Jakarta Sans', sans-serif;
          transition: transform 0.35s cubic-bezier(0.32,0.72,0,1), font-size 0.35s ease, padding 0.35s ease, background 0.35s ease, color 0.35s ease;
        }
        .auth-field input:focus ~ label, .auth-field input:valid ~ label {
          transform: translate(2px, -27px);
          font-size: 9.5px; padding: 4px 9px; border-radius: 7px;
          background: ${INK}; color: #fff; letter-spacing: 0.14em;
        }

        .auth-error {
          width: 100%; font-size: 11.5px; color: #b91c1c;
          background: rgba(185,28,28,0.08); border-left: 3px solid #b91c1c;
          padding: 9px 12px; border-radius: 8px; line-height: 1.4;
          animation: shakeError 0.4s ease-out;
        }

        .auth-submit {
          margin-top: 8px; height: 46px; width: 180px; border-radius: 10px;
          border: 2px solid ${INK}; background: transparent; color: ${INK};
          cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.14em;
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
          border: 2px solid rgba(30,41,59,0.3); border-top-color: ${INK};
          animation: spinDot 0.7s linear infinite;
        }

        .auth-footer { font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.7; }
        .auth-footer a {
          color: #2563EB; text-decoration: none; font-weight: 600;
          transition: color 0.25s ease;
        }
        .auth-footer a:hover { color: #1E3A8A; text-decoration: underline; }
      `}</style>

      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />
      <div className="auth-glow auth-glow-3" />

      <form className="auth-card" onSubmit={handleLogin} noValidate>
        <div className="auth-brand-icon"><FaBuilding size={26} /></div>
        <div className="auth-title">Akses Dokumen Mitra</div>
        <div className="auth-subtitle">E-POKJA HUKER</div>

        <div style={{ display: 'flex', gap: 4, marginTop: 14, background: 'rgba(30,41,59,0.06)', borderRadius: 100, padding: 3 }}>
          {(['kode', 'email'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMetode(m); setError(''); }}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 100, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                background: metode === m ? INK : 'transparent',
                color: metode === m ? '#fff' : 'rgba(30,41,59,0.55)',
                transition: 'all 0.25s ease',
              }}
            >
              {m === 'kode' ? 'Kode Akses' : 'Email'}
            </button>
          ))}
        </div>

        {metode === 'kode' ? (
          <div className="auth-field" style={{ marginTop: 10 }}>
            <input suppressHydrationWarning
              type="text"
              value={kode}
              onChange={e => setKode(e.target.value.toUpperCase())}
              maxLength={12}
              required
              autoFocus
            />
            <label>Kode Akses</label>
          </div>
        ) : (
          <>
            <div className="auth-field" style={{ marginTop: 10 }}>
              <input suppressHydrationWarning
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
              <label>Email Pengajuan</label>
            </div>
            <div className="auth-field" style={{ marginTop: 10 }}>
              <input suppressHydrationWarning
                type="text"
                value={kode}
                onChange={e => setKode(e.target.value.toUpperCase())}
                maxLength={12}
              />
              <label>Kode Akses (opsional)</label>
            </div>
          </>
        )}
        {metode === 'email' && (
          <div style={{ fontSize: 10.5, color: 'rgba(30,41,59,0.45)', marginTop: 6, textAlign: 'center', lineHeight: 1.5 }}>
            {kode.trim()
              ? 'Email + kode akan dicocokkan bersamaan — pastikan keduanya milik institusi yang sama.'
              : 'Institusi punya beberapa dokumen (MOU/PKS)? Isi juga kode akses dokumen yang ingin diakses, biar tidak salah masuk ke dokumen lain. Kalau kode dikosongkan, otomatis masuk ke yang paling baru dibuat.'}
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-submit" type="submit" disabled={loading || (metode === 'kode' ? !kode.trim() : !email.trim())} suppressHydrationWarning>
          {loading && <span className="auth-spinner" />}
          {loading ? 'Memverifikasi' : 'Akses Dokumen Saya'}
        </button>

        <div className="auth-footer">
          Kode dikirim oleh Pokja Kerja Sama saat pengajuan disetujui.<br />
          <a href="/lupa-kode-mitra">Lupa kode akses?</a>
          {' · '}
          <a href="/cek-pengajuan">Cek status pengajuan</a>
        </div>
      </form>
    </div>
  );
}