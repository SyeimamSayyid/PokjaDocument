'use client';

import { useState } from 'react';
import { 
  FiKey, FiLock, FiAlertCircle, FiCheckCircle, 
  FiUser, FiShield, FiExternalLink,
  FiArrowRight, FiInfo
} from 'react-icons/fi';
import { FaKey, FaBuilding, FaLock, FaShieldAlt } from 'react-icons/fa';

export default function LoginMitraPage() {
  const [kode, setKode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kode.trim()) return;

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login-mitra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kode: kode.trim() }),
      });
      const d = await res.json();

      if (!res.ok) { setError(d.message || 'Kode tidak valid.'); setLoading(false); return; }

      localStorage.setItem('paktasign_mitra', JSON.stringify(d.user));
      window.location.href = '/dashboard/mitra';
    } catch {
      setError('Terjadi kesalahan koneksi.');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontFamily: 'sans-serif', 
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle at 30% 40%, rgba(29, 158, 117, 0.05) 0%, transparent 60%)',
        animation: 'pulse 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        right: '-30%',
        width: '150%',
        height: '150%',
        background: 'radial-gradient(circle at 70% 60%, rgba(26, 115, 232, 0.05) 0%, transparent 50%)',
        animation: 'pulse 10s ease-in-out infinite reverse'
      }} />

      <div style={{ 
        width: '100%', 
        maxWidth: 420, 
        background: 'linear-gradient(145deg, rgba(50, 50, 50, 0.95) 0%, rgba(30, 30, 30, 0.98) 100%)', 
        borderRadius: 16, 
        padding: '2.5rem 2rem',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(29, 158, 117, 0.05)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 1
      }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ 
            width: 72, 
            height: 72, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 4px 20px rgba(29, 158, 117, 0.3)',
            animation: 'float 3s ease-in-out infinite'
          }}>
            <FaBuilding size={32} color="#fff" />
          </div>
          <div style={{ 
            fontSize: 20, 
            fontWeight: 700, 
            color: '#f5deb3',
            letterSpacing: 0.5
          }}>
            Akses Dokumen Mitra
          </div>
          <div style={{ 
            fontSize: 12, 
            color: 'rgba(245,222,179,0.4)',
            marginTop: 4,
            letterSpacing: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4
          }}>
            <FiShield size={12} style={{ opacity: 0.5 }} />
            SI-POKJA HUMKER
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 6 }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              fontSize: 11, 
              color: 'rgba(245,222,179,0.5)', 
              marginBottom: 8, 
              textTransform: 'uppercase', 
              letterSpacing: 0.8,
              fontWeight: 500
            }}>
              <FiKey size={12} />
              Kode Akses Dokumen
            </label>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(245,222,179,0.3)',
              pointerEvents: 'none'
            }}>
              <FaKey size={16} />
            </div>
            <input
              type="text"
              value={kode}
              onChange={e => setKode(e.target.value.toUpperCase())}
              placeholder="MOU-XXXXXX atau PKS-XXXXXX"
              maxLength={12}
              autoFocus
              style={{
                width: '100%',
                padding: '14px 14px 14px 42px',
                borderRadius: 10,
                border: error ? '2px solid #f87171' : '2px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.04)',
                color: '#f5deb3',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: 'uppercase',
                boxSizing: 'border-box',
                marginBottom: 12,
                outline: 'none',
                transition: 'all 0.3s ease',
                fontFamily: 'monospace',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(29, 158, 117, 0.4)';
                e.target.style.boxShadow = '0 0 0 4px rgba(29, 158, 117, 0.05)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error ? '#f87171' : 'rgba(255,255,255,0.06)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <div style={{ 
              fontSize: 12, 
              color: '#f87171', 
              background: 'rgba(248,113,113,0.08)', 
              padding: '10px 14px', 
              borderRadius: 8, 
              marginBottom: 14, 
              borderLeft: '3px solid #f87171',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <FiAlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !kode.trim()}
            className="submit-btn"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 10,
              border: 'none',
              background: loading || !kode.trim() 
                ? 'rgba(29, 158, 117, 0.3)' 
                : 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || !kode.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !kode.trim() ? 0.5 : 1,
              fontFamily: 'sans-serif',
              transition: 'all 0.3s ease',
              boxShadow: loading || !kode.trim() 
                ? 'none' 
                : '0 4px 20px rgba(29, 158, 117, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {loading ? (
              <>
                <span className="spin-icon">
                  <FiLock size={18} />
                </span>
                Memverifikasi...
              </>
            ) : (
              <>
                <FiCheckCircle size={18} />
                Akses Dokumen Saya
                <FiArrowRight size={16} className="arrow-icon" />
              </>
            )}
          </button>
        </form>

        <div style={{ 
          marginTop: 20, 
          paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          fontSize: 11, 
          color: 'rgba(245,222,179,0.3)', 
          textAlign: 'center', 
          lineHeight: 1.8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <FiInfo size={11} />
            Kode dikirim oleh Pokja Kerja Sama saat pengajuan disetujui.
          </div>
          <a href="/cek-pengajuan" className="link-hover" style={{ 
            color: 'rgba(29, 158, 117, 0.7)', 
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 4,
            transition: 'all 0.3s ease',
            padding: '4px 8px',
            borderRadius: 4,
          }}>
            Belum punya kode? Cek status pengajuan
            <FiExternalLink size={10} />
          </a>
        </div>

        {/* Decorative corner accents */}
        <div style={{
          position: 'absolute',
          top: -1,
          right: -1,
          width: 60,
          height: 60,
          borderTopRightRadius: 16,
          background: 'linear-gradient(135deg, transparent 50%, rgba(29, 158, 117, 0.1) 100%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -1,
          left: -1,
          width: 60,
          height: 60,
          borderBottomLeftRadius: 16,
          background: 'linear-gradient(225deg, transparent 50%, rgba(29, 158, 117, 0.1) 100%)',
          pointerEvents: 'none'
        }} />
      </div>

      {/* All styles at root level */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-icon {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
        .submit-btn:hover:not(:disabled) .arrow-icon {
          transform: translateX(4px);
        }
        .link-hover:hover {
          color: #1D9E75 !important;
          background: rgba(29, 158, 117, 0.05);
        }
        .shimmer-text {
          background: linear-gradient(90deg, #f5deb3, #ffd700, #f5deb3);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}