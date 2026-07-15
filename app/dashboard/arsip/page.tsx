'use client';

import { useEffect, useState, useCallback } from 'react';

interface Arsip {
  id: string; namaInstitusi: string; jenis: string; judul: string;
  tglBerlaku: string; tglBerakhir: string; fileId: string; fileUrl: string; namaFile: string;
  namaPIC: string; emailPIC: string; waPIC: string; catatan: string;
  diarsipkanOleh: string; tglDiarsipkan: string; statusKerjaSama: string;
  sumber: 'manual' | 'sistem';
  ttdTipe?: string; ttdTglFinal?: string; divisi?: string[];
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
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    setNamaAdmin(u.nama || u.email || 'Admin Pokja');
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFFileError('');
    if (!f) { setFFile(null); return; }
    const allowed = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', 'application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
    ];
    if (!allowed.includes(f.type)) { setFFileError('Format tidak didukung. Gunakan Word, PDF, atau gambar (JPG/PNG).'); setFFile(null); return; }
    if (f.size > 10 * 1024 * 1024) { setFFileError(`File terlalu besar (${(f.size/1024/1024).toFixed(2)}MB). Maksimal 10 MB.`); setFFile(null); return; }
    setFFile(f);
  };

  const resetForm = () => {
    setFNama(''); setFJenis('MOU'); setFJudul(''); setFBerlaku(''); setFBerakhir('');
    setFStatusKS('Sudah Berakhir'); setFDivisi([]);
    setFPIC(''); setFEmail(''); setFWa(''); setFCatatan(''); setFFile(null); setFFileError('');
  };

  const submitArsip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (!fFile) { setError('Berkas dokumen wajib diunggah.'); return; }
    setSaving(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Gagal baca file'));
        reader.readAsDataURL(fFile);
      });
      const r = await fetch('/api/arsip-dokumen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaInstitusi: fNama, jenis: fJenis, judul: fJudul,
          tglBerlaku: fBerlaku, tglBerakhir: fBerakhir, statusKerjaSama: fStatusKS, divisi: fDivisi,
          namaPIC: fPIC, emailPIC: fEmail, waPIC: fWa, catatan: fCatatan,
          diarsipkanOleh: namaAdmin,
          fileBase64: base64, fileName: fFile.name, fileMime: fFile.type,
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

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

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

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#f7f9fc,#eef2f8)', fontFamily: FONT }}>
      <GlobalStyle />
      <nav style={navStyle}>
        <a href={backUrl} style={backLink}>← Dashboard</a>
        <div style={{ fontWeight:700, fontSize:13.5, flex:1, textAlign:'center', color:'#0f1f3d' }}>Arsip Dokumen</div>
        <button onClick={() => { setShowForm(s => !s); if (showForm) resetForm(); }} style={btnPrimary} className="btn-hover">
          {showForm ? 'Batal' : '+ Arsipkan Dokumen'}
        </button>
      </nav>

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'1.5rem 1.25rem 3rem' }}>

        {msg   && <div style={{ ...msgBox('#1D4ED8','#DBEAFE'), marginBottom:14 }} className="fld">{msg}</div>}
        {error && <div style={{ ...msgBox('#A32D2D','#FCEBEB'), marginBottom:14 }} className="fld">{error}</div>}

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
                  <label style={labelSt}>Berkas Dokumen * <span style={{ fontWeight:400, color:'#94a3b8' }}>(Word / PDF / Scan JPG-PNG, maks 10 MB)</span></label>
                  <input type="file" accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/jpeg,image/png"
                    onChange={handleFile} style={inputFull} />
                  {fFile && <div style={{ fontSize:11, color:'#1D4ED8', marginTop:6 }}>✓ {fFile.name} ({(fFile.size/1024).toFixed(0)} KB)</div>}
                  {fFileError && <div style={{ fontSize:11, color:'#A32D2D', marginTop:6 }}>{fFileError}</div>}
                </div>

                <button type="submit" disabled={saving} style={{ ...btnPrimary, width:'100%' }} className="btn-hover">
                  {saving ? 'Mengarsipkan…' : 'Simpan ke Arsip'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          <input
            value={cari}
            onChange={e => setCari(e.target.value)}
            placeholder="Cari institusi, judul, atau PIC..."
            style={{ ...inputFull, flex:1, minWidth:200 }}
          />
          <div style={{ display:'flex', gap:6 }}>
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
            {list.map(a => {
              const sb = statusBadge(a);
              return (
                <div key={a.id} style={shellStyle} className="fld">
                  <div style={coreStyle}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:200 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                          <span style={{ ...pill, background:a.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color:a.jenis==='MOU'?'#1D4ED8':'#92400E' }}>{a.jenis}</span>
                          <span style={{ ...pill, background: sb.bg, color: sb.color }}>{sb.label}</span>
                          <span style={{ ...pill, background: a.sumber === 'sistem' ? '#FEF3C7' : '#f1f3f2', color: a.sumber === 'sistem' ? '#D97706' : '#7d8985' }}>
                            {a.sumber === 'sistem' ? 'Sistem' : 'Arsip Lama'}
                          </span>
                          {(a.divisi || []).map(dv => {
                            const info = DIVISI_LABEL[dv] || { label: dv, color:'#64748b', bg:'#f1f5f9' };
                            return <span key={dv} style={{ ...pill, background: info.bg, color: info.color }}>{info.label}</span>;
                          })}
                        </div>
                        <div style={{ fontSize:14.5, fontWeight:700, color:'#0f1f3d' }}>{a.judul}</div>
                        <div style={{ fontSize:12.5, color:'#1D4ED8', fontWeight:600, marginTop:2 }}>🏢 {a.namaInstitusi}</div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:6 }}>Berlaku: {a.tglBerlaku || '—'} s.d. {a.tglBerakhir || '—'}</div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
                          PIC: {a.namaPIC || '—'}{a.emailPIC ? ` · ${a.emailPIC}` : ''}{a.waPIC ? ` · ${a.waPIC}` : ''}
                        </div>
                        {a.ttdTglFinal && (
                          <div style={{ fontSize:11, color:'#D97706', marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
                            ✒ TTD {a.ttdTipe === 'basah' ? 'Basah' : 'Online'}: {a.ttdTglFinal}
                          </div>
                        )}
                        {a.sumber === 'manual' && (
                          <div style={{ fontSize:10, color:'#94a3b8', marginTop:6 }}>Diarsipkan {a.tglDiarsipkan}{a.diarsipkanOleh ? ` oleh ${a.diarsipkanOleh}` : ''}</div>
                        )}
                        {a.catatan && <div style={{ fontSize:11, color:'#94a3b8', marginTop:6, fontStyle:'italic' }}>{a.catatan}</div>}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                        {a.fileUrl && (
                          <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, textDecoration:'none', textAlign:'center' }} className="btn-hover">
                            📄 Lihat Berkas
                          </a>
                        )}
                        {a.sumber === 'sistem' ? (
                          <a href={`/dashboard/dokumen/${a.id}`} style={{ ...btnSm, textDecoration:'none', textAlign:'center' }} className="btn-hover">
                            Lihat di Sistem
                          </a>
                        ) : confirmDelete === a.id ? (
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
                          <button onClick={() => setConfirmDelete(a.id)} style={deleteLink} className="btn-hover">🗑️ Hapus</button>
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
      .btn-hover { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
      .btn-hover:active:not(:disabled) { transform: scale(0.98); }
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
const nestGroup: React.CSSProperties = { background:'#f8fafc', border:'1px solid rgba(29,78,216,0.06)', borderRadius:14, padding:'0.9rem 1rem' };
const btnPrimary: React.CSSProperties = { padding:'9px 16px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#2563EB,#1E3A8A)', color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:'0 6px 16px -6px rgba(29,78,216,0.45)' };
const btnSm: React.CSSProperties = { padding:'7px 13px', borderRadius:10, border:'1.5px solid rgba(29,78,216,0.10)', background:'#fff', color:'#334155', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap' };
const pill: React.CSSProperties = { fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:100 };
const eyebrow: React.CSSProperties = { display:'inline-block', fontSize:9.5, color:'#D97706', textTransform:'uppercase', letterSpacing:'0.14em', fontWeight:700, background:'#FEF3C7', padding:'4px 11px', borderRadius:100 };
const emptyBox: React.CSSProperties = { padding:'2.5rem', textAlign:'center', color:'#94a3b8', fontSize:12, background:'#f8fafc', borderRadius:16 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:12 });
const jenisBtn: React.CSSProperties = { flex:1, padding:'9px', borderRadius:10, border:'1.5px solid rgba(29,78,216,0.10)', background:'#fff', color:'#64748b', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT };
const jenisBtnActive: React.CSSProperties = { border:'1.5px solid #1D4ED8', background:'linear-gradient(160deg,#EFF6FF,#DBEAFE)', color:'#1E3A8A' };
const statusBtn: React.CSSProperties = { flex:1, padding:'9px 10px', borderRadius:10, border:'1.5px solid rgba(29,78,216,0.10)', background:'#fff', color:'#64748b', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:FONT };
const statusBtnActiveBlue: React.CSSProperties = { border:'1.5px solid #1D4ED8', background:'linear-gradient(160deg,#EFF6FF,#DBEAFE)', color:'#1E3A8A' };
const statusBtnActiveGray: React.CSSProperties = { border:'1.5px solid #94a3b8', background:'#f1f5f9', color:'#475569' };
const filterPill: React.CSSProperties = { padding:'8px 15px', borderRadius:100, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', color:'#64748b', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:FONT };
const filterPillActive: React.CSSProperties = { background:'#1D4ED8', borderColor:'#1D4ED8', color:'#fff' };
const filterPillSm: React.CSSProperties = { padding:'6px 13px', borderRadius:100, borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', background:'#f8fafc', color:'#64748b', fontSize:10.5, fontWeight:600, cursor:'pointer', fontFamily:FONT };
const filterPillSmActive: React.CSSProperties = { background:'#1D4ED8', borderColor:'#1D4ED8', color:'#fff' };
const confirmBox: React.CSSProperties = { padding:'8px 9px', background:'#FCEBEB', border:'1px solid rgba(163,45,45,0.2)', borderRadius:10, minWidth:130 };
const btnDanger: React.CSSProperties = { padding:'7px 10px', borderRadius:8, border:'none', background:'#A32D2D', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT };
const deleteLink: React.CSSProperties = { background:'none', border:'none', color:'#A32D2D', fontSize:10.5, fontWeight:600, cursor:'pointer', padding:'7px 0', fontFamily:FONT };