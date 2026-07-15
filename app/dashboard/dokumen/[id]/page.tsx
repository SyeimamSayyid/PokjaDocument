'use client';

import { useEffect, useState, use } from 'react';
import KomentarRevisi from '@/components/KomentarRevisi';
import EditPencilIndicator from '@/components/EditPencilIndicator';
import KomentarDocs from '@/components/KomentarDocs';
import NotifikasiAdminBell from '@/components/NotifikasiAdminBell';
import {
  FiArrowLeft, FiExternalLink, FiEyeOff, FiEye, FiCheckCircle, FiCornerUpLeft,
  FiClock, FiInfo, FiHome, FiCalendar, FiDownload, FiCheck,
  FiX as FiClose, FiBriefcase, FiFileText, FiLoader, FiMail, FiPhone, FiUser, FiCopy,
  FiEdit3, FiSend, FiPenTool, FiEdit2, FiZap, FiUpload, FiTrash2,
} from 'react-icons/fi';

interface Dokumen {
  id: string; jenis: string; judul: string; namaMitra: string;
  tglDibuat: string; tglBerlaku: string; tglBerakhir: string;
  durasi: string; status: string; kode: string; kodeExpire: string;
  docsId: string; docsUrl: string; embedUrl: string;
  folderId: string; dibuatOleh: string; catatan: string; fotoFolderId: string;
  tglKegiatanMulai: string; tglKegiatanSelesai: string; pdfId: string;
  sisaHari: number | null;
  divisi: string[];
  manualLog?: string;
  scanTtdId?: string;
  scanTtdUrl?: string;
  ttdTipe: string; ttdTglDiajukan: string; ttdStatus: string; ttdTglFinal: string; ttdCatatan: string;
}

interface Kandidat { fileId: string; namaFile: string; fileUrl: string; tglSubmit: string; namaInstansi: string; sumber: string; }

const STATUS_LIST = [
  'Draft','Dalam Proses','Selesai','Kegiatan Berlangsung',
  'Kegiatan Selesai','MOU/PKS Berlaku','Kedaluwarsa',
];

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  'Draft':                { bg: '#f1f3f2', color: '#5b6b66' },
  'Dalam Proses':         { bg: '#EDE9FE', color: '#5B21B6' },
  'Selesai':              { bg: '#FEF3C7', color: '#92400E' },
  'Kegiatan Berlangsung': { bg: '#FEF3C7', color: '#B45309' },
  'Kegiatan Selesai':     { bg: '#DBEAFE', color: '#1E40AF' },
  'MOU/PKS Berlaku':      { bg: '#DBEAFE', color: '#1D4ED8' },
  'Kedaluwarsa':          { bg: '#FCEBEB', color: '#A32D2D' },
};

const STATUS_DESC: Record<string, string> = {
  'Draft':                'Dokumen sedang disusun admin & mitra',
  'Dalam Proses':         'Mitra selesai mengisi, menunggu review admin',
  'Selesai':              'Disetujui, menunggu tanggal kegiatan',
  'Kegiatan Berlangsung': 'Kegiatan berlangsung — upload foto dibuka',
  'Kegiatan Selesai':     'Kegiatan telah selesai',
  'MOU/PKS Berlaku':      'Dokumen aktif & berlaku',
  'Kedaluwarsa':          'Masa berlaku telah berakhir',
};

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const DIVISI_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pencegahan:    { label: 'Pencegahan',    color: '#1E3A8A', bg: '#DBEAFE' },
  pemberantasan: { label: 'Pemberantasan', color: '#A32D2D', bg: '#FEE2E2' },
  rehabilitasi:  { label: 'Rehabilitasi',  color: '#5B21B6', bg: '#EDE9FE' },
  pemberdayaan:  { label: 'Pemberdayaan',  color: '#92400E', bg: '#FEF3C7' },
};
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

// Pertajam scan buram: unsharp mask + naikkan kontras via canvas. Ini BUKAN
// AI upscaling (tidak nambah detail yang beneran hilang) — cuma bikin scan
// dokumen yang blur/pudar jadi lebih gampang dibaca. Sekaligus dikompres ulang
// (JPEG q=0.82) biar ukuran file tidak ikut membengkak walau "kualitasnya" naik.
async function pertajamScan(file: File): Promise<File> {
  if (file.type === 'application/pdf') return file; // PDF dilewati, tidak diproses canvas
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

  // Naikkan kontras + saturasi dikit dulu — bikin teks scan lebih tegas
  ctx.filter = 'contrast(1.18) brightness(1.04) saturate(0.95)';
  ctx.drawImage(img, 0, 0);
  ctx.filter = 'none';

  // Unsharp mask manual: blur ringan lalu campur balik sebagai "high-pass"
  const asli = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = canvas.width; blurCanvas.height = canvas.height;
  const bctx = blurCanvas.getContext('2d')!;
  bctx.filter = 'blur(1.6px)';
  bctx.drawImage(canvas, 0, 0);
  const blurData = bctx.getImageData(0, 0, canvas.width, canvas.height);

  const out = ctx.createImageData(canvas.width, canvas.height);
  const amount = 0.6; // kekuatan penajaman
  for (let i = 0; i < asli.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = asli.data[i + c] - blurData.data[i + c];
      out.data[i + c] = Math.max(0, Math.min(255, asli.data[i + c] + diff * amount));
    }
    out.data[i + 3] = asli.data[i + 3];
  }
  ctx.putImageData(out, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Gagal proses gambar')), 'image/jpeg', 0.82);
  });
  return new File([blob], file.name.replace(/\.(png|jpe?g)$/i, '') + '-HD.jpg', { type: 'image/jpeg' });
}

export default function AdminDokumenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [role, setRole]           = useState('');
  const [dok, setDok]             = useState<Dokumen | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [msg, setMsg]             = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [showIframe, setShowIframe] = useState(true);
  const [tglMulai, setTglMulai]   = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [genPdf, setGenPdf]       = useState(false);

  const [namaAdmin, setNamaAdmin] = useState('Admin Pokja');
  const [idAdmin, setIdAdmin]     = useState('');

  const [templateKandidat, setTemplateKandidat]   = useState<Kandidat[]>([]);
  const [templateChecked, setTemplateChecked]     = useState(false);
  const [applyingTemplate, setApplyingTemplate]   = useState<string | null>(null);

  const [kontak, setKontak] = useState<{ namaPIC: string; email: string; noWa: string; waLink: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [showKembaliBox, setShowKembaliBox] = useState(false);
  const [alasanKembali, setAlasanKembali] = useState('');

  const [divisiDraft, setDivisiDraft] = useState<string[]>([]);
  const [divisiSaving, setDivisiSaving] = useState(false);
  const MAKS_DIVISI = 4;

  const [tglBerakhirDraft, setTglBerakhirDraft] = useState('');
  const [editTglBerakhir, setEditTglBerakhir]   = useState(false);
  const [savingTglBerakhir, setSavingTglBerakhir] = useState(false);

  const [publikasiDitolak, setPublikasiDitolak] = useState(false);

  const [ttdSaving, setTtdSaving] = useState(false);
  const [showTolakTtd, setShowTolakTtd] = useState(false);
  const [alasanTolakTtd, setAlasanTolakTtd] = useState('');
  const [showInputBasah, setShowInputBasah] = useState(false);
  const [tglBasah, setTglBasah] = useState('');
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanUploading, setScanUploading] = useState(false);
  const [scanInfo, setScanInfo] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanUrl, setScanUrl] = useState('');
  const [showBatalkanTtd, setShowBatalkanTtd] = useState(false);
  const [deletingScan, setDeletingScan] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadInfo, setDocUploadInfo] = useState('');
  const [docUploadError, setDocUploadError] = useState('');
  const [docUploadedId, setDocUploadedId] = useState('');
  const [terapkanLoading, setTerapkanLoading] = useState(false);

  const loadDok = () => {
    fetch(`/api/dokumen/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.message) { setError(d.message); setLoading(false); return; }
        setDok(d.dokumen);
        setEditStatus(d.dokumen.status);
        setTglMulai(d.dokumen.tglKegiatanMulai || '');
        setTglSelesai(d.dokumen.tglKegiatanSelesai || '');
        setDivisiDraft(d.dokumen.divisi || []);
        setTglBerakhirDraft(d.dokumen.tglBerakhir || '');
        setPublikasiDitolak(localStorage.getItem(`extractPoinDitolak_${id}`) === '1');
        setLoading(false);
      })
      .catch(() => { setError('Gagal memuat dokumen.'); setLoading(false); });
  };

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    setNamaAdmin(u.nama || u.email || 'Admin Pokja');
    setIdAdmin(u.id || u.email || '');
    loadDok();
  }, [id]);

  useEffect(() => {
    if (!dok) return;
    if (!['Draft', 'Dalam Proses', 'Selesai'].includes(dok.status)) return;
    fetch(`/api/dokumen/ganti-template?idDokumen=${id}`)
      .then(r => r.json())
      .then(d => { setTemplateKandidat(d.data || []); setTemplateChecked(true); })
      .catch(() => setTemplateChecked(true));
  }, [dok, id]);

  useEffect(() => {
    if (!dok) return;
    fetch(`/api/dokumen/pic?idDokumen=${id}`)
      .then(r => r.json())
      .then(d => setKontak({ namaPIC: d.namaPIC || '', email: d.email || '', noWa: d.noWa || '', waLink: d.waLink || '' }))
      .catch(() => {});
  }, [dok, id]);

  const salinTeks = (teks: string, label: string) => {
    navigator.clipboard.writeText(teks);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const transisi = async (statusBaru: string, alasan?: string) => {
    setSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch(`/api/dokumen/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transisi: statusBaru, alasanKembali: alasan, pelaku: 'admin', namaPelaku: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return; }
      setDok(prev => prev ? { ...prev, status: statusBaru } : prev);
      setEditStatus(statusBaru);
      setMsg(`Status berhasil diubah ke "${statusBaru}".`);
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const kembalikanKeDraft = async () => {
    if (!alasanKembali.trim()) { setError('Alasan pengembalian ke Draft wajib diisi.'); return; }
    await transisi('Draft', alasanKembali.trim());
    setShowKembaliBox(false); setAlasanKembali('');
  };

  const toggleDivisiDraft = (key: string) => {
    setDivisiDraft(current => {
      if (current.includes(key)) return current.filter(d => d !== key);
      if (current.length >= MAKS_DIVISI) return current;
      return [...current, key];
    });
  };

  const divisiBerubah = dok ? JSON.stringify([...divisiDraft].sort()) !== JSON.stringify([...(dok.divisi || [])].sort()) : false;

  const simpanDivisi = async () => {
    if (!dok) return;
    setDivisiSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dok.id, fields: { divisi: divisiDraft }, pelaku: 'admin', namaPelaku: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal ubah divisi.'); return; }
      setDok(prev => prev ? { ...prev, divisi: divisiDraft } : prev);
      setMsg('Divisi penanganan berhasil disimpan.');
    } catch { setError('Gagal mengubah divisi.'); }
    finally { setDivisiSaving(false); }
  };

  const batalDivisi = () => { if (dok) setDivisiDraft(dok.divisi || []); };

  const simpanTglBerakhir = async () => {
    if (!dok || !tglBerakhirDraft) return;
    setSavingTglBerakhir(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dok.id, fields: { tglBerakhir: tglBerakhirDraft }, pelaku: 'admin', namaPelaku: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal menyimpan tanggal berakhir.'); return; }
      setDok(prev => prev ? { ...prev, tglBerakhir: tglBerakhirDraft } : prev);
      setMsg('Tanggal berakhir kesepakatan berhasil disimpan.');
      setEditTglBerakhir(false);
    } catch { setError('Gagal menyimpan tanggal berakhir.'); }
    finally { setSavingTglBerakhir(false); }
  };

  const ttdRequest = async (body: Record<string, unknown>) => {
    setTtdSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch(`/api/dokumen/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, pelaku: 'admin', namaPelaku: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return false; }
      setMsg(d.message);
      loadDok();
      return true;
    } catch { setError('Terjadi kesalahan.'); return false; }
    finally { setTtdSaving(false); }
  };

  const setujuiTtd = () => ttdRequest({ ttdAction: 'setujuiOnline' });

  const tolakTtd = async () => {
    if (!alasanTolakTtd.trim()) { setError('Alasan penolakan wajib diisi.'); return; }
    const ok = await ttdRequest({ ttdAction: 'tolakOnline', alasanTolak: alasanTolakTtd.trim() });
    if (ok) { setShowTolakTtd(false); setAlasanTolakTtd(''); }
  };

  const inputTtdBasah = async () => {
    if (!tglBasah) { setError('Tanggal TTD wajib diisi.'); return; }
    const ok = await ttdRequest({ ttdAction: 'inputBasah', tglFinal: tglBasah });
    if (ok) { setShowInputBasah(false); setTglBasah(''); }
  };

  // (2) Admin batalkan pemilihan TTD basah/online kalau salah klik
  const batalkanTtd = async () => {
    const ok = await ttdRequest({ ttdAction: 'batalkan' });
    if (ok) setShowBatalkanTtd(false);
  };

  // (1) Admin hapus scan yang salah upload — hapus file fisik dulu di Drive,
  // baru hapus referensinya di sheet.
  const hapusScan = async () => {
    if (!dok?.scanTtdId) return;
    if (!confirm('Hapus scan TTD Basah ini? Tindakan tidak bisa dibatalkan.')) return;
    setDeletingScan(true); setError(''); setMsg('');
    try {
      const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_WEBAPP_URL;
      if (appsScriptUrl) {
        await fetch(appsScriptUrl, {
          method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'hapusScanTtdBasah', fileId: dok.scanTtdId }),
          redirect: 'follow',
        }).catch(() => {});
      }
      const ok = await ttdRequest({ ttdAction: 'hapusScan' });
      if (ok) setScanUrl('');
    } finally { setDeletingScan(false); }
  };

  // (3) Admin upload dokumen MOU/PKS langsung, sama seperti mitra
  const pilihDocAdmin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setDocUploadError(''); setDocUploadInfo(''); setDocUploadedId('');
    if (!f) { setDocFile(null); return; }
    const allowed = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!allowed.includes(f.type)) { setDocUploadError('Format harus Word (.doc/.docx).'); return; }
    if (f.size > 1024 * 1024) { setDocUploadError(`File terlalu besar (${(f.size/1024/1024).toFixed(2)}MB). Maksimal 1MB.`); return; }
    setDocFile(f);
  };

  const uploadDocAdmin = async () => {
    if (!docFile) return;
    setDocUploading(true); setDocUploadError(''); setDocUploadInfo('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Gagal baca file'));
        reader.readAsDataURL(docFile);
      });
      const r = await fetch('/api/dokumen/upload-template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: id, fileBase64: base64, fileName: docFile.name, fileMime: docFile.type }),
      });
      const d = await r.json();
      if (!r.ok) { setDocUploadError(d.message || 'Gagal mengunggah dokumen.'); return; }
      setDocUploadedId(d.data.fileId);
      setDocUploadInfo(`Diunggah: ${d.data.namaFile}. Klik "Terapkan" buat jadiin ini dokumen aktif.`);
    } catch { setDocUploadError('Terjadi kesalahan saat mengunggah.'); }
    finally { setDocUploading(false); }
  };

  const terapkanDocAdmin = async () => {
    if (!docUploadedId) return;
    setTerapkanLoading(true); setDocUploadError(''); setMsg('');
    try {
      const r = await fetch('/api/dokumen/ganti-template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: id, templateFileId: docUploadedId }),
      });
      const d = await r.json();
      if (!r.ok) { setDocUploadError(d.message || 'Gagal menerapkan dokumen.'); return; }
      setMsg('Dokumen berhasil diganti. Dokumen lama otomatis diarsipkan (tidak dihapus).');
      setDocFile(null); setDocUploadedId(''); setDocUploadInfo('');
      loadDok();
    } catch { setDocUploadError('Terjadi kesalahan saat menerapkan.'); }
    finally { setTerapkanLoading(false); }
  };

  // (4) Admin tandai "selesai mengisi" atas nama mitra, tanpa perlu nunggu mitra klik
  const tandaiSelesaiMengisi = async () => {
    setSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch(`/api/dokumen/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transisi: 'Dalam Proses', pelaku: 'admin', namaPelaku: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return; }
      setMsg('Ditandai selesai mengisi (atas nama mitra).');
      loadDok();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const pilihScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setScanError(''); setScanInfo('');
    if (!f) { setScanFile(null); return; }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowed.includes(f.type)) { setScanError('Format harus JPG, PNG, atau PDF.'); return; }
    if (f.size > 10 * 1024 * 1024) { setScanError('File maksimal 10MB.'); return; }

    if (f.type === 'application/pdf') { setScanFile(f); return; }

    setScanUploading(true); setScanInfo('Mempertajam scan…');
    try {
      const hasil = await pertajamScan(f);
      setScanFile(hasil);
      setScanInfo(`Scan dipertajam: ${(f.size/1024).toFixed(0)}KB → ${(hasil.size/1024).toFixed(0)}KB.`);
    } catch {
      setScanFile(f);
      setScanInfo('Gagal mempertajam, memakai file asli.');
    } finally {
      setScanUploading(false);
    }
  };

  const uploadScan = async () => {
    if (!scanFile) return;
    setScanUploading(true); setScanError(''); setScanInfo('Mengunggah…');
    try {
      const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_WEBAPP_URL;
      if (!appsScriptUrl) { setScanError('URL Apps Script belum dikonfigurasi.'); return; }

      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Gagal baca file'));
        reader.readAsDataURL(scanFile);
      });

      const r = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari preflight CORS
        body: JSON.stringify({ action: 'uploadScanTtdBasah', idDokumen: id, namaFile: scanFile.name, base64Data: base64, mimeType: scanFile.type }),
        redirect: 'follow',
      });
      const d = await r.json();
      if (!d.success) { setScanError(d.message || 'Gagal mengunggah scan.'); return; }
      setScanUrl(d.fileUrl || '');
      setScanInfo('Scan TTD Basah berhasil diunggah dan diarsipkan.');
      setMsg('Scan TTD Basah berhasil diunggah dan diarsipkan (dokumen kerja asli tidak berubah).');
      setScanFile(null);
    } catch {
      setScanError('Terjadi kesalahan saat mengunggah.');
    } finally {
      setScanUploading(false);
    }
  };

  const saveStatusManual = async () => {
    setSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch(`/api/dokumen/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, pelaku: 'admin', namaPelaku: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return; }
      setDok(prev => prev ? { ...prev, status: editStatus } : prev);
      setMsg('Status berhasil diperbarui (manual).');
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const saveTanggal = async () => {
    setSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch(`/api/dokumen/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tglKegiatanMulai: tglMulai, tglKegiatanSelesai: tglSelesai, pelaku: 'admin', namaPelaku: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return; }
      setDok(prev => prev ? { ...prev, tglKegiatanMulai: tglMulai, tglKegiatanSelesai: tglSelesai } : prev);
      setMsg('Tanggal kegiatan disimpan.');
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const unduhPdf = async () => {
    setGenPdf(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/dokumen/pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: id }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal membuat PDF.'); return; }
      const byteChars = atob(d.pdfBase64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = d.namaFile; a.click();
      URL.revokeObjectURL(url);
      setMsg('PDF kualitas tinggi berhasil diunduh.');
    } catch { setError('Gagal mengunduh PDF.'); }
    finally { setGenPdf(false); }
  };

  const gantiTemplate = async (fileId: string) => {
    if (!confirm('Yakin ganti dokumen kerja saat ini dengan draf mitra ini? Dokumen yang sedang dipakai akan diarsipkan (tidak dihapus).')) return;
    setApplyingTemplate(fileId); setError(''); setMsg('');
    try {
      const res = await fetch('/api/dokumen/ganti-template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: id, templateFileId: fileId }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return; }
      setDok(prev => prev ? { ...prev, docsId: d.docsId, docsUrl: d.docsUrl, embedUrl: `https://docs.google.com/document/d/${d.docsId}/preview` } : prev);
      setMsg(d.message || 'Template berhasil diganti.');
    } catch { setError('Gagal mengganti template.'); }
    finally { setApplyingTemplate(null); }
  };

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

  if (loading) return <div style={{ ...centerStyle, fontFamily: FONT }}><GlobalStyle />Memuat detail dokumen…</div>;
  if (error && !dok) return <div style={{ ...centerStyle, color:'#A32D2D', fontFamily: FONT }}><GlobalStyle />{error}</div>;
  if (!dok) return null;

  const sc = STATUS_COLOR[dok.status] || { bg:'#f1f3f2', color:'#5b6b66' };
  const bolehUnduhPdf = ['Selesai','Kegiatan Berlangsung','Kegiatan Selesai','MOU/PKS Berlaku','Kedaluwarsa'].includes(dok.status);
  const bolehGantiTemplate = ['Draft', 'Dalam Proses', 'Selesai'].includes(dok.status);
  const kandidatUtama = templateKandidat[0] || null;

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#f7f9fc,#eef2f8)', fontFamily: FONT }}>
      <GlobalStyle />
      <nav style={navStyle}>
        <a href={backUrl} style={backLink}><FiArrowLeft size={13} /> Dashboard</a>
        <div style={{ fontWeight:700, fontSize:13.5, flex:1, textAlign:'center', color:'#0f1f3d', letterSpacing:'-0.01em' }}>Detail Dokumen</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <NotifikasiAdminBell />
          {dok.docsUrl && <a href={dok.docsUrl} target="_blank" rel="noopener noreferrer" style={btnGhost}><FiExternalLink size={12} style={{ marginRight:6, verticalAlign:'middle' }} />Buka Docs</a>}
        </div>
      </nav>

      {msg   && <div style={{ ...msgBox(BLUE_DARK,'#DBEAFE'), margin:'14px auto', maxWidth:1120 }} className="fld"><FiCheckCircle size={14} style={{ marginRight:6, verticalAlign:'middle' }} />{msg}</div>}
      {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), margin:'14px auto', maxWidth:1120 }} className="fld"><FiInfo size={14} style={{ marginRight:6, verticalAlign:'middle' }} />{error}</div>}

      <div style={{ maxWidth:1120, margin:'0 auto', padding:'1.5rem 1.25rem 3rem', display:'grid', gridTemplateColumns:'1fr 380px', gap:16 }}>

        {/* Kolom kiri */}
        <div>
          <div style={{ ...shellStyle, marginBottom:14 }} className="fld">
            <div style={coreStyle}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10, flexWrap:'wrap' }}>
                <span style={{ ...pill, background:dok.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:dok.jenis==='MOU'?BLUE_DARK:'#92400E' }}>{dok.jenis}</span>
                <span style={{ ...pill, ...sc }}>{dok.status}</span>
                {dok.status === 'MOU/PKS Berlaku' && dok.sisaHari !== null && (
                  <span style={{ ...pill, background: dok.sisaHari <= 30 ? '#FCEBEB' : '#FEF3C7', color: dok.sisaHari <= 30 ? '#A32D2D' : GOLD }}>
                    <FiClock size={10} style={{ marginRight:4, verticalAlign:'middle' }} />
                    {dok.sisaHari > 0 ? `${dok.sisaHari} hari tersisa` : 'Berakhir hari ini'}
                  </span>
                )}
                {(dok.divisi || []).map(dv => {
                  const info = DIVISI_LABEL[dv] || { label: dv, color:'#64748b', bg:'#f1f5f9' };
                  return <span key={dv} style={{ ...pill, background: info.bg, color: info.color }}>{info.label}</span>;
                })}
              </div>
              <div style={{ fontSize:19, fontWeight:800, marginBottom:4, color:'#0f1f3d', letterSpacing:'-0.02em', display:'flex', alignItems:'center', gap:10 }}>
                {dok.judul}
                <EditPencilIndicator manualLog={dok.manualLog} size={24} ttdBasahPending={dok.ttdStatus === 'Menunggu Basah'} />
              </div>
              <div style={{ fontSize:13.5, color:BLUE, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}><FiHome size={13} />{dok.namaMitra}</div>
              <div style={{ fontSize:11.5, color:'#64748b', marginTop:8, lineHeight:1.7 }}>
                <strong>Masa berlaku:</strong> {dok.tglBerlaku} s.d. {dok.tglBerakhir} ({dok.durasi} th)<br/>
                {(dok.tglKegiatanMulai || dok.tglKegiatanSelesai) && (
                  <><strong>Tanggal kegiatan:</strong> {dok.tglKegiatanMulai || '—'} s.d. {dok.tglKegiatanSelesai || '—'}<br/></>
                )}
                Dibuat oleh {dok.dibuatOleh}
              </div>
              <div style={infoNote}><FiInfo size={12} style={{ marginRight:6, flexShrink:0, marginTop:1 }} />{STATUS_DESC[dok.status] || ''}</div>
            </div>
          </div>

          <div style={{ ...shellStyle, marginBottom:14 }} className="fld">
            <div style={coreStyle}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={cardTitle}>Preview Dokumen</div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => setShowIframe(s => !s)} style={btnSm} className="btn-hover">
                    {showIframe ? <FiEyeOff size={12} style={{ marginRight:5, verticalAlign:'middle' }} /> : <FiEye size={12} style={{ marginRight:5, verticalAlign:'middle' }} />}
                    {showIframe ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                  {dok.docsUrl && <a href={dok.docsUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, textDecoration:'none' }} className="btn-hover"><FiExternalLink size={12} style={{ marginRight:5, verticalAlign:'middle' }} />Edit</a>}
                </div>
              </div>
              {showIframe && dok.embedUrl ? (
                <iframe src={dok.embedUrl} style={{ width:'100%', height:520, border:'1px solid rgba(29,78,216,0.08)', borderRadius:16 }} title={dok.judul} />
              ) : !showIframe ? null : (
                <div style={emptyBox}>Preview tidak tersedia.</div>
              )}
            </div>
          </div>

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}><FiUpload size={13} style={{ marginRight:6, verticalAlign:'middle', color: GOLD }} />Upload Dokumen MOU/PKS (Admin)</div>
              <div style={{ ...hintText, marginBottom:10 }}>
                Admin bisa unggah dokumen Word langsung, sama seperti mitra. Dokumen lama otomatis diarsipkan (bukan dihapus) begitu diterapkan.
              </div>
              <input type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={pilihDocAdmin} disabled={docUploading} style={inputFull} />
              {docUploading && (
                <div style={{ fontSize:11, color:'#92400E', marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:12, height:12, border:'2px solid #FDE68A', borderTop:'2px solid #D97706', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }} />
                  Mengunggah…
                </div>
              )}
              {!docUploading && docUploadInfo && <div style={{ fontSize:11, color:'#0F6E56', marginTop:6 }}>{docUploadInfo}</div>}
              {docUploadError && <div style={{ fontSize:11, color:'#A32D2D', marginTop:6 }}>{docUploadError}</div>}
              {docFile && !docUploading && !docUploadedId && (
                <button onClick={uploadDocAdmin} style={{ ...btnPrimary, width:'100%', marginTop:8 }} className="btn-hover">Unggah</button>
              )}
              {docUploadedId && (
                <button onClick={terapkanDocAdmin} disabled={terapkanLoading} style={{ ...btnPrimary, width:'100%', marginTop:8, background:GOLD }} className="btn-hover">
                  {terapkanLoading ? 'Menerapkan…' : 'Terapkan sebagai Dokumen Aktif'}
                </button>
              )}
            </div>
          </div>

          <div className="fld"><KomentarRevisi idDokumen={dok.id} pengirim="admin" senderId={idAdmin} namaPengirim={namaAdmin} /></div>
          <KomentarDocs docsId={dok.docsId} namaPengirim={namaAdmin} />
        </div>

        {/* Kolom kanan */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}>Divisi Penanganan <span style={{ fontWeight:400, color:'#94a3b8', fontSize:10 }}>(pilih 0–{MAKS_DIVISI})</span></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom: divisiBerubah ? 10 : 0 }}>
                {Object.entries(DIVISI_LABEL).map(([key, info]) => {
                  const checked = divisiDraft.includes(key);
                  const disabled = !checked && divisiDraft.length >= MAKS_DIVISI;
                  return (
                    <button key={key} type="button" disabled={disabled} onClick={() => toggleDivisiDraft(key)}
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
              {divisiBerubah && (
                <div style={{ display:'flex', gap:6 }} className="fld">
                  <button onClick={batalDivisi} disabled={divisiSaving} style={{ ...btnSm, flex:1 }} className="btn-hover">Batal</button>
                  <button onClick={simpanDivisi} disabled={divisiSaving} style={{ ...btnPrimary, flex:1 }} className="btn-hover">
                    {divisiSaving ? 'Menyimpan…' : 'Simpan Perubahan'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {kontak && (kontak.email || kontak.noWa || kontak.namaPIC) && (
            <div style={shellStyle} className="fld">
              <div style={coreStyle}>
                <div style={cardTitle}><FiUser size={13} style={{ marginRight:6, verticalAlign:'middle', color: BLUE }} />Kontak Mitra</div>
                {kontak.namaPIC && (
                  <div style={kontakRow}>
                    <FiUser size={13} style={{ color:'#94a3b8', flexShrink:0 }} />
                    <span style={{ fontSize:12, color:'#334155', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{kontak.namaPIC}</span>
                  </div>
                )}
                {kontak.email && (
                  <div style={kontakRow}>
                    <FiMail size={13} style={{ color:'#94a3b8', flexShrink:0 }} />
                    <span style={{ fontSize:12, color:'#334155', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{kontak.email}</span>
                    <button onClick={() => salinTeks(kontak.email, 'email')} style={miniBtn} className="btn-hover" title="Salin email">
                      {copied === 'email' ? <FiCheck size={11} /> : <FiCopy size={11} />}
                    </button>
                  </div>
                )}
                {kontak.noWa && (
                  <div style={kontakRow}>
                    <FiPhone size={13} style={{ color:'#94a3b8', flexShrink:0 }} />
                    <span style={{ fontSize:12, color:'#334155', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{kontak.noWa}</span>
                    {kontak.waLink && (
                      <a href={kontak.waLink} target="_blank" rel="noopener noreferrer" style={{ ...miniBtn, textDecoration:'none', color:'#16A34A' }} className="btn-hover" title="Buka WhatsApp">
                        <FiExternalLink size={11} />
                      </a>
                    )}
                  </div>
                )}
                {!kontak.namaPIC && !kontak.email && !kontak.noWa && (
                  <div style={{ fontSize:11, color:'#94a3b8' }}>Kontak mitra belum tersedia.</div>
                )}
              </div>
            </div>
          )}

          {(dok.ttdStatus || dok.ttdTglFinal) && (
            <div style={shellStyle} className="fld">
              <div style={coreStyle}>
                <div style={cardTitle}><FiPenTool size={13} style={{ marginRight:6, verticalAlign:'middle', color: GOLD }} />Penandatanganan Dokumen</div>

                {dok.ttdStatus === 'Disetujui' ? (
                  <div style={ttdDoneBox}>
                    <FiCheckCircle size={16} style={{ color: BLUE, flexShrink:0, marginTop:1 }} />
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#0f1f3d' }}>TTD {dok.ttdTipe === 'basah' ? 'Basah' : 'Online'} tercatat</div>
                      <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>Tanggal: {dok.ttdTglFinal}</div>
                    </div>
                  </div>
                ) : dok.ttdStatus === 'Menunggu Review' ? (
                  <div>
                    <div style={hintText}>Mitra mengajukan TTD Online pada tanggal:</div>
                    <div style={{ fontSize:14, fontWeight:700, color: BLUE_DARK, marginBottom:10 }}>{dok.ttdTglDiajukan}</div>
                    {!showTolakTtd ? (
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={setujuiTtd} disabled={ttdSaving} style={{ ...btnPrimary, flex:1 }} className="btn-hover">
                          <FiCheck size={13} style={{ marginRight:5, verticalAlign:'middle' }} />Setujui
                        </button>
                        <button onClick={() => setShowTolakTtd(true)} disabled={ttdSaving} style={{ ...btnSm, flex:1, color:'#A32D2D', borderColor:'#FCEBEB' }} className="btn-hover">
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <div style={kembaliBox}>
                        <label style={{ ...labelSt, marginBottom:6 }}>Alasan penolakan *</label>
                        <textarea value={alasanTolakTtd} onChange={e => setAlasanTolakTtd(e.target.value)}
                          placeholder="Contoh: Tanggal bentrok dengan jadwal internal, mohon ajukan tanggal lain…"
                          style={{ ...inputFull, height:56, resize:'none', marginBottom:8 }} autoFocus />
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => { setShowTolakTtd(false); setAlasanTolakTtd(''); }} disabled={ttdSaving} style={{ ...btnSm, flex:1 }} className="btn-hover">Batal</button>
                          <button onClick={tolakTtd} disabled={ttdSaving || !alasanTolakTtd.trim()} style={{ ...btnSm, flex:1, background:'#FCEBEB', color:'#A32D2D', borderColor:'#FCA5A5' }} className="btn-hover">
                            {ttdSaving ? 'Mengirim…' : 'Kirim Penolakan'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : dok.ttdStatus === 'Menunggu Basah' ? (
                  <div>
                    <div style={hintText}>Mitra memilih TTD Basah. Menunggu dokumen fisik diterima.</div>

                    {dok.docsId && (
                      <a href={`https://docs.google.com/document/d/${dok.docsId}/export?format=pdf`} target="_blank" rel="noopener noreferrer"
                        style={{ ...btnSm, width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, textDecoration:'none', marginBottom:10, boxSizing:'border-box' }} className="btn-hover">
                        <FiDownload size={13} />Cetak Dokumen (PDF siap print)
                      </a>
                    )}

                    {!showInputBasah ? (
                      <button onClick={() => setShowInputBasah(true)} style={{ ...btnPrimary, width:'100%' }} className="btn-hover">
                        <FiEdit3 size={13} style={{ marginRight:6, verticalAlign:'middle' }} />Input Tanggal TTD
                      </button>
                    ) : (
                      <div style={kembaliBox}>
                        <label style={{ ...labelSt, marginBottom:6 }}>Tanggal dokumen ditandatangani *</label>
                        <input type="date" style={{ ...inputFull, marginBottom:8 }} value={tglBasah} onChange={e => setTglBasah(e.target.value)} />
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => { setShowInputBasah(false); setTglBasah(''); }} disabled={ttdSaving} style={{ ...btnSm, flex:1 }} className="btn-hover">Batal</button>
                          <button onClick={inputTtdBasah} disabled={ttdSaving || !tglBasah} style={{ ...btnPrimary, flex:1 }} className="btn-hover">
                            {ttdSaving ? 'Menyimpan…' : 'Simpan'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(15,23,42,0.06)' }}>
                      <label style={{ ...labelSt, display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                        <FiUpload size={12} />Upload Dokumen Hasil TTD Basah
                      </label>
                      <div style={{ ...hintText, marginBottom:8 }}>
                        Scan/foto dokumen yang sudah ditandatangani fisik. Otomatis dipertajam & diarsipkan — dokumen kerja yang sedang aktif tidak akan diganti.
                      </div>
                      <input type="file" accept="image/jpeg,image/jpg,image/png,application/pdf" onChange={pilihScan} disabled={scanUploading} style={inputFull} />
                      {scanUploading && (
                        <div style={{ fontSize:11, color:'#92400E', marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ width:12, height:12, border:'2px solid #FDE68A', borderTop:'2px solid #D97706', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }} />
                          {scanInfo || 'Memproses…'}
                        </div>
                      )}
                      {!scanUploading && scanInfo && <div style={{ fontSize:11, color:'#0F6E56', marginTop:6 }}>{scanInfo}</div>}
                      {scanError && <div style={{ fontSize:11, color:'#A32D2D', marginTop:6 }}>{scanError}</div>}
                      {scanFile && !scanUploading && (
                        <button onClick={uploadScan} style={{ ...btnPrimary, width:'100%', marginTop:8 }} className="btn-hover">
                          Unggah &amp; Arsipkan Scan
                        </button>
                      )}
                      {(scanUrl || dok.scanTtdUrl) && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                          <a href={scanUrl || dok.scanTtdUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color: BLUE, flex:1 }}>Lihat scan yang diunggah →</a>
                          <button onClick={hapusScan} disabled={deletingScan} style={{ ...btnSm, fontSize:10, color:'#A32D2D', borderColor:'#FCEBEB', display:'flex', alignItems:'center', gap:4 }} className="btn-hover">
                            <FiTrash2 size={11} />{deletingScan ? 'Menghapus…' : 'Hapus (salah upload)'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {(dok.ttdStatus === 'Disetujui' || dok.ttdStatus === 'Menunggu Review' || dok.ttdStatus === 'Menunggu Basah') && (
                  <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(15,23,42,0.06)' }}>
                    {!showBatalkanTtd ? (
                      <button onClick={() => setShowBatalkanTtd(true)} style={{ ...btnSm, width:'100%', color:'#A32D2D', borderColor:'#FCEBEB', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }} className="btn-hover">
                        <FiEdit2 size={12} />Batalkan Pemilihan TTD (salah klik)
                      </button>
                    ) : (
                      <div style={kembaliBox}>
                        <div style={{ fontSize:11.5, color:'#92400E', marginBottom:8 }}>
                          Ini akan reset pemilihan TTD {dok.ttdTipe === 'basah' ? 'Basah' : 'Online'} — mitra bisa pilih ulang dari awal. Yakin?
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => setShowBatalkanTtd(false)} disabled={ttdSaving} style={{ ...btnSm, flex:1 }} className="btn-hover">Batal</button>
                          <button onClick={batalkanTtd} disabled={ttdSaving} style={{ ...btnSm, flex:1, background:'#FCEBEB', color:'#A32D2D', borderColor:'#FCA5A5' }} className="btn-hover">
                            {ttdSaving ? 'Memproses…' : 'Ya, Batalkan'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {(dok.status === 'Dalam Proses' || dok.status === 'Draft') && (
            <div style={{ ...shellStyle, borderColor:'rgba(29,78,216,0.16)' }} className="fld">
              <div style={{ ...coreStyle, background:'linear-gradient(170deg,#f8fafc,#eef4fc)' }}>
                <div style={cardTitle}>Tindakan</div>
                {dok.status === 'Dalam Proses' && (
                  <>
                    <button onClick={() => transisi('Selesai')} disabled={saving} style={{ ...btnPrimary, width:'100%', marginBottom:8 }} className="btn-hover">
                      <FiCheck size={14} style={{ marginRight:6, verticalAlign:'middle' }} />Setujui Dokumen (Acc)
                    </button>
                    {!showKembaliBox ? (
                      <button onClick={() => setShowKembaliBox(true)} disabled={saving} style={{ ...btnSm, width:'100%', color:'#92400E', borderColor:'#FDE68A' }} className="btn-hover">
                        <FiCornerUpLeft size={12} style={{ marginRight:6, verticalAlign:'middle' }} />Kembalikan ke Draft
                      </button>
                    ) : (
                      <div style={kembaliBox}>
                        <label style={{ ...labelSt, marginBottom:6 }}>Alasan pengembalian *</label>
                        <textarea
                          value={alasanKembali}
                          onChange={e => setAlasanKembali(e.target.value)}
                          placeholder="Contoh: Nomor pihak kedua belum diisi, tolong lengkapi dulu…"
                          style={{ ...inputFull, height:64, resize:'none', marginBottom:8 }}
                          autoFocus
                        />
                        <div style={{ fontSize:10, color:'#94a3b8', marginBottom:8, lineHeight:1.4 }}>
                          Alasan ini otomatis tercatat di Komentar Revisi dan mitra akan mendapat notifikasi.
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => { setShowKembaliBox(false); setAlasanKembali(''); }} disabled={saving} style={{ ...btnSm, flex:1 }} className="btn-hover">Batal</button>
                          <button onClick={kembalikanKeDraft} disabled={saving || !alasanKembali.trim()} style={{ ...btnSm, flex:1, background:'#FEF3C7', color:'#92400E', borderColor:'#FDE68A' }} className="btn-hover">
                            {saving ? 'Mengirim…' : 'Kirim & Kembalikan'}
                          </button>
                        </div>
                      </div>
                    )}
                    <div style={hintText}>Acc → status &quot;Selesai&quot;. Saat tanggal kegiatan tiba, otomatis jadi &quot;Kegiatan Berlangsung&quot;.</div>
                  </>
                )}
                {dok.status === 'Draft' && (
                  <div>
                    <div style={{ fontSize:11.5, color:'#64748b', lineHeight:1.6, marginBottom:10 }}>
                      Dokumen masih Draft. Normalnya mitra klik &quot;Selesai Mengisi&quot; dari halaman mereka, tapi admin juga bisa menandainya langsung.
                    </div>
                    <button onClick={tandaiSelesaiMengisi} disabled={saving} style={{ ...btnPrimary, width:'100%' }} className="btn-hover">
                      <FiCheck size={13} style={{ marginRight:6, verticalAlign:'middle' }} />
                      {saving ? 'Memproses…' : 'Tandai Selesai Mengisi (atas nama Mitra)'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {bolehGantiTemplate && (
            <div style={shellStyle} className="fld">
              <div style={coreStyle}>
                <div style={cardTitle}>Template Dokumen {dok.jenis}</div>
                <div style={hintText}>Pilih sumber naskah kerja yang aktif dipakai.</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
                  <div style={templateCard(false, true)}>
                    <FiBriefcase size={20} style={{ color: BLUE, marginBottom:6 }} />
                    <div style={templateCardTitle}>Template Resmi BNN</div>
                    <div style={templateCardDesc}>Gunakan template standar BNN Provinsi</div>
                  </div>
                  {!templateChecked ? (
                    <div style={templateCard(false, false)}>
                      <FiLoader size={20} style={{ color:'#94a3b8', marginBottom:6 }} className="spin" />
                      <div style={templateCardTitle}>Memeriksa…</div>
                    </div>
                  ) : kandidatUtama ? (
                    <button
                      onClick={() => gantiTemplate(kandidatUtama.fileId)}
                      disabled={applyingTemplate === kandidatUtama.fileId}
                      style={{ ...templateCard(true, true), cursor:'pointer', border:'none', textAlign:'left', font:'inherit' }}
                      className="tpl-active"
                    >
                      <FiFileText size={20} style={{ color: GOLD, marginBottom:6 }} />
                      <div style={templateCardTitle}>{applyingTemplate ? 'Mengganti…' : 'Dokumen Mitra'}</div>
                      <div style={templateCardDesc}>{kandidatUtama.namaFile}</div>
                    </button>
                  ) : (
                    <div style={templateCard(false, false)} title="Mitra belum mengunggah berkas">
                      <FiClose size={20} style={{ color:'#cbd5e1', marginBottom:6 }} />
                      <div style={templateCardTitle}>Dokumen Mitra</div>
                      <div style={templateCardDesc}>Tidak aktif — belum ada berkas</div>
                    </div>
                  )}
                </div>
                {templateKandidat.length > 1 && (
                  <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                    {templateKandidat.slice(1).map(t => (
                      <div key={t.fileId} style={miniCandidateRow}>
                        <span style={{ fontSize:11, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{t.namaFile}</span>
                        <button onClick={() => gantiTemplate(t.fileId)} disabled={applyingTemplate === t.fileId} style={{ ...btnSm, fontSize:10, padding:'4px 10px' }} className="btn-hover">
                          {applyingTemplate === t.fileId ? '…' : 'Gunakan'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}><FiFileText size={13} style={{ marginRight:6, verticalAlign:'middle', color: GOLD }} />Masa Berlaku Kesepakatan {dok.jenis}</div>
              <div style={hintText}>Tanggal mulai otomatis dari Acc. Tanggal berakhir diisi sesuai kesepakatan dengan mitra.</div>
              <div style={mouKesepakatanBox}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: (!dok.tglBerakhir || editTglBerakhir) ? 10 : 0 }}>
                  <div>
                    <div style={{ fontSize:9.5, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.4, fontWeight:600 }}>Mulai</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0f1f3d' }}>{dok.tglBerlaku}</div>
                  </div>
                  <div style={{ color: GOLD, fontSize:16 }}>→</div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9.5, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.4, fontWeight:600 }}>Berakhir</div>
                    {dok.tglBerakhir && !editTglBerakhir ? (
                      <div style={{ fontSize:13, fontWeight:700, color:'#0f1f3d', display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                        {dok.tglBerakhir}
                        <button onClick={() => { setEditTglBerakhir(true); setTglBerakhirDraft(dok.tglBerakhir); }} style={miniIconBtnGold} className="btn-hover" title="Ubah tanggal">
                          <FiEdit2 size={11} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize:11, color:'#A32D2D', fontWeight:600 }}>Belum ditetapkan</div>
                    )}
                  </div>
                </div>
                {(!dok.tglBerakhir || editTglBerakhir) && (
                  <div style={{ display:'flex', gap:6 }}>
                    <input type="date" style={{ ...inputFull, flex:1 }} value={tglBerakhirDraft} onChange={e => setTglBerakhirDraft(e.target.value)} />
                    {editTglBerakhir && (
                      <button onClick={() => { setEditTglBerakhir(false); setTglBerakhirDraft(dok.tglBerakhir); }} style={btnSm} className="btn-hover">Batal</button>
                    )}
                    <button onClick={simpanTglBerakhir} disabled={savingTglBerakhir || !tglBerakhirDraft} style={{ ...btnPrimary, whiteSpace:'nowrap' }} className="btn-hover">
                      {savingTglBerakhir ? 'Menyimpan…' : 'Simpan'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}><FiCalendar size={13} style={{ marginRight:6, verticalAlign:'middle', color: BLUE }} />Tanggal Kegiatan</div>
              <div style={hintText}>Memicu perpindahan otomatis status. Terpisah dari masa berlaku dokumen.</div>
              <label style={labelSt}>Mulai</label>
              <input type="date" style={{ ...inputFull, marginBottom:10 }} value={tglMulai} onChange={e => setTglMulai(e.target.value)} />
              <label style={labelSt}>Selesai</label>
              <input type="date" style={{ ...inputFull, marginBottom:10 }} value={tglSelesai} onChange={e => setTglSelesai(e.target.value)} />
              <button onClick={saveTanggal} disabled={saving} style={{ ...btnPrimary, width:'100%' }} className="btn-hover">
                {saving ? 'Menyimpan…' : 'Simpan Tanggal'}
              </button>
            </div>
          </div>

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}><FiDownload size={13} style={{ marginRight:6, verticalAlign:'middle', color: GOLD }} />Unduh PDF</div>
              {bolehUnduhPdf ? (
                <>
                  <button onClick={unduhPdf} disabled={genPdf} style={{ ...btnPrimary, width:'100%', background:`linear-gradient(135deg,${GOLD},#B45309)` }} className="btn-hover">
                    {genPdf ? 'Membuat PDF…' : 'Unduh PDF Kualitas Tinggi'}
                  </button>
                  <div style={hintText}>PDF dibuat langsung dari Google Docs.</div>
                </>
              ) : (
                <div style={emptyBox}>PDF tersedia setelah status &quot;Selesai&quot;.</div>
              )}
            </div>
          </div>

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}>Ubah Status (Manual)</div>
              <select style={{ ...inputFull, marginBottom:10 }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={saveStatusManual} disabled={saving || editStatus === dok.status} style={{ ...btnSm, width:'100%' }} className="btn-hover">
                {saving ? 'Menyimpan…' : 'Simpan Status Manual'}
              </button>
              <div style={hintText}>Override manual bebas. Otomatisasi hanya mendorong status maju.</div>
            </div>
          </div>

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              {dok.tglKegiatanMulai && !publikasiDitolak ? (
                <>
                  <div style={cardTitle}><FiZap size={13} style={{ marginRight:6, verticalAlign:'middle', color: GOLD }} />Publikasikan ke Beranda?</div>
                  <div style={{ ...hintText, marginBottom:12 }}>
                    Tanggal kegiatan sudah disepakati ({dok.tglKegiatanMulai}). Apakah Anda ingin mempublikasikan kegiatan {dok.jenis} ini ke halaman publik?
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => { localStorage.setItem(`extractPoinDitolak_${id}`, '1'); setPublikasiDitolak(true); }} style={{ ...btnSm, flex:1 }} className="btn-hover">
                      Nanti Saja
                    </button>
                    <a href={`/dashboard/dokumen/extract-poin?idDokumen=${dok.id}&tglMulai=${dok.tglKegiatanMulai}`} style={{ ...btnPrimary, flex:1, textAlign:'center', textDecoration:'none' }} className="btn-hover">
                      Ya, Publikasikan
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div style={cardTitle}>Aksi Cepat</div>
                  {!dok.tglKegiatanMulai && (
                    <div style={{ ...hintText, marginBottom:10 }}>Toggle publikasi akan muncul otomatis setelah Tanggal Kegiatan diisi.</div>
                  )}
                  <a href={`/dashboard/dokumen/extract-poin?idDokumen=${dok.id}${dok.tglKegiatanMulai ? `&tglMulai=${dok.tglKegiatanMulai}` : ''}`} style={{ ...btnSm, textDecoration:'none', textAlign:'center', display:'block' }} className="btn-hover">
                    <FiZap size={12} style={{ marginRight:6, verticalAlign:'middle' }} />Kelola Publikasi di Extract Poin
                  </a>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      @keyframes fadeUp { from { opacity:0; transform: translateY(14px); filter: blur(3px);} to { opacity:1; transform: translateY(0); filter: blur(0);} }
      @keyframes spin { to { transform: rotate(360deg); } }
      .fld { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
      .spin { animation: spin 1s linear infinite; }
      .btn-hover { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
      .btn-hover:active:not(:disabled) { transform: scale(0.98); }
      .tpl-active { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
      .tpl-active:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 22px -8px rgba(29,78,216,0.3); }
    `}</style>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.9rem 1.5rem', background:'rgba(255,255,255,0.75)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(29,78,216,0.06)', position:'sticky', top:0, zIndex:100, gap:8 };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#64748b', textDecoration:'none', flexShrink:0, fontWeight:600, display:'flex', alignItems:'center', gap:6 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', borderRadius:22, padding:6, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:17, padding:'1.15rem 1.3rem', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const cardTitle: React.CSSProperties = { fontSize:12.5, fontWeight:700, marginBottom:10, color:'#0f1f3d' };
const labelSt: React.CSSProperties = { display:'block', fontSize:11, color:'#475569', marginBottom:5, fontWeight:600 };
const hintText: React.CSSProperties = { fontSize:10.5, color:'#94a3b8', marginBottom:8, lineHeight:1.5, marginTop: -2 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 11px', borderRadius:10, border:'1.5px solid rgba(29,78,216,0.10)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', outline:'none', background:'#f8fafc' };
const btnPrimary: React.CSSProperties = { padding:'10px 16px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:`0 6px 16px -6px ${BLUE}60` };
const btnSm: React.CSSProperties = { padding:'8px 13px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', color:'#334155', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap' };
const btnGhost: React.CSSProperties = { fontSize:12, padding:'7px 14px', borderRadius:10, border:'1px solid rgba(29,78,216,0.08)', textDecoration:'none', color:'#334155', background:'#fff', fontWeight:600 };
const pill: React.CSSProperties = { fontSize:10.5, fontWeight:700, padding:'3px 11px', borderRadius:100 };
const infoNote: React.CSSProperties = { fontSize:10.5, color:'#94a3b8', marginTop:10, padding:'7px 11px', background:'#f8fafc', borderRadius:9, display:'flex', alignItems:'flex-start' };
const emptyBox: React.CSSProperties = { padding:'2rem', textAlign:'center', color:'#94a3b8', fontSize:11.5, background:'#f8fafc', borderRadius:12 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:12 });
const centerStyle: React.CSSProperties = { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f7fa', color:'#6b7280', fontSize:13 };
const miniCandidateRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'#f8fafc', borderRadius:8, border:'1px solid rgba(29,78,216,0.06)' };
const kontakRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, padding:'7px 2px', borderBottom:'1px solid rgba(29,78,216,0.05)' };
const miniBtn: React.CSSProperties = { width:24, height:24, borderRadius:8, border:'1px solid rgba(29,78,216,0.10)', background:'#fff', color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const kembaliBox: React.CSSProperties = { background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'10px 12px' };
const mouKesepakatanBox: React.CSSProperties = { background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:11, padding:'11px 13px' };
const miniIconBtnGold: React.CSSProperties = { width:20, height:20, borderRadius:6, border:'1px solid rgba(217,119,6,0.25)', background:'#fff', color:'#D97706', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const ttdDoneBox: React.CSSProperties = { display:'flex', gap:10, padding:'10px 12px', background:'#EFF6FF', borderRadius:12, border:'1px solid rgba(29,78,216,0.12)' };

const templateCard = (active: boolean, enabled: boolean): React.CSSProperties => ({
  padding:'14px 12px', borderRadius:14, textAlign:'center',
  border: `1.5px solid ${active ? BLUE : 'rgba(29,78,216,0.08)'}`,
  background: active ? 'linear-gradient(160deg,#EFF6FF,#DBEAFE)' : (enabled ? '#fff' : '#f7f8f7'),
  opacity: enabled ? 1 : 0.55,
  cursor: enabled ? 'default' : 'not-allowed',
  width: '100%',
});
const templateCardTitle: React.CSSProperties = { fontSize:11.5, fontWeight:700, color:'#0f1f3d' };
const templateCardDesc: React.CSSProperties = { fontSize:9.5, color:'#7d8985', marginTop:3, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' };