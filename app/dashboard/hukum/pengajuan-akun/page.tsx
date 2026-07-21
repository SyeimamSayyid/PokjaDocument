'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiUserPlus, FiClipboard, FiTrendingUp, FiArchive,
  FiSearch, FiCheck, FiX, FiInbox, FiMapPin, FiHash, FiMail, FiUser, FiCheckCircle, FiUpload,
} from 'react-icons/fi';
import { FaBalanceScale } from 'react-icons/fa';

interface Pengajuan {
  id: string; nama: string; nip: string; email: string; lokasi: string; status: string;
  tglDiajukan: string; diprosesOleh: string; tglDiproses: string; cocokMaster: boolean;
}
interface MasterHasil { nip: string; nama: string; lokasi: string; status: string; }

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';
const CREAM = '#FAF8F0';

export default function AkunPegawaiBnnPage() {
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [checking, setChecking] = useState(true);
  const [pengajuan, setPengajuan] = useState<Pengajuan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('Menunggu');

  // Cek Cepat Master — pencarian manual admin, terpisah dari daftar pengajuan
  const [cariMaster, setCariMaster] = useState('');
  const [hasilMaster, setHasilMaster] = useState<MasterHasil[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Upload/ganti Excel Data Pegawai BNN Master
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [totalMaster, setTotalMaster] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/hukum/pengajuan-akun')
      .then(r => r.json())
      .then(d => setPengajuan(d.data || []))
      .catch(() => setError('Gagal memuat data.'))
      .finally(() => setLoading(false));
  }, []);

  const loadTotalMaster = useCallback(() => {
    fetch('/api/hukum/pengajuan-akun/master-upload')
      .then(r => r.json())
      .then(d => setTotalMaster(typeof d.total === 'number' ? d.total : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setNamaAdmin(u.nama || u.email || 'Admin');
        setChecking(false);
        load();
        loadTotalMaster();
      })
      .catch(() => { window.location.href = '/login'; });
  }, [load, loadTotalMaster]);

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  // Debounce sederhana buat pencarian master
  useEffect(() => {
    if (!cariMaster.trim()) { setHasilMaster([]); return; }
    const t = setTimeout(() => {
      setLoadingMaster(true);
      fetch(`/api/hukum/pengajuan-akun?cariMaster=${encodeURIComponent(cariMaster.trim())}`)
        .then(r => r.json())
        .then(d => setHasilMaster(d.master || []))
        .catch(() => {})
        .finally(() => setLoadingMaster(false));
    }, 350);
    return () => clearTimeout(t);
  }, [cariMaster]);

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExcel(true); setUploadMsg(''); setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/hukum/pengajuan-akun/master-upload', { method: 'POST', body: formData });
      const d = await res.json();
      if (!res.ok) { setUploadError(d.message || 'Gagal memproses file.'); return; }
      setUploadMsg(d.message);
      loadTotalMaster();
    } catch {
      setUploadError('Terjadi kesalahan saat mengupload file.');
    } finally {
      setUploadingExcel(false);
      e.target.value = '';
    }
  };

  const proses = async (id: string, keputusan: 'Disetujui' | 'Ditolak') => {
    setProcessing(id); setError(''); setMsg('');
    try {
      const res = await fetch('/api/hukum/pengajuan-akun', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, keputusan, diprosesOleh: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal memproses.'); return; }
      setMsg(d.message);
      load();
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setProcessing(null); }
  };

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/hukum/akun-pegawai', icon: <FiUserPlus size={17} />, label: 'Pembuatan Akun Pegawai' },
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

  const filtered = filterStatus === 'Semua' ? pengajuan : pengajuan.filter(p => p.status === filterStatus);

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        input::placeholder { color: rgba(30,58,95,0.3); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/hukum/pengajuan-akun"
        brandLabel="SI-POKJA HUMKER"
        brandSub="Modul Penegak Hukum"
        navSectionTitle="Modul Hukum"
        userName={namaAdmin}
        userTag="Admin BNNP/BNNK"
        accent="#2C5580"
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 900, margin: '0 auto', padding: '1.4rem 1.5rem 0' }}>
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(250,248,240,0.75)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(30,58,95,0.1)', borderRadius: 100, padding: '10px 14px',
          boxShadow: '0 10px 30px -18px rgba(30,58,95,0.3)',
        }} className="fld">
          <div style={{ fontWeight: 800, fontSize: 14, color: INDIGO, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaBalanceScale size={15} /> Akun Pegawai BNN
          </div>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth: 900, margin: '0 auto', padding: '1.4rem 1.5rem 3rem' }}>
        {msg && <div style={{ ...msgBox('#0a5c47', 'rgba(10,92,71,0.1)'), marginBottom: 14 }} className="fld">{msg}</div>}
        {error && <div style={{ ...msgBox('#A32D2D', '#FCEBEB'), marginBottom: 14 }} className="fld">{error}</div>}

        {/* Cek Cepat Master — pencarian manual, terpisah dari daftar pengajuan */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '1.2rem 1.4rem', border: '1px solid rgba(30,58,95,0.06)', marginBottom: 20 }} className="fld">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: INDIGO, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiSearch size={15} /> Cek Cepat — Data Pegawai BNN Master
            </div>
            <div>
              <label className="btn-hover" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700,
                padding: '7px 14px', borderRadius: 100, border: '1px solid rgba(30,58,95,0.15)',
                background: 'rgba(30,58,95,0.04)', color: INDIGO, cursor: 'pointer', fontFamily: FONT,
              }}>
                <FiUpload size={12} /> {uploadingExcel ? 'Memproses...' : totalMaster !== null ? 'Ganti Excel' : 'Upload Excel'}
                <input type="file" accept=".xlsx,.xls" onChange={handleUploadExcel} style={{ display: 'none' }} disabled={uploadingExcel} />
              </label>
            </div>
          </div>
          {totalMaster !== null && (
            <div style={{ fontSize: 10.5, color: 'rgba(30,58,95,0.5)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <FiCheckCircle size={11} style={{ color: '#0a5c47' }} /> {totalMaster} pegawai tersimpan di data master saat ini.
            </div>
          )}
          {uploadMsg && <div style={{ fontSize: 11, color: '#0a5c47', background: 'rgba(10,92,71,0.08)', padding: '8px 12px', borderRadius: 8, marginBottom: 10 }}>{uploadMsg}</div>}
          {uploadError && <div style={{ fontSize: 11, color: '#A32D2D', background: '#FCEBEB', padding: '8px 12px', borderRadius: 8, marginBottom: 10 }}>{uploadError}</div>}
          <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 10 }}>
            Ketik NIP atau nama buat verifikasi manual siapa saja terhadap data resmi (hasil import Excel) — tanpa perlu buka file Excel lagi.
          </div>
          <div style={{ position: 'relative' }}>
            <FiSearch size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(30,58,95,0.4)' }} />
            <input
              value={cariMaster}
              onChange={e => setCariMaster(e.target.value)}
              placeholder="Ketik NIP atau nama..."
              style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 100, border: '1.5px solid rgba(30,58,95,0.1)', background: 'rgba(30,58,95,0.02)', fontSize: 12.5, fontFamily: FONT, outline: 'none', color: INDIGO, boxSizing: 'border-box' }}
            />
          </div>

          {cariMaster.trim() && (
            <div style={{ marginTop: 12 }}>
              {loadingMaster ? (
                <div style={{ fontSize: 12, color: '#94a3b8', padding: '10px 0' }}>Mencari...</div>
              ) : hasilMaster.length === 0 ? (
                <div style={{ fontSize: 12, color: '#A32D2D', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiX size={13} /> Tidak ditemukan di data master — NIP/nama ini tidak terdaftar sebagai pegawai BNN resmi.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {hasilMaster.map(m => (
                    <div key={m.nip} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(10,92,71,0.06)', border: '1px solid rgba(10,92,71,0.15)' }}>
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

        {/* Daftar Pengajuan */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }} className="fld">
          {['Menunggu', 'Disetujui', 'Ditolak', 'Semua'].map(s => {
            const count = s === 'Semua' ? pengajuan.length : pengajuan.filter(p => p.status === s).length;
            const active = filterStatus === s;
            return (
              <button key={s} onClick={() => setFilterStatus(s)} className="btn-hover" style={{
                padding: '8px 15px', borderRadius: 100, border: active ? 'none' : '1px solid rgba(30,58,95,0.1)',
                background: active ? INDIGO : '#fff', color: active ? CREAM : '#334155',
                fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: FONT,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {s}
                <span style={{ fontSize: 9.5, fontWeight: 700, background: active ? 'rgba(250,248,240,0.2)' : 'rgba(30,58,95,0.06)', padding: '1px 7px', borderRadius: 100, color: active ? CREAM : '#64748b' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: 13 }}>Memuat pengajuan...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '3rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }} className="fld">
            <FiInbox size={32} style={{ color: '#cbd5e1', marginBottom: 10 }} />
            <div style={{ fontSize: 13.5, color: '#64748b' }}>Tidak ada pengajuan pada filter ini.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((p, i) => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', border: '1px solid rgba(30,58,95,0.06)', animationDelay: `${i * 0.02}s` }} className="fld">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: INDIGO }}>{p.nama}</span>
                      {p.cocokMaster ? (
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: 'rgba(10,92,71,0.1)', color: '#0a5c47', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <FiCheckCircle size={10} /> Cocok Data Master
                        </span>
                      ) : (
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: '#FEF3C7', color: '#92400E', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <FiX size={10} /> Tidak Ketemu di Master
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiHash size={11} /> {p.nip}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiMail size={11} /> {p.email}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiMapPin size={11} /> {p.lokasi}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>Diajukan: {p.tglDiajukan}</div>
                    {p.diprosesOleh && <div style={{ fontSize: 10, color: '#94a3b8' }}>Diproses oleh {p.diprosesOleh} pada {p.tglDiproses}</div>}
                  </div>

                  {p.status === 'Menunggu' ? (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => proses(p.id, 'Ditolak')} disabled={processing === p.id} className="btn-hover" style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #FCA5A5', background: '#FCEBEB', color: '#A32D2D', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiX size={13} /> Tolak
                      </button>
                      <button onClick={() => proses(p.id, 'Disetujui')} disabled={processing === p.id} className="btn-hover" style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: '#0a5c47', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiCheck size={13} /> {processing === p.id ? 'Memproses...' : 'Setujui'}
                      </button>
                    </div>
                  ) : (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '4px 12px', borderRadius: 100, flexShrink: 0,
                      background: p.status === 'Disetujui' ? 'rgba(10,92,71,0.1)' : '#FCEBEB',
                      color: p.status === 'Disetujui' ? '#0a5c47' : '#A32D2D',
                    }}>
                      {p.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize: 12, color, background: bg, padding: '10px 14px', borderRadius: 10 });