'use client';

import { useEffect, useState, useCallback, use } from 'react';
import KomentarRevisi from '@/components/KomentarRevisi';
import KomentarDocs from '@/components/KomentarDocs';
import {
  FiArrowLeft, FiBell, FiLogOut, FiLock, FiFileText, FiClock, FiInfo,
  FiCheckCircle, FiAlertCircle, FiCalendar, FiCamera, FiUpload, FiTrash2,
  FiDownload, FiPaperclip, FiExternalLink, FiEyeOff, FiEye, FiEdit2,
  FiCheck, FiX, FiHome, FiPenTool, FiSend,
} from 'react-icons/fi';

interface Dokumen {
  id: string; jenis: string; judul: string; namaMitra: string; idMitra: string;
  docsId: string;
  tglBerlaku: string; tglBerakhir: string; durasi: string;
  status: string; kode: string; embedUrl: string;
  docsUrl: string; fotoFolderId: string; catatan: string;
  tglKegiatanMulai: string; tglKegiatanSelesai: string;
  sisaHari: number | null;
  ttdTipe: string; ttdTglDiajukan: string; ttdStatus: string; ttdTglFinal: string; ttdCatatan: string;
}

interface Notif { id: string; tipe: string; judul: string; pesan: string; dibaca: boolean; tglDibuat: string; }
interface FotoItem { fileId: string; nama: string; ukuran: number; thumbnailUrl: string; url: string; caption: string; tanggalUpload: string; }

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  'Draft':                     { bg: '#eef2f6', color: '#475569' },
  'Dalam Proses':              { bg: '#FEF3C7', color: '#92400E' },
  'Selesai':                   { bg: '#DBEAFE', color: '#1D4ED8' },
  'Kegiatan Akan Berlangsung': { bg: '#DBEAFE', color: '#1D4ED8' },
  'Kegiatan Berlangsung':      { bg: '#FEF3C7', color: '#B45309' },
  'Kegiatan Selesai':          { bg: '#DBEAFE', color: '#1E40AF' },
  'MOU/PKS Berlaku':           { bg: '#DBEAFE', color: '#1D4ED8' },
  'Kedaluwarsa':                { bg: '#FCEBEB', color: '#A32D2D' },
};

const STATUS_DESC: Record<string, string> = {
  'Draft':                     'Dokumen masih bisa diedit. Klik "Selesai Mengisi" jika sudah final.',
  'Dalam Proses':              'Sedang ditinjau oleh tim Pokja BNN.',
  'Selesai':                   'Dokumen disetujui, menunggu jadwal kegiatan.',
  'Kegiatan Akan Berlangsung': 'Dokumen final. Menunggu tanggal kegiatan dimulai.',
  'Kegiatan Berlangsung':      'Kegiatan sedang berlangsung — Anda bisa upload foto.',
  'Kegiatan Selesai':          'Kegiatan telah selesai.',
  'MOU/PKS Berlaku':           'Dokumen aktif & berlaku.',
  'Kedaluwarsa':               'Masa berlaku dokumen telah berakhir.',
};

const KUOTA_MAX = 5 * 1024 * 1024;
const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

function namaBulan(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } catch { return 'Tanggal tidak diketahui'; }
}

export default function MitraDokumenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [dok, setDok]           = useState<Dokumen | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [msg, setMsg]           = useState('');
  const [showIframe, setShowIframe] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [genPdf, setGenPdf]     = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(false);

  const [notif, setNotif]       = useState<Notif[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  const [foto, setFoto]         = useState<FotoItem[]>([]);
  const [terpakai, setTerpakai] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  const [tglMulai, setTglMulai]     = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [savingTgl, setSavingTgl]   = useState(false);

  const [templateMitra, setTemplateMitra] = useState<{ fileId: string; namaFile: string; fileUrl: string } | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');

  const [ttdSaving, setTtdSaving] = useState(false);
  const [showAjukanOnline, setShowAjukanOnline] = useState(false);
  const [tglTtdAjukan, setTglTtdAjukan] = useState('');

  const loadTemplateMitra = useCallback(() => {
    fetch(`/api/dokumen/upload-template?idDokumen=${id}`)
      .then(r => r.json())
      .then(d => setTemplateMitra(d.data || null))
      .catch(() => {});
  }, [id]);

  const uploadTemplateMitra = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!allowedMime.includes(f.type)) { setTemplateError('Hanya file Word (.doc/.docx) yang diizinkan.'); return; }
    if (f.size > 1 * 1024 * 1024) { setTemplateError(`File terlalu besar (${(f.size/1024/1024).toFixed(2)}MB). Maksimal 1MB.`); return; }

    setUploadingTemplate(true); setTemplateError('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Gagal baca file'));
        reader.readAsDataURL(f);
      });
      const r = await fetch('/api/dokumen/upload-template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: id, fileBase64: base64, fileName: f.name, fileMime: f.type }),
      });
      const d = await r.json();
      if (!r.ok) { setTemplateError(d.message || 'Gagal mengunggah.'); return; }
      setTemplateMitra(d.data);
      setMsg('Draf berhasil diunggah. Admin akan meninjau untuk menggunakannya.');
    } catch { setTemplateError('Gagal mengunggah draf.'); }
    finally { setUploadingTemplate(false); if (e.target) e.target.value = ''; }
  };

  const loadDok = useCallback(() => {
    fetch(`/api/dokumen/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.message) { setError(d.message); setLoading(false); return; }
        setDok(d.dokumen);
        setTglMulai(d.dokumen.tglKegiatanMulai || '');
        setTglSelesai(d.dokumen.tglKegiatanSelesai || '');
        setLoading(false);
        if (d.dokumen.fotoFolderId) loadFoto(d.dokumen.fotoFolderId);
      })
      .catch(() => { setError('Gagal memuat dokumen.'); setLoading(false); });
  }, [id]);

  const loadNotif = useCallback(() => {
    fetch(`/api/notifikasi?idDokumen=${id}`)
      .then(r => r.json())
      .then(d => setNotif(d.notifikasi || []))
      .catch(() => {});
  }, [id]);

  const loadFoto = (folderId: string) => {
    fetch('/api/dokumen/foto/list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fotoFolderId: folderId }),
    })
      .then(r => r.json())
      .then(d => { if (d.files) { setFoto(d.files); setTerpakai(d.terpakai || 0); } })
      .catch(() => {});
  };

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_mitra');
    if (!raw) { window.location.href = '/login-mitra'; return; }
    try {
      const u = JSON.parse(raw);
      if (u.idDokumen !== id) { setError('Anda tidak memiliki akses ke dokumen ini.'); setLoading(false); return; }
    } catch { window.location.href = '/login-mitra'; return; }
    loadDok();
    loadNotif();
    loadTemplateMitra();
  }, [id, loadDok, loadNotif, loadTemplateMitra]);

  const belumDibaca = notif.filter(n => !n.dibaca).length;

  const bukaNotif = async () => {
    setShowNotif(s => !s);
    if (!showNotif && belumDibaca > 0) {
      try {
        await fetch('/api/notifikasi', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idDokumen: id, semua: true }),
        });
        setNotif(prev => prev.map(n => ({ ...n, dibaca: true })));
      } catch {}
    }
  };

  const selesaiMengisi = async () => {
    setSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch(`/api/dokumen/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transisi: 'Dalam Proses' }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return; }
      setDok(prev => prev ? { ...prev, status: 'Dalam Proses' } : prev);
      setKonfirmasi(false);
      setMsg('Dokumen telah dikirim untuk ditinjau tim Pokja. Terima kasih!');
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const ttdRequest = async (body: Record<string, unknown>) => {
    setTtdSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch(`/api/dokumen/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return false; }
      setMsg(d.message);
      loadDok();
      return true;
    } catch { setError('Terjadi kesalahan.'); return false; }
    finally { setTtdSaving(false); }
  };

  const pilihTtdBasah = () => {
    if (!confirm('Yakin pilih TTD Basah? Admin akan diberi tahu untuk menyiapkan penerimaan dokumen fisik.')) return;
    ttdRequest({ ttdAction: 'pilihBasah' });
  };

  const ajukanTtdOnline = async () => {
    if (!tglTtdAjukan) { setError('Tanggal TTD wajib diisi.'); return; }
    const ok = await ttdRequest({ ttdAction: 'ajukanOnline', tglDiajukan: tglTtdAjukan });
    if (ok) { setShowAjukanOnline(false); setTglTtdAjukan(''); }
  };

  const saveTanggal = async () => {
    setSavingTgl(true); setError(''); setMsg('');
    try {
      const res = await fetch(`/api/dokumen/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tglKegiatanMulai: tglMulai, tglKegiatanSelesai: tglSelesai }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return; }
      setDok(prev => prev ? { ...prev, tglKegiatanMulai: tglMulai, tglKegiatanSelesai: tglSelesai } : prev);
      setMsg('Tanggal kegiatan disimpan. Admin dapat melihat & menyesuaikannya kembali jika diperlukan.');
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSavingTgl(false); }
  };

  const pilihFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Hanya file gambar yang diizinkan.'); return; }
    if (terpakai + f.size > KUOTA_MAX) { setError('Kuota foto penuh (maks 5MB per dokumen).'); return; }
    setPendingFile(f); setPendingCaption(''); setError('');
  };

  const batalPilihFoto = () => { setPendingFile(null); setPendingCaption(''); };

  const uploadFoto = async () => {
    if (!pendingFile || !dok) return;
    setUploading(true); setError(''); setMsg('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Gagal baca'));
        reader.readAsDataURL(pendingFile);
      });
      const r = await fetch('/api/dokumen/foto/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fotoFolderId: dok.fotoFolderId, fileBase64: base64, fileName: pendingFile.name, fileMime: pendingFile.type, idDokumen: id, caption: pendingCaption }),
      });
      const d = await r.json();
      if (!r.ok || d.success === false) { setError(d.message || d.error || 'Gagal upload.'); return; }
      setMsg('Foto berhasil diunggah.');
      setPendingFile(null); setPendingCaption('');
      loadFoto(dok.fotoFolderId);
    } catch { setError('Gagal upload foto.'); }
    finally { setUploading(false); }
  };

  const hapusFotoSendiri = async (fileId: string) => {
    if (!dok) return;
    try {
      const r = await fetch('/api/dokumen/foto/hapus', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fotoFolderId: dok.fotoFolderId }),
      });
      const d = await r.json();
      if (d.success === false) { setError(d.error || 'Gagal hapus.'); return; }
      setFoto(prev => prev.filter(x => x.fileId !== fileId));
      if (typeof d.terpakai === 'number') setTerpakai(d.terpakai);
    } catch { setError('Gagal hapus foto.'); }
  };

  const mulaiEditCaption = (f: FotoItem) => { setEditingCaption(f.fileId); setCaptionDraft(f.caption || ''); };

  const simpanCaption = async (fileId: string) => {
    setSavingCaption(true);
    try {
      const r = await fetch('/api/dokumen/foto/caption', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, caption: captionDraft }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.message || 'Gagal menyimpan deskripsi.'); return; }
      setFoto(prev => prev.map(f => f.fileId === fileId ? { ...f, caption: d.caption } : f));
      setEditingCaption(null);
    } catch { setError('Gagal menyimpan deskripsi.'); }
    finally { setSavingCaption(false); }
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

  const logout = () => { localStorage.removeItem('paktasign_mitra'); window.location.href = '/login-mitra'; };

  if (loading) return <div style={{ ...centerStyle, fontFamily: FONT }}><GlobalStyle />Memuat dokumen…</div>;
  if (error && !dok) return (
    <div style={{ ...centerStyle, color:'#A32D2D', fontFamily: FONT }}>
      <GlobalStyle />
      <FiLock size={38} style={{ marginBottom:12, opacity:0.6 }} />
      <div style={{ fontSize:14, fontWeight:700 }}>{error}</div>
      <button onClick={logout} style={{ ...btnSm, marginTop:16 }} className="btn-hover">Keluar</button>
    </div>
  );
  if (!dok) return null;

  const sc = STATUS_COLOR[dok.status] || { bg:'#eef2f6', color:'#475569' };
  const bolehUnduhPdf = ['Selesai','Kegiatan Akan Berlangsung','Kegiatan Berlangsung','Kegiatan Selesai','MOU/PKS Berlaku','Kedaluwarsa'].includes(dok.status);
  const bisaUploadFoto = dok.status === 'Kegiatan Berlangsung';
  const persen = Math.round((terpakai / KUOTA_MAX) * 100);

  // Kelompokkan foto per bulan (terbaru dulu)
  const fotoUrut = [...foto].sort((a, b) => new Date(b.tanggalUpload).getTime() - new Date(a.tanggalUpload).getTime());
  const grup: { label: string; items: FotoItem[] }[] = [];
  fotoUrut.forEach(f => {
    const label = namaBulan(f.tanggalUpload);
    const existing = grup.find(g => g.label === label);
    if (existing) existing.items.push(f); else grup.push({ label, items: [f] });
  });

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#f7f9fc,#eef2f8)', fontFamily: FONT }}>
      <GlobalStyle />
      <nav style={navStyle}>
        <a href="/dashboard/mitra" style={backLink}><FiArrowLeft size={13} /> Dashboard Saya</a>
        <div style={{ fontWeight:700, fontSize:13.5, color:'#0f1f3d' }}>Detail Dokumen</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={bukaNotif} style={{ ...btnSm, position:'relative', padding:'8px 11px' }} className="btn-hover" title="Notifikasi">
            <FiBell size={14} />
            {belumDibaca > 0 && <span style={notifBadge}>{belumDibaca}</span>}
          </button>
          <button onClick={logout} style={btnSm} className="btn-hover"><FiLogOut size={13} style={{ marginRight:5, verticalAlign:'middle' }} />Keluar</button>
        </div>
      </nav>

      {showNotif && (
        <div style={{ maxWidth:1000, margin:'14px auto 0', padding:'0 1.25rem' }} className="fld">
          <div style={{ ...shellStyle, borderColor:GOLD }}>
            <div style={coreStyle}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={cardTitle}><FiBell size={13} style={{ marginRight:6, verticalAlign:'middle' }} />Notifikasi</div>
                <button onClick={() => setShowNotif(false)} style={{ ...btnSm, padding:'5px 10px' }} className="btn-hover">Tutup</button>
              </div>
              {notif.length === 0 ? (
                <div style={emptyBox}>Belum ada notifikasi.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:280, overflowY:'auto' }}>
                  {notif.map(n => (
                    <div key={n.id} style={{ display:'flex', gap:10, padding:'10px 12px', background: n.tipe==='hapus-foto'?'#FFF5F5':'#f8fafc', borderRadius:10, border:`1px solid ${n.tipe==='hapus-foto'?'#F7C1C1':'rgba(29,78,216,0.08)'}` }}>
                      <FiInfo size={15} style={{ color: n.tipe==='hapus-foto' ? '#A32D2D' : BLUE, flexShrink:0, marginTop:2 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color: n.tipe==='hapus-foto'?'#A32D2D':'#1e293b' }}>{n.judul}</div>
                        <div style={{ fontSize:11.5, color:'#64748b', marginTop:2, lineHeight:1.5 }}>{n.pesan}</div>
                        <div style={{ fontSize:9.5, color:'#94a3b8', marginTop:4 }}>{n.tglDibuat}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {msg   && <div style={{ ...msgBox('#1D4ED8','#DBEAFE'), margin:'14px auto', maxWidth:1000 }} className="fld"><FiCheckCircle size={14} style={{ marginRight:6, verticalAlign:'middle' }} />{msg}</div>}
      {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), margin:'14px auto', maxWidth:1000 }} className="fld"><FiAlertCircle size={14} style={{ marginRight:6, verticalAlign:'middle' }} />{error}</div>}

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'1.5rem 1.25rem 3rem', display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>

        <div>
          <div style={{ ...shellStyle, marginBottom:14 }} className="fld">
            <div style={coreStyle}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10, flexWrap:'wrap' }}>
                <span style={{ ...pill, background:dok.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:dok.jenis==='MOU'?'#1D4ED8':'#92400E' }}>{dok.jenis}</span>
                <span style={{ ...pill, ...sc }}>{dok.status}</span>
                {dok.status === 'MOU/PKS Berlaku' && dok.sisaHari !== null && (
                  <span style={{ ...pill, background: dok.sisaHari <= 30 ? '#FCEBEB' : '#FEF3C7', color: dok.sisaHari <= 30 ? '#A32D2D' : GOLD }}>
                    <FiClock size={10} style={{ marginRight:4, verticalAlign:'middle' }} />
                    {dok.sisaHari > 0 ? `${dok.sisaHari} hari tersisa` : 'Berakhir hari ini'}
                  </span>
                )}
              </div>
              <div style={{ fontSize:18, fontWeight:800, marginBottom:4, color:'#0f1f3d', letterSpacing:'-0.02em' }}>{dok.judul}</div>
              <div style={{ fontSize:13.5, color:BLUE, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}><FiHome size={13} />{dok.namaMitra}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:8 }}>
                Berlaku: {dok.tglBerlaku} s.d. {dok.tglBerakhir} · {dok.durasi} tahun
              </div>
              <div style={infoNoteBlue}><FiInfo size={13} style={{ marginRight:6, flexShrink:0, marginTop:1 }} />{STATUS_DESC[dok.status] || ''}</div>
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
                  {dok.docsUrl && dok.status === 'Draft' && (
                    <a href={dok.docsUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, textDecoration:'none' }} className="btn-hover">
                      <FiExternalLink size={12} style={{ marginRight:5, verticalAlign:'middle' }} />Buka & Edit
                    </a>
                  )}
                </div>
              </div>
              {dok.status !== 'Draft' && (
                <div style={{ fontSize:10.5, color:'#94a3b8', marginBottom:10, display:'flex', alignItems:'center', gap:5 }}>
                  <FiLock size={11} /> Dokumen tidak bisa diedit saat status &quot;{dok.status}&quot;. Preview di bawah bersifat lihat saja.
                </div>
              )}
              {showIframe && dok.embedUrl ? (
                <iframe src={dok.embedUrl} style={{ width:'100%', height:500, border:'1px solid rgba(29,78,216,0.10)', borderRadius:16 }} title={dok.judul} />
              ) : !showIframe ? null : (
                <div style={emptyBox}>Preview tidak tersedia.</div>
              )}
            </div>
          </div>

          <div className="fld"><KomentarRevisi idDokumen={dok.id} pengirim="mitra" senderId="mitra" /></div>
          <KomentarDocs docsId={dok.docsId} namaPengirim={dok.namaMitra} />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {dok.status === 'Draft' && (
            <div style={{ ...shellStyle, borderColor:'rgba(29,78,216,0.18)' }} className="fld">
              <div style={{ ...coreStyle, background:'linear-gradient(170deg,#f8fafc,#eef4fc)' }}>
                <div style={cardTitle}><FiFileText size={13} style={{ marginRight:6, verticalAlign:'middle' }} />Sudah selesai mengisi?</div>
                <div style={hintText}>Jika dokumen sudah final dan siap ditinjau, klik tombol di bawah. Setelah ini, dokumen masuk tahap review admin.</div>
                {!konfirmasi ? (
                  <button onClick={() => setKonfirmasi(true)} style={{ ...btnPrimary, width:'100%' }} className="btn-hover">
                    <FiCheckCircle size={14} style={{ marginRight:6, verticalAlign:'middle' }} />Selesai Mengisi Dokumen
                  </button>
                ) : (
                  <div>
                    <div style={{ fontSize:11, color:GOLD, background:'#FEF3C7', padding:'9px 11px', borderRadius:10, marginBottom:8, lineHeight:1.5 }}>
                      <FiAlertCircle size={12} style={{ marginRight:5, verticalAlign:'middle' }} />Yakin dokumen sudah final? Pastikan semua bagian sudah terisi dengan benar.
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => setKonfirmasi(false)} style={{ ...btnSm, flex:1 }} className="btn-hover">Batal</button>
                      <button onClick={selesaiMengisi} disabled={saving} style={{ ...btnPrimary, flex:2 }} className="btn-hover">
                        {saving ? 'Mengirim…' : 'Ya, Kirim untuk Ditinjau'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {dok.status === 'Dalam Proses' && (
            <div style={{ ...shellStyle, borderColor:'#FDE68A' }} className="fld">
              <div style={{ ...coreStyle, background:'#FFFBEB' }}>
                <div style={{ ...cardTitle, color:GOLD }}><FiClock size={13} style={{ marginRight:6, verticalAlign:'middle' }} />Sedang Ditinjau</div>
                <div style={{ fontSize:11.5, color:'#64748b', lineHeight:1.6 }}>
                  Dokumen Anda sedang ditinjau oleh tim Pokja BNN. Anda akan diberi tahu setelah ada keputusan.
                </div>
              </div>
            </div>
          )}

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}><FiPaperclip size={13} style={{ marginRight:6, verticalAlign:'middle' }} />Draf Template Anda</div>
              <div style={hintText}>Lupa unggah draf MOU/PKS saat mengajukan? Unggah di sini. Admin akan meninjau dan bisa menggunakannya sebagai dasar dokumen kerja.</div>
              {templateMitra && (
                <div style={fileChip}>
                  <FiFileText size={16} style={{ color: BLUE, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11.5, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#0f1f3d' }}>{templateMitra.namaFile}</div>
                    <div style={{ fontSize:10, color:BLUE }}>Sudah diunggah</div>
                  </div>
                  {templateMitra.fileUrl && <a href={templateMitra.fileUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, fontSize:10, textDecoration:'none' }} className="btn-hover">Lihat</a>}
                </div>
              )}
              <label style={{ ...btnSm, display:'block', textAlign:'center', cursor: uploadingTemplate?'wait':'pointer', opacity: uploadingTemplate?0.6:1 }} className="btn-hover">
                <FiUpload size={12} style={{ marginRight:6, verticalAlign:'middle' }} />
                {uploadingTemplate ? 'Mengunggah…' : (templateMitra ? 'Ganti File' : 'Unggah Draf (.doc/.docx, maks 1MB)')}
                <input type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={uploadTemplateMitra} disabled={uploadingTemplate} style={{ display:'none' }} />
              </label>
              {templateError && <div style={{ fontSize:10.5, color:'#A32D2D', marginTop:7 }}>{templateError}</div>}
            </div>
          </div>

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
                <div style={ttdPendingBox}>
                  <FiClock size={15} style={{ color: GOLD, flexShrink:0, marginTop:1 }} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#0f1f3d' }}>Menunggu review admin</div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>Tanggal diajukan: {dok.ttdTglDiajukan}</div>
                  </div>
                </div>
              ) : dok.ttdStatus === 'Menunggu Basah' ? (
                <div style={ttdPendingBox}>
                  <FiClock size={15} style={{ color: GOLD, flexShrink:0, marginTop:1 }} />
                  <div style={{ fontSize:11.5, color:'#64748b', lineHeight:1.5 }}>Menunggu dokumen fisik diterima admin. Admin akan mencatat tanggal TTD setelah dokumen diterima.</div>
                </div>
              ) : (
                <div>
                  {dok.ttdCatatan && (
                    <div style={{ fontSize:11, color:'#A32D2D', background:'#FCEBEB', padding:'8px 10px', borderRadius:9, marginBottom:10, lineHeight:1.5 }}>
                      Pengajuan sebelumnya ditolak. Alasan: {dok.ttdCatatan}
                    </div>
                  )}
                  <div style={hintText}>Pilih metode penandatanganan dokumen ini.</div>
                  {!showAjukanOnline ? (
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setShowAjukanOnline(true)} disabled={ttdSaving} style={{ ...btnPrimary, flex:1 }} className="btn-hover">
                        <FiSend size={12} style={{ marginRight:5, verticalAlign:'middle' }} />TTD Online
                      </button>
                      <button onClick={pilihTtdBasah} disabled={ttdSaving} style={{ ...btnSm, flex:1 }} className="btn-hover">
                        TTD Basah
                      </button>
                    </div>
                  ) : (
                    <div style={pendingBox}>
                      <label style={{ ...labelSt, marginBottom:6 }}>Tanggal rencana TTD</label>
                      <input type="date" style={{ ...inputFull, marginBottom:8 }} value={tglTtdAjukan} onChange={e => setTglTtdAjukan(e.target.value)} />
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { setShowAjukanOnline(false); setTglTtdAjukan(''); }} disabled={ttdSaving} style={{ ...btnSm, flex:1 }} className="btn-hover">Batal</button>
                        <button onClick={ajukanTtdOnline} disabled={ttdSaving || !tglTtdAjukan} style={{ ...btnPrimary, flex:1 }} className="btn-hover">
                          {ttdSaving ? 'Mengirim…' : 'Ajukan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}><FiCalendar size={13} style={{ marginRight:6, verticalAlign:'middle' }} />Tanggal Kegiatan</div>
              <div style={hintText}>Sesuaikan dengan kesepakatan bersama tim Pokja. Admin bisa menyesuaikannya kembali jika diperlukan.</div>
              <label style={labelSt}>Mulai</label>
              <input type="date" style={{ ...inputFull, marginBottom:10 }} value={tglMulai} onChange={e => setTglMulai(e.target.value)} />
              <label style={labelSt}>Selesai</label>
              <input type="date" style={{ ...inputFull, marginBottom:10 }} value={tglSelesai} onChange={e => setTglSelesai(e.target.value)} />
              <button onClick={saveTanggal} disabled={savingTgl} style={{ ...btnPrimary, width:'100%' }} className="btn-hover">
                {savingTgl ? 'Menyimpan…' : 'Simpan Tanggal'}
              </button>
            </div>
          </div>

          {/* Galeri Foto Kegiatan — dikelompokkan per bulan, dengan caption */}
          {bisaUploadFoto && (
            <div style={{ ...shellStyle, borderColor:'rgba(217,119,6,0.2)' }} className="fld">
              <div style={coreStyle}>
                <div style={cardTitle}><FiCamera size={13} style={{ marginRight:6, verticalAlign:'middle' }} />Foto Kegiatan</div>
                <div style={hintText}>Unggah foto kegiatan beserta deskripsinya. Foto akan tampil di halaman kegiatan publik jika dokumen ini ditampilkan.</div>

                <div style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#64748b', marginBottom:4 }}>
                    <span>{(terpakai/1024/1024).toFixed(2)} MB / 5 MB</span><span>{persen}%</span>
                  </div>
                  <div style={{ height:6, background:'#eef2f6', borderRadius:100, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${persen}%`, background: persen>=90?'#A32D2D':`linear-gradient(90deg,${BLUE},${BLUE_DARK})`, borderRadius:100, transition:'width 0.6s cubic-bezier(0.32,0.72,0,1)' }} />
                  </div>
                </div>

                {!pendingFile ? (
                  <label style={{ ...btnPrimary, display:'block', textAlign:'center', cursor:'pointer' }} className="btn-hover">
                    <FiUpload size={13} style={{ marginRight:6, verticalAlign:'middle' }} />Pilih Foto
                    <input type="file" accept="image/*" onChange={pilihFoto} style={{ display:'none' }} />
                  </label>
                ) : (
                  <div style={pendingBox}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#0f1f3d', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      <FiCamera size={12} style={{ marginRight:5, verticalAlign:'middle' }} />{pendingFile.name}
                    </div>
                    <textarea
                      value={pendingCaption}
                      onChange={e => setPendingCaption(e.target.value)}
                      placeholder="Tulis deskripsi foto ini (opsional)…"
                      style={{ ...inputFull, height:56, resize:'none', marginBottom:8 }}
                    />
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={batalPilihFoto} disabled={uploading} style={{ ...btnSm, flex:1 }} className="btn-hover">Batal</button>
                      <button onClick={uploadFoto} disabled={uploading} style={{ ...btnPrimary, flex:2 }} className="btn-hover">
                        {uploading ? 'Mengunggah…' : 'Unggah Foto'}
                      </button>
                    </div>
                  </div>
                )}

                {grup.length > 0 && (
                  <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:16 }}>
                    {grup.map(g => (
                      <div key={g.label}>
                        <div style={monthLabel}>{g.label}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                          {g.items.map(f => (
                            <div key={f.fileId} style={fotoCard}>
                              <div style={{ position:'relative' }}>
                                <img src={`/api/foto/${f.fileId}`} alt={f.nama} style={{ width:'100%', height:74, objectFit:'cover', display:'block' }} />
                                <button onClick={() => hapusFotoSendiri(f.fileId)} style={fotoDeleteBtn} title="Hapus foto"><FiTrash2 size={11} /></button>
                              </div>
                              <div style={{ padding:'6px 8px' }}>
                                {editingCaption === f.fileId ? (
                                  <div>
                                    <textarea
                                      value={captionDraft}
                                      onChange={e => setCaptionDraft(e.target.value)}
                                      style={{ ...inputFull, height:44, resize:'none', fontSize:10.5, padding:'6px 8px', marginBottom:5 }}
                                      autoFocus
                                    />
                                    <div style={{ display:'flex', gap:4 }}>
                                      <button onClick={() => setEditingCaption(null)} style={miniIconBtn} className="btn-hover"><FiX size={11} /></button>
                                      <button onClick={() => simpanCaption(f.fileId)} disabled={savingCaption} style={{ ...miniIconBtn, background:BLUE, color:'#fff', borderColor:BLUE }} className="btn-hover"><FiCheck size={11} /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <div onClick={() => mulaiEditCaption(f)} style={{ cursor:'pointer', display:'flex', alignItems:'flex-start', gap:4 }}>
                                    <span style={{ fontSize:10.5, color: f.caption ? '#334155' : '#94a3b8', lineHeight:1.4, flex:1 }}>
                                      {f.caption || 'Tambah deskripsi…'}
                                    </span>
                                    <FiEdit2 size={10} style={{ color:'#94a3b8', flexShrink:0, marginTop:2 }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {bolehUnduhPdf && (
            <div style={shellStyle} className="fld">
              <div style={coreStyle}>
                <div style={cardTitle}><FiDownload size={13} style={{ marginRight:6, verticalAlign:'middle' }} />Unduh Dokumen</div>
                <button onClick={unduhPdf} disabled={genPdf} style={{ ...btnPrimary, width:'100%', background:`linear-gradient(135deg,${GOLD},#B45309)` }} className="btn-hover">
                  {genPdf ? 'Membuat PDF…' : 'Unduh PDF'}
                </button>
                <div style={hintText}>PDF kualitas tinggi dari dokumen final.</div>
              </div>
            </div>
          )}

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
      .fld { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
      .btn-hover:active:not(:disabled) { transform: scale(0.98); }
    `}</style>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.9rem 1.5rem', background:'rgba(255,255,255,0.75)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(29,78,216,0.06)', position:'sticky', top:0, zIndex:100, gap:8 };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#475569', textDecoration:'none', flexShrink:0, fontWeight:600, display:'flex', alignItems:'center', gap:6 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', borderRadius:22, padding:6, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:17, padding:'1.1rem 1.25rem', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const cardTitle: React.CSSProperties = { fontSize:12.5, fontWeight:700, marginBottom:9, color:'#0f1f3d', display:'flex', alignItems:'center' };
const labelSt: React.CSSProperties = { display:'block', fontSize:11, color:'#475569', marginBottom:5, fontWeight:600 };
const hintText: React.CSSProperties = { fontSize:10.5, color:'#94a3b8', marginBottom:9, lineHeight:1.5 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 11px', borderRadius:10, border:'1.5px solid rgba(29,78,216,0.10)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', outline:'none', background:'#f8fafc' };
const btnPrimary: React.CSSProperties = { padding:'10px 16px', borderRadius:11, border:'none', background:`linear-gradient(135deg,#2563EB,${BLUE_DARK})`, color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:'0 6px 16px -6px rgba(29,78,216,0.5)' };
const btnSm: React.CSSProperties = { padding:'8px 13px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.12)', background:'#fff', color:'#334155', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap' };
const pill: React.CSSProperties = { fontSize:10.5, fontWeight:700, padding:'3px 11px', borderRadius:100, display:'inline-flex', alignItems:'center' };
const infoNoteBlue: React.CSSProperties = { fontSize:10.5, color:BLUE_DARK, marginTop:10, padding:'8px 11px', background:'#EFF6FF', borderRadius:9, lineHeight:1.5, display:'flex', alignItems:'flex-start' };
const emptyBox: React.CSSProperties = { padding:'2rem', textAlign:'center', color:'#94a3b8', fontSize:11.5, background:'#f8fafc', borderRadius:12 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:12 });
const centerStyle: React.CSSProperties = { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#f5f7fa', color:'#6b7280', fontSize:13 };
const notifBadge: React.CSSProperties = { position:'absolute', top:-4, right:-4, minWidth:16, height:16, padding:'0 4px', borderRadius:100, background:'#A32D2D', color:'#fff', fontSize:9.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' };
const fileChip: React.CSSProperties = { display:'flex', alignItems:'center', gap:9, padding:'9px 11px', background:'#EFF6FF', borderRadius:11, marginBottom:9 };
const fotoDeleteBtn: React.CSSProperties = { position:'absolute', top:4, right:4, width:20, height:20, borderRadius:'50%', border:'none', background:'rgba(163,45,45,.9)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' };
const monthLabel: React.CSSProperties = { fontSize:10.5, fontWeight:700, color:GOLD, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, paddingBottom:6, borderBottom:'1px solid rgba(217,119,6,0.15)' };
const fotoCard: React.CSSProperties = { borderRadius:12, overflow:'hidden', border:'1px solid rgba(29,78,216,0.08)', background:'#fff' };
const pendingBox: React.CSSProperties = { background:'#EFF6FF', border:'1px solid rgba(29,78,216,0.14)', borderRadius:12, padding:'10px 11px' };
const ttdDoneBox: React.CSSProperties = { display:'flex', gap:10, padding:'10px 12px', background:'#EFF6FF', borderRadius:12, border:'1px solid rgba(29,78,216,0.12)' };
const ttdPendingBox: React.CSSProperties = { display:'flex', gap:10, padding:'10px 12px', background:'#FFFBEB', borderRadius:12, border:'1px solid #FDE68A' };
const miniIconBtn: React.CSSProperties = { width:24, height:24, borderRadius:8, border:'1px solid rgba(29,78,216,0.12)', background:'#fff', color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' };