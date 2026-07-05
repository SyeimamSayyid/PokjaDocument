'use client';

import { useEffect, useState, use, useRef } from 'react';
import {
  ArrowLeft, CheckCircle, Copy, Check, AlertCircle, Calendar, MapPin,
  Users, Building, Mail, Phone, FileText, Tag, Clipboard, Home, Search,
  GraduationCap, MessageSquare, Send, Info, FileCheck, User, Upload,
  Trash2, Paperclip, Loader2,
} from 'lucide-react';

interface Kegiatan {
  id: string; kategori: string; divisi: string[]; divisiLabel: string[]; judul: string;
  deskripsi: string; jenis: string; target: number; terisi: number;
  wilayah: string; tglMulai: string; tglTarget: string;
  tglDitetapkan: string; tglBerakhirMou: string;
  status: string; tampilPublik: boolean; sisaKuota: number;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';
const WA_MIN = 10;
const WA_MAX = 12;

const DIVISI_COLOR: Record<string, string> = {
  pencegahan: BLUE_DARK, pemberantasan: '#A32D2D', rehabilitasi: '#5B21B6', pemberdayaan: GOLD,
};

function formatTanggal(t: string) {
  if (!t) return '';
  try { return new Date(t).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return t; }
}

export default function DaftarKegiatanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }              = use(params);
  const [keg, setKeg]       = useState<Kegiatan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [mounted, setMounted] = useState(false);

  const [step, setStep]     = useState<'form'|'sukses'>('form');
  const [hasil, setHasil]   = useState<{ kodeTracking:string; jenis:string; judulKegiatan:string; namaInstitusi:string; sisaKuota:number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formProgress, setFormProgress] = useState(0);

  const [namaInstitusi, setNamaInstitusi] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [namaPIC, setNamaPIC] = useState('');
  const [email, setEmail]     = useState('');
  const [noWa, setNoWa]       = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  const [file, setFile]         = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [templateMitraId, setTemplateMitraId] = useState('');
  const [templateFileName, setTemplateFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch(`/api/rencana/publik?id=${id}`)
      .then(r => r.json())
      .then(d => {
        const k = d.data;
        if (!k) { setError('Kegiatan tidak ditemukan.'); return; }
        if (!k.tampilPublik) { setError('Kegiatan ini tidak menerima pendaftaran.'); return; }
        setKeg(k);
      })
      .catch(() => setError('Gagal memuat kegiatan.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    let p = 0;
    if (namaInstitusi) p += 25;
    if (namaPIC) p += 20;
    if (email) p += 20;
    if (noWa.length >= WA_MIN) p += 20;
    if (deskripsi || file) p += 15;
    setFormProgress(Math.min(100, p));
  }, [namaInstitusi, namaPIC, email, noWa, deskripsi, file]);

  const handleWaChange = (v: string) => setNoWa(v.replace(/\D/g, '').slice(0, WA_MAX));

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
        body: JSON.stringify({ fileBase64: base64, fileName: f.name, fileMime: f.type, namaInstitusi: namaInstitusi || 'Draft', jenis: keg?.jenis || '' }),
      });
      const d = await res.json();
      if (!res.ok) { setFileError(d.message || 'Gagal mengunggah.'); setFile(null); return; }
      setTemplateMitraId(d.fileId);
      setTemplateFileName(d.namaFile || f.name);
    } catch { setFileError('Gagal mengunggah berkas.'); setFile(null); }
    finally { setUploadingFile(false); }
  };

  const hapusFile = () => { setFile(null); setTemplateMitraId(''); setTemplateFileName(''); setFileError(''); if (fileRef.current) fileRef.current.value = ''; };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileChange({ target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const daftar = async () => {
    setError('');
    if (!namaInstitusi.trim()) { setError('Nama institusi wajib diisi.'); return; }
    if (!namaPIC.trim())       { setError('Nama PIC wajib diisi.'); return; }
    if (!email.trim())         { setError('Email wajib diisi.'); return; }
    if (!noWa.trim())          { setError('No. WhatsApp wajib diisi.'); return; }
    if (noWa.length < WA_MIN || noWa.length > WA_MAX) { setError(`No. WhatsApp harus ${WA_MIN}-${WA_MAX} angka (saat ini ${noWa.length}).`); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/rencana/daftar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idKegiatan: id, namaInstitusi, namaPIC, jurusan, email, noWa, deskripsi,
          ...(templateMitraId ? { fileDokumenId: templateMitraId, fileDokumenNama: templateFileName } : {}),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mendaftar.'); return; }
      setHasil(d); setStep('sukses');
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:38, height:38, border:'3px solid #eef2f6', borderTop:`3px solid ${BLUE}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13.5 }}>Memuat kegiatan...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error && !keg) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:FONT, color:'#A32D2D', padding:'1.5rem', textAlign:'center' }}>
      <AlertCircle size={52} style={{ color:'#f7b4b4', marginBottom:16 }} />
      <div style={{ fontSize:16, fontWeight:700 }}>{error}</div>
      <a href="/beranda" style={{ marginTop:16, color: BLUE, textDecoration:'none', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:100, background:'#EFF6FF', fontWeight:600 }} className="btn-hover">
        <ArrowLeft size={15} /> Kembali ke Beranda
      </a>
      <style>{`.btn-hover{transition:all .25s ease}.btn-hover:hover{filter:brightness(1.05)}`}</style>
    </div>
  );

  if (step === 'sukses' && hasil) {
    return (
      <div style={pageStyle}>
        <GlobalStyle />
        <div style={shellStyle} className="reveal">
          <div style={coreStyle}>
            <div style={{ textAlign:'center', marginBottom:26 }}>
              <div style={badgeIcon}><CheckCircle size={34} color="#fff" strokeWidth={1.6} /></div>
              <div style={{ fontSize:22, fontWeight:800, color: BLUE_DARK, letterSpacing:'-0.02em' }}>Pendaftaran Berhasil!</div>
              <div style={{ fontSize:13.5, color:'#64748b', marginTop:4 }}>{hasil.namaInstitusi} · {hasil.jenis}</div>
            </div>

            <div style={kodeShell}>
              <div style={kodeCore}>
                <div style={eyebrow}><Clipboard size={11} strokeWidth={1.8} /> Kode Tracking</div>
                <div style={{ fontSize:30, fontWeight:800, letterSpacing:5, color: BLUE_DARK, margin:'10px 0 16px', fontFamily:'monospace' }}>
                  {hasil.kodeTracking}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(hasil.kodeTracking); setCopied(true); setTimeout(()=>setCopied(false),1500); }} style={ctaPill} className="cta">
                  {copied ? 'Tersalin' : 'Salin Kode'}
                  <span style={ctaIconWrap} className="cta-ic">{copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.8} />}</span>
                </button>
              </div>
            </div>

            <div style={infoCard('#92400E', 'rgba(217,119,6,0.07)', 'rgba(217,119,6,0.16)')}>
              <AlertCircle size={17} strokeWidth={1.6} style={{ flexShrink:0, marginTop:1 }} />
              <div><strong>Simpan kode ini.</strong> Gunakan untuk melacak status pendaftaran Anda.</div>
            </div>

            <div style={{ display:'flex', gap:9, flexWrap:'wrap', marginTop:8 }}>
              <a href="/cek-pengajuan" style={{ ...ctaPill, flex:1, minWidth:140, justifyContent:'center', textDecoration:'none' }} className="cta">
                Cek Status
                <span style={ctaIconWrap} className="cta-ic"><Search size={15} strokeWidth={1.8} /></span>
              </a>
              <a href="/beranda" style={{ ...ghostPill, flex:1, textDecoration:'none' }}>
                <Home size={16} strokeWidth={1.8} /> Ke Beranda
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!keg) return null;
  const kuotaPenuh = keg.sisaKuota <= 0;
  const waInvalid = noWa.length > 0 && (noWa.length < WA_MIN || noWa.length > WA_MAX);
  const fieldDelay = (n: number) => ({ animationDelay: `${0.05 * n + 0.1}s` });

  return (
    <div style={pageStyle}>
      <GlobalStyle />
      <div style={shellStyle} className={mounted ? 'reveal' : ''}>
        <div style={coreStyle}>

          <a href="/beranda" style={{ fontSize:12, color:'#64748b', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6, marginBottom:18, fontWeight:600 }} className="btn-hover">
            <ArrowLeft size={14} /> Kembali
          </a>

          {/* Info kegiatan */}
          <div style={infoBox}>
            <div style={{ display:'flex', gap:6, marginBottom:11, flexWrap:'wrap' }}>
              {keg.divisi.map((dv, i) => {
                const color = DIVISI_COLOR[dv] || BLUE;
                return <span key={dv} style={pillTag(`${color}15`, color)}><Tag size={11} />{keg.divisiLabel[i] || dv}</span>;
              })}
              <span style={pillTag(keg.jenis==='MOU'?'#DBEAFE':'#FEF3C7', keg.jenis==='MOU'?BLUE_DARK:'#92400E')}><FileText size={11} />{keg.jenis}</span>
            </div>
            <div style={{ fontSize:18.5, fontWeight:800, marginBottom:6, color:'#0f1f3d', letterSpacing:'-0.01em' }}>{keg.judul}</div>
            {keg.deskripsi && <div style={{ fontSize:13, color:'#64748b', marginBottom:12, lineHeight:1.7 }}>{keg.deskripsi}</div>}
            <div style={{ fontSize:12, color:'#64748b', display:'flex', gap:14, flexWrap:'wrap' }}>
              {keg.wilayah && <span style={{ display:'flex', alignItems:'center', gap:5 }}><MapPin size={13} /> {keg.wilayah}</span>}
              {keg.tglMulai && <span style={{ display:'flex', alignItems:'center', gap:5 }}><Calendar size={13} /> {formatTanggal(keg.tglMulai)}{keg.tglTarget && ` – ${formatTanggal(keg.tglTarget)}`}</span>}
            </div>
            {(keg.tglDitetapkan || keg.tglBerakhirMou) && (
              <div style={mouBox}>
                <div style={{ fontSize:10, fontWeight:700, color: GOLD, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.08em', display:'flex', alignItems:'center', gap:6 }}>
                  <FileCheck size={12} /> Masa Berlaku {keg.jenis}
                </div>
                <div style={{ fontSize:12.5, color:'#78350F', fontWeight:600 }}>
                  {keg.tglDitetapkan ? formatTanggal(keg.tglDitetapkan) : 'Belum ditetapkan'} — {keg.tglBerakhirMou ? formatTanggal(keg.tglBerakhirMou) : 'Belum ditetapkan'}
                </div>
              </div>
            )}
            <div style={{ marginTop:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:7 }}>
                <span style={{ color:'#64748b', display:'flex', alignItems:'center', gap:5 }}><Users size={13} /> Slot Tersedia</span>
                <span style={{ fontWeight:700, color: kuotaPenuh ? '#A32D2D' : BLUE }}>{keg.sisaKuota} dari {keg.target} slot</span>
              </div>
              <div style={{ height:8, background:'#eef2f6', borderRadius:100, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${keg.target > 0 ? Math.round((keg.terisi/keg.target)*100) : 0}%`, background: kuotaPenuh ? '#DC2626' : `linear-gradient(90deg,${BLUE_LIGHT},${BLUE_DARK})`, borderRadius:100, transition:`width 0.8s ${EASE}` }} />
              </div>
            </div>
          </div>

          {kuotaPenuh ? (
            <div style={{ textAlign:'center', padding:'2.6rem 1.5rem', background:'#FCEBEB', borderRadius:16, color:'#991B1B', border:'1px solid #F7C1C1' }}>
              <AlertCircle size={44} style={{ margin:'0 auto 12px', opacity:0.8 }} />
              <div style={{ fontSize:16, fontWeight:700 }}>Kuota Penuh</div>
              <div style={{ fontSize:13, marginTop:4, color:'#7F1D1D' }}>Maaf, slot pendaftaran untuk kegiatan ini sudah penuh.</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, color:'#64748b', marginBottom:7, fontWeight:600 }}>
                  <span>Progress Pengisian</span><span style={{ color: BLUE }}>{formProgress}%</span>
                </div>
                <div style={{ height:7, background:'#eef2f6', borderRadius:100, overflow:'hidden', boxShadow:'inset 0 1px 2px rgba(15,23,42,0.06)' }}>
                  <div style={{ height:'100%', borderRadius:100, width:`${formProgress}%`, background:`linear-gradient(90deg,${BLUE_LIGHT},${BLUE_DARK})`, transition:`width 0.7s ${EASE}` }} />
                </div>
              </div>

              {error && <div style={errBox} className="shake"><AlertCircle size={16} strokeWidth={1.7} style={{ flexShrink:0 }} /> {error}</div>}

              <div style={{ ...fieldGroup, ...fieldDelay(1) }} className="fld">
                <label style={label}><Building size={13} strokeWidth={1.7} /> Nama Institusi <em style={req}>wajib</em></label>
                <input style={inp(focusedField==='ni')} value={namaInstitusi} onChange={e=>setNamaInstitusi(e.target.value)}
                  placeholder="Contoh: Universitas Hasanuddin"
                  onFocus={()=>setFocusedField('ni')} onBlur={()=>setFocusedField(null)} />
              </div>

              {keg.jenis === 'PKS' && (
                <div style={fieldGroup} className="fld">
                  <label style={label}><GraduationCap size={13} strokeWidth={1.7} /> Jurusan / Program Studi</label>
                  <input style={inp(focusedField==='jur')} value={jurusan} onChange={e=>setJurusan(e.target.value)}
                    placeholder="Contoh: Teknik Informatika"
                    onFocus={()=>setFocusedField('jur')} onBlur={()=>setFocusedField(null)} />
                  <div style={hintText}><Info size={11} strokeWidth={1.7} /> Khusus PKS — isi jika melibatkan prodi tertentu</div>
                </div>
              )}

              <div style={{ ...nestGroup, ...fieldDelay(2) }} className="fld">
                <label style={{ ...label, marginBottom:12 }}><User size={13} strokeWidth={1.7} /> Informasi Kontak <em style={req}>wajib</em></label>
                <div style={{ marginBottom:12 }}>
                  <label style={subLabel}><User size={12} strokeWidth={1.7} /> Nama PIC / Penanggung Jawab</label>
                  <input style={inp(focusedField==='pic')} value={namaPIC} onChange={e=>setNamaPIC(e.target.value)}
                    placeholder="Nama lengkap penanggung jawab"
                    onFocus={()=>setFocusedField('pic')} onBlur={()=>setFocusedField(null)} />
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={subLabel}><Mail size={12} strokeWidth={1.7} /> Email</label>
                  <input type="email" style={inp(focusedField==='em')} value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="email@institusi.id"
                    onFocus={()=>setFocusedField('em')} onBlur={()=>setFocusedField(null)} />
                </div>
                <div>
                  <label style={subLabel}><Phone size={12} strokeWidth={1.7} /> No. WhatsApp <span style={{ fontWeight:400, opacity:0.7 }}>({noWa.length} angka, {WA_MIN}-{WA_MAX})</span></label>
                  <input style={{ ...inp(focusedField==='wa'), borderColor: waInvalid ? '#DC2626' : (focusedField==='wa' ? BLUE : 'rgba(29,78,216,0.10)') }}
                    type="tel" inputMode="numeric" value={noWa} onChange={e=>handleWaChange(e.target.value)}
                    placeholder="081234567890" maxLength={WA_MAX}
                    onFocus={()=>setFocusedField('wa')} onBlur={()=>setFocusedField(null)} />
                  {waInvalid && <div style={{ fontSize:10.5, color:'#DC2626', marginTop:6, display:'flex', alignItems:'center', gap:5 }}><AlertCircle size={11} strokeWidth={1.8} /> Harus {WA_MIN}-{WA_MAX} angka</div>}
                </div>
              </div>

              <div style={{ ...fieldGroup, ...fieldDelay(3) }} className="fld">
                <label style={label}><MessageSquare size={13} strokeWidth={1.7} /> Tujuan / Catatan (opsional)</label>
                <textarea style={{ ...inp(focusedField==='desk'), height:82, resize:'none' }} value={deskripsi} onChange={e=>setDeskripsi(e.target.value)}
                  placeholder="Jelaskan tujuan bergabung dan kontribusi yang dapat diberikan…"
                  onFocus={()=>setFocusedField('desk')} onBlur={()=>setFocusedField(null)} />
              </div>

              <div style={{ ...nestGroup, ...fieldDelay(4) }} className="fld">
                <label style={{ ...label, marginBottom:10 }}><Paperclip size={13} strokeWidth={1.7} /> Dokumen {keg.jenis} Milik Anda <span style={opt}>opsional · maks 1MB</span></label>
                {!file ? (
                  <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                    onClick={()=>fileRef.current?.click()}
                    style={{ border:`1.5px dashed ${isDragging ? BLUE : 'rgba(29,78,216,0.18)'}`, borderRadius:16, padding:'1.4rem', textAlign:'center', cursor:'pointer', transition:`all 0.4s ${EASE}`, background: isDragging ? 'rgba(29,78,216,0.05)' : '#fff' }}>
                    <div style={{ width:42, height:42, borderRadius:'50%', background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                      <Upload size={18} strokeWidth={1.6} style={{ color: BLUE }} />
                    </div>
                    <div style={{ fontSize:13, color:'#3a4742', fontWeight:500 }}>{isDragging ? 'Lepaskan di sini' : 'Tarik & letakkan, atau klik untuk pilih'}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>.doc / .docx</div>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#EFF6FF', borderRadius:14 }}>
                    <FileText size={24} strokeWidth={1.5} style={{ color: uploadingFile ? '#94a3b8' : BLUE, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'#0f1f3d', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{templateFileName || file.name}</div>
                      <div style={{ fontSize:11, color: uploadingFile ? '#94a3b8' : BLUE_DARK }}>{uploadingFile ? 'Mengunggah…' : 'Siap dikirim bersama pendaftaran'}</div>
                    </div>
                    <button type="button" onClick={hapusFile}
                      style={{ fontSize:11, padding:'7px 12px', borderRadius:100, border:'1px solid rgba(220,38,38,0.25)', cursor:'pointer', background:'#fff', color:'#b91c1c', fontFamily:FONT, display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                      <Trash2 size={13} strokeWidth={1.7} /> Hapus
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file"
                  accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange} style={{ display:'none' }} />
                {fileError && <div style={{ fontSize:11.5, color:'#b91c1c', marginTop:8, display:'flex', alignItems:'center', gap:6 }}><AlertCircle size={13} strokeWidth={1.7} /> {fileError}</div>}
                <div style={{ ...hintText, marginTop:10 }}><Info size={11} strokeWidth={1.7} /> Sudah punya draf {keg.jenis} sendiri? Unggah sebagai referensi tim Pokja.</div>
              </div>

              <button onClick={daftar} disabled={submitting || uploadingFile}
                style={{ ...ctaPill, width:'100%', justifyContent:'center', height:54, fontSize:15, marginTop:8, opacity:(submitting||uploadingFile)?0.6:1, cursor:(submitting||uploadingFile)?'not-allowed':'pointer' }} className="cta">
                {submitting ? (<><Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} /> Mendaftar…</>) : (<>Daftar Sekarang <span style={ctaIconWrap} className="cta-ic"><Send size={15} strokeWidth={1.8} /></span></>)}
              </button>
            </>
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
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeUp { from { opacity:0; transform: translateY(14px); filter: blur(3px);} to { opacity:1; transform: translateY(0); filter: blur(0);} }
      @keyframes shellIn { from { opacity:0; transform: translateY(24px) scale(0.985); filter: blur(6px);} to { opacity:1; transform: none; filter: blur(0);} }
      @keyframes shakeX { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
      .reveal { animation: shellIn 0.8s cubic-bezier(0.32,0.72,0,1) both; }
      .fld { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
      .shake { animation: shakeX 0.4s ease-out; }
      .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { filter: brightness(1.06); }
      .cta { transition: all 0.45s cubic-bezier(0.32,0.72,0,1); }
      .cta:hover { transform: translateY(-2px); box-shadow: 0 14px 30px -10px rgba(29,78,216,0.5) !important; }
      .cta:active { transform: scale(0.985); }
      .cta:hover .cta-ic { transform: translate(2px,-1px) scale(1.08); }
      .cta-ic { transition: transform 0.45s cubic-bezier(0.32,0.72,0,1); }
    `}</style>
  );
}

const pageStyle: React.CSSProperties = { minHeight:'100dvh', background:'radial-gradient(1200px 600px at 50% -10%, #dbeafe 0%, rgba(219,234,254,0) 60%), linear-gradient(180deg,#f7f9fc,#eef2f8)', padding:'2.5rem 1.25rem', display:'flex', alignItems:'flex-start', justifyContent:'center', fontFamily:FONT };
const shellStyle: React.CSSProperties = { maxWidth:600, width:'100%', background:'rgba(255,255,255,0.55)', border:'1px solid rgba(29,78,216,0.07)', borderRadius:34, padding:8, boxShadow:'0 1px 2px rgba(15,23,42,0.04), 0 40px 80px -40px rgba(15,23,42,0.22)' };
const coreStyle: React.CSSProperties = { background:'#fff', borderRadius:27, padding:'2rem 2rem', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const infoBox: React.CSSProperties = { background:'#f8fafc', border:'1px solid rgba(29,78,216,0.07)', borderRadius:18, padding:'1.2rem 1.3rem', marginBottom:24 };
const badgeIcon: React.CSSProperties = { width:74, height:74, borderRadius:24, background:`linear-gradient(150deg,${BLUE_LIGHT},${BLUE_DARK})`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:`0 16px 34px -12px ${BLUE}60` };
const eyebrow: React.CSSProperties = { fontSize:10, color: BLUE, textTransform:'uppercase', letterSpacing:'0.2em', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 };
const kodeShell: React.CSSProperties = { background:'linear-gradient(160deg,#EFF6FF,#DBEAFE)', border:'1px solid rgba(29,78,216,0.14)', borderRadius:24, padding:7, marginBottom:16 };
const kodeCore: React.CSSProperties = { background:'rgba(255,255,255,0.7)', borderRadius:18, padding:'1.5rem 1.25rem', textAlign:'center', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const fieldGroup: React.CSSProperties = { marginBottom:18 };
const nestGroup: React.CSSProperties = { marginBottom:18, background:'linear-gradient(170deg,#fafcfd,#f3f6fa)', padding:'1.25rem', borderRadius:20, border:'1px solid rgba(29,78,216,0.06)' };
const label: React.CSSProperties = { display:'flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:700, color:'#3a4742', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' };
const subLabel: React.CSSProperties = { display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600, color:'#54635e', marginBottom:7 };
const req: React.CSSProperties = { fontStyle:'normal', fontSize:9, color: BLUE, background:'#EFF6FF', padding:'2px 7px', borderRadius:100, marginLeft:'auto', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 };
const opt: React.CSSProperties = { fontSize:9.5, color:'#94a3b8', fontWeight:500, textTransform:'none', letterSpacing:0, marginLeft:'auto' };
const hintText: React.CSSProperties = { fontSize:11, color:'#94a3b8', marginTop:7, lineHeight:1.6, display:'flex', alignItems:'center', gap:6 };
const inp = (focus: boolean): React.CSSProperties => ({
  width:'100%', padding:'13px 15px', borderRadius:13, fontSize:13.5, fontFamily:FONT, boxSizing:'border-box', outline:'none',
  background: focus ? '#fff' : '#fafcfd', border:`1.5px solid ${focus ? BLUE : 'rgba(29,78,216,0.10)'}`,
  boxShadow: focus ? `0 0 0 4px ${BLUE}15` : 'none', transition:'all 0.4s cubic-bezier(0.32,0.72,0,1)', color:'#0f1f3d',
});
const ctaPill: React.CSSProperties = { display:'inline-flex', alignItems:'center', gap:10, padding:'13px 16px 13px 24px', borderRadius:100, border:'none', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:`0 10px 24px -10px ${BLUE}60` };
const ctaIconWrap: React.CSSProperties = { width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const ghostPill: React.CSSProperties = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, padding:'13px 22px', borderRadius:100, border:'1.5px solid rgba(29,78,216,0.12)', background:'#fff', color:'#334155', fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:FONT };
const infoCard = (color: string, bg: string, brd: string): React.CSSProperties => ({ background:bg, border:`1px solid ${brd}`, borderRadius:14, padding:'13px 16px', marginBottom:14, fontSize:12.5, color, display:'flex', alignItems:'flex-start', gap:10, lineHeight:1.55 });
const errBox: React.CSSProperties = { fontSize:12.5, color:'#b91c1c', background:'rgba(220,38,38,0.06)', padding:'12px 16px', borderRadius:13, marginBottom:16, border:'1px solid rgba(220,38,38,0.18)', display:'flex', alignItems:'center', gap:8 };
const pillTag = (bg: string, color: string): React.CSSProperties => ({ fontSize:10, fontWeight:700, padding:'4px 12px', borderRadius:100, background:bg, color, display:'flex', alignItems:'center', gap:5 });
const mouBox: React.CSSProperties = { marginTop:14, background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'12px 15px' };