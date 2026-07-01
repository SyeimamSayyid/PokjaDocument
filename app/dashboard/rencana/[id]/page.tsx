'use client';

import { useEffect, useState, use } from 'react';

interface Kegiatan {
  id: string; kategori: string; divisi: string; judul: string;
  deskripsi: string; jenis: string; target: number; terisi: number;
  wilayah: string; biaya: string; tglMulai: string; tglTarget: string;
  status: string; tampilPublik: boolean; sisaKuota: number;
}

const DIVISI_LABEL: Record<string, string> = {
  'pencegahan': 'Pencegahan', 'pemberantasan': 'Pemberantasan',
  'rehabilitasi': 'Rehabilitasi', 'pemberdayaan': 'Pemberdayaan',
  'bantuan-hukum': 'Bantuan Hukum', 'pendampingan-hukum': 'Pendampingan Hukum',
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

  const [step, setStep]     = useState<'form'|'sukses'>('form');
  const [hasil, setHasil]   = useState<{ kodeTracking:string; jenis:string; judulKegiatan:string; namaInstitusi:string; sisaKuota:number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form
  const [namaInstitusi, setNamaInstitusi] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [email, setEmail]     = useState('');
  const [noWa, setNoWa]       = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  useEffect(() => {
    fetch(`/api/rencana?id=${id}`)
      .then(r => r.json())
      .then(d => {
        const k = (d.data || [])[0];
        if (!k) { setError('Kegiatan tidak ditemukan.'); return; }
        if (!k.tampilPublik) { setError('Kegiatan ini tidak menerima pendaftaran.'); return; }
        setKeg(k);
      })
      .catch(() => setError('Gagal memuat kegiatan.'))
      .finally(() => setLoading(false));
  }, [id]);

  const daftar = async () => {
    if (!namaInstitusi.trim()) { setError('Nama institusi wajib diisi.'); return; }
    if (!email.trim() && !noWa.trim()) { setError('Email atau WhatsApp wajib diisi.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/rencana/daftar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idKegiatan: id, namaInstitusi, jurusan, email, noWa, deskripsi }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mendaftar.'); return; }
      setHasil(d); setStep('sukses');
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif', color:'#6b7280' }}>
      Memuat...
    </div>
  );

  if (error && !keg) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif', color:'#A32D2D', padding:'1.5rem', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>😕</div>
      <div>{error}</div>
      <a href="/beranda" style={{ marginTop:12, color:'#0F6E56', textDecoration:'underline', fontSize:13 }}>← Kembali ke Beranda</a>
    </div>
  );

  // Halaman sukses
  if (step === 'sukses' && hasil) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ textAlign:'center', marginBottom:20 }}>
            <div style={{ fontSize:48, marginBottom:8 }}>🎉</div>
            <div style={{ fontSize:20, fontWeight:700, color:'#0F6E56' }}>Pendaftaran Berhasil!</div>
            <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>{hasil.namaInstitusi} · {hasil.jenis}</div>
          </div>

          <div style={{ background:'#F0FBF7', border:'2px solid #9FE1CB', borderRadius:12, padding:'1.5rem', marginBottom:16, textAlign:'center' }}>
            <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Kode Tracking</div>
            <div style={{ fontSize:30, fontWeight:700, letterSpacing:4, color:'#0F6E56', marginBottom:12, fontFamily:'monospace' }}>
              {hasil.kodeTracking}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(hasil.kodeTracking); setCopied(true); setTimeout(()=>setCopied(false),1500); }} style={btnPrimary}>
              {copied ? '✓ Tersalin!' : '📋 Salin Kode'}
            </button>
          </div>

          <div style={{ background:'#FFF8E1', border:'1px solid #FFD54F', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:12, color:'#7C5A00' }}>
            ⚠️ <strong>Simpan kode ini!</strong> Gunakan untuk melacak status pendaftaran Anda. Tim Pokja akan meninjau pendaftaran dan menghubungi Anda.
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <a href="/cek-pengajuan" style={{ ...btnPrimary, flex:1, textAlign:'center', textDecoration:'none', display:'block' }}>Cek Status</a>
            <a href="/beranda" style={{ ...btnSm, flex:1, textAlign:'center', textDecoration:'none', display:'block' }}>Ke Beranda</a>
          </div>
        </div>
      </div>
    );
  }

  if (!keg) return null;

  const kuotaPenuh = keg.sisaKuota <= 0;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        <a href="/beranda" style={{ fontSize:12, color:'#6b7280', textDecoration:'none', display:'inline-block', marginBottom:14 }}>← Kembali</a>

        {/* Info kegiatan */}
        <div style={{ background:'#f9fafb', borderRadius:12, padding:'1rem 1.25rem', marginBottom:16, border:'1px solid #e5e7eb' }}>
          <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:100, background:'#E1F5EE', color:'#0F6E56' }}>
              {DIVISI_LABEL[keg.divisi] || keg.divisi}
            </span>
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:100, background:keg.jenis==='MOU'?'#E6F1FB':'#FAEEDA', color:keg.jenis==='MOU'?'#0C447C':'#854F0B' }}>
              {keg.jenis}
            </span>
          </div>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:6 }}>{keg.judul}</div>
          {keg.deskripsi && <div style={{ fontSize:13, color:'#6b7280', marginBottom:8, lineHeight:1.6 }}>{keg.deskripsi}</div>}
          <div style={{ fontSize:12, color:'#9ca3af', display:'flex', gap:12, flexWrap:'wrap' }}>
            {keg.wilayah  && <span>📍 {keg.wilayah}</span>}
            {keg.tglMulai && <span>📅 {formatTanggal(keg.tglMulai)}{keg.tglTarget && ` – ${formatTanggal(keg.tglTarget)}`}</span>}
            {keg.biaya    && <span>💰 Rp {keg.biaya}</span>}
          </div>

          {/* Kuota */}
          <div style={{ marginTop:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
              <span style={{ color:'#6b7280' }}>Slot Mitra Tersedia</span>
              <span style={{ fontWeight:700, color: kuotaPenuh ? '#A32D2D' : '#0F6E56' }}>
                {keg.sisaKuota} dari {keg.target} slot
              </span>
            </div>
            <div style={{ height:8, background:'#f3f4f6', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.round((keg.terisi/keg.target)*100)}%`, background: kuotaPenuh ? '#A32D2D' : '#0F6E56', borderRadius:4 }}></div>
            </div>
          </div>
        </div>

        {/* Jenis dikunci — info */}
        <div style={{ background:'#E6F1FB', borderRadius:8, padding:'8px 12px', marginBottom:16, fontSize:11, color:'#0C447C' }}>
          ℹ️ Jenis dokumen untuk kegiatan ini adalah <strong>{keg.jenis}</strong>, telah ditentukan oleh BNN Provinsi.
        </div>

        {kuotaPenuh ? (
          <div style={{ textAlign:'center', padding:'2rem', background:'#FCEBEB', borderRadius:12, color:'#A32D2D' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🚫</div>
            <div style={{ fontSize:15, fontWeight:600 }}>Kuota Penuh</div>
            <div style={{ fontSize:12, marginTop:4 }}>Maaf, slot pendaftaran untuk kegiatan ini sudah penuh.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Form Pendaftaran</div>

            {error && <div style={msgBox('#A32D2D','#FCEBEB')}>{error}</div>}

            <div style={{ marginBottom:12 }}>
              <label style={labelSt}>Nama Institusi ✱</label>
              <input style={inputFull} value={namaInstitusi} onChange={e => setNamaInstitusi(e.target.value)} placeholder="Contoh: Universitas Hasanuddin" />
            </div>

            {keg.jenis === 'PKS' && (
              <div style={{ marginBottom:12 }}>
                <label style={labelSt}>Jurusan / Program Studi</label>
                <input style={inputFull} value={jurusan} onChange={e => setJurusan(e.target.value)} placeholder="Contoh: Teknik Informatika" />
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <label style={labelSt}>Email</label>
                <input type="email" style={inputFull} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@institusi.id" />
              </div>
              <div>
                <label style={labelSt}>No. WhatsApp</label>
                <input type="tel" style={inputFull} value={noWa} onChange={e => setNoWa(e.target.value)} placeholder="08xxx" />
              </div>
            </div>
            <div style={{ fontSize:10, color:'#9ca3af', marginTop:-6, marginBottom:12 }}>* Isi minimal salah satu kontak</div>

            <div style={{ marginBottom:16 }}>
              <label style={labelSt}>Tujuan / Catatan (opsional)</label>
              <textarea style={{ ...inputFull, height:70, resize:'none' }} value={deskripsi} onChange={e => setDeskripsi(e.target.value)} placeholder="Jelaskan tujuan bergabung..." />
            </div>

            <button onClick={daftar} disabled={submitting} style={{ ...btnPrimary, width:'100%', height:46, fontSize:14 }}>
              {submitting ? '⏳ Mendaftar...' : '✓ Daftar Sekarang'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { minHeight:'100vh', background:'#f5f5f5', fontFamily:'sans-serif', padding:'1.5rem', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'2.5rem' };
const containerStyle: React.CSSProperties = { width:'100%', maxWidth:520, background:'#fff', borderRadius:16, padding:'1.5rem', border:'1px solid #e5e7eb', boxShadow:'0 2px 12px rgba(0,0,0,.06)' };
const labelSt: React.CSSProperties = { display:'block', fontSize:11, color:'#6b7280', marginBottom:4 };
const inputFull: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:8, border:'2px solid #e5e7eb', fontSize:13, fontFamily:'sans-serif', boxSizing:'border-box' };
const btnPrimary: React.CSSProperties = { padding:'10px 20px', borderRadius:10, border:'none', background:'#0F6E56', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'sans-serif' };
const btnSm: React.CSSProperties = { padding:'10px 16px', borderRadius:10, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:13, cursor:'pointer', fontFamily:'sans-serif' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'8px 12px', borderRadius:8, marginBottom:12 });