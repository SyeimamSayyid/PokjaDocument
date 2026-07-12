'use client';

import { useState } from 'react';
import { FaBalanceScale, FaArrowLeft } from 'react-icons/fa';
import { FiSearch, FiCheckCircle, FiXCircle, FiMapPin } from 'react-icons/fi';

const INDIGO = '#00416A';
const INDIGO_DEEP = '#002E4D';
const EGGSHELL = '#F0EAD6';
const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";

interface HasilCek {
  ditemukan: boolean;
  nip?: string;
  lokasi?: string;
}

export default function CekNipPage() {
  const [nip, setNip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasil, setHasil] = useState<HasilCek | null>(null);

  const handleCek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nip.trim()) return;

    setLoading(true); setError(''); setHasil(null);
    try {
      const res = await fetch(`/api/hukum/pegawai/cek?nip=${encodeURIComponent(nip.trim())}`);
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Terjadi kesalahan.'); return; }
      setHasil(d);
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: EGGSHELL, fontFamily: FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); filter: blur(5px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .fld { animation: fadeUp 0.7s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover:not(:disabled) { transform: translateY(-2px); }
        .btn-hover:active:not(:disabled) { transform: scale(0.97); }
        input::placeholder { color: rgba(0,65,106,0.3); }
        .result-shake { animation: shake 0.4s ease-out; }
      `}</style>

      <div style={{ position: 'relative', background: `linear-gradient(160deg, ${INDIGO} 0%, ${INDIGO_DEEP} 100%)`, paddingBottom: 80 }}>
        <nav style={{ display: 'flex', alignItems: 'center', padding: '1.2rem 2rem', maxWidth: 640, margin: '0 auto' }}>
          <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(240,234,214,0.7)', textDecoration: 'none' }}>
            <FaArrowLeft size={11} /> Kembali ke Login
          </a>
        </nav>

        <div style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(240,234,214,0.1)', border: '1px solid rgba(240,234,214,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }} className="fld">
            <FaBalanceScale size={26} color={EGGSHELL} />
          </div>
          <div style={{ display: 'inline-block', fontSize: 10, color: EGGSHELL, textTransform: 'uppercase', letterSpacing: '0.24em', fontWeight: 700, background: 'rgba(240,234,214,0.1)', padding: '6px 16px', borderRadius: 100, marginBottom: 16 }} className="fld">
            Modul Penegak Hukum
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: EGGSHELL, margin: '0 0 8px', letterSpacing: '-0.02em' }} className="fld">
            Cek NIP / NRP
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(240,234,214,0.6)', margin: 0, lineHeight: 1.6, maxWidth: 340 }} className="fld">
            Periksa apakah NIP/NRP Anda sudah terdaftar di sistem Pengajuan/Pendampingan Hukum Pokja
          </p>
        </div>

        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: 80, display: 'block' }}>
          <path d="M0,80 C360,10 1080,10 1440,80 L1440,80 L0,80 Z" fill={EGGSHELL} />
        </svg>
      </div>

      <div style={{ maxWidth: 460, margin: '0 auto', padding: '1.5rem 2rem 5rem' }}>
        <form onSubmit={handleCek} className="fld" style={{
          background: '#fff', borderRadius: 24, padding: '2rem', boxShadow: '0 30px 60px -40px rgba(0,65,106,0.35)', border: '1px solid rgba(0,65,106,0.08)',
        }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INDIGO, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            NIP / NRP
          </label>
          <div style={{ position: 'relative' }}>
            <FiSearch size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,65,106,0.35)' }} />
            <input
              type="text"
              value={nip}
              onChange={e => setNip(e.target.value)}
              placeholder="Masukkan NIP atau NRP Anda"
              autoFocus
              style={{
                width: '100%', padding: '13px 14px 13px 40px', borderRadius: 12,
                border: '1.5px solid rgba(0,65,106,0.12)', background: 'rgba(0,65,106,0.02)',
                color: INDIGO, fontSize: 14, fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <button type="submit" disabled={loading || !nip.trim()} className="btn-hover" style={{
            width: '100%', marginTop: 16, padding: '13px', borderRadius: 12, border: 'none',
            background: INDIGO, color: EGGSHELL, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: FONT, opacity: loading || !nip.trim() ? 0.6 : 1,
          }}>
            {loading ? 'Memeriksa...' : 'Cek Status'}
          </button>
        </form>

        {error ? (
          <div className="fld" style={{ marginTop: 16, fontSize: 12.5, color: '#A32D2D', background: 'rgba(163,45,45,0.06)', padding: '12px 16px', borderRadius: 12 }}>
            {error}
          </div>
        ) : null}

        {hasil ? (
          <div className={hasil.ditemukan ? 'fld' : 'fld result-shake'} style={{
            marginTop: 16, borderRadius: 20, padding: '1.6rem 1.7rem',
            background: hasil.ditemukan ? 'rgba(0,65,106,0.04)' : 'rgba(163,45,45,0.05)',
            border: `1px solid ${hasil.ditemukan ? 'rgba(0,65,106,0.12)' : 'rgba(163,45,45,0.15)'}`,
          }}>
            {hasil.ditemukan ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiCheckCircle size={17} color={EGGSHELL} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: INDIGO }}>NIP/NRP Terdaftar</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: 'rgba(0,65,106,0.55)' }}>NIP / NRP</span>
                    <strong style={{ color: INDIGO }}>{hasil.nip}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: 'rgba(0,65,106,0.55)' }}>Lokasi BNN</span>
                    <strong style={{ color: INDIGO, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiMapPin size={12} /> {hasil.lokasi}
                    </strong>
                  </div>
                </div>
                <a href="/login" className="btn-hover" style={{
                  display: 'block', textAlign: 'center', marginTop: 18, padding: '11px', borderRadius: 10,
                  background: INDIGO, color: EGGSHELL, fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
                }}>
                  Lanjut ke Login
                </a>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#A32D2D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiXCircle size={17} color="#fff" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#A32D2D' }}>Tidak Ditemukan</div>
                </div>
                <p style={{ fontSize: 12.5, color: '#7a3a3a', lineHeight: 1.7, margin: 0 }}>
                  Maaf, NIP/NRP belum terdaftar, silahkan hubungi admin Pokja untuk mendaftarkan NIP/NRP Anda ke dalam sistem pengajuan/pengawalan.
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}