'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import CekCepatPegawai from '@/components/CekCepatPegawai';
import {
  FiGrid, FiUserPlus, FiClipboard, FiTrendingUp, FiArchive,
  FiSend, FiClock, FiUser, FiInbox, FiAlertCircle, FiArrowLeft,
} from 'react-icons/fi';
import { FaShieldAlt } from 'react-icons/fa';

interface Pengajuan {
  id: string; nama: string; lokasiBnn: string; tglKejadian: string; tempatKejadian: string;
  pasal: string; deskripsi: string; status: string;
}
interface TindakLanjut { id: string; idPendampingan: string; isi: string; oleh: string; tgl: string; }

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';
const CREAM = '#FAF8F0';

const STATUS_INFO: Record<string, { color: string; bg: string }> = {
  'Diajukan': { color: INDIGO, bg: 'rgba(30,58,95,0.08)' },
  'Ditinjau': { color: '#B5813F', bg: '#F5EFE0' },
  'Diproses': { color: '#1D4ED8', bg: '#DBEAFE' },
  'Selesai':  { color: '#0a5c47', bg: 'rgba(10,92,71,0.1)' },
  'Ditolak':  { color: '#A32D2D', bg: '#FCEBEB' },
};

function TindakLanjutContent() {
  const searchParams = useSearchParams();
  const idPendampingan = searchParams.get('id') || '';

  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [checking, setChecking] = useState(true);
  const [kasus, setKasus] = useState<Pengajuan | null>(null);
  const [timeline, setTimeline] = useState<TindakLanjut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isiBaru, setIsiBaru] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!idPendampingan) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetch('/api/hukum/pendampingan').then(r => r.json()),
      fetch(`/api/hukum/tindak-lanjut?idPendampingan=${idPendampingan}`).then(r => r.json()),
    ])
      .then(([pengajuanRes, timelineRes]) => {
        const found = (pengajuanRes.data || []).find((p: Pengajuan) => p.id === idPendampingan);
        setKasus(found || null);
        setTimeline(timelineRes.data || []);
      })
      .catch(() => setError('Gagal memuat data.'))
      .finally(() => setLoading(false));
  }, [idPendampingan]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setNamaAdmin(u.nama || u.email || 'Admin');
        setChecking(false);
        load();
      })
      .catch(() => { window.location.href = '/login'; });
  }, [load]);

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  const kirimTindakLanjut = async () => {
    if (!isiBaru.trim()) { setError('Isi tindak lanjut wajib diisi.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/hukum/tindak-lanjut', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPendampingan, isi: isiBaru.trim(), oleh: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mencatat tindak lanjut.'); return; }
      setIsiBaru('');
      load();
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setSubmitting(false); }
  };

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/hukum/akun-pegawai', icon: <FiUserPlus size={17} />, label: 'Akun Pegawai BNN' },
    { href: '/dashboard/hukum/pengajuan-akun', icon: <FiInbox size={17} />, label: 'Pengajuan Akun' },
    { href: '/dashboard/hukum/pendampingan', icon: <FiClipboard size={17} />, label: 'Kelola Pendampingan' },
    { href: '/dashboard/hukum/tindak-lanjut', icon: <FiTrendingUp size={17} />, label: 'Tindak Lanjut' },
    { href: '/dashboard/hukum/arsip-penanganan', icon: <FiArchive size={17} />, label: 'Arsip Penanganan' },
  ];

  if (checking) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily: FONT, color: '#64748b', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(30,58,95,0.1)', borderTop: `3px solid ${INDIGO}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13 }}>Memuat...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        textarea::placeholder { color: rgba(30,58,95,0.3); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/hukum/tindak-lanjut"
        brandLabel="SI-POKJA HUMKER"
        brandSub="Modul Penegak Hukum"
        navSectionTitle="Modul Hukum"
        userName={namaAdmin}
        userTag="Admin BNNP/BNNK"
        accent="#2C5580"
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 760, margin: '0 auto', padding: '1.4rem 1.5rem 3rem' }}>
        <a href="/dashboard/hukum/pendampingan" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: 16 }} className="fld">
          <FiArrowLeft size={13} /> Kembali ke Kelola Pendampingan
        </a>

        <div style={{ marginBottom: 18 }} className="fld">
          <CekCepatPegawai />
        </div>

        {!idPendampingan ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '3rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }} className="fld">
            <FiInbox size={32} style={{ color: '#cbd5e1', marginBottom: 10 }} />
            <div style={{ fontSize: 13.5, color: '#64748b' }}>Pilih kasus dulu dari halaman Kelola Pendampingan.</div>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: 13 }}>Memuat kasus...</div>
        ) : !kasus ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '3rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }} className="fld">
            <FiAlertCircle size={32} style={{ color: '#cbd5e1', marginBottom: 10 }} />
            <div style={{ fontSize: 13.5, color: '#64748b' }}>Kasus tidak ditemukan.</div>
          </div>
        ) : (
          <>
            <div style={{ background: '#fff', borderRadius: 20, padding: '1.4rem 1.6rem', border: '1px solid rgba(30,58,95,0.06)', marginBottom: 18 }} className="fld">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: (STATUS_INFO[kasus.status] || STATUS_INFO['Diajukan']).bg, color: (STATUS_INFO[kasus.status] || STATUS_INFO['Diajukan']).color }}>{kasus.status}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: INDIGO }}>{kasus.nama}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                <div>{kasus.tempatKejadian} · {kasus.tglKejadian}</div>
                <div>Pasal: {kasus.pasal}</div>
                <div>Lokasi BNN: {kasus.lokasiBnn || '—'}</div>
              </div>
            </div>

            {error && <div style={{ ...msgBox('#A32D2D', '#FCEBEB'), marginBottom: 14 }} className="fld">{error}</div>}

            <div style={{ fontSize: 13, fontWeight: 800, color: INDIGO, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }} className="fld">
              <FiTrendingUp size={15} /> Timeline Tindak Lanjut ({timeline.length})
            </div>

            {timeline.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)', marginBottom: 18 }} className="fld">
                <div style={{ fontSize: 12.5, color: '#64748b' }}>Belum ada catatan tindak lanjut.</div>
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 20, marginBottom: 18 }}>
                <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: 'rgba(30,58,95,0.12)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {timeline.map(t => (
                    <div key={t.id} style={{ position: 'relative' }} className="fld">
                      <div style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: INDIGO, border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(30,58,95,0.1)' }} />
                      <div style={{ background: '#fff', borderRadius: 14, padding: '12px 15px', border: '1px solid rgba(30,58,95,0.06)' }}>
                        <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>{t.isi}</div>
                        <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><FiUser size={10} /> {t.oleh}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><FiClock size={10} /> {t.tgl}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 18, padding: '1.2rem 1.4rem', border: '1px solid rgba(30,58,95,0.06)' }} className="fld">
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INDIGO, marginBottom: 6 }}>Catat Tindak Lanjut Baru</label>
              <textarea
                value={isiBaru}
                onChange={e => setIsiBaru(e.target.value)}
                style={{ width: '100%', height: 80, padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(30,58,95,0.1)', background: 'rgba(30,58,95,0.02)', fontSize: 12.5, fontFamily: FONT, outline: 'none', color: INDIGO, boxSizing: 'border-box', resize: 'none' }}
                placeholder="Contoh: Sudah koordinasi dengan pihak kepolisian setempat, menunggu jadwal BAP..."
              />
              <button onClick={kirimTindakLanjut} disabled={submitting} className="btn-hover" style={{ marginTop: 10, width: '100%', padding: '11px', borderRadius: 12, border: 'none', background: INDIGO, color: CREAM, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <FiSend size={13} /> {submitting ? 'Menyimpan...' : 'Simpan Tindak Lanjut'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize: 12, color, background: bg, padding: '10px 14px', borderRadius: 10 });

export default function TindakLanjutHukumPage() {
  return (
    <Suspense fallback={null}>
      <TindakLanjutContent />
    </Suspense>
  );
}