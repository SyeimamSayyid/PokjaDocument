'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiUserPlus, FiClipboard, FiTrendingUp, FiArchive,
  FiCalendar, FiMapPin, FiBookOpen, FiChevronDown, FiChevronUp, FiInbox, FiSearch,
} from 'react-icons/fi';
import { FaShieldAlt } from 'react-icons/fa';

interface Pengajuan {
  id: string; nip: string; nama: string; lokasiBnn: string; tglKejadian: string; waktuKejadian: string;
  tempatKejadian: string; pasal: string; deskripsi: string; status: string;
  tglDiajukan: string; diprosesOleh: string; catatanAdmin: string; tglDiproses: string;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';

export default function ArsipPenangananHukumPage() {
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<Pengajuan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/hukum/pendampingan')
      .then(r => r.json())
      // Arsip Penanganan cuma nampilin yang BERHASIL (status "Selesai") — beda
      // dari Kelola Pendampingan yang nampilin semua status buat diproses admin.
      .then(d => setData((d.data || []).filter((p: Pengajuan) => p.status === 'Selesai')))
      .catch(() => {})
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

  const filtered = data.filter(p => {
    const q = search.toLowerCase();
    return !q || p.nama.toLowerCase().includes(q) || p.tempatKejadian.toLowerCase().includes(q) || p.lokasiBnn.toLowerCase().includes(q) || p.pasal.toLowerCase().includes(q);
  });

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
        activeHref="/dashboard/hukum/arsip-penanganan"
        brandLabel="E-POKJA HUKER"
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
            <FaShieldAlt size={15} /> Arsip Penanganan
          </div>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth: 900, margin: '0 auto', padding: '1.4rem 1.5rem 3rem' }}>
        <div style={{ marginBottom: 18 }} className="fld">
          <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
            Riwayat lengkap kasus pendampingan hukum yang <strong>sudah berhasil ditangani</strong> (status "Selesai") — bersifat internal, tidak tampil di sisi pegawai maupun publik.
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: 18 }} className="fld">
          <FiSearch size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(30,58,95,0.4)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, lokasi, tempat kejadian, atau pasal..."
            style={{ width: '100%', padding: '11px 14px 11px 40px', borderRadius: 100, border: '1.5px solid rgba(30,58,95,0.1)', background: '#fff', fontSize: 13, fontFamily: FONT, outline: 'none', color: INDIGO, boxSizing: 'border-box' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: 13 }}>Memuat arsip...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '3rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }} className="fld">
            <FiInbox size={32} style={{ color: '#cbd5e1', marginBottom: 10 }} />
            <div style={{ fontSize: 13.5, color: '#64748b' }}>{search ? 'Tidak ada yang cocok dengan pencarian ini.' : 'Belum ada kasus yang selesai ditangani.'}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((p, i) => {
              const expanded = expandedId === p.id;
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(10,92,71,0.15)', overflow: 'hidden', animationDelay: `${i * 0.02}s` }} className="fld">
                  <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => setExpandedId(expanded ? null : p.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: 'rgba(10,92,71,0.1)', color: '#0a5c47' }}>✓ Selesai</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f1f3d', flex: 1 }}>{p.nama}</span>
                      {expanded ? <FiChevronUp size={15} color="#94a3b8" /> : <FiChevronDown size={15} color="#94a3b8" />}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 5, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiCalendar size={11} /> {p.tglKejadian}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiMapPin size={11} /> {p.tempatKejadian}</span>
                      <span>{p.lokasiBnn}</span>
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(30,58,95,0.05)', marginTop: 4 }}>
                      <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.8, marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiBookOpen size={12} style={{ color: '#94a3b8' }} /> <strong>Pasal:</strong> {p.pasal}</div>
                        <div style={{ marginTop: 6 }}><strong>Deskripsi:</strong> {p.deskripsi}</div>
                        {p.catatanAdmin && <div style={{ marginTop: 6 }}><strong>Catatan Penyelesaian:</strong> {p.catatanAdmin}</div>}
                        <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 8 }}>Diajukan: {p.tglDiajukan} · Selesai: {p.tglDiproses} · Ditangani oleh: {p.diprosesOleh || '—'}</div>
                      </div>
                      <a href={`/dashboard/hukum/tindak-lanjut?id=${p.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11.5, fontWeight: 700, color: '#1D4ED8', textDecoration: 'none' }}>
                        <FiTrendingUp size={12} /> Lihat riwayat tindak lanjut
                      </a>
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