'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import BadgeDokumenBasah from '@/components/BadgeDokumenBasah';
import {
  FiGrid, FiFolder, FiArchive, FiUsers, FiShield, FiCalendar, FiInbox, FiKey,
  FiActivity, FiList, FiFileText, FiMessageCircle, FiMessageSquare, FiDroplet,
  FiExternalLink, FiTrash2, FiClock, FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi';

interface DokumenBasahItem {
  id: string; jenis: string; judul: string; namaMitra: string; status: string;
  ttdStatus: string; ttdTglDiajukan: string; ttdTglFinal: string;
  scanTtdId: string; scanTtdUrl: string;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';
const CREAM = '#FAF8F0';

export default function DokumenBasahPage() {
  const [nama, setNama] = useState('Admin');
  const [level, setLevel] = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<DokumenBasahItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmHapus, setConfirmHapus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/dokumen/dokumen-basah')
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
        setNama(u.nama || u.email || 'Admin');
        setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
        setChecking(false);
        load();
      })
      .catch(() => { window.location.href = '/login'; });
  }, [load]);

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  const hapusScan = async (id: string) => {
    setDeleting(id); setError(''); setMsg('');
    try {
      const res = await fetch('/api/dokumen/dokumen-basah', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal menghapus scan.'); return; }
      setMsg(d.message);
      setConfirmHapus(null);
      load();
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setDeleting(null); }
  };

  const sidebarItems: SidebarItem[] = level === 'utama' ? [
    { href: '/dashboard/bnn-utama', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Dokumen & Tata Kelola' },
    { href: '/dashboard/dokumen-basah', icon: <FiDroplet size={17} />, label: 'Dokumen Basah' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Daftar Admin' },
  ] : [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/dokumen-basah', icon: <FiDroplet size={17} />, label: 'Dokumen Basah' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiList size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/laporan', icon: <FiFileText size={17} />, label: 'Laporan' },
    { href: '/dashboard/kelola-chatbot', icon: <FiMessageCircle size={17} />, label: 'Kelola Chatbot' },
    { href: '/dashboard/kotak-saran', icon: <FiMessageSquare size={17} />, label: 'Kotak Saran' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' },
  ];

  if (checking) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily: FONT, color: '#64748b', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(30,58,95,0.1)', borderTop: `3px solid ${INDIGO}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13 }}>Memuat...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const menunggu = data.filter(d => d.ttdStatus === 'Menunggu Basah');
  const selesai = data.filter(d => d.ttdStatus === 'Disetujui');

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/dokumen-basah"
        brandLabel="E-POKJA HUKER"
        brandSub={level === 'utama' ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        navSectionTitle="Navigasi"
        userName={nama}
        userTag={level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={level === 'utama' ? '#ABD1C6' : INDIGO}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 900, margin: '0 auto', padding: '1.4rem 1.5rem 3rem' }}>
        <div style={{ marginBottom: 20 }} className="fld">
          <h1 style={{ fontSize: 22, fontWeight: 800, color: INDIGO, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiDroplet size={20} style={{ color: '#D97706' }} /> Dokumen Basah
          </h1>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 0' }}>
            Kumpulan dokumen dengan tanda tangan fisik (TTD Basah) yang diunggah admin — terpisah dari Arsip Dokumen.
          </p>
        </div>

        {msg && <div style={{ fontSize: 12, color: '#0a5c47', background: 'rgba(10,92,71,0.08)', padding: '10px 14px', borderRadius: 10, marginBottom: 14 }} className="fld">{msg}</div>}
        {error && <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', padding: '10px 14px', borderRadius: 10, marginBottom: 14 }} className="fld">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }} className="fld">
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(30,58,95,0.06)' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: INDIGO }}>{data.length}</div>
            <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Total Dokumen Basah</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(30,58,95,0.06)' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#B5813F' }}>{menunggu.length}</div>
            <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Menunggu Dokumen Fisik</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(30,58,95,0.06)' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0a5c47' }}>{selesai.length}</div>
            <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Sudah Diterima</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: 13 }}>Memuat dokumen...</div>
        ) : data.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 18, padding: '3rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }}>
            <FiDroplet size={28} style={{ color: '#cbd5e1', marginBottom: 10 }} />
            <div style={{ fontSize: 13, color: '#64748b' }}>Belum ada dokumen dengan TTD Basah.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.map(d => (
              <div key={d.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(30,58,95,0.06)', position: 'relative' }} className="fld">
                <BadgeDokumenBasah />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: d.jenis === 'MOU' ? '#DBEAFE' : '#FEF3C7', color: d.jenis === 'MOU' ? '#1D4ED8' : '#92400E' }}>{d.jenis}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 100,
                        background: d.ttdStatus === 'Menunggu Basah' ? '#FEF3C7' : d.ttdStatus === 'Disetujui' ? 'rgba(10,92,71,0.1)' : '#f1f5f9',
                        color: d.ttdStatus === 'Menunggu Basah' ? '#92400E' : d.ttdStatus === 'Disetujui' ? '#0a5c47' : '#64748b',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        {d.ttdStatus === 'Menunggu Basah' ? <FiClock size={9} /> : d.ttdStatus === 'Disetujui' ? <FiCheckCircle size={9} /> : null}
                        {d.ttdStatus || 'Belum ada status'}
                      </span>
                    </div>
                    <a href={`/dashboard/dokumen/${d.id}`} style={{ fontSize: 13, fontWeight: 700, color: INDIGO, textDecoration: 'none' }}>{d.judul}</a>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>{d.namaMitra}</div>
                    {d.ttdTglFinal && <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>Tanggal TTD tercatat: {d.ttdTglFinal}</div>}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
                    {d.scanTtdUrl && (
                      <a href={d.scanTtdUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(30,58,95,0.12)', background: '#fff', color: '#334155', fontSize: 11, fontWeight: 600, textDecoration: 'none' }} className="btn-hover">
                        <FiExternalLink size={11} /> Lihat Scan
                      </a>
                    )}
                    {level !== 'utama' && d.scanTtdId && (
                      confirmHapus === d.id ? (
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', background: '#FCEBEB', padding: '6px 8px', borderRadius: 9, border: '1px solid rgba(220,38,38,0.2)' }}>
                          <span style={{ fontSize: 10, color: '#A32D2D', fontWeight: 600 }}>Yakin?</span>
                          <button onClick={() => setConfirmHapus(null)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: 'none', background: '#fff', cursor: 'pointer' }}>Batal</button>
                          <button onClick={() => hapusScan(d.id)} disabled={deleting === d.id} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: 'none', background: '#A32D2D', color: '#fff', cursor: 'pointer' }}>
                            {deleting === d.id ? '…' : 'Hapus'}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmHapus(d.id)} title="Hapus scan (salah upload) — bukan diarsipkan" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(220,38,38,0.2)', background: '#fff', color: '#A32D2D', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }} className="btn-hover">
                          <FiTrash2 size={11} /> Hapus (Salah Upload)
                        </button>
                      )
                    )}
                    {!d.scanTtdId && (
                      <span style={{ fontSize: 10.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FiAlertCircle size={11} /> Belum ada scan diunggah
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}