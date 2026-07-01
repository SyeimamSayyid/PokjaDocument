'use client';

import { useEffect, useState, useCallback, use } from 'react';
import KomentarRevisi from '@/components/KomentarRevisi';
import KomentarDocs from '@/components/KomentarDocs';

interface Dokumen {
  id: string; jenis: string; judul: string; namaMitra: string; idMitra: string;
  docsId: string;
  tglBerlaku: string; tglBerakhir: string; durasi: string;
  status: string; kode: string; embedUrl: string;
  docsUrl: string; fotoFolderId: string; catatan: string;
  tglKegiatanMulai: string; tglKegiatanSelesai: string;
  sisaHari: number | null;
}

interface Notif { id: string; tipe: string; judul: string; pesan: string; dibaca: boolean; tglDibuat: string; }
interface FotoItem { fileId: string; nama: string; ukuran: number; thumbnailUrl: string; url: string; }

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  'Draft':                     { bg: '#f1f3f2', color: '#5b6b66' },
  'Dalam Proses':              { bg: '#EDE9FE', color: '#5B21B6' },
  'Selesai':                   { bg: '#FEF3E2', color: '#854F0B' },
  'Kegiatan Akan Berlangsung': { bg: '#E6F1FB', color: '#0C447C' },
  'Kegiatan Berlangsung':      { bg: '#D1FAE5', color: '#065F46' },
  'Kegiatan Selesai':          { bg: '#A7F3D0', color: '#065F46' },
  'MOU/PKS Berlaku':           { bg: '#E1F5EE', color: '#0F6E56' },
  'Kedaluwarsa':               { bg: '#FCEBEB', color: '#A32D2D' },
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

  const [tglMulai, setTglMulai]     = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [savingTgl, setSavingTgl]   = useState(false);

  const [templateMitra, setTemplateMitra] = useState<{ fileId: string; namaFile: string; fileUrl: string } | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');

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

  const uploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !dok) return;
    if (!f.type.startsWith('image/')) { setError('Hanya file gambar yang diizinkan.'); return; }
    if (terpakai + f.size > KUOTA_MAX) { setError('Kuota foto penuh (maks 5MB per dokumen).'); return; }
    setUploading(true); setError(''); setMsg('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Gagal baca'));
        reader.readAsDataURL(f);
      });
      const r = await fetch('/api/dokumen/foto/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fotoFolderId: dok.fotoFolderId, fileBase64: base64, fileName: f.name, fileMime: f.type, idDokumen: id }),
      });
      const d = await r.json();
      if (!r.ok || d.success === false) { setError(d.message || d.error || 'Gagal upload.'); return; }
      setMsg('Foto berhasil diunggah.');
      loadFoto(dok.fotoFolderId);
    } catch { setError('Gagal upload foto.'); }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
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
      <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
      <div style={{ fontSize:14, fontWeight:700 }}>{error}</div>
      <button onClick={logout} style={{ ...btnSm, marginTop:16 }} className="btn-hover">Keluar</button>
    </div>
  );
  if (!dok) return null;

  const sc = STATUS_COLOR[dok.status] || { bg:'#f1f3f2', color:'#5b6b66' };
  const bolehUnduhPdf = ['Selesai','Kegiatan Akan Berlangsung','Kegiatan Berlangsung','Kegiatan Selesai','MOU/PKS Berlaku','Kedaluwarsa'].includes(dok.status);
  const bisaUploadFoto = dok.status === 'Kegiatan Berlangsung';
  const persen = Math.round((terpakai / KUOTA_MAX) * 100);

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#f7f9f8,#eef2f0)', fontFamily: FONT }}>
      <GlobalStyle />
      <nav style={navStyle}>
        <a href="/dashboard/mitra" style={backLink}>← Dashboard Saya</a>
        <div style={{ fontWeight:700, fontSize:13.5, color:'#0a2e24' }}>Detail Dokumen</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={bukaNotif} style={{ ...btnSm, position:'relative', padding:'8px 11px' }} className="btn-hover" title="Notifikasi">
            🔔
            {belumDibaca > 0 && <span style={notifBadge}>{belumDibaca}</span>}
          </button>
          <button onClick={logout} style={btnSm} className="btn-hover">Keluar</button>
        </div>
      </nav>

      {showNotif && (
        <div style={{ maxWidth:1000, margin:'14px auto 0', padding:'0 1.25rem' }} className="fld">
          <div style={{ ...shellStyle, borderColor:'#FFD54F' }}>
            <div style={coreStyle}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={cardTitle}>🔔 Notifikasi</div>
                <button onClick={() => setShowNotif(false)} style={{ ...btnSm, padding:'5px 10px' }} className="btn-hover">Tutup</button>
              </div>
              {notif.length === 0 ? (
                <div style={emptyBox}>Belum ada notifikasi.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:280, overflowY:'auto' }}>
                  {notif.map(n => (
                    <div key={n.id} style={{ display:'flex', gap:10, padding:'10px 12px', background: n.tipe==='hapus-foto'?'#FFF5F5':'#f9fafb', borderRadius:10, border:`1px solid ${n.tipe==='hapus-foto'?'#F7C1C1':'rgba(10,46,36,0.06)'}` }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{n.tipe==='hapus-foto'?'🗑️':'ℹ️'}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color: n.tipe==='hapus-foto'?'#A32D2D':'#374151' }}>{n.judul}</div>
                        <div style={{ fontSize:11.5, color:'#5b6b66', marginTop:2, lineHeight:1.5 }}>{n.pesan}</div>
                        <div style={{ fontSize:9.5, color:'#9aa5a1', marginTop:4 }}>{n.tglDibuat}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {msg   && <div style={{ ...msgBox('#085041','#E1F5EE'), margin:'14px auto', maxWidth:1000 }} className="fld">{msg}</div>}
      {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), margin:'14px auto', maxWidth:1000 }} className="fld">{error}</div>}

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'1.5rem 1.25rem 3rem', display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>

        <div>
          <div style={{ ...shellStyle, marginBottom:14 }} className="fld">
            <div style={coreStyle}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10, flexWrap:'wrap' }}>
                <span style={{ ...pill, background:dok.jenis==='MOU'?'#E6F1FB':'#FAEEDA', color:dok.jenis==='MOU'?'#0C447C':'#854F0B' }}>{dok.jenis}</span>
                <span style={{ ...pill, ...sc }}>{dok.status}</span>
                {dok.status === 'MOU/PKS Berlaku' && dok.sisaHari !== null && (
                  <span style={{ ...pill, background: dok.sisaHari <= 30 ? '#FCEBEB' : '#E1F5EE', color: dok.sisaHari <= 30 ? '#A32D2D' : '#0F6E56' }}>
                    ⏳ {dok.sisaHari > 0 ? `${dok.sisaHari} hari tersisa` : 'Berakhir hari ini'}
                  </span>
                )}
              </div>
              <div style={{ fontSize:18, fontWeight:800, marginBottom:4, color:'#0a2e24', letterSpacing:'-0.02em' }}>{dok.judul}</div>
              <div style={{ fontSize:13.5, color:'#0F6E56', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>🏢 {dok.namaMitra}</div>
              <div style={{ fontSize:12, color:'#5b6b66', marginTop:8 }}>
                Berlaku: {dok.tglBerlaku} s.d. {dok.tglBerakhir} · {dok.durasi} tahun
              </div>
              <div style={infoNoteGreen}>ℹ️ {STATUS_DESC[dok.status] || ''}</div>
            </div>
          </div>

          <div style={{ ...shellStyle, marginBottom:14 }} className="fld">
            <div style={coreStyle}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={cardTitle}>Preview Dokumen</div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => setShowIframe(s => !s)} style={btnSm} className="btn-hover">{showIframe ? 'Sembunyikan' : 'Tampilkan'}</button>
                  {dok.docsUrl && dok.status === 'Draft' && (
                    <a href={dok.docsUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, textDecoration:'none' }} className="btn-hover">Buka & Edit ↗</a>
                  )}
                </div>
              </div>
              {dok.status !== 'Draft' && (
                <div style={{ fontSize:10.5, color:'#9aa5a1', marginBottom:10, display:'flex', alignItems:'center', gap:5 }}>
                  🔒 Dokumen tidak bisa diedit saat status &quot;{dok.status}&quot;. Preview di bawah bersifat lihat saja.
                </div>
              )}
              {showIframe && dok.embedUrl ? (
                <iframe src={dok.embedUrl} style={{ width:'100%', height:500, border:'1px solid rgba(10,46,36,0.08)', borderRadius:16 }} title={dok.judul} />
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
            <div style={{ ...shellStyle, borderColor:'rgba(15,110,86,0.16)' }} className="fld">
              <div style={{ ...coreStyle, background:'linear-gradient(170deg,#fafcfb,#f3f8f6)' }}>
                <div style={cardTitle}>📝 Sudah selesai mengisi?</div>
                <div style={hintText}>Jika dokumen sudah final dan siap ditinjau, klik tombol di bawah. Setelah ini, dokumen masuk tahap review admin.</div>
                {!konfirmasi ? (
                  <button onClick={() => setKonfirmasi(true)} style={{ ...btnPrimary, width:'100%' }} className="btn-hover">
                    ✓ Selesai Mengisi Dokumen
                  </button>
                ) : (
                  <div>
                    <div style={{ fontSize:11, color:'#854F0B', background:'#FAEEDA', padding:'9px 11px', borderRadius:10, marginBottom:8, lineHeight:1.5 }}>
                      ⚠️ Yakin dokumen sudah final? Pastikan semua bagian sudah terisi dengan benar.
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
            <div style={{ ...shellStyle, borderColor:'#DDD6FE' }} className="fld">
              <div style={{ ...coreStyle, background:'#FAF9FF' }}>
                <div style={{ ...cardTitle, color:'#5B21B6' }}>⏳ Sedang Ditinjau</div>
                <div style={{ fontSize:11.5, color:'#5b6b66', lineHeight:1.6 }}>
                  Dokumen Anda sedang ditinjau oleh tim Pokja BNN. Anda akan diberi tahu setelah ada keputusan.
                </div>
              </div>
            </div>
          )}

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}>📎 Draf Template Anda</div>
              <div style={hintText}>Lupa unggah draf MOU/PKS saat mengajukan? Unggah di sini. Admin akan meninjau dan bisa menggunakannya sebagai dasar dokumen kerja.</div>
              {templateMitra && (
                <div style={fileChip}>
                  <span style={{ fontSize:16 }}>📄</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11.5, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#0a2e24' }}>{templateMitra.namaFile}</div>
                    <div style={{ fontSize:10, color:'#085041' }}>Sudah diunggah</div>
                  </div>
                  {templateMitra.fileUrl && <a href={templateMitra.fileUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, fontSize:10, textDecoration:'none' }} className="btn-hover">Lihat ↗</a>}
                </div>
              )}
              <label style={{ ...btnSm, display:'block', textAlign:'center', cursor: uploadingTemplate?'wait':'pointer', opacity: uploadingTemplate?0.6:1 }} className="btn-hover">
                {uploadingTemplate ? '⏳ Mengunggah…' : (templateMitra ? '↻ Ganti File' : '+ Unggah Draf (.doc/.docx, maks 1MB)')}
                <input type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={uploadTemplateMitra} disabled={uploadingTemplate} style={{ display:'none' }} />
              </label>
              {templateError && <div style={{ fontSize:10.5, color:'#A32D2D', marginTop:7 }}>{templateError}</div>}
            </div>
          </div>

          <div style={shellStyle} className="fld">
            <div style={coreStyle}>
              <div style={cardTitle}>📅 Tanggal Kegiatan</div>
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

          {bisaUploadFoto && (
            <div style={{ ...shellStyle, borderColor:'rgba(15,110,86,0.16)' }} className="fld">
              <div style={coreStyle}>
                <div style={cardTitle}>📷 Foto Kegiatan</div>
                <div style={hintText}>Unggah foto kegiatan. Foto akan tampil di halaman kegiatan publik jika dokumen ini ditampilkan.</div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#5b6b66', marginBottom:4 }}>
                    <span>{(terpakai/1024/1024).toFixed(2)} MB / 5 MB</span><span>{persen}%</span>
                  </div>
                  <div style={{ height:6, background:'#f1f3f2', borderRadius:100, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${persen}%`, background: persen>=90?'#A32D2D':'linear-gradient(90deg,#0F6E56,#19b894)', borderRadius:100, transition:'width 0.6s cubic-bezier(0.32,0.72,0,1)' }} />
                  </div>
                </div>
                <label style={{ ...btnPrimary, display:'block', textAlign:'center', cursor: uploading?'wait':'pointer', opacity: uploading?0.6:1 }} className="btn-hover">
                  {uploading ? '⏳ Mengunggah…' : '+ Unggah Foto'}
                  <input type="file" accept="image/*" onChange={uploadFoto} disabled={uploading} style={{ display:'none' }} />
                </label>
                {foto.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
                    {foto.map(f => (
                      <div key={f.fileId} style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid rgba(10,46,36,0.08)' }}>
                        <img src={`/api/foto/${f.fileId}`} alt={f.nama} style={{ width:'100%', height:74, objectFit:'cover', display:'block' }} />
                        <button onClick={() => hapusFotoSendiri(f.fileId)} style={fotoDeleteBtn}>✕</button>
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
                <div style={cardTitle}>📄 Unduh Dokumen</div>
                <button onClick={unduhPdf} disabled={genPdf} style={{ ...btnPrimary, width:'100%', background:'linear-gradient(135deg,#2571c9,#185FA5)' }} className="btn-hover">
                  {genPdf ? '⏳ Membuat PDF…' : '⬇ Unduh PDF'}
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

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.9rem 1.5rem', background:'rgba(255,255,255,0.75)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(10,46,36,0.06)', position:'sticky', top:0, zIndex:100, gap:8 };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#5b6b66', textDecoration:'none', flexShrink:0, fontWeight:600 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.6)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(10,46,36,0.06)', borderRadius:22, padding:6, boxShadow:'0 1px 2px rgba(10,46,36,0.03), 0 20px 40px -30px rgba(10,46,36,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:17, padding:'1.1rem 1.25rem', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const cardTitle: React.CSSProperties = { fontSize:12.5, fontWeight:700, marginBottom:9, color:'#0a2e24' };
const labelSt: React.CSSProperties = { display:'block', fontSize:11, color:'#5b6b66', marginBottom:5, fontWeight:600 };
const hintText: React.CSSProperties = { fontSize:10.5, color:'#9aa5a1', marginBottom:9, lineHeight:1.5 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 11px', borderRadius:10, border:'1.5px solid rgba(10,46,36,0.10)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', outline:'none', background:'#fafcfb' };
const btnPrimary: React.CSSProperties = { padding:'10px 16px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#13987a,#0F6E56)', color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:'0 6px 16px -6px rgba(15,110,86,0.5)' };
const btnSm: React.CSSProperties = { padding:'8px 13px', borderRadius:10, border:'1.5px solid rgba(10,46,36,0.10)', background:'#fff', color:'#3a4742', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap' };
const pill: React.CSSProperties = { fontSize:10.5, fontWeight:700, padding:'3px 11px', borderRadius:100 };
const infoNoteGreen: React.CSSProperties = { fontSize:10.5, color:'#085041', marginTop:10, padding:'8px 11px', background:'#F0FBF7', borderRadius:9, lineHeight:1.5 };
const emptyBox: React.CSSProperties = { padding:'2rem', textAlign:'center', color:'#9aa5a1', fontSize:11.5, background:'#f9fafb', borderRadius:12 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:12 });
const centerStyle: React.CSSProperties = { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#f5f7f6', color:'#6b7280', fontSize:13 };
const notifBadge: React.CSSProperties = { position:'absolute', top:-4, right:-4, minWidth:16, height:16, padding:'0 4px', borderRadius:100, background:'#A32D2D', color:'#fff', fontSize:9.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' };
const fileChip: React.CSSProperties = { display:'flex', alignItems:'center', gap:9, padding:'9px 11px', background:'#F0FBF7', borderRadius:11, marginBottom:9 };
const fotoDeleteBtn: React.CSSProperties = { position:'absolute', top:4, right:4, width:20, height:20, borderRadius:'50%', border:'none', background:'rgba(163,45,45,.9)', color:'#fff', cursor:'pointer', fontSize:11, lineHeight:1 };