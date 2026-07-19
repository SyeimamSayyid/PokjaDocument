'use client';

import { useState } from 'react';
import { FaKey } from 'react-icons/fa';
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

const CREAM = '#FBF9E4';
const BLUE  = '#C8D9E6';
const INK   = '#1E293B';

export default function LupaPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [pesan, setPesan]     = useState('');
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email wajib diisi.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/lupa-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        // Ditemukan & email terkirim
        setPesan(data.message || 'Kami telah mengirimkan informasi akun dan password login Anda melalui email.');
        setDone(true);
      } else {
        // 404 (tidak terdaftar), 429 (kena limit), atau error lain — tampilkan
        // pesan spesifik dari server, tetap di form (tidak pindah ke layar sukses).
        setError(data.message || 'Gagal memproses permintaan.');
      }
    } catch {
      setError('Terjadi kesalahan koneksi. Coba lagi.');
    } finally {
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
        @keyframes spinDot { to { transform: rotate(360deg); } }
        @keyframes fieldIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }

        .auth-page {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
          position: relative; overflow: hidden;
        }
        .auth-glow { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }
        .auth-glow-1 {
          width: 460px; height: 460px; top: -140px; left: -110px;
          background: radial-gradient(circle, ${BLUE} 0%, transparent 70%);
          opacity: 0.16; animation: glowDrift1 15s ease-in-out infinite;
        }
        .auth-glow-2 {
          width: 500px; height: 500px; bottom: -170px; right: -130px;
          background: radial-gradient(circle, ${CREAM} 0%, transparent 70%);
          opacity: 0.14; animation: glowDrift2 18s ease-in-out infinite;
        }

        .auth-card {
          position: relative; z-index: 1; width: 100%; max-width: 380px;
          display: flex; flex-direction: column; align-items: center; gap: 20px;
          padding: 2.4rem 2rem 2.2rem; border-radius: 22px; background: ${CREAM};
          box-shadow: 0 30px 70px rgba(0,0,0,0.5), 20px 20px 44px #d9d6c0, -10px -10px 28px #ffffff;
          animation: cardIn 0.55s cubic-bezier(0.32,0.72,0,1) both;
        }
        .auth-brand { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
        .auth-brand-icon {
          width: 46px; height: 46px; border-radius: 14px;
          background: linear-gradient(135deg, ${BLUE}, #A9C3D8);
          display: flex; align-items: center; justify-content: center; color: ${INK};
          box-shadow: 6px 6px 14px #d9d6c0, -6px -6px 14px #ffffff;
          animation: iconFloat 3.5s ease-in-out infinite;
        }
        .auth-title { font-size: 16px; font-weight: 800; letter-spacing: 0.04em; color: ${INK}; }
        .auth-subtitle { font-size: 11.5px; color: #64748b; line-height: 1.6; max-width: 280px; }

        .auth-field { position: relative; width: 100%; margin-top: 6px; animation: fieldIn 0.35s ease-out both; }
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
          margin-top: 8px; height: 46px; width: 100%; border-radius: 10px;
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
          font-size: 11.5px; color: #64748b; text-align: center; margin-top: 4px;
          display: flex; align-items: center; gap: 6px; text-decoration: none;
          transition: color 0.25s ease;
        }
        .auth-footer:hover { color: #2563EB; }

        .success-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(92,122,94,0.12); display: flex; align-items: center; justify-content: center;
          color: #5C7A5E; animation: popIn 0.45s cubic-bezier(0.32,0.72,0,1) both;
        }
        .success-msg {
          font-size: 12.5px; color: #334155; text-align: center; line-height: 1.7;
        }
      `}</style>

      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-card">
        {done ? (
          <>
            <div className="success-icon"><FiCheckCircle size={26} /></div>
            <div className="auth-title">Cek Email Anda</div>
            <div className="success-msg">{pesan}</div>
            <a href="/login" className="auth-footer">
              <FiArrowLeft size={13} /> Kembali ke Login
            </a>
          </>
        ) : (
          <>
            <div className="auth-brand">
              <div className="auth-brand-icon"><FaKey size={18} /></div>
              <div className="auth-title">Lupa Password</div>
              <div className="auth-subtitle">
                Masukkan email akun Admin Anda. Kami akan mengirimkan email berisi info login &amp; password yang tersimpan.
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }} noValidate>
              <div className="auth-field">
                <input suppressHydrationWarning
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
                <label>Email</label>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button className="auth-submit" type="submit" disabled={loading} suppressHydrationWarning>
                {loading && <span className="auth-spinner" />}
                {loading ? 'Mengirim' : 'Kirim Email'}
              </button>
            </form>

            <a href="/login" className="auth-footer">
              <FiArrowLeft size={13} /> Kembali ke Login
            </a>
          </>
        )}
      </div>
    </div>
  );
}