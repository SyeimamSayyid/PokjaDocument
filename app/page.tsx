'use client';

import { useState, useEffect } from 'react'; 
import { useRouter } from 'next/navigation';
import { 
  FiHome, FiBookOpen, FiSearch, FiFileText, FiShield, 
  FiKey, FiCloud, FiClock, FiEye, FiLock,
  FiGrid, FiCalendar, FiUsers, FiTrendingUp, 
  FiArrowRight, FiInfo, FiBook, FiLogIn,
  FiActivity, FiAlertCircle, FiChevronDown, FiChevronUp,
  FiStar
} from 'react-icons/fi';
import { FaBuilding, FaGoogleDrive, FaHandshake, FaUserCog, FaUserShield } from 'react-icons/fa';
import { SiGoogledocs } from 'react-icons/si';

// Typing animation component
const TypingText = ({ 
  text, 
  delay = 100, 
  className = '',
  onComplete 
}: { 
  text: string; 
  delay?: number; 
  className?: string;
  onComplete?: () => void;
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, delay, onComplete, isComplete]);

  return (
    <span className={className}>
      {displayText}
      {!isComplete && (
        <span className="typing-cursor">|</span>
      )}
    </span>
  );
};

export default function HomePage() {
  const router = useRouter();
  const [activePage, setActivePage] = useState('beranda');
  const [activeGuideTab, setActiveGuideTab] = useState('informasi');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [typingComplete, setTypingComplete] = useState(false);

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const faqs = [
    { 
      q: 'Bagaimana cara mengajukan kerja sama?', 
      a: 'Kunjungi halaman Form Pengajuan Kerja Sama di menu utama atau melalui link yang tersedia.' 
    },
    { 
      q: 'Berapa lama proses pengajuan kerja sama?', 
      a: 'Proses pengajuan membutuhkan waktu 3-5 hari kerja setelah dokumen lengkap diterima.' 
    },
    { 
      q: 'Apa saja jenis kerja sama yang tersedia?', 
      a: 'Terdapat dua jenis kerja sama yaitu MOU (Memorandum of Understanding) dan PKS (Perjanjian Kerja Sama).' 
    },
    { 
      q: 'Bagaimana cara melacak status pengajuan?', 
      a: 'Gunakan Kode Tracking yang dikirimkan melalui email untuk melacak status pengajuan di halaman Cek Status Pengajuan.' 
    },
    { 
      q: 'Apa yang harus dilakukan jika pengajuan ditolak?', 
      a: 'Anda akan menerima catatan perbaikan dari Pokja. Silakan perbaiki dan ajukan ulang.' 
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const guideSections = {
    informasi: {
      title: 'Informasi Umum',
      icon: <FiInfo size={20} />,
      description: 'Panduan dasar penggunaan sistem SI-POKJA HUMKER',
      steps: [
        {
          title: 'Apa itu SI-POKJA HUMKER?',
          desc: 'Sistem Informasi Pokja Hukum dan Kerja Sama adalah platform digital untuk mengelola dokumen hukum dan kerja sama antar institusi.',
          tip: 'Semua dokumen tersimpan aman di Google Cloud'
        },
        {
          title: 'Tujuan Sistem',
          desc: 'Memudahkan proses pengajuan, monitoring, dan dokumentasi kerja sama secara digital dan terstruktur.',
          tip: 'Mendukung program P4GN'
        },
        {
          title: 'Manfaat Penggunaan',
          desc: 'Proses cepat, transparan, terintegrasi dengan Google Workspace, dan dapat diakses kapan saja.',
          tip: '100% paperless'
        }
      ]
    },
    mitra: {
      title: 'Mitra Kerja Sama',
      icon: <FaHandshake size={20} />,
      description: 'Panduan untuk mitra kerja sama dalam mengajukan dan mengakses dokumen',
      steps: [
        {
          title: 'Mengajukan Kerja Sama',
          desc: 'Kunjungi halaman "Ajukan Kerja Sama", isi form dengan lengkap, dan kirim pengajuan.',
          tip: 'Pastikan data institusi dan kontak terisi dengan benar'
        },
        {
          title: 'Mendapatkan Kode Tracking',
          desc: 'Setelah pengajuan dikirim, Anda akan menerima kode tracking melalui email.',
          tip: 'Simpan kode tracking untuk cek status'
        },
        {
          title: 'Cek Status Pengajuan',
          desc: 'Gunakan kode tracking untuk memantau status pengajuan di halaman "Status Pengajuan".',
          tip: 'Status akan terupdate secara real-time'
        },
        {
          title: 'Akses Dokumen',
          desc: 'Setelah pengajuan disetujui, Anda dapat mengakses dokumen melalui dashboard mitra.',
          tip: 'Dokumen tersimpan di Google Drive'
        }
      ]
    },
    admin: {
      title: 'Admin',
      icon: <FaUserCog size={20} />,
      description: 'Panduan untuk admin dalam mengelola data dan pengajuan',
      steps: [
        {
          title: 'Kelola Pengajuan',
          desc: 'Akses halaman "Kelola Pengajuan" untuk melihat, meninjau, dan memproses pengajuan dari mitra.',
          tip: 'Pengajuan menunggu akan muncul di dashboard'
        },
        {
          title: 'Update Status Pengajuan',
          desc: 'Admin dapat mengubah status pengajuan (Ditinjau, Disetujui, Ditolak) dengan memberikan catatan.',
          tip: 'Catatan penting untuk mitra'
        },
        {
          title: 'Monitoring Dokumen',
          desc: 'Pantau status dokumen MOU/PKS dan masa berlakunya melalui halaman "Daftar Dokumen".',
          tip: 'Dokumen akan expired setelah 5 tahun'
        },
        {
          title: 'Generate Kode Dokumen',
          desc: 'Setelah pengajuan disetujui, admin dapat generate kode akses dokumen untuk mitra.',
          tip: 'Kode akses dikirim otomatis'
        }
      ]
    },
    adminPokja: {
      title: 'Admin Pokja',
      icon: <FaUserShield size={20} />,
      description: 'Panduan untuk Admin Pokja dengan akses penuh ke seluruh sistem',
      steps: [
        {
          title: 'Akses Superadmin',
          desc: 'Admin Pokja memiliki akses penuh ke semua fitur termasuk dashboard superadmin.',
          tip: 'Akses penuh ke seluruh sistem'
        },
        {
          title: 'Kelola Dokumen MOU/PKS',
          desc: 'Buat, edit, dan hapus dokumen kerja sama langsung di Google Docs dan Drive.',
          tip: 'Dokumen terintegrasi dengan Google Workspace'
        },
        {
          title: 'Monitoring & Evaluasi',
          desc: 'Pantau seluruh dokumen, masa berlaku, dan aktivitas mitra secara real-time.',
          tip: 'Dashboard lengkap dengan statistik'
        },
        {
          title: 'Laporan & Arsip',
          desc: 'Akses laporan bulanan/tahunan dan arsip dokumen yang sudah berakhir.',
          tip: 'Laporan dapat diekspor'
        }
      ]
    }
  };

  const guideTabs = [
    { key: 'informasi', label: 'Informasi', icon: <FiInfo size={14} /> },
    { key: 'mitra', label: 'Mitra', icon: <FaHandshake size={14} /> },
    { key: 'admin', label: 'Admin', icon: <FaUserCog size={14} /> },
    { key: 'adminPokja', label: 'Admin Pokja', icon: <FaUserShield size={14} /> }
  ];

  return (
    <div className="app-container">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --bg-primary: #F5F5F5;
          --bg-warm: #FFF7D1;
          --blue-dark: #0A2463;
          --blue-primary: #1E3A8A;
          --blue-medium: #2563EB;
          --blue-light: #3B82F6;
          --blue-soft: #DBEAFE;
          --blue-pale: #EFF6FF;
          --green-success: #10B981;
          --orange-warning: #F59E0B;
          --red-danger: #EF4444;
          --text-primary: #0A2463;
          --text-secondary: #4B5563;
          --text-tertiary: #6B7280;
          --border: #E5E7EB;
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        body {
          font-family: 'Sora', sans-serif;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-warm) 100%);
          color: var(--text-primary);
          min-height: 100vh;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.8); }
          50% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .typing-cursor {
          display: inline-block;
          animation: blink 0.8s infinite;
          color: var(--blue-primary);
          font-weight: 300;
        }

        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: rgba(245, 245, 245, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Lora', serif;
          font-size: 16px;
          font-weight: 600;
          color: var(--blue-primary);
        }

        .nav-dot {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--blue-primary), var(--blue-medium));
          display: flex;
          align-items: center;
          justify-content: center;
          animation: float 3s ease-in-out infinite;
          color: #fff;
          font-size: 18px;
        }

        .ps-bar {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 0.75rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          background: rgba(255, 255, 255, 0.5);
          flex-wrap: wrap;
        }

        .ps-btn {
          font-size: 13px;
          padding: 8px 20px;
          border-radius: 100px;
          border: 1px solid var(--border);
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          font-weight: 500;
          background: transparent;
          color: var(--text-secondary);
          transition: var(--transition);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ps-btn:hover { background: var(--blue-soft); border-color: var(--blue-primary); }
        .ps-btn.on { background: linear-gradient(135deg, var(--blue-primary), var(--blue-medium)); color: #fff; border-color: transparent; }

        .pg { display: none; animation: fadeInUp 0.5s ease-out; }
        .pg.on { display: block; }

        .page-container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }

        /* Hero Section */
        .hero { 
          padding: 4rem 2rem 3rem;
          text-align: center; 
          position: relative; 
          overflow: hidden;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(37, 99, 235, 0.08) 100%);
          border-radius: var(--radius-lg);
          margin: 1rem 0;
          border: 1px solid rgba(30, 58, 138, 0.05);
        }

        .hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.03) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .hero::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(30, 58, 138, 0.03) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 1;
        }
        
        .hero-chip { 
          display: inline-flex; 
          align-items: center; 
          gap: 8px; 
          background: linear-gradient(135deg, var(--blue-soft), var(--blue-pale));
          border: 1px solid rgba(30, 58, 138, 0.15); 
          border-radius: 100px; 
          padding: 6px 18px; 
          font-size: 12px; 
          font-weight: 500; 
          color: var(--blue-primary); 
          margin-bottom: 1.5rem; 
          animation: fadeInUp 0.6s ease-out;
          box-shadow: 0 2px 8px rgba(30, 58, 138, 0.05);
        }
        
        .hero h1 { 
          font-family: 'Lora', serif; 
          font-size: clamp(32px, 5vw, 52px); 
          font-weight: 600; 
          line-height: 1.15; 
          margin-bottom: 1rem; 
          animation: fadeInUp 0.6s ease-out 0.1s both;
          color: var(--blue-dark);
        }
        
        .hero h1 .highlight { 
          color: var(--blue-primary);
          position: relative;
        }
        
        .hero h1 .highlight::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, var(--blue-primary), var(--blue-light));
          border-radius: 2px;
        }

        .hero h1 .sub-highlight {
          color: var(--blue-medium);
          font-weight: 700;
          position: relative;
        }

        .hero h1 .sub-highlight::before {
          content: '✨';
          position: absolute;
          top: -10px;
          right: -25px;
          font-size: 16px;
          animation: float 3s ease-in-out infinite;
        }
        
        .hero p { 
          font-size: 16px; 
          color: var(--text-secondary); 
          max-width: 560px; 
          margin: 0 auto 2rem; 
          line-height: 1.8; 
          animation: fadeInUp 0.6s ease-out 0.2s both; 
        }

        .hero p .highlight-text {
          color: var(--blue-primary);
          font-weight: 600;
        }
        
        .hero-btns { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 12px; 
          flex-wrap: wrap; 
          margin-bottom: 2.5rem; 
          animation: fadeInUp 0.6s ease-out 0.3s both; 
        }
        
        .btn-main, .btn-ghost { 
          padding: 14px 28px; 
          font-size: 14px; 
          font-weight: 500; 
          border-radius: 100px; 
          cursor: pointer; 
          transition: var(--transition); 
          display: inline-flex; 
          align-items: center; 
          gap: 8px; 
          font-family: 'Sora', sans-serif;
        }
        
        .btn-main { 
          background: linear-gradient(135deg, var(--blue-primary), var(--blue-medium)); 
          color: #fff; 
          border: none; 
          box-shadow: 0 4px 16px rgba(30, 58, 138, 0.25);
        }
        
        .btn-main:hover { 
          transform: translateY(-3px); 
          box-shadow: 0 8px 24px rgba(30, 58, 138, 0.35); 
        }
        
        .btn-ghost { 
          background: rgba(255, 255, 255, 0.8);
          color: var(--text-primary); 
          border: 1px solid var(--border); 
          backdrop-filter: blur(10px);
        }
        
        .btn-ghost:hover { 
          background: #fff; 
          border-color: var(--blue-primary); 
          transform: translateY(-3px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
        }
        
        .trust-row { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 28px; 
          flex-wrap: wrap; 
          animation: fadeInUp 0.6s ease-out 0.4s both; 
        }
        
        .trust-item { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-size: 13px; 
          color: var(--text-tertiary); 
          background: rgba(255, 255, 255, 0.5);
          padding: 6px 14px;
          border-radius: 100px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 0, 0, 0.03);
        }
        
        .trust-item .icon { 
          color: var(--blue-primary); 
        }

        /* Statistics Section */
        .stats-section {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin: 2rem 0;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          text-align: center;
          border: 1px solid rgba(0, 0, 0, 0.04);
          transition: var(--transition);
          cursor: default;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: var(--blue-soft);
        }

        .stat-number {
          font-family: 'Lora', serif;
          font-size: 32px;
          font-weight: 700;
          color: var(--blue-primary);
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .stat-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--blue-soft);
          color: var(--blue-primary);
          margin-bottom: 8px;
          font-size: 18px;
        }

        /* Features Grid */
        .features-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); 
          gap: 20px; 
          margin: 2rem 0; 
        }
        
        .feature-card { 
          background: rgba(255, 255, 255, 0.7); 
          backdrop-filter: blur(10px); 
          border: 1px solid rgba(0, 0, 0, 0.04); 
          border-radius: var(--radius-lg); 
          padding: 1.75rem 1.5rem; 
          transition: var(--transition); 
          cursor: pointer; 
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--blue-primary), var(--blue-light));
          opacity: 0;
          transition: var(--transition);
        }
        
        .feature-card:hover { 
          transform: translateY(-6px); 
          box-shadow: var(--shadow-lg);
          border-color: var(--blue-soft);
        }

        .feature-card:hover::before {
          opacity: 1;
        }
        
        .feature-icon { 
          width: 60px; 
          height: 60px; 
          border-radius: 14px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          margin: 0 auto 1rem; 
          background: linear-gradient(135deg, var(--blue-soft), var(--blue-pale));
          color: var(--blue-primary); 
          font-size: 26px;
        }
        
        .feature-title { 
          font-size: 16px; 
          font-weight: 600; 
          margin-bottom: 6px; 
          color: var(--text-primary);
        }
        
        .feature-desc { 
          font-size: 13px; 
          color: var(--text-secondary); 
          line-height: 1.6; 
        }

        .feature-badge {
          display: inline-block;
          margin-top: 10px;
          padding: 4px 12px;
          border-radius: 100px;
          background: var(--blue-soft);
          color: var(--blue-primary);
          font-size: 10px;
          font-weight: 600;
        }

        /* Testimonial / Narasi Section */
        .narasi-section {
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.03), rgba(37, 99, 235, 0.05));
          border-radius: var(--radius-lg);
          padding: 3rem 2rem;
          margin: 2rem 0;
          border: 1px solid rgba(30, 58, 138, 0.05);
          text-align: center;
        }

        .narasi-title {
          font-family: 'Lora', serif;
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .narasi-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }

        .narasi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .narasi-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          text-align: left;
          border: 1px solid rgba(0, 0, 0, 0.04);
          transition: var(--transition);
        }

        .narasi-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .narasi-card .quote-icon {
          color: var(--blue-primary);
          opacity: 0.3;
          font-size: 24px;
          margin-bottom: 8px;
        }

        .narasi-card .narasi-text {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.7;
          font-style: italic;
        }

        .narasi-card .narasi-author {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }

        .narasi-card .author-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--blue-soft), var(--blue-pale));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          color: var(--blue-primary);
        }

        .narasi-card .author-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .narasi-card .author-role {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        /* Integration Grid */
        .int-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
          gap: 20px; 
          margin: 2rem 0; 
        }
        
        .int-card { 
          background: rgba(255, 255, 255, 0.7); 
          backdrop-filter: blur(10px); 
          border: 1px solid rgba(0, 0, 0, 0.04); 
          border-radius: var(--radius-lg); 
          padding: 1.5rem; 
          text-align: center; 
          transition: var(--transition); 
          cursor: pointer; 
        }
        
        .int-card:hover { 
          transform: translateY(-6px); 
          box-shadow: var(--shadow-lg); 
        }
        
        .int-icon { 
          width: 60px; 
          height: 60px; 
          border-radius: 16px; 
          margin: 0 auto 1rem; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: linear-gradient(135deg, var(--blue-soft), var(--blue-pale));
          color: var(--blue-primary); 
          font-size: 28px;
        }
        
        .int-name { 
          font-size: 15px; 
          font-weight: 600; 
          margin-bottom: 4px; 
        }
        
        .int-desc { 
          font-size: 12px; 
          color: var(--text-tertiary); 
        }

        /* Guide Styles - Revamped */
        .guide-hero { 
          padding: 2rem; 
          text-align: center; 
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.03) 0%, rgba(37, 99, 235, 0.05) 100%);
          border-radius: var(--radius-lg);
          margin: 1rem 0 2rem;
        }

        .guide-tabs-wrapper {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-lg);
          padding: 0.5rem;
          margin-bottom: 2rem;
          border: 1px solid var(--border);
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .guide-tab {
          font-size: 13px;
          padding: 10px 20px;
          border-radius: var(--radius-sm);
          border: none;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          font-weight: 500;
          background: transparent;
          color: var(--text-secondary);
          transition: var(--transition);
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          justify-content: center;
          min-width: 100px;
        }

        .guide-tab:hover {
          background: var(--blue-soft);
          color: var(--blue-primary);
        }

        .guide-tab.active {
          background: linear-gradient(135deg, var(--blue-primary), var(--blue-medium));
          color: #fff;
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.2);
        }

        .guide-tab .tab-icon {
          font-size: 16px;
        }

        .guide-content {
          animation: fadeInUp 0.4s ease-out;
        }

        .guide-section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--border);
        }

        .guide-section-header .section-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--blue-soft);
          color: var(--blue-primary);
          font-size: 24px;
        }

        .guide-section-header .section-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .guide-section-header .section-desc {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .step-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin: 1.5rem 0;
        }

        .step-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          transition: var(--transition);
          position: relative;
          overflow: hidden;
        }

        .step-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--blue-primary), var(--blue-light));
          opacity: 0;
          transition: var(--transition);
        }

        .step-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .step-card:hover::before {
          opacity: 1;
        }

        .step-card .step-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--blue-soft);
          color: var(--blue-primary);
          font-weight: 600;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .step-card .step-title {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--text-primary);
        }

        .step-card .step-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .step-card .step-tip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 4px 12px;
          background: var(--blue-pale);
          border-radius: 100px;
          font-size: 11px;
          color: var(--blue-primary);
          font-weight: 500;
        }

        .step-card .step-tip .tip-icon {
          font-size: 12px;
        }

        .faq-list { 
          display: flex; 
          flex-direction: column; 
          gap: 12px; 
          margin: 2rem 0; 
        }
        
        .faq-item { 
          border: 1px solid var(--border); 
          border-radius: var(--radius-md); 
          overflow: hidden;
          background: rgba(255, 255, 255, 0.5);
          transition: var(--transition);
        }
        
        .faq-item:hover { background: rgba(255, 255, 255, 0.8); }
        
        .faq-q { 
          padding: 1rem; 
          font-weight: 500; 
          cursor: pointer; 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          background: rgba(255, 255, 255, 0.7);
          transition: var(--transition);
          gap: 12px;
        }
        
        .faq-q:hover { background: var(--blue-soft); }
        
        .faq-q .faq-text { display: flex; align-items: center; gap: 8px; }
        
        .faq-a { 
          padding: 0 1rem; 
          max-height: 0; 
          overflow: hidden; 
          transition: max-height 0.3s ease;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        
        .faq-a.open { 
          padding: 0 1rem 1rem 1rem; 
          max-height: 200px; 
        }

        /* CTA Section */
        .cta-section {
          background: linear-gradient(135deg, var(--blue-primary), var(--blue-medium));
          border-radius: var(--radius-lg);
          padding: 3rem 2rem;
          margin: 2rem 0;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-section::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
          border-radius: 50%;
        }

        .cta-section .cta-content {
          position: relative;
          z-index: 1;
        }

        .cta-section .cta-title {
          font-family: 'Lora', serif;
          font-size: 28px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .cta-section .cta-desc {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.8);
          max-width: 500px;
          margin: 0 auto 1.5rem;
          line-height: 1.7;
        }

        .cta-section .cta-btn {
          padding: 14px 32px;
          border-radius: 100px;
          border: none;
          background: #fff;
          color: var(--blue-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Sora', sans-serif;
        }

        .cta-section .cta-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        /* Role quick access badges */
        .role-badges {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          margin: 1.5rem 0;
        }

        .role-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 100px;
          border: 2px solid var(--border);
          background: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: var(--transition);
          font-size: 13px;
          font-weight: 500;
          font-family: 'Sora', sans-serif;
          color: var(--text-secondary);
        }

        .role-badge:hover {
          border-color: var(--blue-primary);
          background: var(--blue-soft);
          transform: translateY(-2px);
        }

        .role-badge.active {
          border-color: var(--blue-primary);
          background: var(--blue-primary);
          color: #fff;
        }

        .footer { 
          padding: 2rem; 
          text-align: center; 
          border-top: 1px solid var(--border); 
          margin-top: 2rem; 
          background: rgba(255, 255, 255, 0.3);
        }
        
        .footer-brand { 
          font-family: 'Lora', serif; 
          font-weight: 600; 
          font-size: 16px; 
          color: var(--blue-primary);
          margin-bottom: 4px;
        }
        
        .footer-copy { 
          font-size: 12px; 
          color: var(--text-tertiary); 
        }

        @media (max-width: 768px) {
          .page-container { padding: 0 1rem; }
          .hero { padding: 2rem 1rem; }
          .hero h1 { font-size: 28px; }
          .nav { padding: 0.75rem 1rem; }
          .ps-btn { font-size: 11px; padding: 6px 14px; }
          .features-grid { grid-template-columns: 1fr; }
          .stats-section { grid-template-columns: repeat(2, 1fr); }
          .guide-tabs-wrapper { flex-direction: column; }
          .guide-tab { min-width: auto; }
          .step-grid { grid-template-columns: 1fr; }
          .role-badges { gap: 8px; }
          .role-badge { font-size: 11px; padding: 6px 12px; }
          .narasi-grid { grid-template-columns: 1fr; }
          .cta-section .cta-title { font-size: 22px; }
        }
      `}</style>

      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-dot">
            <FiFileText size={18} color="#fff" />
          </div>
          SI-POKJA HUMKER
        </div>
      </nav>

      <div className="ps-bar">
        <button 
          className={`ps-btn ${activePage === 'beranda' ? 'on' : ''}`} 
          onClick={() => setActivePage('beranda')}
        >
          <FiHome size={14} /> Beranda
        </button>
        <button 
          className={`ps-btn ${activePage === 'panduan' ? 'on' : ''}`} 
          onClick={() => setActivePage('panduan')}
        >
          <FiBookOpen size={14} /> Panduan
        </button>
        <button 
          className="ps-btn" 
          onClick={() => router.push('/beranda')}
        >
          <FiActivity size={14} /> Kegiatan
        </button>
        <button 
          className="ps-btn" 
          onClick={() => navigateTo('/cek-pengajuan')}
        >
          <FiSearch size={14} /> Status Pengajuan
        </button>
      </div>

      <div className="page-container">
        {/* ========== BERANDA ========== */}
        <div className={`pg ${activePage === 'beranda' ? 'on' : ''}`}>
          {/* Hero Section */}
          <div className="hero">
            <div className="hero-content">
              <div className="hero-chip">
                <FiShield size={14} /> Manajemen Perjanjian Digital
              </div>
              <h1>
                Kelola Data Hukum &<br />
                Kerja Sama dengan{' '}
                <span className="highlight">
                  <TypingText 
                    text="Aman"
                    delay={80}
                    onComplete={() => setTypingComplete(true)}
                  />
                </span>
                <br />
                <span className="sub-highlight">Pokja</span>
              </h1>
              <p>
                Sistem terintegrasi untuk mengelola MOU, PKS, dan dokumen kerja sama antar institusi. 
                <br />
                <span className="highlight-text">Aman, terstruktur, dan terpercaya</span> untuk mendukung program P4GN.
              </p>
              <div className="hero-btns">
                <button className="btn-main" onClick={() => setActivePage('panduan')}>
                  <FiBook size={16} /> Lihat Panduan
                </button>
                <button className="btn-ghost" onClick={() => navigateTo('/pengajuan')}>
                  <FiFileText size={16} /> Ajukan Kerja Sama
                </button>
                <button className="btn-ghost" onClick={() => navigateTo('/login')}>
                  <FiLogIn size={16} /> Masuk ke Sistem
                </button>
              </div>
              <div className="trust-row">
                <div className="trust-item">
                  <FiShield className="icon" size={14} /> Akses terenkripsi
                </div>
                <div className="trust-item">
                  <FiKey className="icon" size={14} /> Verifikasi kode tracking
                </div>
                <div className="trust-item">
                  <FiCloud className="icon" size={14} /> Tersimpan di Google Cloud
                </div>
                <div className="trust-item">
                  <FiClock className="icon" size={14} /> Log aktivitas lengkap
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-icon"><FiUsers size={20} /></div>
              <div className="stat-number">0</div>
              <div className="stat-label">Total Mitra Kerja Sama</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><FaHandshake size={20} /></div>
              <div className="stat-number">0</div>
              <div className="stat-label">Total Kerja Sama</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><FiFileText size={20} /></div>
              <div className="stat-number">0</div>
              <div className="stat-label">Dokumen Terkelola</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><FiStar size={20} /></div>
              <div className="stat-number">0%</div>
              <div className="stat-label">Tingkat Kepuasan</div>
            </div>
          </div>

          {/* Narasi / Testimonial Section */}
          <div className="narasi-section">
            <div className="narasi-title">🌟 Mengapa SI-POKJA HUMKER?</div>
            <div className="narasi-subtitle">Platform digital yang memudahkan pengelolaan kerja sama antar institusi</div>
            
            <div className="narasi-grid">
              <div className="narasi-card">
                <div className="quote-icon">"</div>
                <div className="narasi-text">
                  Sistem ini sangat membantu kami dalam mengelola dokumen kerja sama. Proses pengajuan menjadi lebih cepat dan transparan.
                </div>
                <div className="narasi-author">
                  <div className="author-avatar">A</div>
                  <div>
                    <div className="author-name">Andi Saputra</div>
                    <div className="author-role">Kepala Pokja Hukum</div>
                  </div>
                </div>
              </div>

              <div className="narasi-card">
                <div className="quote-icon">"</div>
                <div className="narasi-text">
                  Dengan SI-POKJA HUMKER, kami bisa memantau masa berlaku MOU/PKS secara real-time. Tidak ada lagi dokumen yang terlewat.
                </div>
                <div className="narasi-author">
                  <div className="author-avatar">S</div>
                  <div>
                    <div className="author-name">Siti Rahayu</div>
                    <div className="author-role">Admin Kerja Sama</div>
                  </div>
                </div>
              </div>

              <div className="narasi-card">
                <div className="quote-icon">"</div>
                <div className="narasi-text">
                  Sebagai mitra, saya sangat terbantu dengan kemudahan mengajukan dan mengecek status kerja sama. Kode tracking sangat berguna.
                </div>
                <div className="narasi-author">
                  <div className="author-avatar">B</div>
                  <div>
                    <div className="author-name">Budi Santoso</div>
                    <div className="author-role">Mitra Kerja Sama</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ 
              fontFamily: 'Lora, serif', 
              fontSize: '24px', 
              fontWeight: 600, 
              textAlign: 'center',
              marginBottom: '1.5rem',
              color: 'var(--text-primary)'
            }}>
              🚀 Fitur Unggulan
            </h2>
            <div className="features-grid">
              <div className="feature-card" onClick={() => navigateTo('/pengajuan')}>
                <div className="feature-icon"><FiFileText size={26} /></div>
                <div className="feature-title">Pengajuan Kerja Sama</div>
                <div className="feature-desc">Ajukan MOU atau PKS secara online dengan mudah dan cepat.</div>
                <span className="feature-badge">Online 24/7</span>
              </div>
              <div className="feature-card" onClick={() => navigateTo('/cek-pengajuan')}>
                <div className="feature-icon"><FiEye size={26} /></div>
                <div className="feature-title">Cek Status Real-time</div>
                <div className="feature-desc">Pantau status pengajuan Anda dengan kode tracking yang dikirimkan.</div>
                <span className="feature-badge">Update Langsung</span>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><FiLock size={26} /></div>
                <div className="feature-title">Akses Terkontrol</div>
                <div className="feature-desc">Dokumen hanya dapat diakses oleh pihak yang berwenang dengan verifikasi.</div>
                <span className="feature-badge">Aman & Terpercaya</span>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><FiClock size={26} /></div>
                <div className="feature-title">Monitoring Masa Berlaku</div>
                <div className="feature-desc">Pantau masa berlaku MOU/PKS dengan notifikasi otomatis.</div>
                <span className="feature-badge">Notifikasi Aktif</span>
              </div>
            </div>
          </div>

          {/* Integration Grid */}
          <div style={{ marginTop: '1rem' }}>
            <h2 style={{ 
              fontFamily: 'Lora, serif', 
              fontSize: '24px', 
              fontWeight: 600, 
              textAlign: 'center',
              marginBottom: '1.5rem',
              color: 'var(--text-primary)'
            }}>
              🔗 Terintegrasi dengan
            </h2>
            <div className="int-grid">
              <div className="int-card">
                <div className="int-icon"><SiGoogledocs size={28} /></div>
                <div className="int-name">Google Docs</div>
                <div className="int-desc">Template dokumen otomatis</div>
              </div>
              <div className="int-card">
                <div className="int-icon"><FiGrid size={28} /></div>
                <div className="int-name">Google Sheets</div>
                <div className="int-desc">Database & log akses</div>
              </div>
              <div className="int-card">
                <div className="int-icon"><FaGoogleDrive size={28} /></div>
                <div className="int-name">Google Drive</div>
                <div className="int-desc">Arsip folder otomatis</div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="cta-section">
            <div className="cta-content">
              <div className="cta-title">Siap Mengelola Kerja Sama?</div>
              <div className="cta-desc">
                Bergabunglah dengan SI-POKJA HUMKER dan rasakan kemudahan mengelola dokumen hukum dan kerja sama secara digital.
              </div>
              <button className="cta-btn" onClick={() => navigateTo('/pengajuan')}>
                Ajukan Kerja Sama Sekarang <FiArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ========== PANDUAN ========== */}
        <div className={`pg ${activePage === 'panduan' ? 'on' : ''}`}>
          <div className="guide-hero">
            <div className="hero-chip"><FiBookOpen size={14} /> Panduan Lengkap</div>
            <h1>Cara menggunakan SI-POKJA HUMKER</h1>
            <p>Panduan lengkap untuk semua pengguna sistem manajemen kerja sama.</p>
          </div>

          {/* Role Quick Access Badges */}
          <div className="role-badges">
            {guideTabs.map(tab => (
              <button
                key={tab.key}
                className={`role-badge ${activeGuideTab === tab.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveGuideTab(tab.key);
                }}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Guide Tabs */}
          <div className="guide-tabs-wrapper">
            {guideTabs.map(tab => (
              <button
                key={tab.key}
                className={`guide-tab ${activeGuideTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveGuideTab(tab.key)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Guide Content */}
          <div className="guide-content">
            {Object.entries(guideSections).map(([key, section]) => (
              activeGuideTab === key && (
                <div key={key}>
                  <div className="guide-section-header">
                    <div className="section-icon">
                      {section.icon}
                    </div>
                    <div>
                      <div className="section-title">{section.title}</div>
                      <div className="section-desc">{section.description}</div>
                    </div>
                  </div>

                  <div className="step-grid">
                    {section.steps.map((step, index) => (
                      <div key={index} className="step-card">
                        <div className="step-number">{String(index + 1).padStart(2, '0')}</div>
                        <div className="step-title">{step.title}</div>
                        <div className="step-desc">{step.desc}</div>
                        {step.tip && (
                          <div className="step-tip">
                            <FiInfo className="tip-icon" size={12} />
                            {step.tip}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

          {/* FAQ Section */}
          <div style={{ marginTop: '3rem' }}>
            <div className="guide-section-header">
              <div className="section-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
                <FiAlertCircle size={24} />
              </div>
              <div>
                <div className="section-title">Frequently Asked Questions</div>
                <div className="section-desc">Pertanyaan yang sering diajukan seputar sistem</div>
              </div>
            </div>

            <div className="faq-list">
              {faqs.map((faq, idx) => (
                <div key={idx} className="faq-item">
                  <div className="faq-q" onClick={() => toggleFaq(idx)}>
                    <span className="faq-text">
                      <FiInfo size={16} style={{ color: 'var(--blue-primary)' }} />
                      {faq.q}
                    </span>
                    {openFaq === idx ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                  </div>
                  <div className={`faq-a ${openFaq === idx ? 'open' : ''}`}>
                    {faq.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        <div className="footer-brand">SI-POKJA HUMKER</div>
        <div className="footer-copy">Sistem Manajemen Data Hukum & Kerja Sama | BNN Provinsi Sulawesi Selatan</div>
      </div>
    </div>
  );
}