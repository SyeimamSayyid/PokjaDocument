'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import LoaderPage from '@/components/LoaderPage';
import EditPencilIndicator from '@/components/EditPencilIndicator';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiFileText, FiImage, FiDownload, FiTrash2,
  FiClock, FiAlertCircle, FiCheckCircle, FiInfo, FiUpload,
  FiCalendar, FiDatabase, FiBell,
  FiGrid, FiHome, FiEdit2, FiCheck, FiX, FiZap, FiArrowUpRight,
} from 'react-icons/fi';
import { FaFileSignature, FaFileAlt } from 'react-icons/fa';
import { SiGoogledocs } from 'react-icons/si';

interface MitraUser {
  role: string; idDokumen: string; jenis: string; judul: string;
  namaMitra: string; status: string; docsId: string; docsUrl: string;
  folderId: string; fotoFolderId: string; tglBerlaku: string;
  tglBerakhir: string; kodeExpire: string;
}
interface FotoItem {
  fileId: string; nama: string; ukuran: number;
  url: string; thumbnailUrl: string; tanggalUpload: string; caption?: string;
}
interface Notif { id: string; tipe: string; judul: string; pesan: string; dibaca: boolean; tglDibuat: string; }

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function barColor(persen: number): string {
  if (persen >= 90) return '#A32D2D';
  if (persen >= 70) return GOLD;
  return BLUE;
}

export default function DashboardMitraPage() {
  const [user, setUser]           = useState<MitraUser | null>(null);
  const [files, setFiles]         = useState<FotoItem[]>([]);
  const [terpakai, setTerpakai]   = useState(0);
  const [maksimal, setMaksimal]   = useState(5 * 1024 * 1024);
  const [persen, setPersen]       = useState(0);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const [msg, setMsg]             = useState('');
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  const [notif, setNotif] = useState<Notif[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [labelMitra, setLabelMitra] = useState('');

  const [sudahDipublikasi, setSudahDipublikasi] = useState(false);
  const [tglKegiatanSelesai, setTglKegiatanSelesai] = useState('');
  const [manualLog, setManualLog] = useState('');
  const [tglBerlakuFresh, setTglBerlakuFresh] = useState('');
  const [tglBerakhirFresh, setTglBerakhirFresh] = useState('');

  const loadFoto = useCallback((idDokumen: string) => {
    fetch(`/api/dokumen/foto?idDokumen=${idDokumen}`)
      .then(r => r.json())
      .then(d => {
        if (d.files) {
          setFiles(d.files); setTerpakai(d.terpakai);
          setMaksimal(d.maksimal || 5 * 1024 * 1024); setPersen(d.persenTerpakai || 0);
        }
      })
      .catch(() => {});
  }, []);

  const loadNotif = useCallback((idDokumen: string) => {
    fetch(`/api/notifikasi?idDokumen=${idDokumen}`)
      .then(r => r.json())
      .then(d => setNotif(d.notifikasi || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_mitra');
    if (!raw) { window.location.href = '/login-mitra'; return; }
    try {
      const u: MitraUser = JSON.parse(raw);
      setUser(u);
      loadFoto(u.idDokumen);
      loadNotif(u.idDokumen);
      fetch(`/api/dokumen/pic?idDokumen=${u.idDokumen}`)
        .then(r => r.json())
        .then(d => setLabelMitra(d.label || u.namaMitra))
        .catch(() => setLabelMitra(u.namaMitra));
      // Data user di localStorage cuma snapshot saat login — status publikasi
      // & tanggal kegiatan bisa berubah belakangan, jadi ambil yang terbaru.
      fetch(`/api/dokumen/${u.idDokumen}`)
        .then(r => r.json())
        .then(d => {
          if (d.dokumen) {
            setSudahDipublikasi(!!d.dokumen.sudahDipublikasi);
            setTglKegiatanSelesai(d.dokumen.tglKegiatanSelesai || '');
            setManualLog(d.dokumen.manualLog || '');
            setTglBerlakuFresh(d.dokumen.tglBerlaku || '');
            setTglBerakhirFresh(d.dokumen.tglBerakhir || '');
          }
        })
        .catch(() => {});
      fetch('/api/dokumen/aktivitas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: u.idDokumen, aktor: u.namaMitra, peran: 'mitra' }),
      }).catch(() => {});
      setLoading(false);
    } catch { window.location.href = '/login-mitra'; }
  }, [loadFoto, loadNotif]);

  const belumDibaca = notif.filter(n => !n.dibaca).length;

  const bukaNotif = async () => {
    if (!user) return;
    setShowNotif(s => !s);
    if (!showNotif && belumDibaca > 0) {
      try {
        await fetch('/api/notifikasi', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idDokumen: user.idDokumen, semua: true }),
        });
        setNotif(prev => prev.map(n => ({ ...n, dibaca: true })));
      } catch {}
    }
  };

  const pilihFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMime.includes(file.type)) { setError('Tipe file harus JPG, PNG, atau WEBP.'); return; }
    setPendingFile(file); setPendingCaption(''); setError('');
  };

  const batalPilihFile = () => {
    setPendingFile(null); setPendingCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFoto = async () => {
    if (!pendingFile || !user) return;
    setUploading(true); setError(''); setMsg('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Gagal baca'));
        reader.readAsDataURL(pendingFile);
      });
      const res = await fetch('/api/dokumen/foto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: user.idDokumen, namaFile: pendingFile.name, base64Data: base64, mimeType: pendingFile.type, caption: pendingCaption }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal upload.'); return; }
      setMsg('Foto berhasil diupload.');
      setPendingFile(null); setPendingCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadFoto(user.idDokumen);
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setUploading(false); }
  };

  const hapusFoto = async (fileId: string, nama: string) => {
    if (!user || !confirm(`Hapus foto "${nama}"?`)) return;
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/dokumen/foto', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: user.idDokumen, fileId }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal hapus.'); return; }
      setMsg('Foto berhasil dihapus.');
      loadFoto(user.idDokumen);
    } catch { setError('Terjadi kesalahan koneksi.'); }
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
      setFiles(prev => prev.map(f => f.fileId === fileId ? { ...f, caption: d.caption } : f));
      setEditingCaption(null);
    } catch { setError('Gagal menyimpan deskripsi.'); }
    finally { setSavingCaption(false); }
  };

  const logout = () => { localStorage.removeItem('paktasign_mitra'); window.location.href = '/login-mitra'; };

  if (loading || !user) return <LoaderPage text="Memuat Dokumen Kerja Sama..." />;

  const statusColor: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    'draft':        { bg: '#f1f3f2', color: '#5b6b66', icon: <FiFileText size={12} /> },
    'terkirim':     { bg: '#DBEAFE', color: BLUE_DARK, icon: <FiCheckCircle size={12} /> },
    'ditinjau':     { bg: '#FEF3C7', color: '#92400E', icon: <FiClock size={12} /> },
    'menunggu ttd': { bg: '#DBEAFE', color: BLUE_DARK, icon: <FiClock size={12} /> },
    'aktif':        { bg: '#FEF3C7', color: GOLD, icon: <FiZap size={12} /> },
    'selesai':      { bg: '#DBEAFE', color: BLUE_DARK, icon: <FiCheckCircle size={12} /> },
    'kedaluwarsa':  { bg: '#FCEBEB', color: '#A32D2D', icon: <FiAlertCircle size={12} /> },
  };
  const sc = statusColor[user.status.toLowerCase()] || statusColor['draft'];
  const inisial = user.namaMitra.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const kegiatanSudahLewat = (() => {
    if (!tglKegiatanSelesai) return false;
    const selesai = new Date(tglKegiatanSelesai);
    if (isNaN(selesai.getTime())) return false;
    const now = new Date(); now.setHours(0,0,0,0); selesai.setHours(23,59,59,999);
    return now.getTime() > selesai.getTime();
  })();

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1000px 480px at 85% -10%, #dbeafe 0%, rgba(219,234,254,0) 55%), linear-gradient(180deg,#f7f9fc,#eef2f8)' }}>
      <GlobalStyle />

      {/* Nav ramping — cuma notif + avatar, brand & logout sudah di sidebar */}
      <Sidebar
        items={[
          { href: '/dashboard/mitra', icon: <FiGrid size={17} />, label: 'Dashboard' },
          { href: `/mitra/dokumen/${user.idDokumen}`, icon: <FiFileText size={17} />, label: 'Dokumen' },
          { href: '/dashboard/mitra/notifikasi', icon: <FiBell size={17} />, label: 'Notifikasi', notifCount: belumDibaca },
          { href: '/dashboard/mitra/riwayat', icon: <FiClock size={17} />, label: 'Riwayat' },
        ]}
        activeHref="/dashboard/mitra"
        brandLabel="SI-POKJA HUMKER"
        brandSub="Akses Mitra"
        userName={user.namaMitra}
        userTag={labelMitra || user.namaMitra}
        accent={GOLD}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 880, margin: '0 auto', padding: '1.3rem 1.25rem 0' }}>
        <nav style={{ ...navPill, justifyContent: 'flex-end' }} className="rise">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={bukaNotif} style={navIcon} className="btn-hover" title="Notifikasi">
              <FiBell size={15} strokeWidth={1.8} />
              {belumDibaca > 0 && <span style={notifBadge}>{belumDibaca}</span>}
            </button>
            <div style={avatarCircle}>{inisial}</div>
          </div>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth: 880, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>

        {showNotif && (
          <div style={{ ...shellStyle, borderColor: '#FDE68A', marginBottom: 16 }} className="fld">
            <div style={coreStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={cardTitle}><FiBell size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: GOLD }} />Notifikasi</div>
                <button onClick={() => setShowNotif(false)} style={btnSm} className="btn-hover">Tutup</button>
              </div>
              {notif.length === 0 ? (
                <div style={emptyBox}>Belum ada notifikasi.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                  {notif.map(n => (
                    <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: n.tipe === 'hapus-foto' ? '#FFF5F5' : n.tipe === 'publikasi' ? '#FFFBEB' : '#f8fafc', borderRadius: 12, border: `1px solid ${n.tipe === 'hapus-foto' ? '#F7C1C1' : n.tipe === 'publikasi' ? '#FDE68A' : 'rgba(29,78,216,0.1)'}` }}>
                      {n.tipe === 'hapus-foto' ? <FiTrash2 size={15} style={{ color: '#A32D2D', flexShrink: 0, marginTop: 2 }} />
                        : n.tipe === 'publikasi' ? <FiZap size={15} style={{ color: GOLD, flexShrink: 0, marginTop: 2 }} />
                        : <FiInfo size={15} style={{ color: BLUE, flexShrink: 0, marginTop: 2 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: n.tipe === 'hapus-foto' ? '#A32D2D' : '#1e293b' }}>{n.judul}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>{n.pesan}</div>
                        <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 4 }}>{n.tglDibuat}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {msg   && <div style={{ ...msgBox(BLUE_DARK, '#DBEAFE'), marginBottom: 14 }} className="fld"><FiCheckCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{msg}</div>}
        {error && <div style={{ ...msgBox('#A32D2D', '#FCEBEB'), marginBottom: 14 }} className="fld"><FiAlertCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{error}</div>}

        {/* Info dokumen */}
        <div style={{ ...shellStyle, marginBottom: 16 }} className="fld">
          <div style={coreStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ ...pill, background: user.jenis === 'MOU' ? '#DBEAFE' : '#FEF3C7', color: user.jenis === 'MOU' ? BLUE_DARK : '#92400E' }}>
                {user.jenis === 'MOU' ? <FaFileSignature size={11} /> : <FaFileAlt size={11} />}
                {user.jenis}
              </span>
              <span style={{ ...pill, background: sc.bg, color: sc.color }}>{sc.icon}{user.status}</span>
              <span style={{ ...pill, background: '#f1f3f2', color: '#7d8985', marginLeft: 'auto' }}>
                <FiHome size={10} /> ID {user.idDokumen.slice(0, 8)}
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f1f3d', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiFileText size={22} style={{ color: BLUE, flexShrink: 0 }} />
              {user.judul}
              <EditPencilIndicator manualLog={manualLog} size={22} />
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiCalendar size={13} /> Berlaku: {user.tglBerlaku}</span>
              <span style={{ opacity: 0.3 }}>→</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiClock size={13} /> {user.tglBerakhir}</span>
            </div>
          </div>
        </div>

        {/* Masa Berlaku MOU/PKS */}
        <div style={{ ...shellStyle, marginBottom: 16 }} className="fld">
          <div style={coreStyle}>
            <div style={cardTitle}><FiCalendar size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: GOLD }} />Masa Berlaku {user.jenis}</div>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '13px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 9.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Mulai</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1f3d' }}>{tglBerlakuFresh || user.tglBerlaku || 'Belum ditetapkan'}</div>
                </div>
                <div style={{ color: GOLD, fontSize: 17 }}>→</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Berakhir</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1f3d' }}>{tglBerakhirFresh || user.tglBerakhir || 'Belum ditetapkan'}</div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
              Ini periode resmi kesepakatan {user.jenis} antara BNN Provinsi Sulawesi Selatan dan {user.namaMitra}.
            </div>
          </div>
        </div>

        {/* Kartu utama: Lihat Dokumen */}
        <a href={`/mitra/dokumen/${user.idDokumen}`} style={{ ...shellStyle, textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 16 }} className="fld lift">
          <div style={{ ...coreStyle, display: 'flex', alignItems: 'center', gap: 16, padding: '1.25rem 1.4rem', position: 'relative' }}>
            <FiArrowUpRight className="arr" size={17} style={{ position: 'absolute', top: 16, right: 16, color: GOLD }} />
            <div style={{ width: 54, height: 54, borderRadius: 17, background: `linear-gradient(150deg, ${BLUE_LIGHT}, ${BLUE_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 12px 26px -12px ${BLUE}60` }} className="ic-wrap">
              <SiGoogledocs size={26} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f1f3d' }}>Lihat Dokumen</div>
              <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>Preview dokumen & diskusi revisi dengan admin</div>
            </div>
          </div>
        </a>

        {!sudahDipublikasi ? (
          <div style={{ ...shellStyle, marginBottom: 16 }} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}><FiImage size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: BLUE }} />Foto Kegiatan</div>
              <div style={{ background: '#f8fafc', border: '1px solid rgba(29,78,216,0.08)', borderRadius: 12, padding: '13px 15px', fontSize: 12, color: '#64748b', lineHeight: 1.6, display: 'flex', gap: 10 }}>
                <FiInfo size={16} style={{ color: BLUE, flexShrink: 0, marginTop: 1 }} />
                <span>Fitur unggah foto akan terbuka otomatis setelah Admin Pokja mempublikasikan kerja sama ini ke halaman kegiatan publik. Sementara ini, silakan lengkapi dokumen lewat menu &quot;Lihat Dokumen&quot; di atas.</span>
              </div>
            </div>
          </div>
        ) : kegiatanSudahLewat ? (
          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}><FiGrid size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: BLUE }} />Foto Kegiatan ({files.length})</div>
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '11px 14px', fontSize: 12, color: '#92400E', marginBottom: files.length > 0 ? 14 : 0, display: 'flex', gap: 9 }}>
                <FiInfo size={15} style={{ flexShrink: 0, marginTop: 1, color: GOLD }} />
                <span>Kegiatan sudah selesai (berakhir {tglKegiatanSelesai}) — unggah dan edit foto baru sudah ditutup. Foto yang sudah ada tetap tersimpan di bawah ini.</span>
              </div>
              {files.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
                  {files.map(f => (
                    <div key={f.fileId} style={fotoCard} className="fld">
                      <img src={`/api/foto/${f.fileId}`} alt={f.nama} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block', background: '#eef2f6' }} />
                      <div style={{ padding: '9px 10px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#0f1f3d' }}>{f.nama}</div>
                        <div style={{ fontSize: 10.5, color: f.caption ? '#334155' : '#cbd5e1', lineHeight: 1.4, marginTop: 7 }}>{f.caption || 'Tanpa deskripsi'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
        {/* Kuota + upload */}
        <div style={{ ...shellStyle, marginBottom: 16 }} className="fld">
          <div style={coreStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={cardTitle}><FiDatabase size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: GOLD }} />Penyimpanan Foto Kegiatan</div>
              <div style={{ fontSize: 11.5, color: barColor(persen), fontWeight: 700, background: `${barColor(persen)}15`, padding: '4px 12px', borderRadius: 100 }}>
                {formatBytes(terpakai)} / {formatBytes(maksimal)}
              </div>
            </div>
            <div style={{ height: 10, background: '#eef2f6', borderRadius: 100, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 100, width: `${Math.min(100, persen)}%`, background: `linear-gradient(90deg, ${barColor(persen)}, ${barColor(persen)}cc)`, transition: `width 0.7s ${EASE}` }} />
            </div>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <FiInfo size={12} />{persen}% terpakai · {files.length} foto
              {persen >= 100 && <span style={{ color: '#A32D2D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><FiAlertCircle size={12} /> Kuota penuh, hapus foto untuk upload baru</span>}
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(15,23,42,0.06)' }}>
              {!pendingFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <label htmlFor="file-upload" style={{ ...btnPrimary, opacity: persen >= 100 ? 0.5 : 1, cursor: persen >= 100 ? 'not-allowed' : 'pointer' }} className="btn-hover">
                    <FiUpload size={14} style={{ marginRight: 7, verticalAlign: 'middle' }} />Pilih Foto
                  </label>
                  <input ref={fileInputRef} id="file-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={pilihFile} disabled={persen >= 100} style={{ display: 'none' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}><FiInfo size={12} /> JPG, PNG, WEBP</span>
                </div>
              ) : (
                <div style={pendingBox} className="fld">
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f1f3d', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiImage size={13} /> {pendingFile.name}
                  </div>
                  <textarea value={pendingCaption} onChange={e => setPendingCaption(e.target.value)} placeholder="Tulis deskripsi foto ini (opsional)…" style={{ ...inputStyle, height: 58, resize: 'none', marginBottom: 9 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={batalPilihFile} disabled={uploading} style={{ ...btnSm, flex: 1 }} className="btn-hover">Batal</button>
                    <button onClick={uploadFoto} disabled={uploading} style={{ ...btnPrimary, flex: 2, width: '100%' }} className="btn-hover">
                      {uploading ? 'Mengunggah…' : 'Unggah Foto'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Galeri foto */}
        <div style={shellStyle} className="fld">
          <div style={coreStyle}>
            <div style={cardTitle}><FiGrid size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: BLUE }} />Foto Kegiatan ({files.length})</div>
            {files.length === 0 ? (
              <div style={{ ...emptyBox, padding: '2.5rem 1rem', border: '2px dashed rgba(29,78,216,0.14)', background: '#f8fafc' }}>
                <FiImage size={30} style={{ color: '#cbd5e1', marginBottom: 8 }} />
                <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0 }}>Belum ada foto diupload. Upload bukti kegiatan di atas.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
                {files.map((f, i) => (
                  <div key={f.fileId} style={fotoCard} className="fld" >
                    <img src={`/api/foto/${f.fileId}`} alt={f.nama} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block', background: '#eef2f6' }} />
                    <div style={{ padding: '9px 10px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#0f1f3d' }}>{f.nama}</div>
                      <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FiDatabase size={9} /> {formatBytes(f.ukuran)}
                      </div>

                      {editingCaption === f.fileId ? (
                        <div style={{ marginTop: 7 }}>
                          <textarea value={captionDraft} onChange={e => setCaptionDraft(e.target.value)} style={{ ...inputStyle, height: 44, resize: 'none', fontSize: 10.5, padding: '6px 8px', marginBottom: 5 }} autoFocus />
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => setEditingCaption(null)} style={miniIconBtn} className="btn-hover"><FiX size={11} /></button>
                            <button onClick={() => simpanCaption(f.fileId)} disabled={savingCaption} style={{ ...miniIconBtn, background: BLUE, color: '#fff', borderColor: BLUE }} className="btn-hover"><FiCheck size={11} /></button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => mulaiEditCaption(f)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 7 }}>
                          <span style={{ fontSize: 10.5, color: f.caption ? '#334155' : '#cbd5e1', lineHeight: 1.4, flex: 1 }}>{f.caption || 'Tambah deskripsi…'}</span>
                          <FiEdit2 size={10} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
                        <a href={`/api/foto/${f.fileId}?download=1`} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} className="btn-hover">
                          <FiDownload size={11} /> Unduh
                        </a>
                        <button onClick={() => hapusFoto(f.fileId, f.nama)} style={{ ...btnSm, flex: 1, color: '#A32D2D', borderColor: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} className="btn-hover">
                          <FiTrash2 size={11} /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
          </>
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
      .fld, .rise { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
      .btn-hover:active:not(:disabled) { transform: scale(0.98); }
      .lift { transition: all 0.4s cubic-bezier(0.32,0.72,0,1); }
      .lift:hover { transform: translateY(-3px); box-shadow: 0 22px 40px -26px rgba(29,78,216,0.3) !important; }
      .lift:hover .ic-wrap { transform: scale(1.06) rotate(-3deg); }
      .ic-wrap { transition: transform 0.4s cubic-bezier(0.32,0.72,0,1); }
      .lift:hover .arr { opacity: 1; transform: translate(2px,-2px); }
      .arr { transition: all 0.4s cubic-bezier(0.32,0.72,0,1); opacity: 0; }
      @media (min-width: 901px) {
        .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; max-width: 880px !important; box-sizing: border-box !important; }
      }
    `}</style>
  );
}

const navPill: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(29,78,216,0.08)', borderRadius: 100, padding: '9px 12px 9px 16px', boxShadow: '0 10px 26px -18px rgba(15,23,42,0.25)' };
const navIcon: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 100, border: '1px solid rgba(29,78,216,0.08)', background: '#fff', color: '#54635e', cursor: 'pointer', fontFamily: FONT, position: 'relative' };
const avatarCircle: React.CSSProperties = { width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(150deg, ${BLUE_LIGHT}, ${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800, color: '#fff', boxShadow: `0 4px 10px -3px ${GOLD}70` };
const shellStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.65)', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(29,78,216,0.08)', borderRadius: 22, padding: 6, boxShadow: '0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background: '#fff', borderRadius: 17, padding: '1.15rem 1.3rem', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)' };
const cardTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, marginBottom: 12, color: '#0f1f3d' };
const pill: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, padding: '4px 11px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', gap: 4 };
const infoNoteBlue: React.CSSProperties = { fontSize: 10.5, color: BLUE_DARK, marginTop: 12, padding: '8px 11px', background: '#EFF6FF', borderRadius: 9, lineHeight: 1.5, display: 'flex', alignItems: 'flex-start' };
const emptyBox: React.CSSProperties = { padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: 11.5, background: '#f8fafc', borderRadius: 14 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize: 12, color, background: bg, padding: '10px 14px', borderRadius: 12 });
const notifBadge: React.CSSProperties = { position: 'absolute', top: -3, right: -3, minWidth: 15, height: 15, padding: '0 4px', borderRadius: 100, background: '#A32D2D', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 11, border: 'none', background: `linear-gradient(135deg, ${BLUE_LIGHT}, ${BLUE_DARK})`, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, boxShadow: `0 6px 16px -6px ${BLUE}60`, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' };
const btnSm: React.CSSProperties = { padding: '8px 13px', borderRadius: 10, borderWidth: 1.5, borderStyle: 'solid', borderColor: 'rgba(29,78,216,0.12)', background: '#fff', color: '#334155', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, border: '1.5px solid rgba(29,78,216,0.10)', fontSize: 12, fontFamily: FONT, boxSizing: 'border-box', outline: 'none', background: '#f8fafc' };
const pendingBox: React.CSSProperties = { background: '#EFF6FF', border: '1px solid rgba(29,78,216,0.14)', borderRadius: 14, padding: '12px 13px' };
const miniIconBtn: React.CSSProperties = { width: 24, height: 24, borderRadius: 8, border: '1px solid rgba(29,78,216,0.12)', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const fotoCard: React.CSSProperties = { borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(29,78,216,0.08)', background: '#fff' };