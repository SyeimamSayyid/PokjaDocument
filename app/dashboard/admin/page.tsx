'use client';

import { useEffect, useState } from 'react';
import LoaderPage from '@/components/LoaderPage';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import { DonutChart, BarChart } from '@/components/DashboardCharts';
import {
  FiInbox, FiFileText, FiCheckCircle, FiClock, FiXCircle,
  FiFolder, FiAlertCircle, FiCheck, FiEye, FiKey,
  FiUsers, FiCalendar, FiUser, FiActivity, FiGrid,
  FiFile, FiPieChart, FiTrendingUp, FiList, FiArrowUpRight, FiArchive,
  FiUserPlus, FiClipboard, FiShield, FiChevronDown, FiSearch, FiDownload, FiMessageCircle, FiMessageSquare, FiDroplet,
} from 'react-icons/fi';
import { FaFileSignature, FaFileAlt, FaBuilding, FaBalanceScale } from 'react-icons/fa';
import NotifikasiAdminBell from '@/components/NotifikasiAdminBell';
import EditPencilIndicator from '@/components/EditPencilIndicator';

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
  arsipMouCount?: number;
  arsipPksCount?: number;
  arsipTotal?: number;
  mitraTerdaftar?: number;
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
  manualLog?: string;
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
// Palet baru: Sky (#BED9F4) + Milk (#FAF8F0) — sesuai permintaan.
// INDIGO/GOLD_ACCENT sekarang cuma NAMA VARIABEL lama, isinya sudah diganti
// jadi turunan Sky biar teks/kontras tetap terbaca (Sky asli terlalu terang
// buat jadi warna teks langsung).
const INDIGO = '#1E3A5F';       // navy dalam turunan Sky — teks & elemen gelap
const INDIGO_LIGHT = '#3D6690'; // sky yang lebih gelap dikit — gradient
const CREAM = '#FAF8F0';        // Milk — latar & elemen terang
const GOLD_ACCENT = '#4A7FB5';  // sky pertengahan — dipakai sebagai teks/aksen kedua
const RED = '#A32D2D';          // fungsional: bahaya/kedaluwarsa saja
const SKY = '#BED9F4'; // dipakai langsung buat badge/background terang

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
        background: 'rgba(30,58,95,0.02)',
        border: '1px dashed rgba(30,58,95,0.15)',
        animation: `hukumFadeUp 0.7s cubic-bezier(0.32,0.72,0,1) ${0.1 + index * 0.05}s both`,
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(30,58,95,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(30,58,95,0.5)', flexShrink: 0 }}>
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
  const [hukumStats, setHukumStats] = useState<{
    totalPegawai: number;
    pegawaiPerLokasi: { lokasi: string; jumlah: number }[];
    pengajuanMenunggu: number; pengajuanDisetujui: number; pengajuanDitolak: number;
    pendampinganAktif: number; pendampinganArsip: number;
  } | null>(null);
  const [loadingHukumStats, setLoadingHukumStats] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [showPelaporanInfo, setShowPelaporanInfo] = useState(false);
  const [featureComingSoon, setFeatureComingSoon] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [wilayah, setWilayah] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [chatbotMenunggu, setChatbotMenunggu] = useState(0);
  const [dokumenBasahMenunggu, setDokumenBasahMenunggu] = useState(0);
  const [saranBelumDibaca, setSaranBelumDibaca] = useState(0);
  const [dokumenTerbaru, setDokumenTerbaru] = useState<DokItem[]>([]);
  const [alertExpire, setAlertExpire] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTotalBreakdown, setShowTotalBreakdown] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setNama(u.nama || 'Admin');
        setRole(u.role);
        setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
        setWilayah(u.wilayah || '');

        // BNN Utama punya dashboard sendiri — alihkan otomatis biar tidak
        // nyasar ke dashboard operasional BNNP/BNNK ini.
        if (u.level === 'utama') { window.location.href = '/dashboard/bnn-utama'; return; }

        fetch('/api/dashboard/admin')
          .then(r => r.json())
          .then(d => {
            if (d.error) { setError('Gagal memuat data.'); setLoading(false); return; }
            setStats({
              ...d.stats,
              mouCount: d.stats.mouCount ?? Math.round(d.stats.totalDok * 0.6),
              pksCount: d.stats.pksCount ?? Math.round(d.stats.totalDok * 0.4),
              arsipMouCount: d.stats.arsipMouCount || 0,
              arsipPksCount: d.stats.arsipPksCount || 0,
              arsipTotal: d.stats.arsipTotal || 0,
              mitraTerdaftar: d.stats.mitraTerdaftar || 0,
              pendaftaranMenunggu: d.stats.pendaftaranMenunggu || 0,
              rencanaKegiatanAktif: d.stats.rencanaKegiatanAktif || 0,
            });
            setDokumenTerbaru(d.dokumenTerbaru || []);
            setAlertExpire(d.alertExpire || []);
            setLoading(false);
          })
          .catch(() => { setError('Gagal memuat data.'); setLoading(false); });

        // Badge notifikasi sidebar — pertanyaan chatbot menunggu & masukan
        // saran belum dibaca. Fetch terpisah (bukan bagian /api/dashboard/admin)
        // karena datanya dari endpoint yang berbeda.
        fetch('/api/chatbot/pertanyaan-masuk')
          .then(r => r.json())
          .then(d => setChatbotMenunggu((d.data || []).filter((p: { status: string }) => p.status === 'Menunggu').length))
          .catch(() => {});
        fetch('/api/masukan-saran')
          .then(r => r.json())
          .then(d => setSaranBelumDibaca(d.ringkasan?.belumDibaca || 0))
          .catch(() => {});
        fetch('/api/dokumen/dokumen-basah')
          .then(r => r.json())
          .then(d => setDokumenBasahMenunggu((d.data || []).filter((x: { ttdStatus: string }) => x.ttdStatus === 'Menunggu Basah').length))
          .catch(() => {});
      })
      .catch(() => { window.location.href = '/login'; });
  }, []);

  // Ambil statistik modul Hukum sekali begitu toggle diaktifkan (bukan tiap
  // render) — gabungkan 3 sumber data yang sudah ada (Pegawai, Pengajuan
  // Akun, Pendampingan), bukan bikin endpoint agregat baru.
  useEffect(() => {
    if (!hukumOn || hukumStats || loadingHukumStats) return;
    setLoadingHukumStats(true);
    Promise.all([
      fetch('/api/hukum/pegawai').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/hukum/pengajuan-akun').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/hukum/pendampingan').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([pegawaiRes, pengajuanRes, pendampinganRes]) => {
      const pegawaiList: { lokasi?: string }[] = pegawaiRes.data || [];
      const hitungLokasi = new Map<string, number>();
      pegawaiList.forEach(p => {
        const l = p.lokasi || 'Tidak diketahui';
        hitungLokasi.set(l, (hitungLokasi.get(l) || 0) + 1);
      });

      const pengajuanList: { status?: string }[] = pengajuanRes.data || [];
      const pendampinganList: { status?: string }[] = pendampinganRes.data || [];

      setHukumStats({
        totalPegawai: pegawaiList.length,
        pegawaiPerLokasi: Array.from(hitungLokasi.entries()).map(([lokasi, jumlah]) => ({ lokasi, jumlah })),
        pengajuanMenunggu: pengajuanList.filter(p => p.status === 'Menunggu').length,
        pengajuanDisetujui: pengajuanList.filter(p => p.status === 'Disetujui').length,
        pengajuanDitolak: pengajuanList.filter(p => p.status === 'Ditolak').length,
        pendampinganAktif: pendampinganList.filter(p => !['Selesai', 'Ditolak'].includes(p.status || '')).length,
        pendampinganArsip: pendampinganList.filter(p => p.status === 'Selesai').length,
      });
    }).finally(() => setLoadingHukumStats(false));
  }, [hukumOn, hukumStats, loadingHukumStats]);

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
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

  const jenisPill = (j: string) => (j || '').toLowerCase() === 'mou' ? { c: INDIGO, bg: 'rgba(30,58,95,0.08)' } : { c: GOLD_ACCENT, bg: '#EAF2FC' };
  const statusInfo = (s: string): { c: string; bg: string; label: string } => {
    const k = (s || '').toLowerCase();
    if (['aktif', 'disetujui', 'mou/pks berlaku'].includes(k)) return { c: INDIGO, bg: 'rgba(30,58,95,0.08)', label: s };
    if (['draft'].includes(k)) return { c: '#6b6255', bg: '#f2ede2', label: 'Draft' };
    if (['expired', 'kedaluwarsa'].includes(k)) return { c: RED, bg: '#FCEBEB', label: 'Kedaluwarsa' };
    return { c: INDIGO, bg: 'rgba(30,58,95,0.08)', label: s || 'Proses' };
  };

  const menuItems = [
    {
      href: '/dashboard/rencana', icon: <FiCalendar size={20} strokeWidth={1.7} />, label: 'E-Planning',
      desc: 'Kelola rencana kegiatan kerja sama kelembagaan',
      notif: (stats.pendaftaranMenunggu ?? 0) > 0
        ? `${stats.pendaftaranMenunggu} pendaftaran menunggu`
        : ((stats.rencanaKegiatanAktif ?? 0) > 0 ? `${stats.rencanaKegiatanAktif} aktif` : null),
      grad: `linear-gradient(150deg,${INDIGO_LIGHT},${INDIGO})`, accent: INDIGO,
      s1: { icon: <FiCheckCircle size={12} strokeWidth={1.8} />, val: stats.rencanaKegiatanAktif || 0, lbl: 'Aktif' },
      s2: { icon: <FiUsers size={12} strokeWidth={1.8} />, val: stats.pendaftaranMenunggu || 0, lbl: 'Pendaftaran' },
    },
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

  const sidebarItemsDokumen: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning', notifCount: stats.pendaftaranMenunggu || 0 },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan', notifCount: stats.pengajuanMenunggu || 0 },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/dokumen-basah', icon: <FiDroplet size={17} />, label: 'Dokumen Basah', notifCount: dokumenBasahMenunggu },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiList size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/laporan', icon: <FiFileText size={17} />, label: 'Laporan' },
    { href: '/dashboard/kelola-chatbot', icon: <FiMessageCircle size={17} />, label: 'Kelola Chatbot', notifCount: chatbotMenunggu },
    { href: '/dashboard/kotak-saran', icon: <FiMessageSquare size={17} />, label: 'Kotak Saran', notifCount: saranBelumDibaca },
    ...(level === 'bnnp_bnnk' ? [{ href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' }] : []),
  ];

  // Sidebar mode Hukum — menu berbeda, menyesuaikan modul Penegak Hukum.
  // Item yang belum aktif ("Segera Hadir") tetap ditampilkan tapi hrefnya
  // balik ke dashboard sendiri (bukan halaman kosong/404).
  const sidebarItemsHukum: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/hukum/akun-pegawai', icon: <FiUserPlus size={17} />, label: 'Akun Pegawai BNN' },
    { href: '/dashboard/hukum/pengajuan-akun', icon: <FiInbox size={17} />, label: 'Pengajuan Akun' },
    { href: '/dashboard/hukum/pendampingan', icon: <FiClipboard size={17} />, label: 'Kelola Pendampingan' },
    { href: '/dashboard/hukum/tindak-lanjut', icon: <FiTrendingUp size={17} />, label: 'Tindak Lanjut' },
    { href: '/dashboard/hukum/arsip-penanganan', icon: <FiArchive size={17} />, label: 'Arsip Penanganan' },
  ];

  const sidebarItems: SidebarItem[] = hukumOn ? sidebarItemsHukum : sidebarItemsDokumen;

  const hukumFeatures: HukumFeature[] = [
    { label: 'Pembuatan Akun Pegawai BNN', icon: <FiUserPlus size={17} />, href: '/dashboard/hukum/akun-pegawai', active: true },
    { label: 'Pengajuan Akun Pegawai', icon: <FiInbox size={16} />, href: '/dashboard/hukum/pengajuan-akun', active: true },
    { label: 'Kelola Pendampingan/Pengajuan', icon: <FiClipboard size={16} />, href: '/dashboard/hukum/pendampingan', active: true },
    { label: 'Tindak Lanjut Pendampingan', icon: <FiTrendingUp size={16} />, href: '/dashboard/hukum/tindak-lanjut', active: true },
    { label: 'Arsip Penanganan', icon: <FiArchive size={16} />, href: '/dashboard/hukum/arsip-penanganan', active: true },
  ];

  return (
    <div style={{
      minHeight: '100dvh',
      fontFamily: FONT,
      background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); filter: blur(4px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes hukumFadeUp { from { opacity: 0; transform: translateY(20px); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
        .rise { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
        .lift { transition: all 0.45s cubic-bezier(0.32,0.72,0,1); }
        .lift:hover { transform: translateY(-4px); box-shadow: 0 28px 50px -28px rgba(30,58,95,0.28) !important; }
        .lift:active { transform: translateY(-1px) scale(0.995); }
        .lift:hover .ic-wrap { transform: scale(1.08) rotate(-4deg); }
        .ic-wrap { transition: transform 0.45s cubic-bezier(0.32,0.72,0,1); }
        .lift:hover .arr { transform: translate(2px,-2px); opacity: 1; }
        .arr { transition: all 0.45s cubic-bezier(0.32,0.72,0,1); opacity: 0; }
        .trow { transition: background 0.25s ease; }
        .trow:hover { background: rgba(30,58,95,0.03); }
        .btn-hover { transition: all 0.25s ease; }
        .btn-hover:hover { transform: translateY(-1px); filter: brightness(1.08); }
        .hukum-switch { position: relative; display: inline-flex; align-items: center; width: 44px; height: 22px; flex-shrink: 0; }
        .hukum-toggle { opacity: 0; width: 0; height: 0; }
        .hukum-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; border-radius: 100px; background: #e2e8f0; transition: 0.3s; }
        .hukum-slider:before { content: ""; position: absolute; height: 16px; width: 16px; left: 3px; bottom: 3px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: 0.3s; }
        .hukum-toggle:checked + .hukum-slider { background: #1E3A5F; }
        .hukum-toggle:checked + .hukum-slider:before { transform: translateX(22px); background: #FAF8F0; }
        .hukum-card { transition: all 0.6s cubic-bezier(0.32,0.72,0,1); }
        .hukum-card:hover { transform: translateY(-3px) scale(1.01); }
        .hukum-arrow-wrap { transition: transform 0.5s cubic-bezier(0.32,0.72,0,1); }
        .hukum-card:hover .hukum-arrow-wrap { transform: translate(3px,-2px) scale(1.08); }
        .toggle-icon { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; max-width: 1180px !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/admin"
        brandLabel="E-POKJA HUKER"
        brandSub={hukumOn ? 'Modul Penegak Hukum' : `Admin BNNP/BNNK${wilayah ? ' · ' + wilayah : ''}`}
        navSectionTitle={hukumOn ? 'Modul Hukum' : 'Navigasi'}
        userName={nama}
        userTag={wilayah || 'Admin BNNP/BNNK'}
        accent={hukumOn ? '#2C5580' : GOLD_ACCENT}
        onLogout={logout}
      />

      {showPelaporanInfo ? (
        <div
          onClick={() => setShowPelaporanInfo(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(30,58,95,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' }}
          className="rise"
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: CREAM, borderRadius: 26, padding: '2.4rem 2rem', width: '100%', maxWidth: 380, textAlign: 'center', border: '1px solid rgba(30,58,95,0.1)', boxShadow: '0 40px 80px -30px rgba(30,58,95,0.5)' }}
          >
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 14px 30px -10px rgba(30,58,95,0.5)' }}>
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

      <div className="main-content-wrap" style={{ maxWidth: 1180, margin: '0 auto', padding: '1.4rem 1.5rem 0' }}>
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
          background: 'rgba(240,231,213,0.75)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(30,58,95,0.1)',
          borderRadius: 100, padding: '10px 14px 10px 20px',
          boxShadow: '0 10px 30px -18px rgba(30,58,95,0.3)',
        }}>
          <form onSubmit={e => {
            e.preventDefault();
            if (quickSearch.trim()) window.location.href = `/dashboard/dokumen?cari=${encodeURIComponent(quickSearch.trim())}`;
          }} style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <FiSearch size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(30,58,95,0.4)' }} />
            <input
              value={quickSearch}
              onChange={e => setQuickSearch(e.target.value)}
              placeholder="Cari dokumen, mitra, atau kode..."
              style={{
                width: '100%', padding: '9px 14px 9px 36px', borderRadius: 100, border: '1px solid rgba(30,58,95,0.1)',
                background: 'rgba(255,255,255,0.7)', fontSize: 12.5, fontFamily: FONT, color: INDIGO,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            {/* Toggle Dokumen/Hukum DINONAKTIFKAN sesuai arahan (pembimbing
                belum butuh modul Hukum) — un-comment blok di bawah buat
                mengaktifkan lagi, semua logic hukumOn/hukumFeatures masih
                utuh, tidak dihapus. */}
            {false && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px', background: 'rgba(30,58,95,0.04)', borderRadius: 100, border: '1px solid rgba(30,58,95,0.08)' }} title="Dokumen (aktif) / Modul Hukum">
              <div className="toggle-icon" style={{
                width: 24, height: 24, borderRadius: '50%',
                background: !hukumOn ? INDIGO : 'rgba(30,58,95,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: !hukumOn ? '0 4px 10px -3px rgba(30,58,95,0.5)' : 'none',
              }}>
                <FiFileText size={12} style={{ color: !hukumOn ? CREAM : 'rgba(30,58,95,0.35)' }} />
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
                background: hukumOn ? INDIGO : 'rgba(30,58,95,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: hukumOn ? '0 4px 10px -3px rgba(30,58,95,0.5)' : 'none',
              }}>
                <FaBalanceScale size={12} style={{ color: hukumOn ? CREAM : 'rgba(30,58,95,0.35)' }} />
              </div>
            </div>
            )}
            <a href="/panduan/admin-bnnp-bnnk.docx" download style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 100,
              background: 'rgba(30,58,95,0.06)', border: '1px solid rgba(30,58,95,0.1)', color: INDIGO,
              fontSize: 11.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
            }} className="btn-hover">
              <FiDownload size={13} /> Unduh Panduan
            </a>
            <NotifikasiAdminBell />
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(150deg,${INDIGO},#0b1420)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800, color: '#fff', boxShadow: '0 4px 10px -3px rgba(30,58,95,0.5)' }}>
              {nama.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          </div>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth: 1180, margin: '0 auto', padding: '1.5rem' }}>

        <div style={{ marginBottom: 24 }} className="rise">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9.5, color: INDIGO, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700,
              background: 'rgba(30,58,95,0.06)', padding: '6px 14px', borderRadius: 100,
            }}>
              Admin BNNP/BNNK{wilayah ? ` · ${wilayah}` : ''}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: GOLD_ACCENT, background: '#EAF2FC', padding: '5px 13px', borderRadius: 100, border: '1px solid #A8C8EA' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD_ACCENT, animation: 'pulse 2s infinite' }} /> Live
            </span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: INDIGO, letterSpacing: '-0.04em', margin: '0 0 6px', lineHeight: 1.03 }}>
            Selamat datang, {nama.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(30,58,95,0.6)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiUser size={13} strokeWidth={1.7} />
            {hukumOn ? 'Tata kelola pengajuan hukum · data langsung dari Google Sheets' : 'Tata kelola kerja sama · data langsung dari Google Sheets'}
          </p>
        </div>

        {hukumOn ? (
          <div style={{ marginBottom: 24, animation: 'hukumFadeUp 0.7s cubic-bezier(0.32,0.72,0,1) both' }}>
            <div style={{ background: '#fff', borderRadius: 32, padding: '2.6rem 2.6rem', boxShadow: '0 40px 90px -45px rgba(30,58,95,0.25)', border: '1px solid rgba(30,58,95,0.06)' }}>

              <div style={{
                display: 'inline-block', fontSize: 10, color: INDIGO, textTransform: 'uppercase',
                letterSpacing: '0.24em', fontWeight: 700, background: 'rgba(30,58,95,0.06)',
                padding: '7px 18px', borderRadius: 100, marginBottom: 20,
              }}>
                Modul Penegak Hukum
              </div>

              <h2 style={{ fontSize: 34, fontWeight: 900, color: INDIGO, letterSpacing: '-0.03em', margin: '0 0 10px', lineHeight: 1.05 }}>
                Pengajuan &amp; Pendampingan Hukum
              </h2>
              <p style={{ fontSize: 13.5, color: 'rgba(30,58,95,0.55)', lineHeight: 1.7, maxWidth: 480, margin: '0 0 32px' }}>
                Kelola akun pegawai, pendampingan hukum, dan arsip penanganan dalam satu ruang kerja terpisah dari modul kerja sama MOU/PKS.
              </p>

              {/* ── Statistik ringkas modul Hukum ── */}
              {loadingHukumStats && !hukumStats ? (
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>Memuat statistik...</div>
              ) : hukumStats ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 28 }}>
                  <div style={hukumStatCard}>
                    <div style={hukumStatVal}>{hukumStats.totalPegawai}</div>
                    <div style={hukumStatLbl}>Pegawai Terdaftar</div>
                    {hukumStats.pegawaiPerLokasi.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {hukumStats.pegawaiPerLokasi.slice(0, 4).map(l => (
                          <div key={l.lokasi} style={{ fontSize: 9.5, color: 'rgba(30,58,95,0.5)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{l.lokasi}</span><span style={{ fontWeight: 700 }}>{l.jumlah}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={hukumStatCard}>
                    <div style={{ ...hukumStatVal, color: '#B5813F' }}>{hukumStats.pengajuanMenunggu}</div>
                    <div style={hukumStatLbl}>Pengajuan Menunggu</div>
                  </div>
                  <div style={hukumStatCard}>
                    <div style={{ ...hukumStatVal, color: '#0a5c47' }}>{hukumStats.pengajuanDisetujui}</div>
                    <div style={hukumStatLbl}>Akun Disetujui</div>
                  </div>
                  <div style={hukumStatCard}>
                    <div style={{ ...hukumStatVal, color: '#A32D2D' }}>{hukumStats.pengajuanDitolak}</div>
                    <div style={hukumStatLbl}>Akun Ditolak</div>
                  </div>
                  <div style={hukumStatCard}>
                    <div style={{ ...hukumStatVal, color: '#1D4ED8' }}>{hukumStats.pendampinganAktif}</div>
                    <div style={hukumStatLbl}>Pendampingan Aktif</div>
                  </div>
                  <div style={hukumStatCard}>
                    <div style={{ ...hukumStatVal, color: '#0a5c47' }}>{hukumStats.pendampinganArsip}</div>
                    <div style={hukumStatLbl}>Masuk Arsip</div>
                  </div>
                </div>
              ) : null}

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
                          {m.notif ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: '#EAF2FC', color: GOLD_ACCENT }}>{m.notif}</span> : null}
                        </div>
                        <div style={{ fontSize: 12.5, color: 'rgba(30,58,95,0.55)', lineHeight: 1.5, marginTop: 4 }}>{m.desc}</div>
                      </div>
                      <FiArrowUpRight className="arr" size={18} strokeWidth={1.8} style={{ color: m.accent, flexShrink: 0 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 18, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(30,58,95,0.06)' }}>
                      {[m.s1, m.s2].map((s, k) => (
                        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(30,58,95,0.6)' }}>
                          <span style={{ color: m.accent }}>{s.icon}</span>
                          <strong style={{ color: INDIGO, fontWeight: 700 }}>{s.val}</strong> {s.lbl}
                        </span>
                      ))}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 12 }}>
              {statCards.map((s, i) => {
                const isTotal = s.lbl === 'Total dokumen';
                return (
                <div key={s.lbl} style={{
                  ...shellSm, border: undefined,
                  borderWidth: 1, borderStyle: 'solid',
                  borderColor: (isTotal && showTotalBreakdown) ? 'rgba(30,58,95,0.25)' : 'rgba(30,58,95,0.07)',
                  animationDelay: `${0.03 * i + 0.15}s`,
                }} className="rise">
                  <div
                    onClick={isTotal ? () => setShowTotalBreakdown(v => !v) : undefined}
                    style={{ ...coreSm, padding: '1.05rem 1.15rem', cursor: isTotal ? 'pointer' : 'default' }}
                    className={isTotal ? 'btn-hover' : undefined}
                  >
                    <div style={{ fontSize: 11.5, color: 'rgba(30,58,95,0.55)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      {s.icon} {s.lbl}
                      {isTotal && <FiChevronDown size={12} style={{ marginLeft: 'auto', transform: showTotalBreakdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }} />}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: s.warn ? RED : s.ok ? INDIGO : '#3a3f4d' }}>{s.val}</div>
                  </div>
                </div>
                );
              })}
            </div>

            {showTotalBreakdown && (
              <div style={{ ...shell, marginBottom: 18 }} className="rise">
                <div style={{ ...core, padding: '1.2rem 1.4rem' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(30,58,95,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                    Rincian Total Dokumen
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'rgba(30,58,95,0.04)', borderRadius: 14, padding: '13px 15px' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: INDIGO, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiFolder size={13} /> Di Sistem
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'rgba(30,58,95,0.5)', fontWeight: 600, marginBottom: 3 }}>MOU</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: INDIGO }}>{stats.mouCount ?? 0}</div>
                        </div>
                        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'rgba(30,58,95,0.5)', fontWeight: 600, marginBottom: 3 }}>PKS</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: INDIGO }}>{stats.pksCount ?? 0}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#EAF2FC', borderRadius: 14, padding: '13px 15px' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: GOLD_ACCENT, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiArchive size={13} /> Di Arsip
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'rgba(140,95,39,0.7)', fontWeight: 600, marginBottom: 3 }}>MOU</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: GOLD_ACCENT }}>{stats.arsipMouCount ?? 0}</div>
                        </div>
                        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'rgba(140,95,39,0.7)', fontWeight: 600, marginBottom: 3 }}>PKS</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: GOLD_ACCENT }}>{stats.arsipPksCount ?? 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <a href="/dashboard/arsip" style={{ fontSize: 12, color: '#fff', background: INDIGO, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 100, marginTop: 14 }} className="btn-hover">
                    Buka Arsip Dokumen <FiArrowUpRight size={12} />
                  </a>
                </div>
              </div>
            )}

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
                            <div style={{ fontSize: 11.5, color: 'rgba(30,58,95,0.55)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                <div style={{ ...core, padding: '1.2rem 1.4rem', background: 'linear-gradient(160deg,#F0EEE5,rgba(30,58,95,0.06))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: INDIGO, marginBottom: 4 }}>
                    <FiCheck size={16} strokeWidth={2} /> Semua dokumen dalam kondisi baik
                  </div>
                  <div style={{ fontSize: 12.5, color: INDIGO }}>Tidak ada dokumen yang berakhir dalam 90 hari ke depan.</div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: 14, marginBottom: 18 }}>
              <div style={shell} className="rise">
                <div style={{ ...core, padding: '1.2rem 1.4rem' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(30,58,95,0.55)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <FiArchive size={13} strokeWidth={1.8} /> Dokumen: Sistem vs Arsip
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <DonutChart
                      size={104} thickness={14}
                      segments={[
                        { label: 'Sistem', value: stats.totalDok, color: INDIGO },
                        { label: 'Arsip', value: stats.arsipTotal || 0, color: GOLD_ACCENT },
                      ]}
                      centerLabel={String(stats.totalDok + (stats.arsipTotal || 0))}
                      centerSub="Total"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: INDIGO, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#3a3f4d' }}>Sistem: <strong style={{ color: INDIGO }}>{stats.totalDok}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: GOLD_ACCENT, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#3a3f4d' }}>Arsip: <strong style={{ color: GOLD_ACCENT }}>{stats.arsipTotal || 0}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={shell} className="rise">
                <div style={{ ...core, padding: '1.2rem 1.4rem' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(30,58,95,0.55)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <FaBuilding size={12} /> Mitra Terdaftar
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{
                      width: 104, height: 104, borderRadius: '50%', flexShrink: 0,
                      background: `conic-gradient(${INDIGO} 0deg 360deg)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                    }}>
                      <div style={{ width: 104 - 28, height: 104 - 28, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: INDIGO }}>{stats.mitraTerdaftar || 0}</div>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>Mitra</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <div style={{ fontSize: 12, color: '#3a3f4d', lineHeight: 1.5 }}>Institusi yang resmi terdaftar sebagai mitra kerja sama di sistem.</div>
                      <a href="/dashboard/kontak" style={{ fontSize: 11, color: INDIGO, textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Lihat direktori mitra <FiArrowUpRight size={11} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div style={shell} className="rise">
                <div style={{ ...core, padding: '1.2rem 1.4rem' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(30,58,95,0.55)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <FiPieChart size={13} strokeWidth={1.8} /> Jenis Dokumen
                  </div>
                  <BarChart height={130} groups={[
                    { label: 'MOU', values: [{ value: mouCount, color: INDIGO }] },
                    { label: 'PKS', values: [{ value: pksCount, color: GOLD_ACCENT }] },
                    { label: 'Sistem', values: [{ value: stats.totalDok, color: '#5B8BB8' }] },
                    { label: 'Arsip', values: [{ value: stats.arsipTotal || 0, color: '#A8C8EA' }] },
                  ]} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              {[
                {
                  head: <><FiPieChart size={13} strokeWidth={1.8} /> Komposisi Dokumen</>,
                  items: [
                    { lbl: <><FaFileSignature size={11} /> MOU</>, val: `${mouCount} dok (${mouPercent}%)`, pct: mouPercent, grad: `linear-gradient(90deg,${INDIGO_LIGHT},${INDIGO})` },
                    { lbl: <><FaFileAlt size={11} /> PKS</>, val: `${pksCount} dok (${pksPercent}%)`, pct: pksPercent, grad: `linear-gradient(90deg,${GOLD_ACCENT},#2C5580)` },
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
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(30,58,95,0.55)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 7 }}>{blk.head}</div>
                    {blk.items.map((it, ii) => (
                      <div key={ii} style={{ marginBottom: ii === 0 ? 16 : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 7 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#3a3f4d' }}>{it.lbl}</span>
                          <span style={{ color: 'rgba(30,58,95,0.55)', fontWeight: 500 }}>{it.val}</span>
                        </div>
                        <div style={{ height: 9, borderRadius: 100, background: 'rgba(30,58,95,0.07)', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(30,58,95,0.06)' }}>
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
                  <a href="/dashboard/dokumen" style={{ fontSize: 12, color: INDIGO, textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 100, border: `1.5px solid rgba(30,58,95,0.2)` }}>
                    Lihat semua <FiEye size={12} strokeWidth={1.8} />
                  </a>
                </div>
                {dokumenTerbaru.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Jenis', 'Judul', 'Mitra', 'Berakhir', 'Status', ''].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: 'rgba(30,58,95,0.45)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(30,58,95,0.08)' }}>{h}</th>
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
                              <td style={{ ...td, color: 'rgba(30,58,95,0.6)' }}>{d.namaMitra}</td>
                              <td style={{ ...td, color: 'rgba(30,58,95,0.6)' }}>
                                {d.tglBerakhir
                                  ? d.tglBerakhir
                                  : <span style={{ color: '#A32D2D', fontWeight: 700, fontSize: 10.5 }}>Masa Berlaku &amp; Berakhir Belum Ditentukan</span>
                                }
                              </td>
                              <td style={td}><span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: si.bg, color: si.c }}>{si.label}</span></td>
                              <td style={td}><EditPencilIndicator manualLog={d.manualLog} size={26} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(30,58,95,0.35)' }}>
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

const shell: React.CSSProperties = { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(30,58,95,0.07)', borderRadius: 24, padding: 7, boxShadow: '0 1px 2px rgba(30,58,95,0.04), 0 30px 60px -38px rgba(30,58,95,0.18)' };

const hukumStatCard: React.CSSProperties = { background: 'rgba(30,58,95,0.03)', border: '1px solid rgba(30,58,95,0.07)', borderRadius: 16, padding: '14px 16px' };
const hukumStatVal: React.CSSProperties = { fontSize: 24, fontWeight: 800, color: '#1E3A5F', letterSpacing: '-0.02em', lineHeight: 1 };
const hukumStatLbl: React.CSSProperties = { fontSize: 10.5, color: 'rgba(30,58,95,0.55)', fontWeight: 600, marginTop: 4 };
const core: React.CSSProperties = { background: '#fff', borderRadius: 18, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)' };
const shellSm: React.CSSProperties = { ...shell, borderRadius: 20, padding: 6 };
const coreSm: React.CSSProperties = { ...core, borderRadius: 15 };
const td: React.CSSProperties = { padding: '12px', borderBottom: '1px solid rgba(30,58,95,0.05)' };