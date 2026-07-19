'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiInbox, FiKey, FiFolder, FiActivity,
  FiUsers, FiList as FiListSidebar, FiShield,
} from 'react-icons/fi';
import {
  FiFileText, FiHome, FiPenTool, FiEdit2, FiTrash2, FiZap,
  FiUpload, FiX, FiArchive, FiCalendar, FiSearch,
  FiFilter, FiPlus, FiCheckCircle, FiAlertCircle, FiUser,
  FiChevronDown, FiChevronRight, FiExternalLink, FiEye,
} from 'react-icons/fi';
import { FaBuilding } from 'react-icons/fa';

const MAKS_UKURAN = 10 * 1024 * 1024; // 10 MB

// Kompres PDF di browser: render tiap halaman jadi gambar JPEG kualitas sedang,
// susun ulang jadi PDF baru pakai pdf-lib. Trade-off: hasil jadi PDF berbasis
// gambar (teks tidak lagi bisa di-select/cari), tapi ukuran turun drastis.
// Wajib install dulu: npm install pdfjs-dist pdf-lib
async function kompresPdf(file: File, onProgress?: (pesan: string) => void): Promise<File> {
  const pdfjsLib = await import('pdfjs-dist');
  const { PDFDocument } = await import('pdf-lib');

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const newPdf = await PDFDocument.create();

  // Dua tahap kualitas — coba yang lebih halus dulu, turunkan lagi kalau masih kebesaran
  const presets = [
    { scale: 1.3, quality: 0.6 },
    { scale: 1.0, quality: 0.45 },
    { scale: 0.8, quality: 0.35 },
  ];

  for (const preset of presets) {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(`Mengompres halaman ${i} dari ${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: preset.scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const jpegDataUrl = canvas.toDataURL('image/jpeg', preset.quality);
      const jpegBytes = await fetch(jpegDataUrl).then(r => r.arrayBuffer());
      const jpegImage = await doc.embedJpg(jpegBytes);

      const newPage = doc.addPage([viewport.width, viewport.height]);
      newPage.drawImage(jpegImage, { x: 0, y: 0, width: viewport.width, height: viewport.height });
    }
    const bytes = await doc.save();
    const arrBuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    if (bytes.byteLength <= MAKS_UKURAN || preset === presets[presets.length - 1]) {
      return new File([arrBuf], file.name.replace(/\.pdf$/i, '') + '-kompres.pdf', { type: 'application/pdf' });
    }
  }
  // fallback (harusnya tidak pernah sampai sini)
  return file;
}

// Kompres gambar (JPG/PNG) — canvas re-encode ke JPEG kualitas tinggi (0.85).
// Nyaris tidak kelihatan bedanya secara visual, tapi ukuran bisa turun signifikan
// terutama dari PNG (lossless) ke JPEG (lossy terkontrol). PNG dgn transparansi
// akan kehilangan transparansinya — untuk hasil scan dokumen ini tidak masalah.
async function kompresGambar(file: File): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Gagal memuat gambar'));
    im.src = URL.createObjectURL(file);
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Gagal kompres gambar')), 'image/jpeg', 0.85);
  });
  return new File([blob], file.name.replace(/\.(png|jpe?g)$/i, '') + '-kompres.jpg', { type: 'image/jpeg' });
}

// Kompres Word (.docx) — docx itu sendiri adalah arsip ZIP berisi XML, jadi
// "kompresi" di sini murni re-zip dengan level kompresi maksimal (LOSSLESS,
// tidak ada konten yang berubah/hilang sama sekali, cuma dikemas ulang lebih padat).
// Wajib install dulu: npm install jszip
// Catatan: .doc lama (bukan .docx) TIDAK didukung, karena bukan format ZIP.
async function kompresWord(file: File): Promise<File> {
  if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    throw new Error('Kompresi cuma didukung untuk .docx, bukan format .doc lama.');
  }
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  const arrBuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new File([arrBuf], file.name, { type: file.type });
}

function bisaDikompres(mimeType: string): boolean {
  return mimeType === 'application/pdf'
    || mimeType.startsWith('image/')
    || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

function labelJenisFile(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'Gambar';
  if (mimeType.includes('word')) return 'Word';
  return 'File';
}

// Dispatcher — pilih fungsi kompres sesuai tipe file
async function kompresFile(file: File, onProgress?: (pesan: string) => void): Promise<File> {
  if (file.type === 'application/pdf') return kompresPdf(file, onProgress);
  if (file.type.startsWith('image/')) { onProgress?.('Mengompres gambar...'); return kompresGambar(file); }
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    onProgress?.('Mengompres dokumen Word...');
    return kompresWord(file);
  }
  throw new Error('Jenis file ini tidak didukung untuk kompresi otomatis.');
}

interface Arsip {
  id: string; namaInstitusi: string; jenis: string; judul: string;
  tglBerlaku: string; tglBerakhir: string; fileId: string; fileUrl: string; namaFile: string;
  namaPIC: string; emailPIC: string; waPIC: string; catatan: string;
  diarsipkanOleh: string; tglDiarsipkan: string; statusKerjaSama: string;
  sumber: 'manual' | 'sistem';
  ttdTipe?: string; ttdTglFinal?: string; divisi?: string[];
  komentarUtama?: string;
}

// Scan TTD Basah dan Snapshot (isi dokumen sebelum ditandatangani) itu 2 baris
// arsip TERPISAH di sheet, tapi buat 1 peristiwa TTD yang sama — digabung jadi
// SATU kartu di sini, dipasangkan lewat "(ID Dokumen: X)" yang tertulis di
// catatan kedua entri (lihat handleUploadScanTtdBasah & handleArsipkanSnapshotTtd
// di Kode.gs).
type ListEntry =
  | { tipe: 'normal'; item: Arsip }
  | { tipe: 'ttdBasah'; idDokumen: string; representative: Arsip; snapshot?: Arsip; scan?: Arsip };

function ekstrakIdDokumen(catatan: string): string | null {
  const m = catatan.match(/ID Dokumen:\s*([^)]+)\)/);
  return m ? m[1].trim() : null;
}

function kelompokkanArsip(list: Arsip[]): ListEntry[] {
  const hasil: ListEntry[] = [];
  const grupIndex = new Map<string, number>();

  list.forEach(a => {
    const isScan = a.diarsipkanOleh === 'Sistem (Auto-Arsip TTD Basah)';
    const isSnapshot = a.diarsipkanOleh === 'Sistem (Auto-Snapshot TTD)';
    if (!isScan && !isSnapshot) { hasil.push({ tipe: 'normal', item: a }); return; }

    const idDok = ekstrakIdDokumen(a.catatan);
    if (!idDok) { hasil.push({ tipe: 'normal', item: a }); return; }

    if (grupIndex.has(idDok)) {
      const idx = grupIndex.get(idDok)!;
      const grup = hasil[idx] as Extract<ListEntry, { tipe: 'ttdBasah' }>;
      if (isScan) grup.scan = a;
      if (isSnapshot) grup.snapshot = a;
    } else {
      grupIndex.set(idDok, hasil.length);
      hasil.push({
        tipe: 'ttdBasah', idDokumen: idDok, representative: a,
        snapshot: isSnapshot ? a : undefined,
        scan: isScan ? a : undefined,
      });
    }
  });

  return hasil;
}
const DIVISI_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pencegahan:    { label: 'Pencegahan',    color: '#1E3A8A', bg: '#DBEAFE' },
  pemberantasan: { label: 'Pemberantasan', color: '#A32D2D', bg: '#FEE2E2' },
  rehabilitasi:  { label: 'Rehabilitasi',  color: '#5B21B6', bg: '#EDE9FE' },
  pemberdayaan:  { label: 'Pemberdayaan',  color: '#92400E', bg: '#FEF3C7' },
};
const MAKS_DIVISI = 4;

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";

export default function ArsipDokumenPage() {
  const [role, setRole] = useState('');
  const [level, setLevel] = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [namaAdmin, setNamaAdmin] = useState('Admin Pokja');
  const [list, setList] = useState<Arsip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [cari, setCari] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterSumber, setFilterSumber] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [expandedTtd, setExpandedTtd] = useState<Set<string>>(new Set());
  const [statusDraft, setStatusDraft] = useState<'Masih Berlaku' | 'Sudah Berakhir'>('Sudah Berakhir');
  const [savingStatus, setSavingStatus] = useState(false);

  // form fields
  const [fNama, setFNama] = useState('');
  const [fJenis, setFJenis] = useState<'MOU' | 'PKS'>('MOU');
  const [fJudul, setFJudul] = useState('');
  const [fBerlaku, setFBerlaku] = useState('');
  const [fBerakhir, setFBerakhir] = useState('');
  const [fStatusKS, setFStatusKS] = useState<'Masih Berlaku' | 'Sudah Berakhir'>('Sudah Berakhir');
  const [fDivisi, setFDivisi] = useState<string[]>([]);
  const [fPIC, setFPIC] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fWa, setFWa] = useState('');
  const [fCatatan, setFCatatan] = useState('');
  const [fFile, setFFile] = useState<File | null>(null);
  const [fFileError, setFFileError] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [compressInfo, setCompressInfo] = useState('');
  const [showKompresSaran, setShowKompresSaran] = useState(false);
  const [showKompresCard, setShowKompresCard] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterJenis) qs.set('jenis', filterJenis);
    if (filterSumber) qs.set('sumber', filterSumber);
    if (cari.trim()) qs.set('cari', cari.trim());
    fetch(`/api/arsip-dokumen?${qs.toString()}`)
      .then(r => r.json())
      .then(d => setList(d.data || []))
      .catch(() => setError('Gagal memuat arsip.'))
      .finally(() => setLoading(false));
  }, [filterJenis, filterSumber, cari]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setRole(u.role);
        setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
        setNamaAdmin(u.nama || u.email || 'Admin Pokja');
      })
      .catch(() => { window.location.href = '/login'; });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFFileError(''); setCompressInfo(''); setShowKompresSaran(false); setShowKompresCard(false);
    if (!f) { setFFile(null); return; }
    const allowed = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', 'application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
    ];
    if (!allowed.includes(f.type)) { setFFileError('Format tidak didukung. Gunakan Word, PDF, atau gambar (JPG/PNG).'); setFFile(null); return; }

    if (f.size <= MAKS_UKURAN) {
      setFFile(f);
      // 5-10MB — tidak dipaksa, cuma ditawarkan tombol saran kompresi
      if (f.size > 5 * 1024 * 1024 && bisaDikompres(f.type)) setShowKompresSaran(true);
      return;
    }

    // Lebih dari 10MB — WAJIB dikompres kalau jenisnya didukung, kalau tidak (mis. .doc lama), tolak.
    if (!bisaDikompres(f.type)) {
      setFFileError(`File terlalu besar (${(f.size/1024/1024).toFixed(2)}MB). Maksimal 10MB.`);
      setFFile(null);
      return;
    }

    setCompressing(true);
    setCompressInfo(`Ukuran asli ${(f.size/1024/1024).toFixed(2)}MB, melebihi 10MB — mengompres otomatis...`);
    try {
      const compressed = await kompresFile(f, (pesan) => setCompressInfo(pesan));
      if (compressed.size > MAKS_UKURAN) {
        setFFileError(`Sudah dikompres tapi masih ${(compressed.size/1024/1024).toFixed(2)}MB (maksimal 10MB). Coba file yang lebih kecil.`);
        setFFile(null);
      } else {
        setFFile(compressed);
        setCompressInfo(`Berhasil dikompres: ${(f.size/1024/1024).toFixed(2)}MB → ${(compressed.size/1024/1024).toFixed(2)}MB.`);
      }
    } catch {
      setFFileError('Gagal mengompres file. Coba unggah file yang lebih kecil secara manual.');
      setFFile(null);
    } finally {
      setCompressing(false);
    }
  };

  const jalankanKompresManual = async () => {
    if (!fFile) return;
    setShowKompresCard(false); setShowKompresSaran(false);
    setCompressing(true); setCompressInfo('');
    try {
      const original = fFile;
      const compressed = await kompresFile(fFile, (pesan) => setCompressInfo(pesan));
      setFFile(compressed);
      setCompressInfo(`Berhasil dikompres: ${(original.size/1024/1024).toFixed(2)}MB → ${(compressed.size/1024/1024).toFixed(2)}MB.`);
    } catch {
      setFFileError('Gagal mengompres file.');
    } finally {
      setCompressing(false);
    }
  };

  const resetForm = () => {
    setFNama(''); setFJenis('MOU'); setFJudul(''); setFBerlaku(''); setFBerakhir('');
    setFStatusKS('Sudah Berakhir'); setFDivisi([]);
    setFPIC(''); setFEmail(''); setFWa(''); setFCatatan(''); setFFile(null); setFFileError('');
    setCompressInfo(''); setCompressing(false); setShowKompresSaran(false); setShowKompresCard(false);
  };

  const submitArsip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (!fFile) { setError('Berkas dokumen wajib diunggah.'); return; }
    setSaving(true);
    try {
      // Upload file LANGSUNG dari browser ke Google Apps Script — TIDAK lewat
      // Vercel sama sekali. Vercel Serverless Function punya limit body request
      // ~4.5MB yang tidak bisa dinaikkan lewat kode apa pun (batasan platform),
      // jadi file besar wajib dikirim langsung ke Apps Script yang limitnya jauh
      // lebih longgar. Vercel cuma kebagian metadata kecil di langkah berikutnya.
      const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_WEBAPP_URL;
      if (!appsScriptUrl) { setError('URL Apps Script belum dikonfigurasi (NEXT_PUBLIC_APPS_SCRIPT_WEBAPP_URL).'); return; }

      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Gagal baca file'));
        reader.readAsDataURL(fFile);
      });

      const uploadRes = await fetch(appsScriptUrl, {
        method: 'POST',
        // Content-Type text/plain SENGAJA, bukan application/json — Apps Script Web App
        // tidak punya handler untuk preflight OPTIONS, jadi kalau pakai application/json
        // browser bakal kirim preflight duluan dan langsung diblokir CORS sebelum request
        // sungguhan terkirim. Dengan text/plain, browser anggap ini "simple request" dan
        // preflight dilewati sama sekali. Isi body tetap JSON, Apps Script tetap baca normal
        // lewat e.postData.contents.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'uploadArsipDokumen', namaFile: fFile.name, base64Data: base64, mimeType: fFile.type }),
        redirect: 'follow',
      });
      const uploaded = await uploadRes.json();
      if (!uploaded.success) { setError(uploaded.message || 'Gagal mengunggah berkas ke Drive.'); return; }

      // Metadata doang — kecil, aman lewat Vercel.
      const r = await fetch('/api/arsip-dokumen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaInstitusi: fNama, jenis: fJenis, judul: fJudul,
          tglBerlaku: fBerlaku, tglBerakhir: fBerakhir, statusKerjaSama: fStatusKS, divisi: fDivisi,
          namaPIC: fPIC, emailPIC: fEmail, waPIC: fWa, catatan: fCatatan,
          diarsipkanOleh: namaAdmin,
          fileId: uploaded.fileId, fileUrl: uploaded.fileUrl, namaFile: uploaded.namaFile,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.message || 'Gagal mengarsipkan.'); return; }
      setMsg('Dokumen berhasil diarsipkan.');
      resetForm();
      setShowForm(false);
      load();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const hapusArsip = async (id: string) => {
    setDeleting(id); setError(''); setMsg('');
    try {
      const r = await fetch(`/api/arsip-dokumen?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) { setError(d.message || 'Gagal menghapus arsip.'); return; }
      setList(prev => prev.filter(a => a.id !== id));
      setMsg('Arsip berhasil dihapus.');
    } catch { setError('Terjadi kesalahan saat menghapus.'); }
    finally { setDeleting(null); setConfirmDelete(null); }
  };

  const mulaiEditStatus = (a: Arsip) => {
    setEditingStatus(a.id);
    setStatusDraft(a.statusKerjaSama === 'Masih Berlaku' ? 'Masih Berlaku' : 'Sudah Berakhir');
    setError(''); setMsg('');
  };

  const simpanStatus = async (id: string) => {
    setSavingStatus(true); setError(''); setMsg('');
    try {
      const r = await fetch('/api/arsip-dokumen', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, statusKerjaSama: statusDraft }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.message || 'Gagal memperbarui status.'); return; }
      setList(prev => prev.map(a => a.id === id ? { ...a, statusKerjaSama: statusDraft } : a));
      setMsg('Status kerja sama berhasil diperbarui.');
      setEditingStatus(null);
    } catch { setError('Terjadi kesalahan saat memperbarui status.'); }
    finally { setSavingStatus(false); }
  };

  // ── Edit lengkap — KHUSUS Admin BNN Utama, hanya utk entri arsip nyata ──
  const [editLengkapId, setEditLengkapId] = useState<string | null>(null);
  const [elKomentarUtama, setElKomentarUtama] = useState('');
  const [savingLengkap, setSavingLengkap] = useState(false);

  const mulaiEditLengkap = (a: Arsip) => {
    setEditLengkapId(a.id);
    setElKomentarUtama(a.komentarUtama || '');
    setError(''); setMsg('');
  };

  const simpanEditLengkap = async (id: string) => {
    setSavingLengkap(true); setError(''); setMsg('');
    try {
      const r = await fetch('/api/arsip-dokumen', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, editLengkap: { komentarUtama: elKomentarUtama } }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.message || 'Gagal menyimpan komentar.'); return; }
      setList(prev => prev.map(a => a.id === id ? { ...a, komentarUtama: elKomentarUtama } : a));
      setMsg('Komentar berhasil disimpan.');
      setEditLengkapId(null);
    } catch { setError('Terjadi kesalahan saat memperbarui arsip.'); }
    finally { setSavingLengkap(false); }
  };

  const backUrl = level === 'utama' ? '/dashboard/bnn-utama' : (role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin');

  const sidebarItems: SidebarItem[] = level === 'utama' ? [
    { href: '/dashboard/bnn-utama', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Dokumen & Tata Kelola' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Daftar Admin' },
  ] : [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiListSidebar size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' },
  ];

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };


  const statusBadge = (a: Arsip) => {
    if (a.sumber === 'manual') {
      return a.statusKerjaSama === 'Masih Berlaku'
        ? { bg: '#DBEAFE', color: '#1D4ED8', label: 'Masih Berlaku' }
        : { bg: '#f1f3f2', color: '#5b6b66', label: 'Sudah Berakhir' };
    }
    // sumber sistem — tampilkan status asli dokumen
    const k = a.statusKerjaSama;
    if (['Draft'].includes(k)) return { bg: '#eef2f6', color: '#475569', label: k };
    if (['Dalam Proses'].includes(k)) return { bg: '#EDE9FE', color: '#5B21B6', label: k };
    if (['Kedaluwarsa'].includes(k)) return { bg: '#FCEBEB', color: '#A32D2D', label: k };
    return { bg: '#FEF3C7', color: '#D97706', label: k }; // Selesai/Berlangsung/Berlaku dkk
  };

  if (!role) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #eef2f6', borderTop:'3px solid #1D4ED8', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat arsip dokumen...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily: FONT }}>
      <GlobalStyle />
      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/arsip"
        brandLabel="SI-POKJA HUMKER"
        brandSub={level === 'utama' ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        userName={namaAdmin}
        userTag={level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={level === 'utama' ? '#ABD1C6' : '#1D4ED8'}
        onLogout={logout}
      />
      <nav className="main-content-wrap" style={navStyle}>
        <div style={{ fontWeight:700, fontSize:13.5, flex:1, textAlign:'center', color:'#0f1f3d', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          <FiArchive size={15} style={{ color:'#1D4ED8' }} /> Arsip Dokumen
        </div>
        {level === 'utama' ? (
          <span style={{ fontSize:10.5, fontWeight:700, padding:'8px 16px', borderRadius:100, background:'rgba(171,209,198,0.25)', color:'#2F5449', display:'flex', alignItems:'center', gap:6 }}>
            <FiEye size={13} /> Mode Tinjau
          </span>
        ) : (
          <button onClick={() => { setShowForm(s => !s); if (showForm) resetForm(); }} style={{ ...btnPrimary, display:'flex', alignItems:'center', gap:6 }} className="btn-hover">
            {showForm ? (<><FiX size={13} /> Batal</>) : (<><FiPlus size={13} /> Arsipkan Dokumen</>)}
          </button>
        )}
      </nav>

      <div className="main-content-wrap" style={{ maxWidth:1000, margin:'0 auto', padding:'1.5rem 1.25rem 3rem' }}>

        {msg   && <div style={{ ...msgBox('#1D4ED8','#DBEAFE'), marginBottom:14, display:'flex', alignItems:'center', gap:8 }} className="fld"><FiCheckCircle size={14} style={{ flexShrink:0 }} />{msg}</div>}
        {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), marginBottom:14, display:'flex', alignItems:'center', gap:8 }} className="fld"><FiAlertCircle size={14} style={{ flexShrink:0 }} />{error}</div>}

        <div style={{ ...eyebrow, marginBottom:6 }}>Riwayat Lengkap Kerja Sama</div>
        <p style={{ fontSize:12, color:'#64748b', marginTop:0, marginBottom:18, lineHeight:1.6 }}>
          Menggabungkan dokumen yang sedang berjalan di sistem (Draft, Aktif, Selesai, dst) dengan kerja sama lama yang diarsipkan manual oleh admin — internal, tidak tampil di publik maupun sisi mitra.
        </p>

        {showForm && (
          <div style={{ ...shellStyle, marginBottom:20 }} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}>Arsipkan Dokumen Lama</div>
              <form onSubmit={submitArsip}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div>
                    <label style={labelSt}>Nama Institusi *</label>
                    <input style={inputFull} value={fNama} onChange={e => setFNama(e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelSt}>Jenis *</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {(['MOU', 'PKS'] as const).map(j => (
                        <button key={j} type="button" onClick={() => setFJenis(j)}
                          style={{ ...jenisBtn, ...(fJenis === j ? jenisBtnActive : {}) }} className="btn-hover">
                          {j}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}>Judul Dokumen *</label>
                  <input style={inputFull} value={fJudul} onChange={e => setFJudul(e.target.value)} placeholder="Contoh: Kerja Sama Pencegahan Narkoba di Lingkungan Kampus" required />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div>
                    <label style={labelSt}>Tanggal Berlaku *</label>
                    <input type="date" style={inputFull} value={fBerlaku} onChange={e => setFBerlaku(e.target.value)} required />
                  </div>
                  <div>
                    <label style={labelSt}>Tanggal Berakhir *</label>
                    <input type="date" style={inputFull} value={fBerakhir} onChange={e => setFBerakhir(e.target.value)} required />
                  </div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}>Status Kerja Sama *</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="button" onClick={() => setFStatusKS('Masih Berlaku')}
                      style={{ ...statusBtn, ...(fStatusKS === 'Masih Berlaku' ? statusBtnActiveBlue : {}) }} className="btn-hover">
                      Masih Berlaku hingga saat ini
                    </button>
                    <button type="button" onClick={() => setFStatusKS('Sudah Berakhir')}
                      style={{ ...statusBtn, ...(fStatusKS === 'Sudah Berakhir' ? statusBtnActiveGray : {}) }} className="btn-hover">
                      Sudah Berakhir
                    </button>
                  </div>
                  <div style={hintText}>Pilih &quot;Masih Berlaku&quot; kalau kerja sama ini masih aktif sampai sekarang, bukan cuma yang sudah kedaluwarsa.</div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}>Divisi Penanganan <span style={{ fontWeight:400, color:'#94a3b8', fontSize:10 }}>(opsional, pilih 0–{MAKS_DIVISI})</span></label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {Object.entries(DIVISI_LABEL).map(([key, info]) => {
                      const checked = fDivisi.includes(key);
                      const disabled = !checked && fDivisi.length >= MAKS_DIVISI;
                      return (
                        <button key={key} type="button" disabled={disabled}
                          onClick={() => setFDivisi(prev => checked ? prev.filter(d => d !== key) : [...prev, key])}
                          style={{
                            padding:'9px 10px', borderRadius:9, cursor: disabled ? 'not-allowed' : 'pointer',
                            fontFamily:FONT, fontSize:12, textAlign:'left',
                            border:`1.5px solid ${checked ? info.color : 'rgba(29,78,216,0.10)'}`,
                            background: checked ? info.bg : '#fff',
                            color: checked ? info.color : '#334155',
                            fontWeight: checked ? 700 : 500,
                            opacity: disabled ? 0.45 : 1,
                          }} className="btn-hover">
                          {info.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ ...nestGroup, marginBottom:12 }}>
                  <label style={{ ...labelSt, marginBottom:8 }}>Kontak PIC *</label>
                  <div style={{ marginBottom:8 }}>
                    <label style={subLabel}>Nama PIC</label>
                    <input style={inputFull} value={fPIC} onChange={e => setFPIC(e.target.value)} required />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div>
                      <label style={subLabel}>Email</label>
                      <input type="email" style={inputFull} value={fEmail} onChange={e => setFEmail(e.target.value)} />
                    </div>
                    <div>
                      <label style={subLabel}>No. WhatsApp</label>
                      <input style={inputFull} value={fWa} onChange={e => setFWa(e.target.value)} />
                    </div>
                  </div>
                  <div style={hintText}>Isi salah satu (Email atau WA) minimal.</div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}>Catatan (opsional)</label>
                  <textarea style={{ ...inputFull, height:60, resize:'none' }} value={fCatatan} onChange={e => setFCatatan(e.target.value)} />
                </div>

                <div style={{ marginBottom:16 }}>
                  <label style={{ ...labelSt, display:'flex', alignItems:'center', gap:6 }}><FiUpload size={12} /> Berkas Dokumen * <span style={{ fontWeight:400, color:'#94a3b8' }}>(Word / PDF / Scan JPG-PNG, maks 10MB — PDF di atas 10MB otomatis dikompres)</span></label>
                  <input type="file" accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/jpeg,image/png"
                    onChange={handleFile} disabled={compressing} style={inputFull} />
                  {compressing && (
                    <div style={{ fontSize:11, color:'#92400E', marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:12, height:12, border:'2px solid #FDE68A', borderTop:'2px solid #D97706', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }} />
                      {compressInfo || 'Mengompres PDF...'}
                    </div>
                  )}
                  {!compressing && compressInfo && <div style={{ fontSize:11, color:'#0F6E56', marginTop:6 }}>{compressInfo}</div>}
                  {fFile && !compressing && <div style={{ fontSize:11, color:'#1D4ED8', marginTop:6, display:'flex', alignItems:'center', gap:6 }}><FiCheckCircle size={12} /> {fFile.name} ({(fFile.size/1024).toFixed(0)} KB)</div>}
                  {fFileError && <div style={{ fontSize:11, color:'#A32D2D', marginTop:6 }}>{fFileError}</div>}

                  {showKompresSaran && !showKompresCard && !compressing && (
                    <button type="button" onClick={() => setShowKompresCard(true)}
                      style={{ marginTop:8, fontSize:11, padding:'6px 12px', borderRadius:8, border:'1px solid #FDE68A', background:'#FFFBEB', color:'#92400E', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                      <FiZap size={12} style={{ flexShrink:0 }} /> Kompres {fFile ? labelJenisFile(fFile.type) : 'File'} Ini
                    </button>
                  )}

                  {showKompresCard && fFile && !compressing && (
                    <div style={{ marginTop:8, padding:'12px 14px', borderRadius:10, background:'#FFFBEB', border:'1px solid #FDE68A' }}>
                      <div style={{ fontSize:11.5, color:'#92400E', lineHeight:1.6, marginBottom:8 }}>
                        Kompres ini tidak mengurangi tampilan HD file, hanya mengurangi ukurannya saja.
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button type="button" onClick={() => setShowKompresCard(false)} style={{ fontSize:11, padding:'6px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#334155', cursor:'pointer' }}>
                          Nanti Saja
                        </button>
                        <button type="button" onClick={jalankanKompresManual} style={{ fontSize:11, padding:'6px 12px', borderRadius:8, border:'none', background:'#D97706', color:'#fff', cursor:'pointer', fontWeight:600 }}>
                          Ya, Kompres Sekarang
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={saving || compressing} style={{ ...btnPrimary, width:'100%' }} className="btn-hover">
                  {compressing ? 'Menunggu kompresi selesai…' : saving ? 'Mengarsipkan…' : 'Simpan ke Arsip'}
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </form>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <FiSearch size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
            <input
              value={cari}
              onChange={e => setCari(e.target.value)}
              placeholder="Cari institusi, judul, atau PIC..."
              style={{ ...inputFull, width:'100%', paddingLeft:34 }}
            />
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <FiFilter size={13} style={{ color:'#94a3b8', flexShrink:0 }} />
            {['', 'MOU', 'PKS'].map(j => (
              <button key={j} onClick={() => setFilterJenis(j)}
                style={{ ...filterPill, ...(filterJenis === j ? filterPillActive : {}) }} className="btn-hover">
                {j || 'Semua Jenis'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          {[
            { key: '', label: 'Semua Asal' },
            { key: 'sistem', label: 'Dari Sistem' },
            { key: 'manual', label: 'Arsip Lama' },
          ].map(s => (
            <button key={s.key} onClick={() => setFilterSumber(s.key)}
              style={{ ...filterPillSm, ...(filterSumber === s.key ? filterPillSmActive : {}) }} className="btn-hover">
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={emptyBox}>Memuat arsip…</div>
        ) : list.length === 0 ? (
          <div style={emptyBox}>Belum ada dokumen yang diarsipkan.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {kelompokkanArsip(list).map((entry, idx) => {
              if (entry.tipe === 'ttdBasah') {
                const { representative: r, snapshot, scan, idDokumen } = entry;
                const isOpen = expandedTtd.has(idDokumen);
                const toggle = () => setExpandedTtd(prev => {
                  const next = new Set(prev);
                  if (next.has(idDokumen)) next.delete(idDokumen); else next.add(idDokumen);
                  return next;
                });
                return (
                  <div key={`ttd-${idDokumen}`} style={{ ...shellStyle, animationDelay:`${Math.min(idx, 8) * 0.04}s`, borderColor:'rgba(248,198,30,0.35)' }} className="fld lift">
                    <div style={coreStyle}>
                      <button onClick={toggle} style={{ all:'unset', cursor:'pointer', width:'100%', display:'block' }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                          <span style={{ ...pill, background:r.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:r.jenis==='MOU'?'#1D4ED8':'#92400E' }}>{r.jenis}</span>
                          <span style={{ ...pill, background:'linear-gradient(135deg,#F8C61E,#252C37)', color:'#fff' }}>✒ TTD Basah Selesai</span>
                          <span style={{ ...pill, background:'#f1f3f2', color:'#7d8985' }}>{(snapshot?1:0)+(scan?1:0)} berkas</span>
                          {(r.divisi || []).map(dv => {
                            const info = DIVISI_LABEL[dv] || { label: dv, color:'#64748b', bg:'#f1f5f9' };
                            return <span key={dv} style={{ ...pill, background: info.bg, color: info.color }}>{info.label}</span>;
                          })}
                          <span style={{ marginLeft:'auto', color:'#94a3b8', display:'flex', alignItems:'center' }}>
                            {isOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                          </span>
                        </div>
                        <div style={{ fontSize:14.5, fontWeight:700, color:'#0f1f3d', textAlign:'left' }}>{r.judul}</div>
                        <div style={{ fontSize:12.5, color:'#1D4ED8', fontWeight:600, marginTop:2, display:'flex', alignItems:'center', gap:6 }}><FaBuilding size={12} /> {r.namaInstitusi}</div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:6, display:'flex', alignItems:'center', gap:5 }}><FiCalendar size={11} /> Berlaku: {r.tglBerlaku || '—'} s.d. {r.tglBerakhir || '—'}</div>
                      </button>

                      {isOpen && (
                        <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(15,23,42,0.06)', display:'flex', flexDirection:'column', gap:8 }}>
                          {snapshot ? (
                            <a href={snapshot.fileUrl} target="_blank" rel="noopener noreferrer"
                              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'#212842', color:'#F0E7D5', textDecoration:'none' }} className="btn-hover">
                              <span style={{ fontSize:16 }}>📎</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:12, fontWeight:700 }}>Dokumen Sebelum TTD (Snapshot)</div>
                                <div style={{ fontSize:10, opacity:0.75 }}>Isi persis saat tanggal TTD dicatat — {snapshot.tglDiarsipkan}</div>
                              </div>
                              <FiExternalLink size={13} />
                            </a>
                          ) : (
                            <div style={{ fontSize:11, color:'#94a3b8', padding:'10px 12px', background:'#F5F1E8', borderRadius:10 }}>Snapshot belum tersedia untuk dokumen ini.</div>
                          )}
                          {scan ? (
                            <a href={scan.fileUrl} target="_blank" rel="noopener noreferrer"
                              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'#F8C61E', color:'#252C37', textDecoration:'none' }} className="btn-hover">
                              <span style={{ fontSize:16 }}>📷</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:12, fontWeight:700 }}>Hasil Scan TTD Basah</div>
                                <div style={{ fontSize:10, opacity:0.75 }}>Dokumen fisik yang sudah ditandatangani — {scan.tglDiarsipkan}</div>
                              </div>
                              <FiExternalLink size={13} />
                            </a>
                          ) : (
                            <div style={{ fontSize:11, color:'#94a3b8', padding:'10px 12px', background:'#F5F1E8', borderRadius:10 }}>Scan belum diunggah admin untuk dokumen ini.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              const a = entry.item;
              const sb = statusBadge(a);
              return (
                <div key={a.id} style={{ ...shellStyle, animationDelay:`${Math.min(idx, 8) * 0.04}s` }} className="fld lift">
                  <div style={coreStyle}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:200 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                          <span style={{ ...pill, background:a.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:a.jenis==='MOU'?'#1D4ED8':'#92400E' }}>{a.jenis}</span>
                          <span style={{ ...pill, background: sb.bg, color: sb.color }}>{sb.label}</span>
                          <span style={{ ...pill, background: a.sumber === 'sistem' ? '#FEF3C7' : '#f1f3f2', color: a.sumber === 'sistem' ? '#D97706' : '#7d8985' }}>
                            {a.sumber === 'sistem' ? 'Sistem' : 'Arsip Lama'}
                          </span>
                          {a.diarsipkanOleh === 'Sistem (Auto-Arsip TTD Basah)' && (
                            <span style={{ ...pill, background:'#F8C61E', color:'#252C37' }}>📷 Scan TTD Basah</span>
                          )}
                          {a.diarsipkanOleh === 'Sistem (Auto-Snapshot TTD)' && (
                            <span style={{ ...pill, background:'#212842', color:'#F0E7D5' }}>📎 Snapshot (belum di-TTD)</span>
                          )}
                          {(a.divisi || []).map(dv => {
                            const info = DIVISI_LABEL[dv] || { label: dv, color:'#64748b', bg:'#f1f5f9' };
                            return <span key={dv} style={{ ...pill, background: info.bg, color: info.color }}>{info.label}</span>;
                          })}
                        </div>
                        <div style={{ fontSize:14.5, fontWeight:700, color:'#0f1f3d' }}>{a.judul}</div>
                        <div style={{ fontSize:12.5, color:'#1D4ED8', fontWeight:600, marginTop:2, display:'flex', alignItems:'center', gap:6 }}><FaBuilding size={12} /> {a.namaInstitusi}</div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:6, display:'flex', alignItems:'center', gap:5 }}><FiCalendar size={11} /> Berlaku: {a.tglBerlaku || '—'} s.d. {a.tglBerakhir || '—'}</div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:2, display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                          <FiUser size={11} /> {a.namaPIC || '—'}{a.emailPIC ? ` · ${a.emailPIC}` : ''}{a.waPIC ? ` · ${a.waPIC}` : ''}
                        </div>
                        {a.ttdTglFinal && (
                          <div style={{ fontSize:11, color:'#D97706', marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
                            <FiPenTool size={11} /> TTD {a.ttdTipe === 'basah' ? 'Basah' : 'Online'}: {a.ttdTglFinal}
                          </div>
                        )}
                        {a.sumber === 'manual' && (
                          <div style={{ fontSize:10, color:'#94a3b8', marginTop:6 }}>Diarsipkan {a.tglDiarsipkan}{a.diarsipkanOleh ? ` oleh ${a.diarsipkanOleh}` : ''}</div>
                        )}
                        {a.catatan && <div style={{ fontSize:11, color:'#94a3b8', marginTop:6, fontStyle:'italic' }}>{a.catatan}</div>}
                        {a.komentarUtama && (
                          <div style={{ marginTop:8, padding:'8px 11px', borderRadius:10, background:'rgba(171,209,198,0.15)', borderLeft:'3px solid #ABD1C6' }}>
                            <div style={{ fontSize:9.5, fontWeight:700, color:'#2F5449', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>💬 Komentar BNN Utama</div>
                            <div style={{ fontSize:11, color:'#1E332D' }}>{a.komentarUtama}</div>
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                        {a.fileUrl && (
                          <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, textDecoration:'none', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }} className="btn-hover">
                            <FiFileText size={12} /> Lihat Berkas
                          </a>
                        )}
                        {a.sumber === 'sistem' ? (
                          <a href={`/dashboard/dokumen/${a.id}`} style={{ ...btnSm, textDecoration:'none', textAlign:'center' }} className="btn-hover">
                            Lihat di Sistem
                          </a>
                        ) : editingStatus === a.id ? (
                          <div style={confirmBox}>
                            <select value={statusDraft} onChange={e => setStatusDraft(e.target.value as 'Masih Berlaku' | 'Sudah Berakhir')}
                              style={{ fontSize:11, padding:'6px 8px', borderRadius:8, border:'1px solid #e2e8f0', width:'100%', marginBottom:6 }}>
                              <option value="Masih Berlaku">Masih Berlaku</option>
                              <option value="Sudah Berakhir">Sudah Berakhir</option>
                            </select>
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={() => setEditingStatus(null)} style={{ ...btnSm, flex:1, fontSize:10 }} className="btn-hover">Batal</button>
                              <button onClick={() => simpanStatus(a.id)} disabled={savingStatus} style={{ ...btnSm, flex:1, fontSize:10, background:'#1D4ED8', color:'#fff', borderColor:'#1D4ED8' }} className="btn-hover">
                                {savingStatus ? '…' : 'Simpan'}
                              </button>
                            </div>
                          </div>
                        ) : level === 'utama' ? null : (
                          <button onClick={() => mulaiEditStatus(a)} style={{ ...btnSm, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }} className="btn-hover"><FiEdit2 size={11} /> Edit Status</button>
                        )}

                        {level === 'utama' && a.sumber === 'manual' && (
                          editLengkapId === a.id ? (
                            <div style={{ ...confirmBox, width:230, background:'#F5FAF8', borderColor:'#ABD1C6' }}>
                              <label style={{ fontSize:9.5, fontWeight:700, color:'#2F5449', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:4 }}>💬 Komentar BNN Utama</label>
                              <textarea value={elKomentarUtama} onChange={e => setElKomentarUtama(e.target.value)} placeholder="Tulis komentar di sini..." rows={3}
                                style={{ fontSize:11, padding:'7px 9px', borderRadius:8, border:'1px solid #ABD1C6', width:'100%', marginBottom:6, boxSizing:'border-box', resize:'vertical' }} />
                              <div style={{ display:'flex', gap:6 }}>
                                <button onClick={() => setEditLengkapId(null)} style={{ ...btnSm, flex:1, fontSize:10 }} className="btn-hover">Batal</button>
                                <button onClick={() => simpanEditLengkap(a.id)} disabled={savingLengkap} style={{ ...btnSm, flex:1, fontSize:10, background:'#2F5449', color:'#fff', borderColor:'#2F5449' }} className="btn-hover">
                                  {savingLengkap ? '…' : 'Simpan'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => mulaiEditLengkap(a)} style={{ ...btnSm, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:6, color:'#2F5449', borderColor:'#ABD1C6' }} className="btn-hover">
                              💬 {a.komentarUtama ? 'Ubah Komentar' : 'Beri Komentar'}
                            </button>
                          )
                        )}
                        {a.sumber === 'sistem' || level === 'utama' ? null : confirmDelete === a.id ? (
                          <div style={confirmBox}>
                            <span style={{ fontSize:10.5, color:'#A32D2D', fontWeight:600 }}>Yakin hapus?</span>
                            <div style={{ display:'flex', gap:6, marginTop:6 }}>
                              <button onClick={() => setConfirmDelete(null)} style={{ ...btnSm, flex:1, fontSize:10 }} className="btn-hover">Batal</button>
                              <button onClick={() => hapusArsip(a.id)} disabled={deleting === a.id} style={{ ...btnDanger, flex:1, fontSize:10 }} className="btn-hover">
                                {deleting === a.id ? '…' : 'Hapus'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(a.id)} style={{ ...deleteLink, display:'flex', alignItems:'center', gap:5 }} className="btn-hover"><FiTrash2 size={11} /> Hapus</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      @keyframes fadeUp { from { opacity:0; transform: translateY(14px); filter: blur(3px);} to { opacity:1; transform: translateY(0); filter: blur(0);} }
      .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
      .lift { transition: all 0.5s cubic-bezier(0.32,0.72,0,1); }
      .lift:hover { transform: translateY(-3px); box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 28px 48px -28px rgba(29,78,216,0.28) !important; }
      .btn-hover { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
      .btn-hover:active:not(:disabled) { transform: scale(0.98); }
      @media (min-width: 901px) {
        .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
      }
    `}</style>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.9rem 1.5rem', background:'rgba(255,255,255,0.75)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(29,78,216,0.06)', position:'sticky', top:0, zIndex:100, gap:8 };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#64748b', textDecoration:'none', flexShrink:0, fontWeight:600 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.6)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', borderRadius:20, padding:6, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, padding:'1.15rem 1.3rem', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const cardTitle: React.CSSProperties = { fontSize:13, fontWeight:700, marginBottom:14, color:'#0f1f3d' };
const labelSt: React.CSSProperties = { display:'block', fontSize:11, color:'#334155', marginBottom:5, fontWeight:700 };
const subLabel: React.CSSProperties = { display:'block', fontSize:10.5, color:'#64748b', marginBottom:4, fontWeight:600 };
const hintText: React.CSSProperties = { fontSize:10, color:'#94a3b8', marginTop:6 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 11px', borderRadius:10, border:'1.5px solid rgba(29,78,216,0.10)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', outline:'none', background:'#f8fafc' };
const nestGroup: React.CSSProperties = { background:'#F5F1E8', border:'1px solid rgba(29,78,216,0.06)', borderRadius:14, padding:'0.9rem 1rem' };
const btnPrimary: React.CSSProperties = { padding:'9px 16px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#2563EB,#1E3A8A)', color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:'0 6px 16px -6px rgba(29,78,216,0.45)' };
const btnSm: React.CSSProperties = { padding:'7px 13px', borderRadius:10, border:'1.5px solid rgba(29,78,216,0.10)', background:'#fff', color:'#334155', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap' };
const pill: React.CSSProperties = { fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:100 };
const eyebrow: React.CSSProperties = { display:'inline-block', fontSize:9.5, color:'#D97706', textTransform:'uppercase', letterSpacing:'0.14em', fontWeight:700, background:'#FEF3C7', padding:'4px 11px', borderRadius:100 };
const emptyBox: React.CSSProperties = { padding:'2.5rem', textAlign:'center', color:'#94a3b8', fontSize:12, background:'#F5F1E8', borderRadius:16 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:12 });
const jenisBtn: React.CSSProperties = { flex:1, padding:'9px', borderRadius:10, border:'1.5px solid rgba(29,78,216,0.10)', background:'#fff', color:'#64748b', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT };
const jenisBtnActive: React.CSSProperties = { border:'1.5px solid #1D4ED8', background:'linear-gradient(160deg,#EFF6FF,#DBEAFE)', color:'#1E3A8A' };
const statusBtn: React.CSSProperties = { flex:1, padding:'9px 10px', borderRadius:10, border:'1.5px solid rgba(29,78,216,0.10)', background:'#fff', color:'#64748b', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:FONT };
const statusBtnActiveBlue: React.CSSProperties = { border:'1.5px solid #1D4ED8', background:'linear-gradient(160deg,#EFF6FF,#DBEAFE)', color:'#1E3A8A' };
const statusBtnActiveGray: React.CSSProperties = { border:'1.5px solid #94a3b8', background:'#f1f5f9', color:'#475569' };
const filterPill: React.CSSProperties = { padding:'8px 15px', borderRadius:100, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', color:'#64748b', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:FONT };
const filterPillActive: React.CSSProperties = { background:'#1D4ED8', borderColor:'#1D4ED8', color:'#fff' };
const filterPillSm: React.CSSProperties = { padding:'6px 13px', borderRadius:100, borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', background:'#F5F1E8', color:'#64748b', fontSize:10.5, fontWeight:600, cursor:'pointer', fontFamily:FONT };
const filterPillSmActive: React.CSSProperties = { background:'#1D4ED8', borderColor:'#1D4ED8', color:'#fff' };
const confirmBox: React.CSSProperties = { padding:'8px 9px', background:'#FCEBEB', border:'1px solid rgba(163,45,45,0.2)', borderRadius:10, minWidth:130 };
const btnDanger: React.CSSProperties = { padding:'7px 10px', borderRadius:8, border:'none', background:'#A32D2D', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT };
const deleteLink: React.CSSProperties = { background:'none', border:'none', color:'#A32D2D', fontSize:10.5, fontWeight:600, cursor:'pointer', padding:'7px 0', fontFamily:FONT };