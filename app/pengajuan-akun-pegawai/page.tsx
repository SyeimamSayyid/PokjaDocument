'use client';

import { useState } from 'react';
import { FiUser, FiHash, FiMail, FiMapPin, FiSend, FiCheckCircle, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import { FaBalanceScale } from 'react-icons/fa';

const INDIGO = '#1E3A5F';
const CREAM = '#FAF8F0';
const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";

const LOKASI_LIST = ['BNNP Sulsel', 'BNNK Palopo', 'BNNK Toraja', 'BNNK Bone', 'BNNK Sidrap'];

export default function PengajuanAkunPegawaiPage() {
  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [email, setEmail] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nama.trim() || !nip.trim() || !email.trim() || !lokasi) {
      setError('Semua kolom wajib diisi.'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hukum/pengajuan-akun', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: nama.trim(), nip: nip.trim(), email: email.trim(), lokasi }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengirim pengajuan.'); return; }
      setPesan(d.message);
      setDone(true);
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes spinDot { to { transform: rotate(360deg); } }

        .auth-page {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 1.5rem; font-family: ${FONT};
          background: radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.08) 0%, rgba(30,58,95,0) 55%), linear-gradient(135deg, #0a0a0a 0%, #16213e 100%);
        }
        .auth-card {
          position: relative; width: 100%; max-width: 420px;
          display: flex; flex-direction: column; align-items: center; gap: 18px;
          padding: 2.2rem 2rem; border-radius: 22px; background: ${CREAM};
          box-shadow: 0 30px 70px rgba(0,0,0,0.5);
          animation: cardIn 0.5s cubic-bezier(0.32,0.72,0,1) both;
        }
        .auth-brand-icon {
          width: 48px; height: 48px; border-radius: 14px; background: ${INDIGO};
          display: flex; align-items: center; justify-content: center; color: ${CREAM};
        }
        .auth-title { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; color: ${INDIGO}; text-align: center; }
        .auth-subtitle { font-size: 11.5px; color: #64748b; line-height: 1.6; text-align: center; max-width: 320px; }

        .auth-field { position: relative; width: 100%; }
        .auth-field label { display: block; font-size: 10.5px; font-weight: 700; color: ${INDIGO}; margin-bottom: 5px; }
        .auth-field .wrap { position: relative; }
        .auth-field input, .auth-field select {
          width: 100%; padding: 11px 12px 11px 36px; font-size: 13px; font-family: ${FONT};
          color: ${INDIGO}; background: #fff; outline: none; box-sizing: border-box;
          border: 1.5px solid rgba(30,58,95,0.12); border-radius: 10px;
          transition: border-color 0.25s ease;
        }
        .auth-field input:focus, .auth-field select:focus { border-color: #2563EB; }
        .auth-field .ic { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }

        .auth-error {
          width: 100%; font-size: 11.5px; color: #b91c1c; background: rgba(185,28,28,0.08);
          border-left: 3px solid #b91c1c; padding: 9px 12px; border-radius: 8px; line-height: 1.4; box-sizing: border-box;
        }

        .auth-submit {
          margin-top: 4px; height: 46px; width: 100%; border-radius: 10px; border: 2px solid ${INDIGO};
          background: transparent; color: ${INDIGO}; cursor: pointer; font-family: ${FONT};
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em;
          transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .auth-submit:hover:not(:disabled) { background: ${INDIGO}; color: ${CREAM}; }
        .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-spinner {
          width: 12px; height: 12px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
          animation: spinDot 0.7s linear infinite;
        }

        .auth-footer {
          font-size: 11.5px; color: #64748b; display: flex; align-items: center; gap: 6px;
          text-decoration: none; transition: color 0.25s ease;
        }
        .auth-footer:hover { color: #2563EB; }

        .success-icon {
          width: 56px; height: 56px; border-radius: 50%; background: rgba(10,92,71,0.12);
          display: flex; align-items: center; justify-content: center; color: #0a5c47;
          animation: popIn 0.45s cubic-bezier(0.32,0.72,0,1) both;
        }
        .success-msg { font-size: 12.5px; color: #334155; text-align: center; line-height: 1.7; }
      `}</style>

      <div className="auth-card">
        {done ? (
          <>
            <div className="success-icon"><FiCheckCircle size={26} /></div>
            <div className="auth-title">Pengajuan Terkirim</div>
            <div className="success-msg">{pesan}</div>
            <a href="/login" className="auth-footer"><FiArrowLeft size={13} /> Kembali ke Login</a>
          </>
        ) : (
          <>
            <div className="auth-brand-icon"><FaBalanceScale size={20} /></div>
            <div className="auth-title">Pengajuan Akun Pegawai BNN</div>
            <div className="auth-subtitle">
              Belum punya akun untuk sistem Pendampingan Hukum? Isi data di bawah — admin akan memverifikasi dan mengaktifkan akun Anda.
            </div>

            <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
              <div className="auth-field">
                <label>Nama Lengkap</label>
                <div className="wrap">
                  <FiUser size={14} className="ic" />
                  <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap Anda" autoFocus />
                </div>
              </div>

              <div className="auth-field">
                <label>NIP / NRP</label>
                <div className="wrap">
                  <FiHash size={14} className="ic" />
                  <input value={nip} onChange={e => setNip(e.target.value)} placeholder="Contoh: 197205062010011007" />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(30,58,95,0.4)', marginTop: 4 }}>NIP ini yang akan dipakai buat login nantinya.</div>
              </div>

              <div className="auth-field">
                <label>Email Aktif</label>
                <div className="wrap">
                  <FiMail size={14} className="ic" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" />
                </div>
              </div>

              <div className="auth-field">
                <label>Lokasi BNNP/BNNK</label>
                <div className="wrap">
                  <FiMapPin size={14} className="ic" />
                  <select value={lokasi} onChange={e => setLokasi(e.target.value)}>
                    <option value="">Pilih lokasi...</option>
                    {LOKASI_LIST.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {error && <div className="auth-error"><FiAlertCircle size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />{error}</div>}

              <button className="auth-submit" type="submit" disabled={submitting}>
                {submitting && <span className="auth-spinner" />}
                {submitting ? 'Mengirim...' : (<><FiSend size={13} /> Kirim Pengajuan</>)}
              </button>
            </form>

            <a href="/login" className="auth-footer"><FiArrowLeft size={13} /> Sudah punya akun? Login</a>
          </>
        )}
      </div>
    </div>
  );
}