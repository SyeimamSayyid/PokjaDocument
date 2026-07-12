'use client';

import { useEffect, useState } from 'react';
import LoaderPage from '@/components/LoaderPage';
import {
  FiInbox, FiFileText, FiCheckCircle, FiClock, FiXCircle,
  FiFolder, FiAlertCircle, FiCheck, FiEye, FiKey,
  FiUsers, FiCalendar, FiLogOut, FiUser, FiActivity,
  FiFile, FiPieChart, FiTrendingUp, FiList, FiArrowUpRight, FiArchive,
  FiUserPlus, FiClipboard,
} from 'react-icons/fi';
import { FaFileSignature, FaFileAlt, FaBuilding, FaBalanceScale } from 'react-icons/fa';
import NotifikasiAdminBell from '@/components/NotifikasiAdminBell';

interface Stats {
  pengajuanMenunggu: number;
  pengajuanDiterima: number;
  pengajuanDitolak: number;
  dokDraft: number;
  dokAktif: number;
  dokHampirExpire: number;
  dokExpired: number;
  totalDok: number;
  mouCount?: number;
  pksCount?: number;
  pendaftaranMenunggu?: number;
  rencanaKegiatanAktif?: number;
}
interface DokItem {
  id: string;
  jenis: string;
  judul: string;
  namaMitra: string;
  tglBerakhir: string;
  status: string;
}
interface AlertItem {
  id: string;
  jenis: string;
  judul: string;
  namaMitra: string;
  tglBerakhir: string;
  sisaHari: number;
}
interface HukumFeature {
  label: string;
  icon: React.ReactNode;
  href?: string;
  active: boolean;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#212842';
const INDIGO_LIGHT = '#31406B';
const CREAM = '#F0E7D5';
const GOLD_ACCENT = '#B5813F';
const SAGE = '#5C7A5E';
const ESPRESSO = '#6B4A32';
const RED = '#A32D2D';
const PURPLE = '#5B4B8A';

function HukumCardActive({ item }: { item: HukumFeature }) {
  const goTo = () => { window.location.href = item.href || '#'; };
  return (
    <div
      onClick={goTo}
      role="link"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') goTo(); }}
      className="hukum-card"
      style={{
        gridColumn: 'span 3',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.6rem 1.7rem',
        borderRadius: 24,
        minHeight: 148,
        background: INDIGO,
        animation: 'hukumFadeUp 0.7s cubic-bezier(0.32,0.72,0,1) 0.05s both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(240,231,213,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: CREAM }}>
          {item.icon}
        </div>
        <div className="hukum-arrow-wrap" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(240,231,213,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: CREAM }}>
          <FiArrowUpRight size={15} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color: CREAM, letterSpacing: '-0.015em' }}>{item.label}</div>
        <div style={{ fontSize: 12, color: 'rgba(240,231,213,0.6)', marginTop: 5 }}>Tambah manual atau impor massal via Excel</div>
      </div>
    </div>
  );
}

function HukumCardSoon({ item, index, onClick }: { item: HukumFeature; index: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hukum-card"
      style={{
        gridColumn: 'span 3',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: FONT,
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '1.2rem 1.4rem',
        borderRadius: 22,
        background: 'rgba(33,40,66,0.02)',
        border: '1px dashed rgba(33,40,66,0.15)',
        animation: `hukumFadeUp 0.7s cubic-bezier(0.32,0.72,0,1) ${0.1 + index * 0.05}s both`,
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(33,40,66,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(33,40,66,0.5)', flexShrink: 0 }}>
        {item.icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: INDIGO }}>{item.label}</div>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: GOLD_ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>Segera Hadir</div>
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  const [nama, setNama] = useState('');
  const [hukumOn, setHukumOn] = useState(false);
  const [showPelaporanInfo, setShowPelaporanInfo] = useState(false);
  const [featureComingSoon, setFeatureComingSoon] = useState('');
  const [role, setRole] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [dokumenTerbaru, setDokumenTerbaru] = useState<DokItem[]>([]);
  const [alertExpire, setAlertExpire] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setNama(u.nama || 'Admin Pokja');
    setRole(u.role);

    fetch('/api/dashboard/admin')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError('Gagal memuat data.'); setLoading(false); return; }
        setStats({
          ...d.stats,
          mouCount: d.stats.mouCount || Math.round(d.stats.totalDok * 0.6),
          pksCount: d.stats.pksCount || Math.round(d.stats.totalDok * 0.4),
          pendaftaranMenunggu: d.stats.pendaftaranMenunggu || 0,
          rencanaKegiatanAktif: d.stats.rencanaKegiatanAktif || 0,
        });
        setDokumenTerbaru(d.dokumenTerbaru || []);
        setAlertExpire(d.alertExpire || []);
        setLoading(false);
      })
      .catch(() => { setError('Gagal memuat data.'); setLoading(false); });
  }, []);

  const logout = () => {
    localStorage.removeItem('paktasign_user');
    document.cookie = 'paktasign_user=; path=/; max-age=0';
    document.cookie = 'paktasign_role=; path=/; max-age=0';
    window.location.href = '/login';
  };

  if (loading) return <LoaderPage text="Memuat dashboard..." />;
  if (error || !stats) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: '#b91c1c', gap: 10 }}>
        <FiAlertCircle size={44} style={{ opacity: 0.5 }} />
        <div style={{ fontSize: 16, fontWeight: 700 }}>Gagal Memuat Data</div>
        <div style={{ fontSize: 13, color: '#9aa5a1' }}>{error || 'Terjadi kesalahan.'}</div>
      </div>
    );
  }

  const jenisPill = (j: string) => (j || '').toLowerCase() === 'mou' ? { c: INDIGO, bg: 'rgba(33,40,66,0.08)' } : { c: GOLD_ACCENT, bg: '#FBF3E7' };
  const statusInfo = (s: string): { c: string; bg: string; label: string } => {
    const k = (s || '').toLowerCase();
    if (['aktif', 'disetujui', 'mou/pks berlaku'].includes(k)) return { c: INDIGO, bg: 'rgba(33,40,66,0.08)', label: s };
    if (['draft'].includes(k)) return { c: '#6b6255', bg: '#f2ede2', label: 'Draft' };
    if (['expired', 'kedaluwarsa'].includes(k)) return { c: RED, bg: '#FCEBEB', label: 'Kedaluwarsa' };
    return { c: PURPLE, bg: '#EDE9FE', label: s || 'Proses' };
  };

  const menuItems = [
    {
      href: '/dashboard/rencana', icon: <FiCalendar size={20} strokeWidth={1.7} />, label: 'E-Planning',
      desc: 'Kelola rencana kegiatan kerja sama kelembagaan',
      notif: (stats.rencanaKegiatanAktif ?? 0) > 0 ? `${stats.rencanaKegiatanAktif} aktif` : null,
      grad: `linear-gradient(150deg,${INDIGO_LIGHT},${INDIGO})`, accent: INDIGO,
      s1: { icon: <FiCheckCircle size={12} strokeWidth={1.8} />, val: stats.rencanaKegiatanAktif || 0, lbl: 'Aktif' },
      s2: { icon: <FiFileText size={12} strokeWidth={1.8} />, val: stats.dokDraft || 0, lbl: 'Draft' },
    },
    {
      href: '/dashboard/rencana/pendaftaran', icon: <FiUsers size={20} strokeWidth={1.7} />, label: 'Pendaftaran Kegiatan',
      desc: 'Tinjau & setujui pendaftaran mitra ke kegiatan E-Planning',
      notif: (stats.pendaftaranMenunggu ?? 0) > 0 ? `${stats.pendaftaranMenunggu} menunggu` : null,
      grad: `linear-gradient(150deg,${GOLD_ACCENT},#8C5F27)`, accent: GOLD_ACCENT,
      s1: { icon: <FiUsers size={12} strokeWidth={1.8} />, val: stats.pendaftaranMenunggu || 0, lbl: 'Menunggu' },
      s2: { icon: <FiCheck size={12} strokeWidth={1.8} />, val: stats.pengajuanDiterima || 0, lbl: 'Disetujui' },
    },
  ];

  const quickActions = [
    { href: '/dashboard/pengajuan', icon: <FiInbox size={19} strokeWidth={1.7} />, label: 'Kelola Pengajuan', desc: 'Proses & ubah status pengajuan kerja sama dari mitra', notif: stats.pengajuanMenunggu > 0 ? `${stats.pengajuanMenunggu} menunggu` : null, c: INDIGO, bg: 'rgba(33,40,66,0.08)' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={19} strokeWidth={1.7} />, label: 'Generate Kode', desc: 'Buat kode status atau akses dokumen MOU/PKS', notif: null, c: GOLD_ACCENT, bg: '#FBF3E7' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={19} strokeWidth={1.7} />, label: 'Daftar Dokumen', desc: 'Folder per institusi, filter tahap status, edit & hapus dokumen', notif: null, c: PURPLE, bg: '#EDE9FE' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={19} strokeWidth={1.7} />, label: 'Kelola Kegiatan', desc: 'Pantau kegiatan & foto dokumentasi mitra', notif: null, c: SAGE, bg: '#E6EDE6' },
    { href: '/dashboard/tata-kelola-instansi', icon: <FaBuilding size={18} />, label: 'Tata Kelola Instansi', desc: 'Profil mitra: status terdaftar, anak cabang jurusan PKS, kontak', notif: null, c: ESPRESSO, bg: '#EFE5DB' },
    { href: '/dashboard/kontak', icon: <FiUsers size={19} strokeWidth={1.7} />, label: 'Kontak Mitra', desc: 'Direktori email, WhatsApp & PIC seluruh mitra', notif: null, c: INDIGO, bg: 'rgba(33,40,66,0.08)' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiList size={19} strokeWidth={1.7} />, label: 'Extract Poin Publik', desc: 'Kelola poin publikasi kegiatan kerja sama', notif: null, c: GOLD_ACCENT, bg: '#FBF3E7' },
    { href: '/dashboard/arsip', icon: <FiArchive size={19} strokeWidth={1.7} />, label: 'Arsip Dokumen', desc: 'Riwayat lengkap kerja sama — sistem & arsip lama', notif: null, c: ESPRESSO, bg: '#EFE5D2' },
  ];

  const mouCount = stats.mouCount || 0;
  const pksCount = stats.pksCount || 0;
  const totalDocs = stats.totalDok || 1;
  const mouPercent = Math.round((mouCount / totalDocs) * 100);
  const pksPercent = Math.round((pksCount / totalDocs) * 100);
  const aktifPercent = Math.round((stats.dokAktif / totalDocs) * 100);
  const needAction = stats.dokHampirExpire + stats.dokExpired;
  const needActionPercent = Math.round((needAction / totalDocs) * 100);

  const statCards = [
    { lbl: 'Menunggu review', val: stats.pengajuanMenunggu, icon: <FiInbox size={14} strokeWidth={1.7} />, warn: stats.pengajuanMenunggu > 0 },
    { lbl: 'Draft dokumen', val: stats.dokDraft, icon: <FiFileText size={14} strokeWidth={1.7} /> },
    { lbl: 'Dokumen aktif', val: stats.dokAktif, icon: <FiCheckCircle size={14} strokeWidth={1.7} />, ok: true },
    { lbl: 'Hampir berakhir', val: stats.dokHampirExpire, icon: <FiClock size={14} strokeWidth={1.7} />, warn: stats.dokHampirExpire > 0 },
    { lbl: 'Kedaluwarsa', val: stats.dokExpired, icon: <FiXCircle size={14} strokeWidth={1.7} />, warn: stats.dokExpired > 0 },
    { lbl: 'Total dokumen', val: stats.totalDok, icon: <FiFolder size={14} strokeWidth={1.7} /> },
  ];

  const hukumFeatures: HukumFeature[] = [
    { label: 'Pembuatan Akun Pegawai BNN', icon: <FiUserPlus size={17} />, href: '/dashboard/hukum/akun-pegawai', active: true },
    { label: 'Kelola Pendampingan/Pengajuan', icon: <FiClipboard size={16} />, active: false },
    { label: 'Tindak Lanjut Pendampingan', icon: <FiTrendingUp size={16} />, active: false },
    { label: 'Arsip Penanganan', icon: <FiArchive size={16} />, active: false },
  ];

  return (
    <div style={{
      minHeight: '100dvh',
      fontFamily: FONT,
      background: 'radial-gradient(1100px 520px at 85% -8%, rgba(33,40,66,0.05) 0%, rgba(33,40,66,0) 55%), linear-gradient(180deg,#F3ECDD,#EDE4D0)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); filter: blur(4px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes hukumFadeUp { from { opacity: 0; transform: translateY(20px); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
        .rise { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
        .lift { transition: all 0.45s cubic-bezier(0.32,0.72,0,1); }
        .lift:hover { transform: translateY(-4px); box-shadow: 0 28px 50px -28px rgba(33,40,66,0.28) !important; }
        .lift:active { transform: translateY(-1px) scale(0.995); }
        .lift:hover .ic-wrap { transform: scale(1.08) rotate(-4deg); }
        .ic-wrap { transition: transform 0.45s cubic-bezier(0.32,0.72,0,1); }
        .lift:hover .arr { transform: translate(2px,-2px); opacity: 1; }
        .arr { transition: all 0.45s cubic-bezier(0.32,0.72,0,1); opacity: 0; }
        .trow { transition: background 0.25s ease; }
        .trow:hover { background: rgba(33,40,66,0.03); }
        .btn-hover { transition: all 0.25s ease; }
        .btn-hover:hover { transform: translateY(-1px); filter: brightness(1.08); }
        .hukum-switch { position: relative; display: inline-flex; align-items: center; width: 44px; height: 22px; flex-shrink: 0; }
        .hukum-toggle { opacity: 0; width: 0; height: 0; }
        .hukum-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; border-radius: 100px; background: #e2e8f0; transition: 0.3s; }
        .hukum-slider:before { content: ""; position: absolute; height: 16px; width: 16px; left: 3px; bottom: 3px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: 0.3s; }
        .hukum-toggle:checked + .hukum-slider { background: #212842; }
        .hukum-toggle:checked + .hukum-slider:before { transform: translateX(22px); background: #F0E7D5; }
        .hukum-card { transition: all 0.6s cubic-bezier(0.32,0.72,0,1); }
        .hukum-card:hover { transform: translateY(-3px) scale(1.01); }
        .hukum-arrow-wrap { transition: transform 0.5s cubic-bezier(0.32,0.72,0,1); }
        .hukum-card:hover .hukum-arrow-wrap { transform: translate(3px,-2px) scale(1.08); }
        .toggle-icon { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
      `}</style>

      {showPelaporanInfo ? (
        <div
          onClick={() => setShowPelaporanInfo(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(33,40,66,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }}
          className="rise"
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: CREAM, borderRadius: 26, padding: '2.4rem 2rem', width: '100%', maxWidth: 380, textAlign: 'center', border: '1px solid rgba(33,40,66,0.1)', boxShadow: '0 40px 80px -30px rgba(33,40,66,0.5)' }}
          >
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 14px 30px -10px rgba(33,40,66,0.5)' }}>
              <FaBalanceScale size={28} color={CREAM} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: INDIGO, marginBottom: 10, letterSpacing: '-0.02em' }}>
              {featureComingSoon || 'Halaman ini'}
            </div>
            <p style={{ fontSize: 13, color: '#3a4a5c', lineHeight: 1.7, margin: '0 0 6px' }}>
              Halaman {featureComingSoon || 'ini'} dalam tahap pengembangan, silakan tunggu informasi lebih lanjut terkait halaman ini.
            </p>
            <p style={{ fontSize: 13, color: '#3a4a5c', lineHeight: 1.7, margin: '0 0 20px', fontWeight: 600 }}>
              Terima kasih atas pengertiannya.
            </p>
            <button
              onClick={() => setShowPelaporanInfo(false)}
              style={{ padding: '11px 30px', borderRadius: 100, border: 'none', background: INDIGO, color: CREAM, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '1.4rem 1.5rem 0' }}>
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(240,231,213,0.75)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(33,40,66,0.1)',
          borderRadius: 100, padding: '10px 14px 10px 18px',
          boxShadow: '0 10px 30px -18px rgba(33,40,66,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontWeight: 800, fontSize: 15, color: INDIGO, letterSpacing: '-0.02em' }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px -8px rgba(33,40,66,0.5)' }}>
              <FaFileAlt size={15} color={CREAM} />
            </div>
            SI-POKJA HUMKER
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px', background: 'rgba(33,40,66,0.04)', borderRadius: 100, border: '1px solid rgba(33,40,66,0.08)' }} title="Dokumen (aktif) / Modul Hukum">
              <div className="toggle-icon" style={{
                width: 24, height: 24, borderRadius: '50%',
                background: !hukumOn ? INDIGO : 'rgba(33,40,66,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: !hukumOn ? '0 4px 10px -3px rgba(33,40,66,0.5)' : 'none',
              }}>
                <FiFileText size={12} style={{ color: !hukumOn ? CREAM : 'rgba(33,40,66,0.35)' }} />
              </div>
              <label className="hukum-switch">
                <input
                  className="hukum-toggle"
                  type="checkbox"
                  checked={hukumOn}
                  onChange={e => setHukumOn(e.target.checked)}
                />
                <span className="hukum-slider" />
              </label>
              <div className="toggle-icon" style={{
                width: 24, height: 24, borderRadius: '50%',
                background: hukumOn ? INDIGO : 'rgba(33,40,66,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: hukumOn ? '0 4px 10px -3px rgba(33,40,66,0.5)' : 'none',
              }}>
                <FaBalanceScale size={12} style={{ color: hukumOn ? CREAM : 'rgba(33,40,66,0.35)' }} />
              </div>
            </div>
            <NotifikasiAdminBell />
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(150deg,${INDIGO},#0b1420)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800, color: '#fff', boxShadow: '0 4px 10px -3px rgba(33,40,66,0.5)' }}>
              {nama.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <button onClick={logout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'auto', height: 36, borderRadius: 100, border: '1px solid rgba(33,40,66,0.1)', background: 'rgba(33,40,66,0.03)', cursor: 'pointer', fontFamily: FONT, padding: '0 14px', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#3a4a5c' }}>
              <FiLogOut size={14} strokeWidth={1.8} /> Keluar
            </button>
          </div>
        </nav>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '1.5rem' }}>

        <div style={{ marginBottom: 24 }} className="rise">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9.5, color: INDIGO, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700,
              background: 'rgba(33,40,66,0.06)', padding: '6px 14px', borderRadius: 100,
            }}>
              {role === 'superadmin' ? 'Superadmin' : 'Admin Pokja'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: GOLD_ACCENT, background: '#FBF3E7', padding: '5px 13px', borderRadius: 100, border: '1px solid #E3C89A' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD_ACCENT, animation: 'pulse 2s infinite' }} /> Live
            </span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: INDIGO, letterSpacing: '-0.04em', margin: '0 0 6px', lineHeight: 1.03 }}>
            Selamat datang, {nama.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(33,40,66,0.6)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiUser size={13} strokeWidth={1.7} />
            {hukumOn ? 'Tata kelola pengajuan hukum · data langsung dari Google Sheets' : 'Tata kelola kerja sama · data langsung dari Google Sheets'}
          </p>
        </div>

        {hukumOn ? (
          <div style={{ marginBottom: 24, animation: 'hukumFadeUp 0.7s cubic-bezier(0.32,0.72,0,1) both' }}>
            <div style={{ background: '#fff', borderRadius: 32, padding: '2.6rem 2.6rem', boxShadow: '0 40px 90px -45px rgba(33,40,66,0.25)', border: '1px solid rgba(33,40,66,0.06)' }}>

              <div style={{
                display: 'inline-block', fontSize: 10, color: INDIGO, textTransform: 'uppercase',
                letterSpacing: '0.24em', fontWeight: 700, background: 'rgba(33,40,66,0.06)',
                padding: '7px 18px', borderRadius: 100, marginBottom: 20,
              }}>
                Modul Penegak Hukum
              </div>

              <h2 style={{ fontSize: 34, fontWeight: 900, color: INDIGO, letterSpacing: '-0.03em', margin: '0 0 10px', lineHeight: 1.05 }}>
                Pengajuan &amp; Pendampingan Hukum
              </h2>
              <p style={{ fontSize: 13.5, color: 'rgba(33,40,66,0.55)', lineHeight: 1.7, maxWidth: 480, margin: '0 0 32px' }}>
                Kelola akun pegawai, pendampingan hukum, dan arsip penanganan dalam satu ruang kerja terpisah dari modul kerja sama MOU/PKS.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
                {hukumFeatures.map((item, i) => (
                  item.active
                    ? <HukumCardActive key={item.label} item={item} />
                    : <HukumCardSoon key={item.label} item={item} index={i} onClick={() => { setFeatureComingSoon(item.label); setShowPelaporanInfo(true); }} />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {!hukumOn ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 18 }}>
              {menuItems.map((m, i) => (
                <a key={m.href} href={m.href} style={{ ...shell, textDecoration: 'none', color: 'inherit', animationDelay: `${0.05 * i + 0.1}s` }} className="lift rise">
                  <div style={{ ...core, padding: '1.4rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div className="ic-wrap" style={{ width: 50, height: 50, borderRadius: 15, background: m.grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 12px 26px -12px ${m.accent}` }}>
                        {m.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 16.5, fontWeight: 800, color: INDIGO, letterSpacing: '-0.02em' }}>{m.label}</span>
                          {m.notif ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: '#FBF3E7', color: GOLD_ACCENT }}>{m.notif}</span> : null}
                        </div>
                        <div style={{ fontSize: 12.5, color: 'rgba(33,40,66,0.55)', lineHeight: 1.5, marginTop: 4 }}>{m.desc}</div>
                      </div>
                      <FiArrowUpRight className="arr" size={18} strokeWidth={1.8} style={{ color: m.accent, flexShrink: 0 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 18, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(33,40,66,0.06)' }}>
                      {[m.s1, m.s2].map((s, k) => (
                        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(33,40,66,0.6)' }}>
                          <span style={{ color: m.accent }}>{s.icon}</span>
                          <strong style={{ color: INDIGO, fontWeight: 700 }}>{s.val}</strong> {s.lbl}
                        </span>
                      ))}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
              {statCards.map((s, i) => (
                <div key={s.lbl} style={{ ...shellSm, animationDelay: `${0.03 * i + 0.15}s` }} className="rise">
                  <div style={{ ...coreSm, padding: '1.05rem 1.15rem' }}>
                    <div style={{ fontSize: 11.5, color: 'rgba(33,40,66,0.55)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>{s.icon} {s.lbl}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: s.warn ? RED : s.ok ? INDIGO : '#3a3f4d' }}>{s.val}</div>
                  </div>
                </div>
              ))}
            </div>

            {alertExpire.length > 0 ? (
              <div style={{ ...shell, marginBottom: 18 }} className="rise">
                <div style={{ ...core, padding: '1.2rem 1.4rem', background: 'linear-gradient(160deg,#FBF3E7,#F5E6CC)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#8C5F27', marginBottom: 12 }}>
                    <FiAlertCircle size={16} strokeWidth={1.8} /> {alertExpire.length} dokumen akan berakhir dalam 90 hari
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {alertExpire.map(a => {
                      const jp = jenisPill(a.jenis);
                      return (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(181,129,63,0.18)' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: INDIGO, fontSize: 13.5 }}>{a.namaMitra}</div>
                            <div style={{ fontSize: 11.5, color: 'rgba(33,40,66,0.55)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: jp.bg, color: jp.c }}>{a.jenis}</span>
                              {a.judul} · Berakhir {a.tglBerakhir}
                            </div>
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 12px', borderRadius: 100, background: a.sisaHari <= 30 ? '#FCEBEB' : '#F5E6CC', color: a.sisaHari <= 30 ? RED : '#8C5F27', whiteSpace: 'nowrap' }}>{a.sisaHari} hari lagi</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ ...shell, marginBottom: 18 }} className="rise">
                <div style={{ ...core, padding: '1.2rem 1.4rem', background: 'linear-gradient(160deg,#F5EFE0,rgba(33,40,66,0.06))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: INDIGO, marginBottom: 4 }}>
                    <FiCheck size={16} strokeWidth={2} /> Semua dokumen dalam kondisi baik
                  </div>
                  <div style={{ fontSize: 12.5, color: INDIGO }}>Tidak ada dokumen yang berakhir dalam 90 hari ke depan.</div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 13, marginBottom: 18 }}>
              {quickActions.map((a, i) => (
                <a key={a.href} href={a.href} style={{ ...shellSm, textDecoration: 'none', color: 'inherit', animationDelay: `${0.03 * i + 0.2}s` }} className="lift rise">
                  <div style={{ ...coreSm, padding: '1.2rem 1.3rem', position: 'relative' }}>
                    <FiArrowUpRight className="arr" size={16} strokeWidth={1.8} style={{ position: 'absolute', top: 16, right: 16, color: a.c }} />
                    <div className="ic-wrap" style={{ width: 42, height: 42, borderRadius: 13, background: a.bg, color: a.c, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      {a.icon}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: INDIGO, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {a.label}
                      {a.notif ? <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#FBF3E7', color: GOLD_ACCENT }}>{a.notif}</span> : null}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(33,40,66,0.55)', lineHeight: 1.5, marginTop: 4 }}>{a.desc}</div>
                  </div>
                </a>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              {[
                {
                  head: <><FiPieChart size={13} strokeWidth={1.8} /> Komposisi Dokumen</>,
                  items: [
                    { lbl: <><FaFileSignature size={11} /> MOU</>, val: `${mouCount} dok (${mouPercent}%)`, pct: mouPercent, grad: `linear-gradient(90deg,${INDIGO_LIGHT},${INDIGO})` },
                    { lbl: <><FaFileAlt size={11} /> PKS</>, val: `${pksCount} dok (${pksPercent}%)`, pct: pksPercent, grad: `linear-gradient(90deg,${GOLD_ACCENT},#8C5F27)` },
                  ],
                },
                {
                  head: <><FiTrendingUp size={13} strokeWidth={1.8} /> Status Keseluruhan</>,
                  items: [
                    { lbl: <><FiCheckCircle size={11} strokeWidth={1.9} style={{ color: INDIGO }} /> Aktif</>, val: `${stats.dokAktif} dari ${totalDocs} (${aktifPercent}%)`, pct: aktifPercent, grad: `linear-gradient(90deg,${INDIGO_LIGHT},${INDIGO})` },
                    { lbl: <><FiAlertCircle size={11} strokeWidth={1.9} style={{ color: RED }} /> Butuh Tindakan</>, val: `${needAction} dok (${needActionPercent}%)`, pct: needActionPercent, grad: 'linear-gradient(90deg,#c0524a,#8c2f28)' },
                  ],
                },
              ].map((blk, bi) => (
                <div key={bi} style={shell} className="rise">
                  <div style={{ ...core, padding: '1.3rem 1.4rem' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(33,40,66,0.55)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 7 }}>{blk.head}</div>
                    {blk.items.map((it, ii) => (
                      <div key={ii} style={{ marginBottom: ii === 0 ? 16 : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 7 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#3a3f4d' }}>{it.lbl}</span>
                          <span style={{ color: 'rgba(33,40,66,0.55)', fontWeight: 500 }}>{it.val}</span>
                        </div>
                        <div style={{ height: 9, borderRadius: 100, background: 'rgba(33,40,66,0.07)', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(33,40,66,0.06)' }}>
                          <div style={{ height: '100%', borderRadius: 100, width: `${it.pct}%`, background: it.grad, transition: 'width 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={shell} className="rise">
              <div style={{ ...core, padding: '1.3rem 1.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: INDIGO, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiFile size={16} strokeWidth={1.8} /> Dokumen Terbaru
                  </span>
                  <a href="/dashboard/dokumen" style={{ fontSize: 12, color: INDIGO, textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 100, border: `1.5px solid rgba(33,40,66,0.2)` }}>
                    Lihat semua <FiEye size={12} strokeWidth={1.8} />
                  </a>
                </div>
                {dokumenTerbaru.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Jenis', 'Judul', 'Mitra', 'Berakhir', 'Status'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: 'rgba(33,40,66,0.45)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(33,40,66,0.08)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dokumenTerbaru.map((d, i) => {
                          const jp = jenisPill(d.jenis);
                          const si = statusInfo(d.status);
                          return (
                            <tr key={i} className="trow">
                              <td style={td}><span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: jp.bg, color: jp.c }}>{d.jenis}</span></td>
                              <td style={{ ...td, fontWeight: 600, color: INDIGO }}>{d.judul}</td>
                              <td style={{ ...td, color: 'rgba(33,40,66,0.6)' }}>{d.namaMitra}</td>
                              <td style={{ ...td, color: 'rgba(33,40,66,0.6)' }}>{d.tglBerakhir}</td>
                              <td style={td}><span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: si.bg, color: si.c }}>{si.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(33,40,66,0.35)' }}>
                    <FiFile size={34} strokeWidth={1.3} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Belum ada dokumen</div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

      </div>
    </div>
  );
}

const shell: React.CSSProperties = { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(33,40,66,0.07)', borderRadius: 24, padding: 7, boxShadow: '0 1px 2px rgba(33,40,66,0.04), 0 30px 60px -38px rgba(33,40,66,0.18)' };
const core: React.CSSProperties = { background: '#fff', borderRadius: 18, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)' };
const shellSm: React.CSSProperties = { ...shell, borderRadius: 20, padding: 6 };
const coreSm: React.CSSProperties = { ...core, borderRadius: 15 };
const td: React.CSSProperties = { padding: '12px', borderBottom: '1px solid rgba(33,40,66,0.05)' };