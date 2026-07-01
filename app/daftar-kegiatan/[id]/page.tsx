'use client';

import { useEffect, useState, use } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Check,
  AlertCircle,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Building,
  Mail,
  Phone,
  FileText,
  Tag,
  Clipboard,
  Home,
  Search,
  User,
  GraduationCap,
  MessageSquare,
  Clock,
  Award,
  Shield,
  Send,
  ExternalLink,
  Lock,
  Info
} from 'lucide-react';

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

const DIVISI_COLOR: Record<string, string> = {
  'pencegahan': '#0C447C',
  'pemberantasan': '#A32D2D',
  'rehabilitasi': '#5B21B6',
  'pemberdayaan': '#085041',
  'bantuan-hukum': '#B45309',
  'pendampingan-hukum': '#7C3AED',
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Form
  const [namaInstitusi, setNamaInstitusi] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [email, setEmail]     = useState('');
  const [noWa, setNoWa]       = useState('');
  const [deskripsi, setDeskripsi] = useState('');

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
    <div style={{ 
      minHeight:'100vh', 
      display:'flex', 
      flexDirection:'column',
      alignItems:'center', 
      justifyContent:'center', 
      fontFamily:'sans-serif', 
      color:'#6b7280',
      gap:16
    }}>
      <div style={{
        width:40,
        height:40,
        border:'3px solid #f3f4f6',
        borderTop:'3px solid #0F6E56',
        borderRadius:'50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <div style={{ fontSize:14 }}>Memuat kegiatan...</div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (error && !keg) return (
    <div style={{ 
      minHeight:'100vh', 
      display:'flex', 
      flexDirection:'column', 
      alignItems:'center', 
      justifyContent:'center', 
      fontFamily:'sans-serif', 
      color:'#A32D2D', 
      padding:'1.5rem', 
      textAlign:'center' 
    }}>
      <div style={{ 
        fontSize:56, 
        marginBottom:16,
        opacity:0.7
      }}>
        <AlertCircle size={56} style={{ color:'#fca5a5' }} />
      </div>
      <div style={{ fontSize:16, fontWeight:600 }}>{error}</div>
      <a 
        href="/beranda" 
        style={{ 
          marginTop:16, 
          color:'#0F6E56', 
          textDecoration:'none', 
          fontSize:13,
          display:'flex',
          alignItems:'center',
          gap:6,
          padding:'8px 16px',
          borderRadius:8,
          background:'#F0FDF4',
          transition:'all .2s ease'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#D1FAE5';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = '#F0FDF4';
        }}
      >
        <ArrowLeft size={16} />
        Kembali ke Beranda
      </a>
    </div>
  );

  // Halaman sukses
  if (step === 'sukses' && hasil) {
    return (
      <div style={pageStyle}>
        <div style={{ 
          ...containerStyle,
          animation: 'fadeInUp 0.5s ease-out'
        }}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ 
              display:'inline-flex',
              alignItems:'center',
              justifyContent:'center',
              width:72,
              height:72,
              borderRadius:'50%',
              background:'linear-gradient(135deg, #0F6E56, #22a67e)',
              marginBottom:12,
              boxShadow:'0 4px 20px rgba(15,110,86,.3)'
            }}>
              <CheckCircle size={36} style={{ color:'#fff' }} />
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:'#0F6E56' }}>Pendaftaran Berhasil!</div>
            <div style={{ fontSize:14, color:'#6b7280', marginTop:4 }}>
              {hasil.namaInstitusi} · {hasil.jenis}
            </div>
          </div>

          <div style={{ 
            background:'linear-gradient(135deg, #F0FDF4, #D1FAE5)', 
            border:'2px solid #86EFAC', 
            borderRadius:14, 
            padding:'1.75rem', 
            marginBottom:18, 
            textAlign:'center',
            boxShadow:'0 2px 12px rgba(15,110,86,.1)'
          }}>
            <div style={{ 
              fontSize:11, 
              color:'#065F46', 
              marginBottom:8, 
              textTransform:'uppercase', 
              letterSpacing:1.5,
              fontWeight:600,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              gap:6
            }}>
              <Clipboard size={14} />
              Kode Tracking
            </div>
            <div style={{ 
              fontSize:32, 
              fontWeight:800, 
              letterSpacing:5, 
              color:'#065F46', 
              marginBottom:14, 
              fontFamily:'monospace',
              background:'rgba(255,255,255,.6)',
              padding:'8px 16px',
              borderRadius:8,
              display:'inline-block'
            }}>
              {hasil.kodeTracking}
            </div>
            <button 
              onClick={() => { 
                navigator.clipboard.writeText(hasil.kodeTracking); 
                setCopied(true); 
                setTimeout(()=>setCopied(false),1500); 
              }} 
              style={{
                ...btnPrimary,
                display:'inline-flex',
                alignItems:'center',
                gap:8,
                padding:'10px 24px'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,110,86,.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,110,86,.2)';
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Tersalin!' : 'Salin Kode'}
            </button>
          </div>

          <div style={{ 
            background:'#FFFBEB', 
            border:'1px solid #FCD34D', 
            borderRadius:10, 
            padding:'14px 18px', 
            marginBottom:18, 
            fontSize:13, 
            color:'#78350F',
            display:'flex',
            alignItems:'flex-start',
            gap:8
          }}>
            <AlertCircle size={16} style={{ flexShrink:0, marginTop:2 }} />
            <div>
              <strong>Simpan kode ini!</strong> Gunakan untuk melacak status pendaftaran Anda. 
              Tim Pokja akan meninjau pendaftaran dan menghubungi Anda.
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <a 
              href="/cek-pengajuan" 
              style={{ 
                ...btnPrimary, 
                flex:1, 
                textAlign:'center', 
                textDecoration:'none', 
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                gap:6
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,110,86,.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,110,86,.2)';
              }}
            >
              <Search size={16} />
              Cek Status
            </a>
            <a 
              href="/beranda" 
              style={{ 
                ...btnSm, 
                flex:1, 
                textAlign:'center', 
                textDecoration:'none', 
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                gap:6
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#fff';
              }}
            >
              <Home size={16} />
              Ke Beranda
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!keg) return null;

  const kuotaPenuh = keg.sisaKuota <= 0;
  const divisiColor = DIVISI_COLOR[keg.divisi] || '#0F6E56';

  return (
    <div style={pageStyle}>
      <div style={{ 
        ...containerStyle,
        animation: 'fadeInUp 0.5s ease-out'
      }}>

        <a 
          href="/beranda" 
          style={{ 
            fontSize:12, 
            color:'#6b7280', 
            textDecoration:'none', 
            display:'inline-flex',
            alignItems:'center',
            gap:6,
            marginBottom:16,
            padding:'4px 8px',
            borderRadius:6,
            transition:'all .2s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <ArrowLeft size={14} />
          Kembali
        </a>

        {/* Info kegiatan */}
        <div style={{ 
          background:'#f9fafb', 
          borderRadius:12, 
          padding:'1.25rem 1.5rem', 
          marginBottom:18, 
          border:'1px solid #e5e7eb',
          transition:'all .3s ease'
        }}>
          <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
            <span style={{ 
              fontSize:10, 
              fontWeight:600, 
              padding:'3px 12px', 
              borderRadius:100, 
              background: `${divisiColor}15`,
              color: divisiColor,
              display:'flex',
              alignItems:'center',
              gap:4
            }}>
              <Tag size={11} />
              {DIVISI_LABEL[keg.divisi] || keg.divisi}
            </span>
            <span style={{ 
              fontSize:10, 
              fontWeight:600, 
              padding:'3px 12px', 
              borderRadius:100, 
              background:keg.jenis==='MOU'?'#E6F1FB':'#FAEEDA', 
              color:keg.jenis==='MOU'?'#0C447C':'#854F0B',
              display:'flex',
              alignItems:'center',
              gap:4
            }}>
              <FileText size={11} />
              {keg.jenis}
            </span>
            {keg.sisaKuota > 0 && (
              <span style={{ 
                fontSize:10, 
                fontWeight:600, 
                padding:'3px 12px', 
                borderRadius:100, 
                background:'#D1FAE5', 
                color:'#065F46',
                display:'flex',
                alignItems:'center',
                gap:4
              }}>
                <Users size={11} />
                Slot Tersedia
              </span>
            )}
          </div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:6, color:'#1a1a2e' }}>{keg.judul}</div>
          {keg.deskripsi && (
            <div style={{ 
              fontSize:13, 
              color:'#6b7280', 
              marginBottom:10, 
              lineHeight:1.7 
            }}>
              {keg.deskripsi}
            </div>
          )}
          <div style={{ 
            fontSize:12, 
            color:'#6b7280', 
            display:'flex', 
            gap:14, 
            flexWrap:'wrap',
            background:'#fff',
            padding:'6px 12px',
            borderRadius:6
          }}>
            {keg.wilayah && (
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <MapPin size={14} /> {keg.wilayah}
              </span>
            )}
            {keg.tglMulai && (
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <Calendar size={14} /> {formatTanggal(keg.tglMulai)}{keg.tglTarget && ` – ${formatTanggal(keg.tglTarget)}`}
              </span>
            )}
            {keg.biaya && (
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <DollarSign size={14} /> Rp {keg.biaya}
              </span>
            )}
          </div>

          {/* Kuota */}
          <div style={{ marginTop:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
              <span style={{ color:'#6b7280', display:'flex', alignItems:'center', gap:4 }}>
                <Users size={14} />
                Slot Mitra Tersedia
              </span>
              <span style={{ 
                fontWeight:700, 
                color: kuotaPenuh ? '#DC2626' : '#0F6E56',
                display:'flex',
                alignItems:'center',
                gap:4
              }}>
                {keg.sisaKuota} dari {keg.target} slot
                {kuotaPenuh && <AlertCircle size={14} />}
              </span>
            </div>
            <div style={{ height:8, background:'#f3f4f6', borderRadius:4, overflow:'hidden' }}>
              <div style={{ 
                height:'100%', 
                width:`${Math.round((keg.terisi/keg.target)*100)}%`, 
                background: kuotaPenuh ? 'linear-gradient(90deg, #DC2626, #EF4444)' : 'linear-gradient(90deg, #0F6E56, #22a67e)',
                borderRadius:4,
                transition:'width .8s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>
        </div>

        {/* Jenis dikunci — info */}
        <div style={{ 
          background:'#E6F1FB', 
          borderRadius:8, 
          padding:'10px 14px', 
          marginBottom:18, 
          fontSize:12, 
          color:'#0C447C',
          display:'flex',
          alignItems:'flex-start',
          gap:8
        }}>
          <Info size={16} style={{ flexShrink:0, marginTop:2 }} />
          <span>
            Jenis dokumen untuk kegiatan ini adalah <strong>{keg.jenis}</strong>, telah ditentukan oleh BNN Provinsi.
          </span>
        </div>

        {kuotaPenuh ? (
          <div style={{ 
            textAlign:'center', 
            padding:'2.5rem 1.5rem', 
            background:'#FEF2F2', 
            borderRadius:12, 
            color:'#991B1B',
            border:'1px solid #FCA5A5'
          }}>
            <div style={{ 
              fontSize:48, 
              marginBottom:12,
              opacity:0.7
            }}>
              <AlertCircle size={48} style={{ margin:'0 auto' }} />
            </div>
            <div style={{ fontSize:16, fontWeight:700 }}>Kuota Penuh</div>
            <div style={{ fontSize:13, marginTop:4, color:'#7F1D1D' }}>
              Maaf, slot pendaftaran untuk kegiatan ini sudah penuh.
            </div>
          </div>
        ) : (
          <>
            <div style={{ 
              fontSize:16, 
              fontWeight:700, 
              marginBottom:14,
              display:'flex',
              alignItems:'center',
              gap:8,
              color:'#1a1a2e'
            }}>
              <Send size={18} />
              Form Pendaftaran
            </div>

            {error && (
              <div style={{ 
                ...msgBox('#991B1B','#FEF2F2'),
                display:'flex',
                alignItems:'flex-start',
                gap:8,
                animation: 'shake 0.4s ease-out'
              }}>
                <AlertCircle size={16} style={{ flexShrink:0, marginTop:1 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom:14 }}>
              <label style={labelSt}>
                <Building size={14} style={{ marginRight:4 }} />
                Nama Institusi <span style={{ color:'#DC2626' }}>✱</span>
              </label>
              <input 
                style={{
                  ...inputFull,
                  borderColor: focusedField === 'namaInstitusi' ? '#0F6E56' : '#e5e7eb',
                  boxShadow: focusedField === 'namaInstitusi' ? '0 0 0 3px rgba(15,110,86,.1)' : 'none',
                  transition:'all .3s ease'
                }}
                value={namaInstitusi} 
                onChange={e => setNamaInstitusi(e.target.value)} 
                placeholder="Contoh: Universitas Hasanuddin"
                onFocus={() => setFocusedField('namaInstitusi')}
                onBlur={() => setFocusedField(null)}
              />
            </div>

            {keg.jenis === 'PKS' && (
              <div style={{ marginBottom:14 }}>
                <label style={labelSt}>
                  <GraduationCap size={14} style={{ marginRight:4 }} />
                  Jurusan / Program Studi
                </label>
                <input 
                  style={{
                    ...inputFull,
                    borderColor: focusedField === 'jurusan' ? '#0F6E56' : '#e5e7eb',
                    boxShadow: focusedField === 'jurusan' ? '0 0 0 3px rgba(15,110,86,.1)' : 'none',
                    transition:'all .3s ease'
                  }}
                  value={jurusan} 
                  onChange={e => setJurusan(e.target.value)} 
                  placeholder="Contoh: Teknik Informatika"
                  onFocus={() => setFocusedField('jurusan')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={labelSt}>
                  <Mail size={14} style={{ marginRight:4 }} />
                  Email
                </label>
                <input 
                  type="email" 
                  style={{
                    ...inputFull,
                    borderColor: focusedField === 'email' ? '#0F6E56' : '#e5e7eb',
                    boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(15,110,86,.1)' : 'none',
                    transition:'all .3s ease'
                  }}
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="email@institusi.id"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
              <div>
                <label style={labelSt}>
                  <Phone size={14} style={{ marginRight:4 }} />
                  No. WhatsApp
                </label>
                <input 
                  type="tel" 
                  style={{
                    ...inputFull,
                    borderColor: focusedField === 'noWa' ? '#0F6E56' : '#e5e7eb',
                    boxShadow: focusedField === 'noWa' ? '0 0 0 3px rgba(15,110,86,.1)' : 'none',
                    transition:'all .3s ease'
                  }}
                  value={noWa} 
                  onChange={e => setNoWa(e.target.value)} 
                  placeholder="08xxx"
                  onFocus={() => setFocusedField('noWa')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>
            <div style={{ 
              fontSize:11, 
              color:'#9ca3af', 
              marginTop:-8, 
              marginBottom:14,
              display:'flex',
              alignItems:'center',
              gap:4
            }}>
              <AlertCircle size={12} />
              * Isi minimal salah satu kontak
            </div>

            <div style={{ marginBottom:18 }}>
              <label style={labelSt}>
                <MessageSquare size={14} style={{ marginRight:4 }} />
                Tujuan / Catatan (opsional)
              </label>
              <textarea 
                style={{ 
                  ...inputFull, 
                  height:80, 
                  resize:'none',
                  borderColor: focusedField === 'deskripsi' ? '#0F6E56' : '#e5e7eb',
                  boxShadow: focusedField === 'deskripsi' ? '0 0 0 3px rgba(15,110,86,.1)' : 'none',
                  transition:'all .3s ease',
                  fontFamily:'sans-serif'
                }} 
                value={deskripsi} 
                onChange={e => setDeskripsi(e.target.value)} 
                placeholder="Jelaskan tujuan bergabung dan kontribusi yang dapat diberikan..."
                onFocus={() => setFocusedField('deskripsi')}
                onBlur={() => setFocusedField(null)}
              />
            </div>

            <button 
              onClick={daftar} 
              disabled={submitting} 
              style={{ 
                ...btnPrimary, 
                width:'100%', 
                height:50, 
                fontSize:15,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                gap:8,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition:'all .3s ease'
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,110,86,.3)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,110,86,.2)';
              }}
            >
              {submitting ? (
                <>
                  <div style={{
                    width:18,
                    height:18,
                    border:'2px solid rgba(255,255,255,.3)',
                    borderTop:'2px solid #fff',
                    borderRadius:'50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Mendaftar...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Daftar Sekarang
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Animasi CSS */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

const pageStyle: React.CSSProperties = { 
  minHeight:'100vh', 
  background:'linear-gradient(135deg, #f8fafb 0%, #f1f5f9 100%)', 
  fontFamily:'sans-serif', 
  padding:'1.5rem', 
  display:'flex', 
  alignItems:'flex-start', 
  justifyContent:'center', 
  paddingTop:'2.5rem' 
};

const containerStyle: React.CSSProperties = { 
  width:'100%', 
  maxWidth:540, 
  background:'#fff', 
  borderRadius:20, 
  padding:'1.75rem', 
  border:'1px solid #e5e7eb', 
  boxShadow:'0 4px 24px rgba(0,0,0,.06)',
  transition:'all .3s ease'
};

const labelSt: React.CSSProperties = { 
  display:'flex', 
  alignItems:'center',
  fontSize:12, 
  fontWeight:600,
  color:'#374151', 
  marginBottom:5 
};

const inputFull: React.CSSProperties = { 
  width:'100%', 
  padding:'11px 14px', 
  borderRadius:10, 
  border:'2px solid #e5e7eb', 
  fontSize:14, 
  fontFamily:'sans-serif', 
  boxSizing:'border-box',
  background:'#fafbfc',
  transition:'all .3s ease'
};

const btnPrimary: React.CSSProperties = { 
  padding:'10px 20px', 
  borderRadius:10, 
  border:'none', 
  background:'#0F6E56', 
  color:'#fff', 
  fontSize:13, 
  fontWeight:600, 
  cursor:'pointer', 
  fontFamily:'sans-serif',
  boxShadow:'0 2px 8px rgba(15,110,86,.2)',
  transition:'all .3s ease'
};

const btnSm: React.CSSProperties = { 
  padding:'10px 16px', 
  borderRadius:10, 
  border:'1px solid #e5e7eb', 
  background:'#fff', 
  color:'#374151', 
  fontSize:13, 
  cursor:'pointer', 
  fontFamily:'sans-serif',
  transition:'all .2s ease'
};

const msgBox = (color: string, bg: string): React.CSSProperties => ({ 
  fontSize:13, 
  color, 
  background:bg, 
  padding:'10px 14px', 
  borderRadius:10, 
  marginBottom:14,
  border:'1px solid transparent'
});