'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiCalendar, FiInbox, FiKey, FiFolder, FiActivity, FiFileText,
  FiUsers, FiList, FiArchive, FiShield, FiMessageCircle, FiMessageSquare,
} from 'react-icons/fi';
import {
  ArrowLeft, Key, Building, User, FileText, Tag, Calendar,
  Copy, Check, ExternalLink, AlertCircle, CheckCircle, Loader2, Send,
  Mail, Phone, Clock, List, Search, Landmark, Upload, Trash2, Paperclip,
  GraduationCap,
} from 'lucide-react';

interface RiwayatItem {
  id: string; jenis: string; judul: string; namaMitra: string;
  tglBerlaku: string; tglBerakhir: string; status: string; kode: string; docsUrl: string;
}
interface HasilGenerate {
  idDokumen: string; kodeAkses: string; kodeExpire: string;
  tglBerlaku: string; tglBerakhir: string; docsUrl: string; message: string;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const DIVISI_LIST = [
  { key: 'pencegahan',    label: 'Pencegahan',    color: BLUE_DARK, bg: '#DBEAFE' },
  { key: 'pemberantasan', label: 'Pemberantasan', color: '#A32D2D', bg: '#FEE2E2' },
  { key: 'rehabilitasi',  label: 'Rehabilitasi',  color: '#5B21B6', bg: '#EDE9FE' },
  { key: 'pemberdayaan',  label: 'Pemberdayaan',  color: GOLD,      bg: '#FEF3C7' },
];
const MAKS_DIVISI = 4;
const WA_MIN = 10;
const WA_MAX = 12;

export default function GenerateKodePage() {
  const [role, setRole] = useState('');
  const [level, setLevel] = useState<'utama' | 'bnnp_bnnk'>('bnnp_bnnk');
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [institusiOpsi, setInstitusiOpsi] = useState<string[]>([]);
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);
  const [search, setSearch] = useState('');

  const [namaMitra, setNamaMitra] = useState('');
  const [namaPIC, setNamaPIC]     = useState('');
  const [jurusan, setJurusan]     = useState('');
  const [emailMitra, setEmailMitra] = useState('');
  const [noWaMitra, setNoWaMitra] = useState('');
  const [jenis, setJenis]         = useState<'MOU'|'PKS'>('MOU');
  const [judul, setJudul]         = useState('');
  const [divisi, setDivisi]       = useState<string[]>([]);
  const [tglMulai, setTglMulai]   = useState('');
  const [tglAkhir, setTglAkhir]   = useState('');

  const [file, setFile]           = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [templateMitraId, setTemplateMitraId] = useState('');
  const [templateFileName, setTemplateFileName] = useState('');
  const [fileError, setFileError] = useState('');

  const [generating, setGenerating] = useState(false);
  const [error, setError]     = useState('');
  const [hasil, setHasil]     = useState<HasilGenerate | null>(null);
  const [copied, setCopied]   = useState(false);
  const [kirimLoading, setKirimLoading] = useState(false);
  const [emailTerkirim, setEmailTerkirim] = useState(false);

  const loadRiwayat = useCallback(() => {
    setLoadingRiwayat(true);
    fetch('/api/superadmin/generate-kode')
      .then(r => r.json())
      .then(d => { setRiwayat(d.data || []); setLoadingRiwayat(false); })
      .catch(() => setLoadingRiwayat(false));
  }, []);

  // Sumber institusi sama dengan Tata Kelola Instansi — gabungan Mitra resmi + riwayat pengajuan/arsip.
  // Cuma nama yang diambil — kontak/PIC sengaja TIDAK di-autofill (lihat pilihInstitusi).
  const loadInstitusi = useCallback(async () => {
    try {
      const [mitraRes, kontakRes] = await Promise.all([
        fetch('/api/superadmin/mitra').then(r => r.json()),
        fetch('/api/kontak-mitra').then(r => r.json()),
      ]);
      const set = new Set<string>();
      (mitraRes.data || []).forEach((m: any) => { if (m.nama) set.add(m.nama); });
      (kontakRes.data || []).forEach((k: any) => { if (k.namaInstitusi) set.add(k.namaInstitusi); });
      setInstitusiOpsi(Array.from(set).sort((a, b) => a.localeCompare(b)));
    } catch { /* opsional, form tetap bisa isi manual */ }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
    setNamaAdmin(u.nama || u.email || 'Admin');
    loadRiwayat();
    loadInstitusi();
  }, [loadRiwayat, loadInstitusi]);

  const toggleDivisi = (key: string) => {
    setDivisi(prev => prev.includes(key) ? prev.filter(d => d !== key) : (prev.length < MAKS_DIVISI ? [...prev, key] : prev));
  };

  const pilihInstitusi = (nama: string) => {
    setNamaMitra(nama);
    // Sengaja HANYA nama institusi yang di-autofill — PIC/email/WA dibiarkan
    // kosong karena penanggung jawab bisa beda tiap pengajuan MOU/PKS,
    // meski institusinya sama.
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError('');
    if (!f) return;
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!allowedMime.includes(f.type)) { setFileError('Hanya file Word (.doc/.docx) yang diizinkan.'); return; }
    if (f.size > 1 * 1024 * 1024) { setFileError(`File terlalu besar (${(f.size/1024/1024).toFixed(2)}MB). Maksimal 1MB.`); return; }

    setFile(f); setUploadingFile(true); setTemplateMitraId('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(',')[1]);
        reader.onerror = () => rej(new Error('Gagal baca file'));
        reader.readAsDataURL(f);
      });
      const res = await fetch('/api/dokumen/upload-draft-mitra', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, fileName: f.name, fileMime: f.type, namaInstitusi: namaMitra || 'Draft', jenis }),
      });
      const d = await res.json();
      if (!res.ok) { setFileError(d.message || 'Gagal mengunggah.'); setFile(null); return; }
      setTemplateMitraId(d.fileId);
      setTemplateFileName(d.namaFile || f.name);
    } catch { setFileError('Gagal mengunggah berkas.'); setFile(null); }
    finally { setUploadingFile(false); }
  };

  const hapusFile = () => { setFile(null); setTemplateMitraId(''); setTemplateFileName(''); setFileError(''); };

  const resetForm = () => {
    setNamaMitra(''); setNamaPIC(''); setJurusan(''); setEmailMitra(''); setNoWaMitra('');
    setJenis('MOU'); setJudul(''); setDivisi([]); setTglMulai(''); setTglAkhir('');
    setHasil(null); setError(''); setEmailTerkirim(false); hapusFile();
  };

  const handleGenerate = async () => {
    setError('');
    if (!namaMitra.trim()) { setError('Nama mitra wajib diisi.'); return; }
    if (!judul.trim()) { setError('Judul dokumen wajib diisi.'); return; }
    if (divisi.length === 0) { setError('Pilih minimal 1 divisi.'); return; }
    if (!tglMulai || !tglAkhir) { setError('Tanggal mulai dan berakhir wajib diisi.'); return; }
    if (new Date(tglAkhir) <= new Date(tglMulai)) { setError('Tanggal berakhir harus setelah tanggal mulai.'); return; }
    if (!emailMitra.trim()) { setError('Email mitra wajib diisi.'); return; }
    if (!noWaMitra.trim()) { setError('No. WhatsApp mitra wajib diisi.'); return; }
    if (noWaMitra.length < WA_MIN || noWaMitra.length > WA_MAX) { setError(`No. WhatsApp harus ${WA_MIN}-${WA_MAX} angka (saat ini ${noWaMitra.length}).`); return; }

    setGenerating(true);
    try {
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipeKode: 'dokumen', namaMitra: namaMitra.trim(),
          namaPIC, jenis, judul: judul.trim(), divisi, jurusan,
          tglBerlaku: tglMulai, tglBerakhir: tglAkhir, dibuatOleh: role,
          ...(templateMitraId ? { templateMitraId } : {}),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || d.error || 'Gagal generate kode.'); return; }
      setHasil(d);
      loadRiwayat();
    } catch (e) {
      setError('Terjadi kesalahan: ' + String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleKirimEmail = async () => {
    if (!hasil) return;
    setKirimLoading(true); setError('');
    try {
      const res = await fetch('/api/email/kirim-akses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailMitra.trim(), namaMitra, jenis, judul,
          kodeAkses: hasil.kodeAkses, kodeExpire: hasil.kodeExpire, idDokumen: hasil.idDokumen,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengirim email.'); return; }
      setEmailTerkirim(true);
    } catch { setError('Terjadi kesalahan saat mengirim email.'); }
    finally { setKirimLoading(false); }
  };

  const copyKode = () => {
    if (!hasil) return;
    navigator.clipboard.writeText(hasil.kodeAkses);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiList size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/laporan', icon: <FiFileText size={17} />, label: 'Laporan' },
    { href: '/dashboard/kelola-chatbot', icon: <FiMessageCircle size={17} />, label: 'Kelola Chatbot' },
    { href: '/dashboard/kotak-saran', icon: <FiMessageSquare size={17} />, label: 'Kotak Saran' },
    ...(level === 'bnnp_bnnk' ? [{ href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' }] : []),
  ];

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  const riwayatFiltered = riwayat.filter(r =>
    !search || r.namaMitra?.toLowerCase().includes(search.toLowerCase()) || r.judul?.toLowerCase().includes(search.toLowerCase()) || r.kode?.toLowerCase().includes(search.toLowerCase())
  );

  if (!role) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <GlobalStyle />

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/superadmin/generate-kode"
        brandLabel="SI-POKJA HUMKER"
        brandSub={level === 'utama' ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        userName={namaAdmin}
        userTag={level === 'utama' ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={BLUE}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth:1000, margin:'0 auto', padding:'1.4rem 1.25rem 0' }}>
        <nav style={navPill} className="fld">
          <div style={{ fontWeight:800, fontSize:14, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d', margin:'0 auto' }}>
            <Key size={17} style={{ color: BLUE }} /> Generate Dokumen
          </div>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth:1000, margin:'0 auto', padding:'1.5rem 1.25rem 3rem', display:'grid', gridTemplateColumns:'1fr 380px', gap:16 }}>

        {/* Kolom kiri — form / hasil */}
        <div>
          {hasil ? (
            <div style={shellStyle} className="fld">
              <div style={{ ...coreStyle, padding:'1.6rem 1.6rem' }}>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:60, height:60, borderRadius:'50%', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, marginBottom:12, boxShadow:`0 10px 26px -8px ${BLUE}60` }}>
                    <CheckCircle size={28} style={{ color:'#fff' }} />
                  </div>
                  <div style={{ fontSize:17, fontWeight:800, color: BLUE_DARK }}>Dokumen Berhasil Dibuat</div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{namaMitra} · {jenis}</div>
                </div>

                <div style={kodeBox}>
                  <div style={{ fontSize:10, color: BLUE_DARK, marginBottom:6, textTransform:'uppercase', letterSpacing:1.5, fontWeight:700 }}>Kode Akses Dokumen</div>
                  <div style={{ fontSize:26, fontWeight:800, letterSpacing:4, color: BLUE_DARK, marginBottom:12, fontFamily:'monospace', background:'rgba(255,255,255,.7)', padding:'8px 16px', borderRadius:8, display:'inline-block' }}>
                    {hasil.kodeAkses}
                  </div>
                  <div>
                    <button onClick={copyKode} style={btnPrimarySm} className="btn-hover">
                      {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Tersalin' : 'Salin Kode'}
                    </button>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, margin:'16px 0', fontSize:12 }}>
                  <div style={dField}><span style={dLabel}>Berlaku</span><span>{hasil.tglBerlaku}</span></div>
                  <div style={dField}><span style={dLabel}>Berakhir</span><span>{hasil.tglBerakhir}</span></div>
                  <div style={dField}><span style={dLabel}>Kode Expire (draft)</span><span>{hasil.kodeExpire}</span></div>
                  <div style={dField}><span style={dLabel}>ID Dokumen</span><span style={{ fontFamily:'monospace', fontSize:11 }}>{hasil.idDokumen}</span></div>
                </div>

                {hasil.docsUrl && (
                  <a href={hasil.docsUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, textDecoration:'none', marginBottom:14 }} className="btn-hover">
                    <ExternalLink size={13} /> Buka Google Docs
                  </a>
                )}

                <div style={mouBox}>
                  <div style={{ fontSize:10.5, fontWeight:700, color: GOLD, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <Send size={12} /> Kirim Kode ke Mitra
                  </div>
                  {emailTerkirim ? (
                    <div style={{ fontSize:12.5, color: BLUE_DARK, background:'#DBEAFE', padding:'10px 13px', borderRadius:9, display:'flex', alignItems:'center', gap:8, fontWeight:600 }}>
                      <CheckCircle size={15} /> Email terkirim ke {emailMitra}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize:12, color:'#78350F', marginBottom:9, display:'flex', alignItems:'center', gap:6 }}>
                        <Mail size={13} /> Tujuan: <strong>{emailMitra}</strong>
                      </div>
                      <button onClick={handleKirimEmail} disabled={kirimLoading} style={{ ...btnPrimary, width:'100%' }} className="btn-hover">
                        {kirimLoading ? (<><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> Mengirim…</>) : (<><Mail size={14} /> Kirim Kode Akses ke Email</>)}
                      </button>
                    </>
                  )}
                </div>

                <div style={{ fontSize:10.5, color:'#94a3b8', margin:'14px 0', display:'flex', alignItems:'center', gap:6 }}>
                  <Clock size={12} /> Dokumen ini otomatis tercatat di Arsip Dokumen (sumber: Sistem).
                </div>

                <button onClick={resetForm} style={{ ...btnSm, width:'100%' }} className="btn-hover">Buat Dokumen Baru</button>
              </div>
            </div>
          ) : (
            <div style={shellStyle} className="fld">
              <div style={{ ...coreStyle, padding:'1.5rem 1.6rem' }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#0f1f3d', marginBottom:4 }}>Generate Dokumen Baru</div>
                <div style={{ fontSize:12, color:'#64748b', marginBottom:18 }}>Buat kode akses + dokumen MOU/PKS langsung dari template resmi BNN.</div>

                {error && (
                  <div style={{ ...msgBox('#991B1B','#FEE2E2'), display:'flex', alignItems:'center', gap:6 }} className="shake">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}><Building size={13} style={{ marginRight:4 }} /> Mitra (dari daftar sistem)</label>
                  <select style={{ ...inputFull, marginBottom:6 }} value="" onChange={e => { if (e.target.value) pilihInstitusi(e.target.value); }}>
                    <option value="">-- Pilih dari daftar, atau isi manual di bawah --</option>
                    {institusiOpsi.map(nama => <option key={nama} value={nama}>{nama}</option>)}
                  </select>
                  <input style={inputFull} value={namaMitra} onChange={e => setNamaMitra(e.target.value)} placeholder="Nama institusi" />
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}><User size={13} style={{ marginRight:4 }} /> Nama PIC</label>
                  <input style={inputFull} value={namaPIC} onChange={e => setNamaPIC(e.target.value)} placeholder="Nama penanggung jawab (opsional)" />
                </div>

                <div style={{ ...nestGroup, marginBottom:12 }}>
                  <label style={{ ...labelSt, marginBottom:8 }}>Kontak Mitra <span style={{ color:'#DC2626' }}>*</span></label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div>
                      <label style={subLabel}><Mail size={12} style={{ marginRight:4 }} /> Email</label>
                      <input type="email" style={inputFull} value={emailMitra} onChange={e => setEmailMitra(e.target.value)} placeholder="email@institusi.id" />
                    </div>
                    <div>
                      <label style={subLabel}><Phone size={12} style={{ marginRight:4 }} /> No. WhatsApp <span style={{ fontWeight:400, opacity:0.7 }}>({noWaMitra.length} angka, {WA_MIN}-{WA_MAX})</span></label>
                      <input type="tel" style={{ ...inputFull, borderColor: (noWaMitra.length > 0 && (noWaMitra.length < WA_MIN || noWaMitra.length > WA_MAX)) ? '#DC2626' : 'rgba(29,78,216,0.10)' }}
                        value={noWaMitra} onChange={e => setNoWaMitra(e.target.value.replace(/\D/g,'').slice(0, WA_MAX))} placeholder="08xxxxxxxxxx" maxLength={WA_MAX} />
                    </div>
                  </div>
                  <div style={hint}>Wajib diisi ({WA_MIN}-{WA_MAX} angka) — dipakai untuk kirim kode akses langsung setelah dokumen dibuat.</div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}><FileText size={13} style={{ marginRight:4 }} /> Judul Dokumen *</label>
                  <input style={inputFull} value={judul} onChange={e => setJudul(e.target.value)} placeholder="Contoh: Kerja Sama Pencegahan Narkoba" />
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}><Tag size={13} style={{ marginRight:4 }} /> Jenis Dokumen *</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {(['MOU','PKS'] as const).map(j => (
                      <button key={j} type="button" onClick={() => { setJenis(j); if (j !== 'PKS') setJurusan(''); }}
                        style={{ flex:1, padding:'9px', borderRadius:9, cursor:'pointer', fontFamily:FONT, fontSize:12.5,
                          border:`1.5px solid ${jenis===j?BLUE:'rgba(29,78,216,0.10)'}`, background: jenis===j?'#EFF6FF':'#fff',
                          color: jenis===j?BLUE_DARK:'#334155', fontWeight: jenis===j?700:400 }}>
                        {j}
                      </button>
                    ))}
                  </div>
                </div>

                {jenis === 'PKS' && (
                  <div style={{ marginBottom:12 }} className="fld">
                    <label style={labelSt}><GraduationCap size={13} style={{ marginRight:4 }} /> Jurusan / Program Studi</label>
                    <input style={inputFull} value={jurusan} onChange={e => setJurusan(e.target.value)} placeholder="Contoh: Teknik Informatika" />
                    <div style={hint}>Khusus PKS — isi kalau kerja sama melibatkan jurusan/prodi tertentu.</div>
                  </div>
                )}

                <div style={{ marginBottom:12 }}>
                  <label style={labelSt}><Landmark size={13} style={{ marginRight:4 }} /> Divisi Penanganan * <span style={{ fontWeight:400, color:'#94a3b8', fontSize:10 }}>(pilih 1–{MAKS_DIVISI})</span></label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {DIVISI_LIST.map(dv => {
                      const checked = divisi.includes(dv.key);
                      const disabled = !checked && divisi.length >= MAKS_DIVISI;
                      return (
                        <button key={dv.key} type="button" disabled={disabled} onClick={() => toggleDivisi(dv.key)}
                          style={{ padding:'9px 10px', borderRadius:9, cursor: disabled?'not-allowed':'pointer', fontFamily:FONT, fontSize:12, textAlign:'left',
                            border:`1.5px solid ${checked?dv.color:'rgba(29,78,216,0.10)'}`, background: checked?dv.bg:'#fff',
                            color: checked?dv.color:'#334155', fontWeight: checked?700:400, opacity: disabled?0.45:1 }}>
                          {dv.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <div>
                    <label style={labelSt}><Calendar size={13} style={{ marginRight:4 }} /> Tanggal Mulai *</label>
                    <input type="date" style={inputFull} value={tglMulai} onChange={e => setTglMulai(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelSt}><Calendar size={13} style={{ marginRight:4 }} /> Tanggal Berakhir *</label>
                    <input type="date" style={inputFull} value={tglAkhir} onChange={e => setTglAkhir(e.target.value)} />
                  </div>
                </div>

                <div style={{ ...nestGroup, marginBottom:18 }}>
                  <label style={{ ...labelSt, marginBottom:8 }}><Paperclip size={13} style={{ marginRight:4 }} /> Draf Dokumen Mitra <span style={{ fontWeight:400, color:'#94a3b8', fontSize:10 }}>(opsional — kalau kosong pakai template resmi BNN)</span></label>
                  {!file ? (
                    <label style={{ ...btnSm, display:'block', textAlign:'center', cursor:'pointer' }} className="btn-hover">
                      <Upload size={13} style={{ marginRight:6, verticalAlign:'middle' }} /> Unggah Draf (.doc/.docx, maks 1MB)
                      <input type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} style={{ display:'none' }} />
                    </label>
                  ) : (
                    <div style={fileChip}>
                      <FileText size={16} style={{ color: uploadingFile ? '#94a3b8' : BLUE, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11.5, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#0f1f3d' }}>{templateFileName || file.name}</div>
                        <div style={{ fontSize:10, color: uploadingFile ? '#94a3b8' : BLUE }}>{uploadingFile ? 'Mengunggah…' : 'Siap dipakai sebagai template'}</div>
                      </div>
                      <button onClick={hapusFile} style={miniIconBtn} className="btn-hover"><Trash2 size={12} /></button>
                    </div>
                  )}
                  {fileError && <div style={{ fontSize:10.5, color:'#DC2626', marginTop:7 }}>{fileError}</div>}
                </div>

                <button onClick={handleGenerate} disabled={generating || uploadingFile} style={{ ...btnPrimary, width:'100%', height:48, fontSize:14, opacity: (generating||uploadingFile)?0.7:1 }} className="btn-hover">
                  {generating ? (<><Loader2 size={17} style={{ animation:'spin 1s linear infinite' }} /> Membuat dokumen…</>) : (<><Key size={17} /> Generate Kode & Dokumen</>)}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Kolom kanan — riwayat */}
        <div>
          <div style={shellStyle} className="fld">
            <div style={{ ...coreStyle, padding:'1.2rem 1.3rem' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#0f1f3d', marginBottom:10, display:'flex', alignItems:'center', gap:7 }}>
                <List size={14} /> Riwayat Generate
              </div>
              <div style={{ position:'relative', marginBottom:10 }}>
                <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
                <input style={{ ...inputFull, paddingLeft:30, fontSize:11.5 }} placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {loadingRiwayat ? (
                <div style={{ textAlign:'center', padding:'2rem 0', color:'#94a3b8', fontSize:12 }}>Memuat…</div>
              ) : riwayatFiltered.length === 0 ? (
                <div style={{ textAlign:'center', padding:'2rem 0', color:'#94a3b8', fontSize:12 }}>Belum ada riwayat.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:7, maxHeight:520, overflowY:'auto' }}>
                  {riwayatFiltered.slice(0,30).map(r => (
                    <a key={r.id} href={`/dashboard/dokumen/${r.id}`} style={riwayatRow} className="btn-hover">
                      <div style={{ display:'flex', gap:5, marginBottom:3 }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:100, background: r.jenis==='MOU'?'#DBEAFE':'#FEF3C7', color: r.jenis==='MOU'?BLUE_DARK:'#92400E' }}>{r.jenis}</span>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#0f1f3d', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.judul}</div>
                      <div style={{ fontSize:10.5, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.namaMitra}</div>
                      <div style={{ fontSize:9.5, color: BLUE, fontFamily:'monospace', marginTop:2 }}>{r.kode}</div>
                    </a>
                  ))}
                </div>
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
      @keyframes fadeUp { from { opacity:0; transform: translateY(12px); filter: blur(3px);} to { opacity:1; transform: translateY(0); filter: blur(0);} }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes shakeX { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
      .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
      .shake { animation: shakeX 0.4s ease-out; }
      .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
      @media (min-width: 901px) {
        .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
      }
    `}</style>
  );
}

const navPill: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.72)', backdropFilter:'blur(12px)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:100, padding:'9px 10px 9px 18px', boxShadow:'0 10px 26px -18px rgba(15,23,42,0.25)' };
const backLink: React.CSSProperties = { fontSize:12.5, color:'#64748b', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:6 };
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(29,78,216,0.08)', borderRadius:20, padding:6, boxShadow:'0 1px 2px rgba(15,23,42,0.03), 0 20px 40px -30px rgba(15,23,42,0.18)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:15, boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const labelSt: React.CSSProperties = { display:'flex', alignItems:'center', fontSize:11, fontWeight:600, color:'#334155', marginBottom:5 };
const subLabel: React.CSSProperties = { display:'flex', alignItems:'center', fontSize:10.5, fontWeight:600, color:'#54635e', marginBottom:5 };
const hint: React.CSSProperties = { fontSize:10, color:'#94a3b8', marginTop:8, lineHeight:1.5 };
const inputFull: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:9, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', fontSize:12, fontFamily:FONT, boxSizing:'border-box', background:'#F5F1E8', outline:'none' };
const nestGroup: React.CSSProperties = { background:'#F5F1E8', border:'1px solid rgba(29,78,216,0.06)', borderRadius:12, padding:'0.9rem 1rem' };
const btnPrimary: React.CSSProperties = { padding:'10px 16px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:FONT, display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:`0 6px 16px -6px ${BLUE}60` };
const btnPrimarySm: React.CSSProperties = { ...btnPrimary, padding:'8px 18px', fontSize:11.5, display:'inline-flex' };
const btnSm: React.CSSProperties = { padding:'9px 14px', borderRadius:10, borderWidth:1.5, borderStyle:'solid', borderColor:'rgba(29,78,216,0.10)', background:'#fff', color:'#334155', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT };
const dField: React.CSSProperties = { display:'flex', flexDirection:'column', gap:2, background:'#F5F1E8', borderRadius:8, padding:'8px 10px' };
const dLabel: React.CSSProperties = { fontSize:9.5, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.3, fontWeight:600 };
const kodeBox: React.CSSProperties = { background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border:'2px solid #93C5FD', borderRadius:14, padding:'1.3rem', textAlign:'center', marginBottom:6 };
const mouBox: React.CSSProperties = { background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'12px 14px' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'10px 14px', borderRadius:10, marginBottom:14 });
const riwayatRow: React.CSSProperties = { display:'block', padding:'9px 11px', borderRadius:10, background:'#F5F1E8', border:'1px solid rgba(29,78,216,0.06)', textDecoration:'none' };
const fileChip: React.CSSProperties = { display:'flex', alignItems:'center', gap:9, padding:'9px 11px', background:'#EFF6FF', borderRadius:10 };
const miniIconBtn: React.CSSProperties = { width:26, height:26, borderRadius:8, border:'1px solid rgba(220,38,38,0.15)', background:'#fff', color:'#DC2626', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };