'use client';

import { useEffect, useState, use } from 'react';
import KomentarRevisi from '@/components/KomentarRevisi';
import KomentarDocs from '@/components/KomentarDocs';

interface Dokumen {
  id: string; jenis: string; judul: string; namaMitra: string;
  tglDibuat: string; tglBerlaku: string; tglBerakhir: string;
  durasi: string; status: string; kode: string; kodeExpire: string;
  docsId: string; docsUrl: string; embedUrl: string;
  folderId: string; dibuatOleh: string; catatan: string; fotoFolderId: string;
  tglKegiatanMulai: string; tglKegiatanSelesai: string; pdfId: string;
  sisaHari: number | null;
}

interface Kandidat { fileId: string; namaFile: string; fileUrl: string; tglSubmit: string; namaInstansi: string; sumber: string; }

const STATUS_LIST = [
  'Draft','Dalam Proses','Selesai','Kegiatan Berlangsung',
  'Kegiatan Selesai','MOU/PKS Berlaku','Kedaluwarsa',
];

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  'Draft':                { bg: '#f1f3f2', color: '#5b6b66' },
  'Dalam Proses':         { bg: '#EDE9FE', color: '#5B21B6' },
  'Selesai':              { bg: '#FEF3E2', color: '#854F0B' },
  'Kegiatan Berlangsung': { bg: '#D1FAE5', color: '#065F46' },
  'Kegiatan Selesai':     { bg: '#A7F3D0', color: '#065F46' },
  'MOU/PKS Berlaku':      { bg: '#E1F5EE', color: '#0F6E56' },
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

  const loadDok = () => {
    fetch(`/api/dokumen/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.message) { setError(d.message); setLoading(false); return; }
        setDok(d.dokumen);
        setEditStatus(d.dokumen.status);
        setTglMulai(d.dokumen.tglKegiatanMulai || '');
        setTglSelesai(d.dokumen.tglKegiatanSelesai || '');
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

  const transisi = async (statusBaru: string) => {
    setSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch(`/api/dokumen/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transisi: statusBaru }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message); return; }
      setDok(prev => prev ? { ...prev, status: statusBaru } : prev);
      setEditStatus(statusBaru);
      setMsg(`Status berhasil diubah ke "${statusBaru}".`);
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const saveStatusManual = async () => {
    setSaving(true); setError(''); setMsg('');
    try {
      const res = await fetch(`/api/dokumen/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus }),
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
        body: JSON.stringify({ tglKegiatanMulai: tglMulai, tglKegiatanSelesai: tglSelesai }),
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
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#f7f9f8,#eef2f0)', fontFamily: FONT }}>
      <GlobalStyle />
      <nav style={navStyle}>
        <a href={backUrl} style={backLink}>← Dashboard</a>
        <div style={{ fontWeight:700, fontSize:13.5, flex:1, textAlign:'center', color:'#0a2e24', letterSpacing:'-0.01em' }}>Detail Dokumen</div>
        {dok.docsUrl && <a href={dok.docsUrl} target="_blank" rel="noopener noreferrer" style={btnGhost}>Buka Docs ↗</a>}
      </nav>

      {msg   && <div style={{ ...msgBox('#085041','#E1F5EE'), margin:'14px auto', maxWidth:1120 }} className="fld">{msg}</div>}
      {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), margin:'14px auto', maxWidth:1120 }} className="fld">{error}</div>}

      <div style={{ maxWidth:1120, margin:'0 auto', padding:'1.5rem 1.25rem 3rem', display:'grid', gridTemplateColumns:'1fr 380px', gap:16 }}>

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
              <div style={{ fontSize:19, fontWeight:800, marginBottom:4, color:'#0a2e24', letterSpacing:'-0.02em' }}>{dok.judul}</div>
              <div style={{ fontSize:13.5, color:'#0F6E56', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>🏢 {dok.namaMitra}</div>
              <div style={{ fontSize:11.5, color:'#5b6b66', marginTop:8, lineHeight:1.7 }}>
                <strong>Masa berlaku:</strong> {dok.tglBerlaku} s.d. {dok.tglBerakhir} ({dok.durasi} th)<br/>
                {(dok.tglKegiatanMulai || dok.tglKegiatanSelesai) && (
                  <><strong>Tanggal kegiatan:</strong> {dok.tglKegiatanMulai || '—'} s.d. {dok.tglKegiatanSelesai || '—'}<br/></>
                )}
                Dibuat oleh {dok.dibuatOleh}
              </div>
              <div style={infoNote}>ℹ️ {STATUS_DESC[dok.status] || ''}</div>
            </div>
          </div>

          <div style={{ ...shellStyle, marginBottom:14 }} className="fld">
            <div style={coreStyle}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={cardTitle}>Preview Dokumen</div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => setShowIframe(s => !s)} style={btnSm} className="btn-hover">{showIframe ? 'Sembunyikan' : 'Tampilkan'}</button>
                  {dok.docsUrl && <a href={dok.docsUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, textDecoration:'none' }} className="btn-hover">Edit ↗</a>}
                </div>
              </div>
              {showIframe && dok.embedUrl ? (
                <iframe src={dok.embedUrl} style={{ width:'100%', height:520, border:'1px solid rgba(10,46,36,0.08)', borderRadius:16 }} title={dok.judul} />
              ) : !showIframe ? null : (
                <div style={emptyBox}>Preview tidak tersedia.</div>
              )}
            </div>
          </div>

          <div className="fld"><KomentarRevisi idDokumen={dok.id} pengirim="admin" senderId={idAdmin} namaPengirim={namaAdmin} /></div>
          <KomentarDocs docsId={dok.docsId} namaPengirim={namaAdmin} />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {(dok.status === 'Dalam Proses' || dok.status === 'Draft') && (
            <div style={{ ...shellStyle, borderColor:'rgba(15,110,86,0.16)' }} className="fld">
              <div style={{ ...coreStyle, background:'linear-gradient(170deg,#fafcfb,#f3f8f6)' }}>
                <div style={cardTitle}>Tindakan</div>
                {dok.status === 'Dalam Proses' && (
                  <>
                    <button onClick={() => transisi('Selesai')} disabled={saving} style={{ ...btnPrimary, width:'100%', marginBottom:8 }} className="btn-hover">
                      ✓ Setujui Dokumen (Acc)
                    </button>
                    <button onClick={() => transisi('Draft')} disabled={saving} style={{ ...btnSm, width:'100%', color:'#854F0B', borderColor:'#FAEEDA' }} className="btn-hover">
                      ↩ Kembalikan ke Draft
                    </button>
                    <div style={hintText}>Acc → status &quot;Selesai&quot;. Saat tanggal kegiatan tiba, otomatis jadi &quot;Kegiatan Berlangsung&quot;.</div>
                  </>
                )}
                {dok.status === 'Draft' && (
                  <div style={{ fontSize:11.5, color:'#5b6b66', lineHeight:1.6 }}>
                    Dokumen masih Draft. Mitra perlu klik &quot;Selesai Mengisi&quot; dari halaman mereka untuk lanjut ke review.
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
                    <div style={templateCardIcon}>🏛️</div>
                    <div style={templateCardTitle}>Template Resmi BNN</div>
                    <div style={templateCardDesc}>Gunakan template standar BNN Provinsi</div>
                  </div>
                  {!templateChecked ? (
                    <div style={templateCard(false, false)}>
                      <div style={templateCardIcon}>⏳</div>
                      <div style={templateCardTitle}>Memeriksa…</div>
                    </div>
                  ) : kandidatUtama ? (
                    <button
                      onClick={() => gantiTemplate(kandidatUtama.fileId)}
                      disabled={applyingTemplate === kandidatUtama.fileId}
                      style={{ ...templateCard(true, true), cursor:'pointer', border:'none', textAlign:'left', font:'inherit' }}
                      className="tpl-active"
                    >
                      <div style={templateCardIcon}>📄</div>
                      <div style={templateCardTitle}>{applyingTemplate ? 'Mengganti…' : 'Dokumen Mitra'}</div>
                      <div style={templateCardDesc}>{kandidatUtama.namaFile}</div>
                    </button>
                  ) : (
                    <div style={templateCard(false, false)} title="Mitra belum mengunggah berkas">
                      <div style={templateCardIcon}>🚫</div>
                      <div style={templateCardTitle}>Dokumen Mitra</div>
                      <div style={templateCardDesc}>Tidak aktif — belum ada berkas</div>
                    </div>
                  )}
                </div>
                {templateKandidat.length > 1 && (
                  <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                    {templateKandidat.slice(1).map(t => (
                      <div key={t.fileId} style={miniCandidateRow}>
                        <span style={{ fontSize:11, color:'#3a4742', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{t.namaFile}</span>
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
              <div style={cardTitle}>📅 Tanggal Kegiatan</div>
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
              <div style={cardTitle}>📄 Unduh PDF</div>
              {bolehUnduhPdf ? (
                <>
                  <button onClick={unduhPdf} disabled={genPdf} style={{ ...btnPrimary, width:'100%', background:'linear-gradient(135deg,#2571c9,#185FA5)' }} className="btn-hover">
                    {genPdf ? '⏳ Membuat PDF…' : '⬇ Unduh PDF Kualitas Tinggi'}
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
              <div style={cardTitle}>Aksi Cepat</div>
              <a href={`/dashboard/dokumen/foto?id=${dok.id}&judul=${encodeURIComponent(dok.judul)}`} style={{ ...btnSm, textDecoration:'none', textAlign:'center', display:'block' }} className="btn-hover">📷 Kelola Foto Kegiatan</a>
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
      .fld { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
      .btn-hover:active:not(:disabled) { transform: scale(0.98); }
      .tpl-active { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
      .tpl-active:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 22px -8px rgba(15,110,86,0.35); }
    `}</style>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.9rem 1.5rem', background:'rgba(255,255,255,0.75)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(10,46,36,0.06)', position:'sticky', top:0, zIndex:100, gap:8 };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#5b6b66', textDecoration:'none', flexShrink:0, fontWeight:600 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.6)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(10,46,36,0.06)', borderRadius:22, padding:6, boxShadow:'0 1px 2px rgba(10,46,36,0.03), 0 20px 40px -30px rgba(10,46,36,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:17, padding:'1.15rem 1.3rem', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const cardTitle: React.CSSProperties = { fontSize:12.5, fontWeight:700, marginBottom:10, color:'#0a2e24' };
const labelSt: React.CSSProperties = { display:'block', fontSize:11, color:'#5b6b66', marginBottom:5, fontWeight:600 };
const hintText: React.CSSProperties = { fontSize:10.5, color:'#9aa5a1', marginBottom:8, lineHeight:1.5, marginTop: -2 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 11px', borderRadius:10, border:'1.5px solid rgba(10,46,36,0.10)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', outline:'none', background:'#fafcfb' };
const btnPrimary: React.CSSProperties = { padding:'10px 16px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#13987a,#0F6E56)', color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:'0 6px 16px -6px rgba(15,110,86,0.5)' };
const btnSm: React.CSSProperties = { padding:'8px 13px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(10,46,36,0.10)', background:'#fff', color:'#3a4742', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap' };
const btnGhost: React.CSSProperties = { fontSize:12, padding:'7px 14px', borderRadius:10, border:'1px solid rgba(10,46,36,0.08)', textDecoration:'none', color:'#3a4742', background:'#fff', fontWeight:600 };
const pill: React.CSSProperties = { fontSize:10.5, fontWeight:700, padding:'3px 11px', borderRadius:100 };
const infoNote: React.CSSProperties = { fontSize:10.5, color:'#9aa5a1', marginTop:10, padding:'7px 11px', background:'#f9fafb', borderRadius:9 };
const emptyBox: React.CSSProperties = { padding:'2rem', textAlign:'center', color:'#9aa5a1', fontSize:11.5, background:'#f9fafb', borderRadius:12 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:12 });
const centerStyle: React.CSSProperties = { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f7f6', color:'#6b7280', fontSize:13 };
const miniCandidateRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'#fafcfb', borderRadius:8, border:'1px solid rgba(10,46,36,0.06)' };

const templateCard = (active: boolean, enabled: boolean): React.CSSProperties => ({
  padding:'14px 12px', borderRadius:14, textAlign:'center',
  border: `1.5px solid ${active ? '#0F6E56' : 'rgba(10,46,36,0.08)'}`,
  background: active ? 'linear-gradient(160deg,#f1fbf7,#e2f3eb)' : (enabled ? '#fff' : '#f7f8f7'),
  opacity: enabled ? 1 : 0.55,
  cursor: enabled ? 'default' : 'not-allowed',
  width: '100%',
});
const templateCardIcon: React.CSSProperties = { fontSize:20, marginBottom:6 };
const templateCardTitle: React.CSSProperties = { fontSize:11.5, fontWeight:700, color:'#0a2e24' };
const templateCardDesc: React.CSSProperties = { fontSize:9.5, color:'#7d8985', marginTop:3, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' };