'use client';

import { useState } from 'react';
import ChatbotWidget from '@/components/ChatbotWidget';
import {
  Search, Check, X, Clock, FileText, Building, Calendar, Send, Eye,
  CheckCircle, AlertCircle, ArrowRight, RefreshCw, FilePlus, Key,
  GraduationCap, FileCheck, FileX, Info, Lock, ExternalLink, Mail,
  ArrowLeft,
} from 'lucide-react';

interface HasilCek {
  ditemukan: boolean;
  idPengajuan: string;
  namaInstitusi: string;
  jenis: string;
  deskripsi: string;
  tanggalKegiatan: string;
  tglSubmit: string;
  jurusan: string;
  adaDokumenMitra: boolean;
  status: string;
  catatan: string;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const BLUE = '#1D4ED8';
const BLUE_LIGHT = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const GOLD = '#D97706';

const ALUR_PUBLIK = [
  { key: 'terkirim', label: 'Dokumen Terkirim', desc: 'Pengajuan Anda telah diterima oleh sistem', icon: Send, statuses: ['Diajukan', 'Menunggu Review'] },
  { key: 'review',   label: 'Admin Mereview',   desc: 'Tim Pokja BNN sedang meninjau pengajuan Anda', icon: Eye, statuses: ['Ditinjau', 'Sedang Ditinjau', 'Dalam Proses'] },
  { key: 'hasil',    label: 'Keputusan',        desc: 'Pengajuan disetujui atau ditolak', icon: CheckCircle, statuses: ['Disetujui', 'Selesai', 'Kegiatan Berlangsung', 'Kegiatan Selesai', 'Ditolak'] },
];

function getAlurIndex(status: string): number {
  for (let i = 0; i < ALUR_PUBLIK.length; i++) if (ALUR_PUBLIK[i].statuses.includes(status)) return i;
  return 0;
}
function isAcc(status: string): boolean { return ['Disetujui','Selesai','Kegiatan Berlangsung','Kegiatan Selesai'].includes(status); }
function isTolak(status: string): boolean { return status === 'Ditolak'; }

export default function CekPengajuanPage() {
  const [kode, setKode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [hasil, setHasil]     = useState<HasilCek | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleCek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kode.trim()) { setError('Masukkan kode tracking.'); return; }
    setLoading(true); setError(''); setHasil(null);
    try {
      const res = await fetch(`/api/pengajuan/publik?kode=${kode.trim().toUpperCase()}`);
      const d   = await res.json();
      if (!res.ok || !d.ditemukan) { setError(d.message || 'Kode tidak ditemukan.'); return; }
      setHasil(d);
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setLoading(false); }
  };

  const handleReset = () => { setHasil(null); setKode(''); setError(''); };

  const alurIdx    = hasil ? getAlurIndex(hasil.status) : -1;
  const sudahAcc    = hasil ? isAcc(hasil.status) : false;
  const sudahTolak  = hasil ? isTolak(hasil.status) : false;
  const sudahHasil  = sudahAcc || sudahTolak;

  return (
    <div style={pageStyle}>
      <GlobalStyle />
      <a href="/" style={backHomeBtn} className="back-home-btn">
        <ArrowLeft size={14} /> Kembali ke Beranda
      </a>
      <div style={containerStyle} className="fld">

        <div style={{ textAlign:'center', marginBottom:26 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:60, height:60, borderRadius:'50%', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', marginBottom:13, boxShadow:`0 10px 26px -8px ${BLUE}60` }}>
            <Search size={26} />
          </div>
          <div style={{ fontSize:19, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.02em' }}>Cek Status Pengajuan</div>
          <div style={{ fontSize:12.5, color:'#64748b', marginTop:4 }}>BNN Provinsi Sulawesi Selatan</div>
        </div>

        <form onSubmit={handleCek} style={{ marginBottom:24 }}>
          <label style={label}><Key size={13} style={{ marginRight:5 }} />Kode Tracking</label>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, position:'relative' }}>
              <input
                style={{ ...input, borderColor: isFocused ? BLUE : error ? '#DC2626' : 'rgba(29,78,216,0.10)' }}
                value={kode} onChange={e => setKode(e.target.value.toUpperCase())}
                placeholder="KS-XXXXXX" maxLength={12} autoFocus
                onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
              />
              {kode && (
                <button type="button" onClick={() => setKode('')} style={clearBtn}>
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1, display:'flex', alignItems:'center', gap:7 }} className="btn-hover">
              {loading ? (
                <><div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />Memuat</>
              ) : (
                <><Search size={15} />Cek</>
              )}
            </button>
          </div>
          {error && <div style={{ fontSize:12, color:'#DC2626', marginTop:9, display:'flex', alignItems:'center', gap:6 }}><AlertCircle size={13} />{error}</div>}
        </form>

        {hasil && (
          <div className="fld">
            {/* Info institusi */}
            <div style={{ ...shellStyle, marginBottom:16 }}>
              <div style={{ ...coreStyle, padding:'1rem 1.2rem' }}>
                <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:9, flexWrap:'wrap' }}>
                  <span style={pillTag(hasil.jenis==='MOU'?'#DBEAFE':'#FEF3C7', hasil.jenis==='MOU'?BLUE_DARK:'#92400E')}><FileText size={11} />{hasil.jenis}</span>
                  {hasil.adaDokumenMitra && <span style={pillTag('#DBEAFE', BLUE_DARK)}><FileCheck size={11} />Ada dok. mitra</span>}
                </div>
                <div style={{ fontSize:15.5, fontWeight:800, color:'#0f1f3d', display:'flex', alignItems:'center', gap:8 }}>
                  <Building size={16} style={{ color: BLUE }} />{hasil.namaInstitusi}
                </div>
                {hasil.jurusan && (
                  <div style={{ fontSize:12, color:'#5B21B6', marginTop:5, display:'flex', alignItems:'center', gap:5 }}><GraduationCap size={13} />{hasil.jurusan}</div>
                )}
                <div style={{ fontSize:12.5, color:'#64748b', marginTop:8, lineHeight:1.65, background:'#f8fafc', padding:'9px 12px', borderRadius:10 }}>{hasil.deskripsi}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:9, display:'flex', gap:15, flexWrap:'wrap' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><Calendar size={12} />Diajukan: {hasil.tglSubmit}</span>
                  {hasil.tanggalKegiatan && <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={12} />Rencana: {hasil.tanggalKegiatan}</span>}
                </div>
              </div>
            </div>

            {/* Alur */}
            <div style={{ ...shellStyle, marginBottom:16 }}>
              <div style={{ ...coreStyle, padding:'1.2rem 1.3rem' }}>
                <div style={{ fontSize:11.5, fontWeight:700, marginBottom:15, display:'flex', alignItems:'center', gap:7, color:'#334155' }}>
                  <Clock size={13} />Progress Pengajuan
                </div>

                <div style={{ height:6, background:'#eef2f6', borderRadius:100, overflow:'hidden', marginBottom:20 }}>
                  <div style={{ height:'100%', borderRadius:100, width: sudahHasil ? '100%' : alurIdx === 1 ? '50%' : '15%', background: sudahTolak ? '#DC2626' : `linear-gradient(90deg,${BLUE_LIGHT},${BLUE_DARK})`, transition:'width .8s cubic-bezier(0.32,0.72,0,1)' }} />
                </div>

                {ALUR_PUBLIK.map((step, i) => {
                  const isDone     = i < alurIdx || (i === alurIdx && sudahHasil);
                  const isCurrent  = i === alurIdx && !sudahHasil;
                  const isUpcoming = i > alurIdx;
                  const StepIcon   = step.icon;

                  if (i === 2 && sudahHasil) {
                    return (
                      <div key={step.key} style={{ display:'flex', gap:13, alignItems:'flex-start' }} className="fld">
                        <div style={{ flexShrink:0, paddingTop:2 }}>
                          <div style={{ width:38, height:38, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background: sudahAcc ? BLUE : '#DC2626', color:'#fff', boxShadow: sudahAcc ? `0 0 0 4px #DBEAFE` : '0 0 0 4px #FEE2E2' }}>
                            {sudahAcc ? <Check size={18} /> : <X size={18} />}
                          </div>
                        </div>
                        <div style={{ flex:1, paddingTop:2 }}>
                          <div style={{ fontSize:13.5, fontWeight:800, color: sudahAcc ? BLUE_DARK : '#991B1B', marginBottom:8, display:'flex', alignItems:'center', gap:7 }}>
                            {sudahAcc ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                            {sudahAcc ? 'Dokumen Disetujui' : 'Dokumen Ditolak'}
                          </div>

                          {sudahAcc && (
                            <div style={accBox}>
                              <div style={{ fontSize:12.5, fontWeight:800, color: BLUE_DARK, marginBottom:8 }}>Mitra Terhormat,</div>
                              <div style={{ fontSize:13, color:'#334155', lineHeight:1.8, marginBottom:14 }}>
                                Dokumen Anda sudah <strong>disetujui</strong> oleh Admin Pokja. Silakan periksa
                                <strong> email</strong> Anda untuk mendapatkan <strong>kode akses kerja sama</strong>.
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid rgba(29,78,216,0.14)', borderRadius:10, padding:'9px 13px', marginBottom:14, fontSize:11.5, color: BLUE_DARK }}>
                                <Mail size={14} style={{ flexShrink:0 }} />
                                Kode akses dikirim ke email yang Anda daftarkan saat pengajuan.
                              </div>
                              <a href="/login-mitra" style={{ ...btnPrimary, display:'inline-flex', alignItems:'center', gap:8, textDecoration:'none' }} className="btn-hover">
                                <Lock size={15} />Login Mitra<ArrowRight size={13} />
                              </a>
                            </div>
                          )}

                          {sudahTolak && (
                            <div style={tolakBox}>
                              <div style={{ fontSize:13, color:'#991B1B', lineHeight:1.7, marginBottom: hasil.catatan ? 11 : 0, display:'flex', gap:8 }}>
                                <AlertCircle size={15} style={{ flexShrink:0, marginTop:2 }} />
                                <span>Mohon maaf, pengajuan kerja sama ini tidak dapat diproses saat ini.</span>
                              </div>
                              {hasil.catatan && (
                                <div style={{ fontSize:12.5, padding:'10px 13px', background:'#fff', borderRadius:9, color:'#991B1B', border:'1px solid #FCA5A5', marginBottom:13, display:'flex', alignItems:'flex-start', gap:7 }}>
                                  <FileX size={14} style={{ flexShrink:0, marginTop:2 }} />
                                  <div><strong>Alasan:</strong> {hasil.catatan}</div>
                                </div>
                              )}
                              <a href="/pengajuan" style={{ fontSize:12.5, color:'#DC2626', fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:9, background:'#fff', border:'1px solid #FCA5A5' }} className="btn-hover">
                                <FilePlus size={13} />Ajukan kembali<ArrowRight size={12} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={step.key} style={{ display:'flex', alignItems:'flex-start', gap:13, opacity: isUpcoming ? 0.55 : 1 }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                        <div style={{ width:38, height:38, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background: isDone ? BLUE : isCurrent ? '#EFF6FF' : '#eef2f6', color: isDone ? '#fff' : isCurrent ? BLUE : '#94a3b8', border: isCurrent ? `2px solid ${BLUE}` : 'none', boxShadow: isCurrent ? '0 0 0 4px #DBEAFE' : 'none' }}>
                          {isDone ? <Check size={17} /> : <StepIcon size={17} />}
                        </div>
                        {i < ALUR_PUBLIK.length - 1 && <div style={{ width:2, height:30, background: isDone ? `linear-gradient(180deg,${BLUE_LIGHT},${BLUE_DARK})` : '#eef2f6', marginTop:4 }} />}
                      </div>
                      <div style={{ paddingTop:6, flex:1 }}>
                        <div style={{ fontSize:13.5, fontWeight: isCurrent ? 800 : isDone ? 700 : 400, color: isUpcoming ? '#94a3b8' : '#0f1f3d', marginBottom:2, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          {step.label}
                          {isCurrent && <span style={{ fontSize:9, color: BLUE, background:'#DBEAFE', padding:'2px 8px', borderRadius:100, fontWeight:700 }}>Proses</span>}
                        </div>
                        <div style={{ fontSize:11.5, color: isUpcoming ? '#cbd5e1' : '#64748b', lineHeight:1.5 }}>{step.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleReset} style={{ ...btnSm, flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }} className="btn-hover">
                <RefreshCw size={13} />Cek Kode Lain
              </button>
              {!sudahHasil && (
                <a href="/pengajuan" style={{ ...btnSm, flex:1, textDecoration:'none', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }} className="btn-hover">
                  <FilePlus size={13} />Ajukan Baru
                </a>
              )}
              {sudahAcc && (
                <a href="/login-mitra" style={{ ...btnPrimary, flex:1, textDecoration:'none', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }} className="btn-hover">
                  <Lock size={15} />Login Mitra<ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}

        {!hasil && (
          <div style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:16 }}>
            Belum punya kode?{' '}
            <a href="/pengajuan" style={{ color: BLUE, textDecoration:'none', fontWeight:700, display:'inline-flex', alignItems:'center', gap:4 }}>
              Ajukan kerja sama <ArrowRight size={12} />
            </a>
          </div>
        )}
      </div>

      <ChatbotWidget tema="biru" sumberLabel="Cek Status Pengajuan" />
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      @keyframes fadeUp { from { opacity:0; transform: translateY(16px); filter: blur(3px);} to { opacity:1; transform: translateY(0); filter: blur(0);} }
      @keyframes spin { to { transform: rotate(360deg); } }
      .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
      .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
      .back-home-btn { transition: all 0.25s ease; }
      .back-home-btn:hover { background: rgba(29,78,216,0.08); transform: translateY(-1px); }
    `}</style>
  );
}
const pageStyle: React.CSSProperties = { minHeight:'100vh', background:'linear-gradient(180deg,#f7f9fc,#eef2f8)', fontFamily: FONT, padding:'1.5rem', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'2.5rem' };
const containerStyle: React.CSSProperties = { width:'100%', maxWidth:520, background:'#fff', borderRadius:24, padding:'1.9rem', border:'1px solid rgba(29,78,216,0.08)', boxShadow:'0 20px 60px -30px rgba(15,23,42,0.25)' };
const backHomeBtn: React.CSSProperties = {
  position:'fixed', top:20, left:20, zIndex:50,
  display:'flex', alignItems:'center', gap:7,
  background:'#fff', border:'1px solid rgba(29,78,216,0.12)', borderRadius:100,
  padding:'9px 16px', color:'#334155', fontSize:12, fontWeight:600,
  textDecoration:'none', fontFamily:FONT, boxShadow:'0 6px 18px -10px rgba(15,23,42,0.15)',
};
const shellStyle: React.CSSProperties = { background:'rgba(255,255,255,0.65)', border:'1px solid rgba(29,78,216,0.08)', borderRadius:17, padding:5 };
const coreStyle: React.CSSProperties = { background:'#f8fafc', borderRadius:13 };
const pillTag = (bg: string, color: string): React.CSSProperties => ({ fontSize:10, fontWeight:700, padding:'4px 12px', borderRadius:100, background:bg, color, display:'flex', alignItems:'center', gap:5 });
const label: React.CSSProperties = { display:'flex', alignItems:'center', fontSize:10.5, fontWeight:700, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.6 };
const input: React.CSSProperties = { padding:'12px 16px', borderRadius:11, borderWidth:1.5, borderStyle:'solid', fontSize:14, fontFamily:'monospace', fontWeight:700, letterSpacing:1.5, boxSizing:'border-box', width:'100%', background:'#f8fafc', outline:'none' };
const clearBtn: React.CSSProperties = { position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#94a3b8', cursor:'pointer', padding:4, borderRadius:'50%' };
const btnPrimary: React.CSSProperties = { padding:'11px 24px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${BLUE_LIGHT},${BLUE_DARK})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:`0 8px 20px -8px ${BLUE}60` };
const btnSm: React.CSSProperties = { padding:'11px 16px', borderRadius:11, border:'1.5px solid rgba(29,78,216,0.10)', background:'#fff', color:'#334155', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:FONT };
const accBox: React.CSSProperties = { background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border:'1px solid #93C5FD', borderRadius:14, padding:'18px' };
const tolakBox: React.CSSProperties = { background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:14, padding:'16px' };