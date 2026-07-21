'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import CekCepatPegawai from '@/components/CekCepatPegawai';
import {
  FiGrid, FiUserPlus, FiClipboard, FiTrendingUp, FiArchive,
  FiFileText, FiCalendar, FiClock, FiMapPin, FiBookOpen, FiCheck, FiX, FiMail,
  FiChevronDown, FiChevronUp, FiInbox, FiAlertCircle,
} from 'react-icons/fi';
import { FaShieldAlt } from 'react-icons/fa';

interface Pengajuan {
  id: string; nip: string; nama: string; lokasiBnn: string; email: string; tglKejadian: string; waktuKejadian: string;
  tempatKejadian: string; pasal: string; deskripsi: string; status: string;
  tglDiajukan: string; diprosesOleh: string; catatanAdmin: string; tglDiproses: string;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';
const CREAM = '#FAF8F0';
const GOLD = '#B5813F';

const STATUS_INFO: Record<string, { color: string; bg: string }> = {
  'Diajukan': { color: INDIGO, bg: 'rgba(30,58,95,0.08)' },
  'Ditinjau': { color: GOLD, bg: '#F5EFE0' },
  'Diproses': { color: '#1D4ED8', bg: '#DBEAFE' },
  'Selesai':  { color: '#0a5c47', bg: 'rgba(10,92,71,0.1)' },
  'Ditolak':  { color: '#A32D2D', bg: '#FCEBEB' },
};

const FILTER_STATUS = ['Semua', 'Diajukan', 'Ditinjau', 'Diproses', 'Selesai', 'Ditolak'];

// Transisi status BERIKUTNYA yang valid buat setiap status saat ini
const TRANSISI_LANJUT: Record<string, string> = {
  'Diajukan': 'Ditinjau',
  'Ditinjau': 'Diproses',
  'Diproses': 'Selesai',
};

export default function KelolaPendampinganHukumPage() {
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<Pengajuan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [catatanEdit, setCatatanEdit] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/hukum/pendampingan')
      .then(r => r.json())
      .then(d => setData(d.data || []))
      .catch(() => setError('Gagal memuat data.'))
      .finally(() => setLoading(false));
  }, []);

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

  const ubahStatus = async (id: string, statusBaru: string) => {
    // Validasi di klien dulu — biar admin langsung tau tanpa nunggu roundtrip
    // server, konsisten sama validasi wajib di backend.
    if (statusBaru === 'Ditolak' && !(catatanEdit[id] || '').trim()) {
      setError('Alasan penolakan wajib diisi sebelum menolak pengajuan.');
      return;
    }
    setProcessing(id); setError(''); setMsg('');
    try {
      const res = await fetch('/api/hukum/pendampingan', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, statusBaru, catatanAdmin: catatanEdit[id] || '', diprosesOleh: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal memperbarui status.'); return; }
      setMsg(d.message);
      load();
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setProcessing(null); }
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

  const filtered = filterStatus === 'Semua' ? data : data.filter(d => d.status === filterStatus);

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
        activeHref="/dashboard/hukum/pendampingan"
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
            <FaShieldAlt size={15} /> Kelola Pendampingan Hukum
          </div>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth: 900, margin: '0 auto', padding: '1.4rem 1.5rem 3rem' }}>
        {msg && <div style={{ ...msgBox('#0a5c47', 'rgba(10,92,71,0.1)'), marginBottom: 14 }} className="fld">{msg}</div>}
        {error && <div style={{ ...msgBox('#A32D2D', '#FCEBEB'), marginBottom: 14 }} className="fld"><FiAlertCircle size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />{error}</div>}

        <div style={{ marginBottom: 18 }} className="fld">
          <CekCepatPegawai />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }} className="fld">
          {FILTER_STATUS.map(s => {
            const count = s === 'Semua' ? data.length : data.filter(d => d.status === s).length;
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
            {filtered.map((p, i) => {
              const info = STATUS_INFO[p.status] || STATUS_INFO['Diajukan'];
              const expanded = expandedId === p.id;
              const statusLanjut = TRANSISI_LANJUT[p.status];
              const bisaProses = !['Selesai', 'Ditolak'].includes(p.status);
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(30,58,95,0.06)', overflow: 'hidden', animationDelay: `${i * 0.02}s` }} className="fld">
                  <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => setExpandedId(expanded ? null : p.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: info.bg, color: info.color }}>{p.status}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f1f3d', flex: 1 }}>{p.nama}</span>
                      {expanded ? <FiChevronUp size={15} color="#94a3b8" /> : <FiChevronDown size={15} color="#94a3b8" />}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 5, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiCalendar size={11} /> {p.tglKejadian}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiMapPin size={11} /> {p.tempatKejadian}</span>
                      <span>NIP: {p.nip}</span>
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(30,58,95,0.05)' }}>
                      <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.8, marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FaShieldAlt size={11} style={{ color: '#94a3b8' }} /> <strong>Lokasi BNN:</strong> {p.lokasiBnn || '—'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiMail size={12} style={{ color: '#94a3b8' }} /> <strong>Email:</strong> {p.email || '—'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiClock size={12} style={{ color: '#94a3b8' }} /> <strong>Waktu:</strong> {p.waktuKejadian}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiBookOpen size={12} style={{ color: '#94a3b8' }} /> <strong>Pasal:</strong> {p.pasal}</div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6 }}><FiFileText size={12} style={{ color: '#94a3b8', marginTop: 2, flexShrink: 0 }} /> <span><strong>Deskripsi:</strong> {p.deskripsi}</span></div>
                        <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 8 }}>Diajukan: {p.tglDiajukan}</div>
                        {p.diprosesOleh && <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Terakhir diproses oleh: {p.diprosesOleh} ({p.tglDiproses})</div>}
                      </div>

                      <a href={`/dashboard/hukum/tindak-lanjut?id=${p.id}`} className="btn-hover" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11.5, fontWeight: 700, color: '#1D4ED8', textDecoration: 'none' }}>
                        <FiTrendingUp size={12} /> Lihat / Catat Tindak Lanjut
                      </a>

                      {bisaProses && (
                        <div style={{ marginTop: 14 }}>
                          <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: INDIGO, marginBottom: 5 }}>
                            Catatan Admin {statusLanjut ? '(opsional untuk lanjut, WAJIB untuk tolak)' : ''}
                          </label>
                          <textarea
                            value={catatanEdit[p.id] ?? p.catatanAdmin ?? ''}
                            onChange={e => setCatatanEdit(prev => ({ ...prev, [p.id]: e.target.value }))}
                            style={{ width: '100%', height: 60, padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(30,58,95,0.1)', background: 'rgba(30,58,95,0.02)', fontSize: 12, fontFamily: FONT, outline: 'none', color: INDIGO, boxSizing: 'border-box', resize: 'none' }}
                            placeholder="Catatan buat pegawai — wajib diisi kalau mau menolak..."
                          />
                          <div style={{ fontSize: 10, color: 'rgba(30,58,95,0.45)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <FiMail size={11} /> Perubahan status akan otomatis dikirim ke email pegawai ({p.email || 'tidak ada email'}) — tanpa perlu buka sistem.
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            {statusLanjut && (
                              <button onClick={() => ubahStatus(p.id, statusLanjut)} disabled={processing === p.id} className="btn-hover" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: INDIGO, color: CREAM, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <FiCheck size={13} /> {processing === p.id ? 'Memproses...' : `Lanjut ke "${statusLanjut}"`}
                              </button>
                            )}
                            <button onClick={() => ubahStatus(p.id, 'Ditolak')} disabled={processing === p.id} className="btn-hover" style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #FCA5A5', background: '#FCEBEB', color: '#A32D2D', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FiX size={13} /> Tolak
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize: 12, color, background: bg, padding: '10px 14px', borderRadius: 10 });