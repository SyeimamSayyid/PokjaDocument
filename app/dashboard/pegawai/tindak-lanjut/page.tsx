'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiClipboard, FiTrendingUp,
  FiClock, FiUser, FiInbox, FiArrowLeft, FiMapPin, FiBookOpen, FiEye,
} from 'react-icons/fi';

interface PegawaiUser { role: string; nip: string; lokasi?: string; }
interface Pengajuan {
  id: string; nama: string; tglKejadian: string; tempatKejadian: string;
  pasal: string; deskripsi: string; status: string;
}
interface TindakLanjut { id: string; idPendampingan: string; isi: string; oleh: string; tgl: string; }

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';

const STATUS_INFO: Record<string, { color: string; bg: string }> = {
  'Diajukan': { color: INDIGO, bg: 'rgba(30,58,95,0.08)' },
  'Ditinjau': { color: '#B5813F', bg: '#F5EFE0' },
  'Diproses': { color: '#1D4ED8', bg: '#DBEAFE' },
  'Selesai':  { color: '#0a5c47', bg: 'rgba(10,92,71,0.1)' },
  'Ditolak':  { color: '#A32D2D', bg: '#FCEBEB' },
};

function TindakLanjutPegawaiContent() {
  const searchParams = useSearchParams();
  const idPendampingan = searchParams.get('id') || '';

  const [user, setUser] = useState<PegawaiUser | null>(null);
  const [semuaKasus, setSemuaKasus] = useState<Pengajuan[]>([]);
  const [kasusAktif, setKasusAktif] = useState<Pengajuan | null>(null);
  const [timeline, setTimeline] = useState<TindakLanjut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback((idTerpilih: string) => {
    setLoading(true);
    fetch('/api/hukum/pendampingan')
      .then(r => r.json())
      .then(async d => {
        const semua: Pengajuan[] = d.data || [];
        setSemuaKasus(semua);
        const idFinal = idTerpilih || semua[0]?.id || '';
        const found = semua.find(p => p.id === idFinal) || null;
        setKasusAktif(found);
        if (idFinal) {
          const tlRes = await fetch(`/api/hukum/tindak-lanjut?idPendampingan=${idFinal}`).then(r => r.json());
          setTimeline(tlRes.data || []);
        } else {
          setTimeline([]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (u.role !== 'pegawai_bnn') { window.location.href = '/login'; return; }
    setUser(u);
    load(idPendampingan);
  }, [load, idPendampingan]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('paktasign_user');
    window.location.href = '/login';
  };

  if (!user) return null;

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/pegawai', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/pegawai/pendampingan', icon: <FiClipboard size={17} />, label: 'Pendampingan / Pengajuan' },
    { href: '/dashboard/pegawai/tindak-lanjut', icon: <FiTrendingUp size={17} />, label: 'Tindak Lanjut' },
  ];

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover { transform: translateY(-1px); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/pegawai/tindak-lanjut"
        brandLabel="E-POKJA HUKER"
        brandSub="Modul Penegak Hukum"
        navSectionTitle="Menu"
        userName={`Pegawai ${user.nip}`}
        userTag={user.lokasi || 'Pegawai BNN'}
        accent="#2C5580"
        onLogout={handleLogout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 760, margin: '0 auto', padding: '1.6rem 1.5rem 4rem' }}>
        <a href="/dashboard/pegawai/pendampingan" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: 16 }} className="fld">
          <FiArrowLeft size={13} /> Kembali ke Pendampingan / Pengajuan
        </a>

        <div style={{ marginBottom: 20 }} className="fld">
          <h1 style={{ fontSize: 22, fontWeight: 800, color: INDIGO, letterSpacing: '-0.03em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiEye size={20} /> Tindak Lanjut Kasus Saya
          </h1>
          <p style={{ fontSize: 12.5, color: 'rgba(30,58,95,0.55)', margin: '4px 0 0' }}>Pantau progres lengkap penanganan kasus pendampingan hukum Anda — bersifat baca saja.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: 13 }} className="fld">Memuat...</div>
        ) : semuaKasus.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '3rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }} className="fld">
            <FiInbox size={32} style={{ color: '#cbd5e1', marginBottom: 10 }} />
            <div style={{ fontSize: 13.5, color: '#64748b' }}>Anda belum punya pengajuan pendampingan hukum.</div>
          </div>
        ) : (
          <>
            {semuaKasus.length > 1 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }} className="fld">
                {semuaKasus.map(k => (
                  <a key={k.id} href={`/dashboard/pegawai/tindak-lanjut?id=${k.id}`} style={{
                    fontSize: 11.5, fontWeight: 600, padding: '7px 14px', borderRadius: 100, textDecoration: 'none',
                    background: kasusAktif?.id === k.id ? INDIGO : '#fff', color: kasusAktif?.id === k.id ? '#fff' : INDIGO,
                    border: '1px solid rgba(30,58,95,0.1)',
                  }}>
                    {k.tempatKejadian}
                  </a>
                ))}
              </div>
            )}

            {kasusAktif && (
              <>
                <div style={{ background: '#fff', borderRadius: 20, padding: '1.4rem 1.6rem', border: '1px solid rgba(30,58,95,0.06)', marginBottom: 18 }} className="fld">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: (STATUS_INFO[kasusAktif.status] || STATUS_INFO['Diajukan']).bg, color: (STATUS_INFO[kasusAktif.status] || STATUS_INFO['Diajukan']).color }}>{kasusAktif.status}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: INDIGO }}>{kasusAktif.nama}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiMapPin size={12} /> {kasusAktif.tempatKejadian} · {kasusAktif.tglKejadian}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiBookOpen size={12} /> Pasal: {kasusAktif.pasal}</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 800, color: INDIGO, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }} className="fld">
                  <FiTrendingUp size={15} /> Timeline Tindak Lanjut ({timeline.length})
                </div>

                {timeline.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }} className="fld">
                    <div style={{ fontSize: 12.5, color: '#64748b' }}>Belum ada catatan tindak lanjut dari admin untuk kasus ini.</div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: 20 }}>
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
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function TindakLanjutPegawaiPage() {
  return (
    <Suspense fallback={null}>
      <TindakLanjutPegawaiContent />
    </Suspense>
  );
}