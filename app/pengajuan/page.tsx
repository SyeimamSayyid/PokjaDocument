'use client';

import { useEffect, useState, useRef } from 'react';
import {
  CheckCircle, Copy, Clock, AlertCircle, Mail, Phone, Calendar,
  CircleDollarSign, FileText, Send, Check, Info, Eye, Plus, ArrowRight,
  Upload, Trash2, User, Tag, Paperclip, MessageSquare,
  KeyRound, Building2, FileSignature, File as FileIcon,
  Handshake, GraduationCap, Loader2, UserCheck, Home,
} from 'lucide-react';
import { STATUS_DOKUMEN } from '@/lib/constants';

interface HasilPengajuan {
  kodeTracking: string; kodeExpire: string;
  namaInstitusi: string; jenis: string;
  idPengajuan: string; adaDokumenMitra: boolean;
}

const STATUS_ALUR = STATUS_DOKUMEN.slice(0, 3);
const STATUS_ICONS: Record<string, React.ReactNode> = {
  'Draft': <Send size={13} strokeWidth={1.6} />,
  'Dalam Proses': <Eye size={13} strokeWidth={1.6} />,
  'Selesai': <CheckCircle size={13} strokeWidth={1.6} />,
};

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';
const WA_LEN = 12;

export default function FormPengajuanPage() {
  const [step, setStep]   = useState<'form' | 'konfirmasi'>('form');
  const [hasil, setHasil] = useState<HasilPengajuan | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [formProgress, setFormProgress] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [namaInstitusi, setNamaInstitusi] = useState('');
  const [jenis, setJenis]                 = useState<'MOU'|'PKS'>('MOU');
  const [deskripsi, setDeskripsi]         = useState('');
  const [tanggalKegiatan, setTanggalKegiatan] = useState('');
  const [biaya, setBiaya]                 = useState('');
  const [email, setEmail]                 = useState('');
  const [noWa, setNoWa]                   = useState('');
  const [jurusan, setJurusan]             = useState('');
  const [namaPIC, setNamaPIC]             = useState('');

  const [file, setFile]         = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let p = 0;
    if (namaInstitusi) p += 18;
    if (deskripsi) p += 18;
    if (namaPIC) p += 14;
    if (email) p += 14;
    if (noWa) p += 14;
    if (jenis) p += 12;
    if (file || tanggalKegiatan || biaya) p += 10;
    setFormProgress(Math.min(100, p));
  }, [namaInstitusi, deskripsi, namaPIC, email, noWa, jenis, file, tanggalKegiatan, biaya]);

  const handleWaChange = (v: string) => {
    setNoWa(v.replace(/\D/g, '').slice(0, WA_LEN));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError('');
    if (!f) { setFile(null); return; }
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!allowedMime.includes(f.type)) {
      setFileError('Hanya file Word (.doc/.docx) yang diizinkan.');
      setFile(null); if (fileRef.current) fileRef.current.value = ''; return;
    }
    if (f.size > 1 * 1024 * 1024) {
      setFileError(`File terlalu besar (${(f.size/1024/1024).toFixed(2)}MB). Maksimal 1MB.`);
      setFile(null); if (fileRef.current) fileRef.current.value = ''; return;
    }
    setFile(f);
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileChange({ target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    if (!namaPIC.trim()) { setError('Nama PIC wajib diisi.'); setLoading(false); return; }
    if (!email.trim())   { setError('Email wajib diisi.'); setLoading(false); return; }
    if (!noWa.trim())    { setError('No. WhatsApp wajib diisi.'); setLoading(false); return; }
    if (noWa.length !== WA_LEN) { setError(`No. WhatsApp harus tepat ${WA_LEN} angka (saat ini ${noWa.length}).`); setLoading(false); return; }
    try {
      let fileBase64 = ''; let fileName = ''; let fileMime = '';
      if (file) {
        fileBase64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload  = () => res((reader.result as string).split(',')[1]);
          reader.onerror = () => rej(new Error('Gagal baca file'));
          reader.readAsDataURL(file);
        });
        fileName = file.name; fileMime = file.type;
      }
      const res = await fetch('/api/pengajuan/publik', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaInstitusi, jenis, deskripsi, tanggalKegiatan,
          biaya, email, noWa, jurusan, namaPIC,
          ...(fileBase64 ? { fileBase64, fileName, fileMime } : {}),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengirim.'); return; }
      setHasil(d);
      setTimeout(() => setStep('konfirmasi'), 400);
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setLoading(false); }
  };

  const copyKode = () => {
    if (!hasil) return;
    navigator.clipboard.writeText(hasil.kodeTracking);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  if (step === 'konfirmasi' && hasil) {
    return (
      <div style={{ ...pageStyle, fontFamily: FONT }}>
        <GlobalStyle />
        <div style={{ ...shellStyle, maxWidth: 560 }} className="reveal">
          <div style={coreStyle}>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={badgeIcon}><CheckCircle size={34} color="#fff" strokeWidth={1.6} /></div>
              <div style={{ fontSize:26, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.03em' }}>Pengajuan Berhasil</div>
              <div style={{ fontSize:13.5, color:'#64748b', marginTop:8, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <Building2 size={14} strokeWidth={1.6} /> {hasil.namaInstitusi} · {hasil.jenis}
              </div>
            </div>

            <div style={kodeShell}>
              <div style={kodeCore}>
                <div style={eyebrow}><KeyRound size={11} strokeWidth={1.8} /> Kode Tracking Pengajuan</div>
                <div style={{ fontSize:36, fontWeight:800, letterSpacing:6, color: BLUE_DARK, margin:'10px 0 16px', fontFamily:'monospace' }}>
                  {hasil.kodeTracking}
                </div>
                <button onClick={copyKode} style={ctaPill} className="cta">
                  {copied ? 'Tersalin' : 'Salin Kode'}
                  <span style={ctaIconWrap} className="cta-ic">
                    {copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.8} />}
                  </span>
                </button>
                <div style={{ fontSize:11.5, color:'#64748b', marginTop:14, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <Clock size={12} strokeWidth={1.6} /> Berlaku hingga {hasil.kodeExpire}
                </div>
              </div>
            </div>

            {hasil.adaDokumenMitra && (
              <div style={infoCard(BLUE_DARK, 'rgba(37,99,235,0.07)', 'rgba(37,99,235,0.15)')}>
                <FileText size={17} strokeWidth={1.6} style={{ flexShrink:0, marginTop:1 }} />
                <div><strong>Dokumen {hasil.jenis} terupload.</strong> Akan ditinjau tim Pokja; jika disetujui, dapat dijadikan dasar perjanjian.</div>
              </div>
            )}

            <div style={infoCard('#92400E', 'rgba(217,119,6,0.07)', 'rgba(217,119,6,0.16)')}>
              <AlertCircle size={17} strokeWidth={1.6} style={{ flexShrink:0, marginTop:1 }} />
              <div><strong>Simpan kode ini.</strong> Kode tidak dapat ditampilkan ulang — gunakan untuk melacak status.</div>
            </div>

            <div style={{ margin:'22px 0' }}>
              <div style={{ fontSize:13.5, fontWeight:700, marginBottom:16, display:'flex', alignItems:'center', gap:8, color:'#0f1f3d' }}>
                <Clock size={15} strokeWidth={1.7} /> Alur Proses
              </div>
              {STATUS_ALUR.map((s, i) => (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                      background: i===0 ? `linear-gradient(145deg,${BLUE_LIGHT},${BLUE_DARK})` : '#eef2f6',
                      color: i===0 ? '#fff' : '#94a3b8', fontSize:12, fontWeight:700, flexShrink:0,
                      boxShadow: i===0 ? `0 4px 12px -2px ${BLUE}60` : 'none' }}>
                      {i === 0 ? <Check size={15} strokeWidth={2.2} /> : i + 1}
                    </div>
                    {i < STATUS_ALUR.length - 1 && (
                      <div style={{ width:2, height:26, background: i===0 ? `linear-gradient(${BLUE_LIGHT},#cfe0f3)` : '#eef2f6', marginTop:3 }} />
                    )}
                  </div>
                  <div style={{ fontSize:13, color: i===0 ? '#0f1f3d' : '#94a3b8', fontWeight: i===0 ? 700 : 500, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', paddingBottom: i<STATUS_ALUR.length-1 ? 14 : 0 }}>
                    {STATUS_ICONS[s] || <FileText size={13} strokeWidth={1.6} />} {s}
                    {i === 0 && <span style={pillNow}>posisi saat ini</span>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:9, flexWrap:'wrap' }}>
              <a href="/cek-pengajuan" style={{ ...ctaPill, flex:1, minWidth:140, justifyContent:'center', textDecoration:'none' }} className="cta">
                Cek Status
                <span style={ctaIconWrap} className="cta-ic"><Eye size={15} strokeWidth={1.8} /></span>
              </a>
              <button onClick={() => {
                setStep('form'); setHasil(null);
                setNamaInstitusi(''); setDeskripsi(''); setEmail(''); setNoWa('');
                setBiaya(''); setTanggalKegiatan(''); setJurusan(''); setNamaPIC(''); setFile(null);
              }} style={ghostPill}>
                <Plus size={16} strokeWidth={1.8} /> Ajukan Lagi
              </button>
              <a href="/" style={{ ...ghostPill, textDecoration:'none', flex:'1 0 100%', justifyContent:'center' }}>
                <Home size={16} strokeWidth={1.8} /> Kembali ke Beranda
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fieldDelay = (n: number) => ({ animationDelay: `${0.05 * n + 0.1}s` });
  const waInvalid = noWa.length > 0 && noWa.length !== WA_LEN;

  return (
    <div style={{ ...pageStyle, fontFamily: FONT }}>
      <GlobalStyle />
      <div style={shellStyle} className={mounted ? 'reveal' : ''}>
        <div style={coreStyle}>

          <div style={{ textAlign:'center', marginBottom:26 }}>
            <div style={eyebrowCenter}>BNN Provinsi Sulawesi Selatan</div>
            <div style={badgeIconSm}><Handshake size={26} color="#fff" strokeWidth={1.6} /></div>
            <h1 style={{ fontSize:27, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.035em', margin:'14px 0 6px', lineHeight:1.1 }}>
              Form Pengajuan<br/>Kerja Sama
            </h1>
            <p style={{ fontSize:13.5, color:'#64748b', margin:0 }}>Ajukan kerja sama kelembagaan dengan tim Pokja Humker</p>
          </div>

          <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, color:'#64748b', marginBottom:7, fontWeight:600 }}>
              <span>Progress Pengisian</span><span style={{ color: BLUE }}>{formProgress}%</span>
            </div>
            <div style={{ height:7, background:'#eef2f6', borderRadius:100, overflow:'hidden', boxShadow:'inset 0 1px 2px rgba(15,23,42,0.06)' }}>
              <div style={{ height:'100%', borderRadius:100, width:`${formProgress}%`, background:`linear-gradient(90deg,${BLUE_LIGHT},${BLUE_DARK})`, transition:`width 0.7s ${EASE}` }} />
            </div>
          </div>

          {error && (
            <div style={errBox} className="shake">
              <AlertCircle size={16} strokeWidth={1.7} style={{ flexShrink:0 }} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div style={{ ...fieldGroup, ...fieldDelay(1) }} className="fld">
              <label style={label}><Building2 size={13} strokeWidth={1.7} /> Nama Institusi / Organisasi <em style={req}>wajib</em></label>
              <input style={inp(focusedField==='ni')} value={namaInstitusi} onChange={e=>setNamaInstitusi(e.target.value)}
                placeholder="Contoh: Universitas Hasanuddin" required
                onFocus={()=>setFocusedField('ni')} onBlur={()=>setFocusedField(null)} />
            </div>

            <div style={{ ...fieldGroup, ...fieldDelay(2) }} className="fld">
              <label style={label}><Tag size={13} strokeWidth={1.7} /> Jenis Kerja Sama <em style={req}>wajib</em></label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {(['MOU','PKS'] as const).map(j => {
                  const on = jenis === j;
                  return (
                    <button key={j} type="button" onClick={()=>{ setJenis(j); setJurusan(''); }}
                      style={{ padding:'18px 12px', borderRadius:18, cursor:'pointer', fontFamily:FONT, textAlign:'center',
                        border:`1.5px solid ${on ? BLUE : 'rgba(29,78,216,0.10)'}`,
                        background: on ? 'linear-gradient(160deg,#EFF6FF,#DBEAFE)' : '#fff',
                        color: on ? BLUE_DARK : '#54635e', transition:`all 0.45s ${EASE}`,
                        boxShadow: on ? `0 8px 22px -10px ${BLUE}45` : '0 1px 2px rgba(15,23,42,0.04)',
                        transform: on ? 'translateY(-2px)' : 'none' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontWeight:700, fontSize:15 }}>
                        {j === 'MOU' ? <FileSignature size={18} strokeWidth={1.6} /> : <FileIcon size={18} strokeWidth={1.6} />} {j}
                      </div>
                      <div style={{ fontSize:10.5, fontWeight:500, marginTop:6, opacity:.7 }}>
                        {j === 'MOU' ? 'Memorandum of Understanding' : 'Perjanjian Kerja Sama'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {jenis === 'PKS' && (
              <div style={{ ...fieldGroup, animation:`fadeUp 0.45s ${EASE}` }}>
                <label style={label}><GraduationCap size={13} strokeWidth={1.7} /> Jurusan / Program Studi</label>
                <input style={inp(focusedField==='jur')} value={jurusan} onChange={e=>setJurusan(e.target.value)}
                  placeholder="Contoh: Teknik Informatika, Hukum…"
                  onFocus={()=>setFocusedField('jur')} onBlur={()=>setFocusedField(null)} />
                <div style={hint}><Info size={11} strokeWidth={1.7} /> Khusus PKS — isi jika melibatkan prodi tertentu</div>
              </div>
            )}

            <div style={{ ...fieldGroup, ...fieldDelay(3) }} className="fld">
              <label style={label}><MessageSquare size={13} strokeWidth={1.7} /> Deskripsi / Perihal <em style={req}>wajib</em></label>
              <textarea style={{ ...inp(focusedField==='desk'), height:100, resize:'none' }} value={deskripsi} onChange={e=>setDeskripsi(e.target.value)}
                placeholder="Jelaskan tujuan, ruang lingkup, dan manfaat kerja sama…" required
                onFocus={()=>setFocusedField('desk')} onBlur={()=>setFocusedField(null)} />
            </div>

            <div style={{ ...nestGroup, ...fieldDelay(4) }} className="fld">
              <label style={{ ...label, marginBottom:10 }}><Paperclip size={13} strokeWidth={1.7} /> Dokumen {jenis} <span style={opt}>opsional · maks 1MB</span></label>
              <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                onClick={()=>fileRef.current?.click()}
                style={{ border:`1.5px dashed ${isDragging ? BLUE : 'rgba(29,78,216,0.18)'}`, borderRadius:16, padding:'1.6rem', textAlign:'center', cursor:'pointer', transition:`all 0.4s ${EASE}`, background: isDragging ? 'rgba(29,78,216,0.05)' : '#fff' }}>
                {file ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
                    <FileText size={30} strokeWidth={1.4} style={{ color: BLUE }} />
                    <div style={{ textAlign:'left' }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'#0f1f3d' }}>{file.name}</div>
                      <div style={{ fontSize:11.5, color:'#64748b' }}>{(file.size/1024).toFixed(1)} KB</div>
                    </div>
                    <button type="button" onClick={(e)=>{ e.stopPropagation(); setFile(null); if(fileRef.current) fileRef.current.value=''; }}
                      style={{ fontSize:11, padding:'7px 13px', borderRadius:100, border:'1px solid rgba(220,38,38,0.25)', cursor:'pointer', background:'#fff', color:'#b91c1c', fontFamily:FONT, display:'flex', alignItems:'center', gap:6 }}>
                      <Trash2 size={13} strokeWidth={1.7} /> Hapus
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ width:46, height:46, borderRadius:'50%', background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                      <Upload size={20} strokeWidth={1.6} style={{ color: BLUE }} />
                    </div>
                    <div style={{ fontSize:13.5, color:'#3a4742', fontWeight:500 }}>{isDragging ? 'Lepaskan di sini' : 'Tarik & letakkan, atau klik untuk pilih'}</div>
                    <div style={{ fontSize:11.5, color:'#94a3b8', marginTop:5 }}>.doc / .docx</div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange} style={{ display:'none' }} />
              {fileError && <div style={{ fontSize:11.5, color:'#b91c1c', marginTop:8, display:'flex', alignItems:'center', gap:6 }}><AlertCircle size={13} strokeWidth={1.7} /> {fileError}</div>}
              <div style={{ ...hint, marginTop:10 }}><Info size={11} strokeWidth={1.7} /> Punya draft sendiri? Unggah sebagai referensi tim Pokja.</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18, ...fieldDelay(5) }} className="fld">
              <div>
                <label style={label}><Calendar size={13} strokeWidth={1.7} /> Tanggal Kegiatan</label>
                <input style={inp(focusedField==='tgl')} type="date" value={tanggalKegiatan} onChange={e=>setTanggalKegiatan(e.target.value)}
                  onFocus={()=>setFocusedField('tgl')} onBlur={()=>setFocusedField(null)} />
              </div>
              <div>
                <label style={label}><CircleDollarSign size={13} strokeWidth={1.7} /> Estimasi Biaya</label>
                <input style={inp(focusedField==='by')} value={biaya} onChange={e=>setBiaya(e.target.value)} placeholder="Opsional"
                  onFocus={()=>setFocusedField('by')} onBlur={()=>setFocusedField(null)} />
              </div>
            </div>

            <div style={{ ...nestGroup, ...fieldDelay(6) }} className="fld">
              <label style={{ ...label, marginBottom:12 }}><User size={13} strokeWidth={1.7} /> Informasi Kontak <em style={req}>wajib</em></label>
              <div style={{ marginBottom:12 }}>
                <label style={subLabel}><UserCheck size={12} strokeWidth={1.7} /> Nama PIC / Penanggung Jawab</label>
                <input style={inp(focusedField==='pic')} value={namaPIC} onChange={e=>setNamaPIC(e.target.value)}
                  placeholder="Nama lengkap penanggung jawab" required
                  onFocus={()=>setFocusedField('pic')} onBlur={()=>setFocusedField(null)} />
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={subLabel}><Mail size={12} strokeWidth={1.7} /> Email</label>
                <input style={inp(focusedField==='em')} type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="email@institusi.go.id" required
                  onFocus={()=>setFocusedField('em')} onBlur={()=>setFocusedField(null)} />
              </div>
              <div>
                <label style={subLabel}><Phone size={12} strokeWidth={1.7} /> No. WhatsApp <span style={{ fontWeight:400, opacity:0.7 }}>({noWa.length}/{WA_LEN} angka)</span></label>
                <input style={{ ...inp(focusedField==='wa'), borderColor: waInvalid ? '#DC2626' : (focusedField==='wa' ? BLUE : 'rgba(29,78,216,0.10)') }}
                  type="tel" inputMode="numeric" value={noWa} onChange={e=>handleWaChange(e.target.value)}
                  placeholder="081234567890" required maxLength={WA_LEN}
                  onFocus={()=>setFocusedField('wa')} onBlur={()=>setFocusedField(null)} />
                {waInvalid ? (
                  <div style={{ fontSize:10.5, color:'#DC2626', marginTop:6, display:'flex', alignItems:'center', gap:5 }}>
                    <AlertCircle size={11} strokeWidth={1.8} /> Harus tepat {WA_LEN} angka
                  </div>
                ) : (
                  <div style={hint}><Info size={11} strokeWidth={1.7} /> Nomor WhatsApp harus tepat {WA_LEN} angka, tanpa spasi atau tanda baca</div>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading || !!fileError || waInvalid}
              style={{ ...ctaPill, width:'100%', justifyContent:'center', height:54, fontSize:15, marginTop:8,
                opacity:(loading || !!fileError || waInvalid) ? 0.6 : 1, cursor:(loading || !!fileError || waInvalid) ? 'not-allowed' : 'pointer' }} className="cta">
              {loading ? (<><Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} /> Mengirim…</>) : (
                <>Kirim Pengajuan <span style={ctaIconWrap} className="cta-ic"><Send size={15} strokeWidth={1.8} /></span></>
              )}
            </button>

            <div style={{ marginTop:18, fontSize:12.5, color:'#94a3b8', textAlign:'center' }}>
              Sudah punya kode? <a href="/cek-pengajuan" style={{ color: BLUE, textDecoration:'none', fontWeight:700, display:'inline-flex', alignItems:'center', gap:4 }}>Cek status <ArrowRight size={13} strokeWidth={1.9} /></a>
            </div>
          </form>
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
      .cta { transition: all 0.45s cubic-bezier(0.32,0.72,0,1); }
      .cta:hover { transform: translateY(-2px); box-shadow: 0 14px 30px -10px rgba(29,78,216,0.5) !important; }
      .cta:active { transform: scale(0.985); }
      .cta:hover .cta-ic { transform: translate(2px,-1px) scale(1.08); }
      .cta-ic { transition: transform 0.45s cubic-bezier(0.32,0.72,0,1); }
      input::placeholder, textarea::placeholder { color:#aab4b0; }
    `}</style>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background: 'radial-gradient(1200px 600px at 50% -10%, #dbeafe 0%, rgba(219,234,254,0) 60%), linear-gradient(180deg,#f7f9fc,#eef2f8)',
  padding: '3rem 1.25rem', display:'flex', alignItems:'flex-start', justifyContent:'center',
};
const shellStyle: React.CSSProperties = {
  maxWidth: 600, width:'100%', background:'rgba(255,255,255,0.55)',
  border:'1px solid rgba(29,78,216,0.07)', borderRadius:34, padding:8,
  boxShadow:'0 1px 2px rgba(15,23,42,0.04), 0 40px 80px -40px rgba(15,23,42,0.22)',
};
const coreStyle: React.CSSProperties = {
  background:'#fff', borderRadius:27, padding:'2.4rem 2.1rem',
  boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)',
};
const badgeIcon: React.CSSProperties = { width:74, height:74, borderRadius:24, background:`linear-gradient(150deg,${BLUE_LIGHT},${BLUE_DARK})`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:`0 16px 34px -12px ${BLUE}60` };
const badgeIconSm: React.CSSProperties = { width:58, height:58, borderRadius:20, background:`linear-gradient(150deg,${BLUE_LIGHT},${BLUE_DARK})`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', boxShadow:`0 14px 30px -12px ${BLUE}55` };
const eyebrow: React.CSSProperties = { fontSize:10, color: BLUE, textTransform:'uppercase', letterSpacing:'0.2em', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 };
const eyebrowCenter: React.CSSProperties = { display:'inline-block', fontSize:9.5, color: GOLD, textTransform:'uppercase', letterSpacing:'0.22em', fontWeight:700, background:'#FEF3C7', padding:'6px 14px', borderRadius:100, marginBottom:18 };
const kodeShell: React.CSSProperties = { background:'linear-gradient(160deg,#EFF6FF,#DBEAFE)', border:'1px solid rgba(29,78,216,0.14)', borderRadius:24, padding:7, marginBottom:16 };
const kodeCore: React.CSSProperties = { background:'rgba(255,255,255,0.7)', borderRadius:18, padding:'1.5rem 1.25rem', textAlign:'center', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.9)' };
const pillNow: React.CSSProperties = { fontSize:9.5, background:'#DBEAFE', color: BLUE_DARK, padding:'3px 10px', borderRadius:100, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' };
const fieldGroup: React.CSSProperties = { marginBottom:18 };
const nestGroup: React.CSSProperties = { marginBottom:18, background:'linear-gradient(170deg,#fafcfd,#f3f6fa)', padding:'1.25rem', borderRadius:20, border:'1px solid rgba(29,78,216,0.06)' };
const label: React.CSSProperties = { display:'flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:700, color:'#3a4742', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' };
const subLabel: React.CSSProperties = { display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600, color:'#54635e', marginBottom:7 };
const req: React.CSSProperties = { fontStyle:'normal', fontSize:9, color: BLUE, background:'#EFF6FF', padding:'2px 7px', borderRadius:100, marginLeft:'auto', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 };
const opt: React.CSSProperties = { fontSize:9.5, color:'#94a3b8', fontWeight:500, textTransform:'none', letterSpacing:0, marginLeft:'auto' };
const hint: React.CSSProperties = { fontSize:11, color:'#94a3b8', marginTop:7, lineHeight:1.6, display:'flex', alignItems:'center', gap:6 };
const inp = (focus: boolean): React.CSSProperties => ({
  width:'100%', padding:'13px 15px', borderRadius:13, fontSize:13.5, fontFamily:FONT, boxSizing:'border-box', outline:'none',
  background: focus ? '#fff' : '#fafcfd',
  border:`1.5px solid ${focus ? BLUE : 'rgba(29,78,216,0.10)'}`,
  boxShadow: focus ? `0 0 0 4px ${BLUE}15` : 'none',
  transition:'all 0.4s cubic-bezier(0.32,0.72,0,1)', color:'#0f1f3d',
});
const ctaPill: React.CSSProperties = { display:'inline-flex', alignItems:'center', gap:10, padding:'13px 16px 13px 24px', borderRadius:100, border:'none', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:`0 10px 24px -10px ${BLUE}60` };
const ctaIconWrap: React.CSSProperties = { width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 };
const ghostPill: React.CSSProperties = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, padding:'13px 22px', borderRadius:100, border:'1.5px solid rgba(29,78,216,0.12)', background:'#fff', color:'#334155', fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:FONT };
const infoCard = (color: string, bg: string, brd: string): React.CSSProperties => ({ background:bg, border:`1px solid ${brd}`, borderRadius:14, padding:'13px 16px', marginBottom:14, fontSize:12.5, color, display:'flex', alignItems:'flex-start', gap:10, lineHeight:1.55 });
const errBox: React.CSSProperties = { fontSize:12.5, color:'#b91c1c', background:'rgba(220,38,38,0.06)', padding:'12px 16px', borderRadius:13, marginBottom:16, border:'1px solid rgba(220,38,38,0.18)', display:'flex', alignItems:'center', gap:8 };