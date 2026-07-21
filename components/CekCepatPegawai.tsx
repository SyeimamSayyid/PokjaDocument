'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiX, FiCheckCircle } from 'react-icons/fi';

interface MasterHasil { nip: string; nama: string; lokasi: string; status: string; }

const INDIGO = '#1E3A5F';
const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";

// Komponen "Cek Cepat" — cari NIP/nama pegawai terhadap Data Pegawai BNN
// Master (hasil import Excel), tanpa perlu buka file Excel lagi. Dipakai di
// beberapa halaman modul Hukum (Pengajuan Akun, Kelola Pendampingan, Tindak
// Lanjut) — dibikin 1 komponen biar tidak duplikasi logika di 3 tempat.
export default function CekCepatPegawai() {
  const [cari, setCari] = useState('');
  const [hasil, setHasil] = useState<MasterHasil[]>([]);
  const [loading, setLoading] = useState(false);
  const [terbuka, setTerbuka] = useState(false);

  useEffect(() => {
    if (!cari.trim()) { setHasil([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/hukum/pengajuan-akun?cariMaster=${encodeURIComponent(cari.trim())}`)
        .then(r => r.json())
        .then(d => setHasil(d.master || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [cari]);

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(30,58,95,0.06)', overflow: 'hidden' }}>
      <button
        onClick={() => setTerbuka(v => !v)}
        style={{
          width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
        }}
      >
        <FiSearch size={15} style={{ color: INDIGO, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: INDIGO, flex: 1 }}>Cek Cepat — Data Pegawai BNN Master</span>
        <span style={{ fontSize: 10.5, color: '#94a3b8' }}>{terbuka ? 'Tutup' : 'Buka'}</span>
      </button>

      {terbuka && (
        <div style={{ padding: '0 18px 16px' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
            Ketik NIP atau nama buat verifikasi manual siapa saja terhadap data resmi pegawai BNN — tanpa perlu buka file Excel lagi.
          </div>
          <div style={{ position: 'relative' }}>
            <FiSearch size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(30,58,95,0.4)' }} />
            <input
              value={cari}
              onChange={e => setCari(e.target.value)}
              placeholder="Ketik NIP atau nama..."
              style={{ width: '100%', padding: '10px 34px 10px 36px', borderRadius: 100, border: '1.5px solid rgba(30,58,95,0.1)', background: 'rgba(30,58,95,0.02)', fontSize: 12.5, fontFamily: FONT, outline: 'none', color: INDIGO, boxSizing: 'border-box' }}
            />
            {cari && (
              <button onClick={() => setCari('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
                <FiX size={14} />
              </button>
            )}
          </div>

          {cari.trim() && (
            <div style={{ marginTop: 12 }}>
              {loading ? (
                <div style={{ fontSize: 12, color: '#94a3b8', padding: '10px 0' }}>Mencari...</div>
              ) : hasil.length === 0 ? (
                <div style={{ fontSize: 12, color: '#A32D2D', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiX size={13} /> Tidak ditemukan di data master — NIP/nama ini tidak terdaftar sebagai pegawai BNN resmi.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {hasil.map((m, i) => (
                    <div key={`${m.nip}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(10,92,71,0.06)', border: '1px solid rgba(10,92,71,0.15)' }}>
                      <FiCheckCircle size={14} style={{ color: '#0a5c47', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: INDIGO }}>{m.nama}</div>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>NIP: {m.nip} · {m.lokasi}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}