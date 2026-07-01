'use client';

import { useState } from 'react';
import { 
  FiUser, FiLock, FiAlertCircle, FiCheckCircle, 
  FiShield, FiUsers, FiKey, FiExternalLink,
  FiArrowRight, FiBriefcase, FiStar, FiTool
} from 'react-icons/fi';
import { 
  FaUser, FaLock, FaShieldAlt, FaKey, 
  FaCrown, FaUserTie, FaBuilding
} from 'react-icons/fa';
import { SiGoogle } from 'react-icons/si';

type Role = 'superadmin' | 'admin';

const ROLES: { value: Role; label: string; desc: string; icon: React.ReactNode }[] = [
  { 
    value: 'superadmin', 
    label: 'Superadmin',  
    desc: 'Akses & statistik penuh', 
    icon: <FaCrown size={20} /> 
  },
  { 
    value: 'admin',      
    label: 'Admin Pokja',  
    desc: 'Kelola draft & dokumen',  
    icon: <FiTool size={20} /> 
  },
];

const REDIRECT: Record<Role, string> = {
  superadmin: '/dashboard/superadmin',
  admin:      '/dashboard/admin',
};

export default function LoginPage() {
  const [role, setRole]         = useState<Role>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Login gagal. Periksa kembali data Anda.');
        setLoading(false);
        return;
      }

      const userStr = JSON.stringify(data.user);
      localStorage.setItem('paktasign_user', userStr);
      document.cookie = `paktasign_user=${encodeURIComponent(userStr)}; path=/; max-age=86400`;
      document.cookie = `paktasign_role=${data.user.role}; path=/; max-age=86400`;
      window.location.href = REDIRECT[data.user.role as Role];

    } catch {
      setError('Terjadi kesalahan koneksi. Coba lagi.');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* Reset dan base styles */
        .login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
          padding: 1rem;
          position: relative;
          overflow: hidden;
        }

        .login-wrap::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 30% 40%, rgba(175, 169, 236, 0.03) 0%, transparent 60%);
          animation: pulse-bg 8s ease-in-out infinite;
        }

        .login-wrap::after {
          content: '';
          position: absolute;
          bottom: -30%;
          right: -30%;
          width: 150%;
          height: 150%;
          background: radial-gradient(circle at 70% 60%, rgba(245, 222, 179, 0.03) 0%, transparent 50%);
          animation: pulse-bg 10s ease-in-out infinite reverse;
        }

        @keyframes pulse-bg {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        .login-wrap ::selection { 
          background-color: #424242; 
        }

        .login-wrap .container {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .login-wrap .form {
          width: 100%;
          max-width: 420px;
          background: linear-gradient(145deg, rgba(50, 50, 50, 0.95) 0%, rgba(30, 30, 30, 0.98) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          border-radius: 16px;
          padding: 2.5rem 2rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(175, 169, 236, 0.03);
          backdrop-filter: blur(10px);
          position: relative;
        }

        .login-wrap .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .login-wrap .brand-icon { 
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(29, 158, 117, 0.3);
        }

        .login-wrap .brand-name {
          font-size: 18px;
          font-weight: 700;
          color: #f5deb3;
          letter-spacing: 0.5px;
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

        .login-wrap .subtitle {
          font-size: 12px;
          color: rgba(245, 222, 179, 0.4);
          margin-bottom: 24px;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .login-wrap .role-row {
          display: flex;
          gap: 8px;
          width: 100%;
          margin-bottom: 20px;
        }

        .login-wrap .role-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 14px 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(245, 222, 179, 0.08);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: rgba(245, 222, 179, 0.3);
          font-family: inherit;
        }

        .login-wrap .role-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(245, 222, 179, 0.2);
          color: rgba(245, 222, 179, 0.6);
          transform: translateY(-2px);
        }

        .login-wrap .role-icon { 
          font-size: 20px;
          color: inherit;
        }

        .login-wrap .role-label { 
          font-size: 13px; 
          font-weight: 600; 
          color: inherit; 
        }

        .login-wrap .role-desc { 
          font-size: 10px; 
          text-align: center; 
          opacity: 0.7; 
          line-height: 1.3; 
          color: inherit; 
        }

        .login-wrap .role-active { 
          border-width: 2px; 
          color: wheat; 
        }

        .login-wrap .role-active.role-superadmin {
          background: rgba(175, 169, 236, 0.15);
          border-color: #AFA9EC;
          box-shadow: 0 0 20px rgba(175, 169, 236, 0.1);
        }

        .login-wrap .role-active.role-admin {
          background: rgba(245, 222, 179, 0.08);
          border-color: wheat;
          box-shadow: 0 0 20px rgba(245, 222, 179, 0.05);
        }

        .login-wrap .field-group {
          width: 100%;
          margin-bottom: 12px;
        }

        .login-wrap .field-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(245, 222, 179, 0.5);
          margin-bottom: 6px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-weight: 500;
        }

        .login-wrap .input-wrapper {
          position: relative;
        }

        .login-wrap .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(245, 222, 179, 0.2);
          pointer-events: none;
          font-size: 14px;
        }

        .login-wrap .input {
          width: 100%;
          padding: 12px 14px 12px 40px;
          background: rgba(255, 255, 255, 0.04);
          color: #f5deb3;
          border: 2px solid rgba(255, 255, 255, 0.06);
          outline: none;
          transition: all 0.3s ease;
          font-size: 14px;
          font-family: inherit;
          border-radius: 10px;
        }

        .login-wrap .input::placeholder {
          color: rgba(245, 222, 179, 0.2);
          font-size: 13px;
        }

        .login-wrap .input:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(245, 222, 179, 0.15);
        }

        .login-wrap .input:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(29, 158, 117, 0.4);
          box-shadow: 0 0 0 4px rgba(29, 158, 117, 0.05);
        }

        .login-wrap .error-box {
          width: 100%;
          font-size: 12px;
          color: #f87171;
          padding: 10px 14px;
          background: rgba(248, 113, 113, 0.08);
          border-radius: 8px;
          border-left: 3px solid #f87171;
          margin-bottom: 12px;
          line-height: 1.4;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .login-wrap .btn {
          width: 100%;
          padding: 14px;
          margin-top: 12px;
          border-radius: 10px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          cursor: pointer;
          font-family: inherit;
          letter-spacing: 0.3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .login-wrap .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .login-wrap .btn:active:not(:disabled) { 
          transform: scale(0.98); 
        }

        .login-wrap .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .login-wrap .btn-superadmin {
          background: linear-gradient(135deg, #AFA9EC 0%, #8B83D9 100%);
          color: #1a1a2e;
          box-shadow: 0 4px 20px rgba(175, 169, 236, 0.3);
        }

        .login-wrap .btn-superadmin:hover:not(:disabled) { 
          background: linear-gradient(135deg, #CECBF6 0%, #AFA9EC 100%);
          box-shadow: 0 6px 30px rgba(175, 169, 236, 0.4);
        }

        .login-wrap .btn-admin {
          background: linear-gradient(135deg, #f5deb3 0%, #e8cfa0 100%);
          color: #1a1a2e;
          box-shadow: 0 4px 20px rgba(245, 222, 179, 0.2);
        }

        .login-wrap .btn-admin:hover:not(:disabled) { 
          background: linear-gradient(135deg, #ffebcd 0%, #f5deb3 100%);
          box-shadow: 0 6px 30px rgba(245, 222, 179, 0.3);
        }

        .login-wrap .role-info {
          margin-top: 16px;
          font-size: 11px;
          color: rgba(245, 222, 179, 0.25);
          text-align: center;
        }

        .login-wrap .role-info strong { 
          color: rgba(245, 222, 179, 0.5); 
        }

        .login-wrap .mitra-link {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(245, 222, 179, 0.06);
          width: 100%;
          text-align: center;
          font-size: 12px;
          color: rgba(245, 222, 179, 0.3);
        }

        .login-wrap .mitra-link a {
          color: #1D9E75;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .login-wrap .mitra-link a:hover {
          color: #2DB888;
          text-decoration: underline;
        }

        .login-wrap .corner-decor {
          position: absolute;
          top: -1px;
          right: -1px;
          width: 60px;
          height: 60px;
          border-top-right-radius: 16px;
          background: linear-gradient(135deg, transparent 50%, rgba(175, 169, 236, 0.05) 100%);
          pointer-events: none;
        }

        .login-wrap .corner-decor-bottom {
          position: absolute;
          bottom: -1px;
          left: -1px;
          width: 60px;
          height: 60px;
          border-bottom-left-radius: 16px;
          background: linear-gradient(225deg, transparent 50%, rgba(245, 222, 179, 0.05) 100%);
          pointer-events: none;
        }

        @media (max-width: 480px) {
          .login-wrap .form { 
            border-radius: 0; 
            min-height: 100vh; 
            justify-content: center;
            padding: 1.5rem;
          }
          .login-wrap .role-desc { 
            display: none; 
          }
          .login-wrap .brand-name {
            font-size: 16px;
          }
        }
      `}</style>
      <div className="login-wrap">
        <div className="container">
          <form className="form" onSubmit={handleSubmit} noValidate>

            <div className="brand">
              <div className="brand-icon">
                <FaBuilding size={18} color="#fff" />
              </div>
              <span className="brand-name">SI-POKJA HUMKER</span>
            </div>
            <p className="subtitle">
              <FiShield size={12} style={{ opacity: 0.5 }} />
              Sistem Manajemen Kerja Sama
            </p>

            <div className="role-row">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`role-btn ${role === r.value ? `role-active role-${r.value}` : ''}`}
                  onClick={() => {
                    setRole(r.value);
                    setError('');
                    setUsername('');
                    setPassword('');
                  }}
                >
                  <span className="role-icon">{r.icon}</span>
                  <span className="role-label">{r.label}</span>
                  <span className="role-desc">{r.desc}</span>
                </button>
              ))}
            </div>

            <div className="field-group">
              <label className="field-label">
                <FiUser size={12} /> Email / Username
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <FaUser size={14} />
                </span>
                <input
                  className="input"
                  type="text"
                  placeholder={role === 'superadmin' ? 'superadmin@bnn.go.id' : 'admin@bnn.go.id'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">
                <FiLock size={12} /> Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <FaLock size={14} />
                </span>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="error-box">
                <FiAlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button className={`btn btn-${role}`} type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spin-icon">
                    <FiLock size={18} />
                  </span>
                  Memproses...
                </>
              ) : (
                <>
                  <FiCheckCircle size={18} />
                  Masuk ke Sistem
                  <FiArrowRight size={16} className="arrow-icon" />
                </>
              )}
            </button>

            <div className="role-info">
              Masuk sebagai <strong>{ROLES.find(r => r.value === role)?.label}</strong>
            </div>

            <div className="mitra-link">
              Anda mitra kerja sama?{' '}
              <a href="/login-mitra">
                Akses dokumen Anda di sini <FiExternalLink size={12} />
              </a>
            </div>

            <div className="corner-decor" />
            <div className="corner-decor-bottom" />

            <style jsx>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .spin-icon {
                display: inline-block;
                animation: spin 1s linear infinite;
              }
              .btn:hover:not(:disabled) .arrow-icon {
                transform: translateX(4px);
              }
              .arrow-icon {
                transition: transform 0.3s ease;
              }
            `}</style>
          </form>
        </div>
      </div>
    </>
  );
}