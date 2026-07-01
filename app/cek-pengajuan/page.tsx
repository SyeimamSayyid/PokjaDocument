'use client';

import { useState } from 'react';
import {
  Search,
  Check,
  X,
  Clock,
  FileText,
  Building,
  Calendar,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  FilePlus,
  Key,
  User,
  Briefcase,
  GraduationCap,
  FileCheck,
  FileX,
  Info,
  Mail,
  Lock,
  ExternalLink
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

// 4 tahap alur pengajuan publik (disederhanakan)
const ALUR_PUBLIK = [
  {
    key: 'terkirim',
    label: 'Dokumen Terkirim',
    desc: 'Pengajuan Anda telah diterima oleh sistem',
    icon: Send,
    statuses: ['Diajukan', 'Menunggu Review'],
  },
  {
    key: 'review',
    label: 'Admin Mereview',
    desc: 'Tim Pokja BNN sedang meninjau pengajuan Anda',
    icon: Eye,
    statuses: ['Ditinjau', 'Sedang Ditinjau', 'Dalam Proses'],
  },
  {
    key: 'hasil',
    label: 'Keputusan',
    desc: 'Pengajuan disetujui atau ditolak',
    icon: CheckCircle,
    statuses: ['Disetujui', 'Selesai', 'Kegiatan Berlangsung', 'Kegiatan Selesai', 'Ditolak'],
  },
];

function getAlurIndex(status: string): number {
  for (let i = 0; i < ALUR_PUBLIK.length; i++) {
    if (ALUR_PUBLIK[i].statuses.includes(status)) return i;
  }
  return 0;
}

function isAcc(status: string): boolean {
  return ['Disetujui','Selesai','Kegiatan Berlangsung','Kegiatan Selesai'].includes(status);
}

function isTolak(status: string): boolean {
  return status === 'Ditolak';
}

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

  const handleReset = () => {
    setHasil(null);
    setKode('');
    setError('');
  };

  const alurIdx   = hasil ? getAlurIndex(hasil.status) : -1;
  const sudahAcc  = hasil ? isAcc(hasil.status) : false;
  const sudahTolak = hasil ? isTolak(hasil.status) : false;
  const sudahHasil = sudahAcc || sudahTolak;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        {/* Header dengan animasi */}
        <div style={{ 
          textAlign:'center', 
          marginBottom:24,
          animation: 'fadeInDown 0.5s ease-out'
        }}>
          <div style={{ 
            display:'inline-flex',
            alignItems:'center',
            justifyContent:'center',
            width:64,
            height:64,
            borderRadius:'50%',
            background:'linear-gradient(135deg, #0F6E56, #1a8f70)',
            color:'#fff',
            marginBottom:12,
            boxShadow:'0 4px 20px rgba(15,110,86,.3)'
          }}>
            <Search size={28} />
          </div>
          <div style={{ fontSize:20, fontWeight:700, color:'#1a1a2e' }}>Cek Status Pengajuan</div>
          <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>
            BNN Provinsi Sulawesi Selatan
          </div>
        </div>

        {/* Form dengan animasi */}
        <form onSubmit={handleCek} style={{ 
          marginBottom:24,
          animation: 'fadeInUp 0.5s ease-out 0.1s both'
        }}>
          <label style={label}>
            <Key size={14} style={{ marginRight:6 }} />
            Kode Tracking
          </label>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, position:'relative' }}>
              <input
                style={{
                  ...input,
                  borderColor: isFocused ? '#0F6E56' : error ? '#DC2626' : '#e5e7eb',
                  boxShadow: isFocused ? '0 0 0 3px rgba(15,110,86,.1)' : 'none',
                  transition: 'all .3s ease'
                }}
                value={kode}
                onChange={e => setKode(e.target.value.toUpperCase())}
                placeholder="KS-XXXXXX"
                maxLength={12}
                autoFocus
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              {kode && (
                <button
                  type="button"
                  onClick={() => setKode('')}
                  style={{
                    position:'absolute',
                    right:8,
                    top:'50%',
                    transform:'translateY(-50%)',
                    background:'none',
                    border:'none',
                    color:'#9ca3af',
                    cursor:'pointer',
                    padding:4,
                    borderRadius:'50%',
                    transition:'all .2s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              style={{
                ...btnPrimary,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex',
                alignItems:'center',
                gap:8,
                transition:'all .3s ease'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width:16,
                    height:16,
                    border:'2px solid rgba(255,255,255,.3)',
                    borderTop:'2px solid #fff',
                    borderRadius:'50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Memuat
                </>
              ) : (
                <>
                  <Search size={16} />
                  Cek
                </>
              )}
            </button>
          </div>
          {error && (
            <div style={{ 
              fontSize:12, 
              color:'#DC2626', 
              marginTop:8, 
              display:'flex', 
              alignItems:'center', 
              gap:6,
              animation: 'shake 0.4s ease-out'
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </form>

        {/* Hasil dengan animasi */}
        {hasil && (
          <div style={{ animation: 'fadeInUp 0.5s ease-out 0.15s both' }}>
            {/* Info institusi */}
            <div style={{ 
              background:'#f9fafb', 
              borderRadius:12, 
              padding:'14px 16px', 
              marginBottom:16, 
              border:'1px solid #e5e7eb',
              transition:'all .3s ease'
            }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                <span style={{ 
                  fontSize:10, 
                  fontWeight:600, 
                  padding:'3px 12px', 
                  borderRadius:100, 
                  background:hasil.jenis==='MOU'?'#E6F1FB':'#FAEEDA', 
                  color:hasil.jenis==='MOU'?'#0C447C':'#854F0B',
                  display:'flex',
                  alignItems:'center',
                  gap:4
                }}>
                  <FileText size={11} />
                  {hasil.jenis}
                </span>
                {hasil.adaDokumenMitra && (
                  <span style={{ 
                    fontSize:10, 
                    padding:'3px 10px', 
                    borderRadius:100, 
                    background:'#E6F1FB', 
                    color:'#0C447C',
                    display:'flex',
                    alignItems:'center',
                    gap:4
                  }}>
                    <FileCheck size={11} />
                    Ada dok. mitra
                  </span>
                )}
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e', display:'flex', alignItems:'center', gap:8 }}>
                <Building size={16} style={{ color:'#6b7280' }} />
                {hasil.namaInstitusi}
              </div>
              {hasil.jurusan && (
                <div style={{ 
                  fontSize:12, 
                  color:'#5B21B6', 
                  marginTop:4,
                  display:'flex',
                  alignItems:'center',
                  gap:4
                }}>
                  <GraduationCap size={14} />
                  {hasil.jurusan}
                </div>
              )}
              <div style={{ 
                fontSize:13, 
                color:'#6b7280', 
                marginTop:6, 
                lineHeight:1.6,
                background:'#fff',
                padding:'8px 12px',
                borderRadius:6
              }}>
                {hasil.deskripsi}
              </div>
              <div style={{ 
                fontSize:11, 
                color:'#9ca3af', 
                marginTop:8,
                display:'flex',
                gap:16,
                flexWrap:'wrap'
              }}>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <Calendar size={13} />
                  Diajukan: {hasil.tglSubmit}
                </span>
                {hasil.tanggalKegiatan && (
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <Clock size={13} />
                    Rencana: {hasil.tanggalKegiatan}
                  </span>
                )}
              </div>
            </div>

            {/* Alur 3 tahap */}
            <div style={{ 
              ...sectionCard, 
              marginBottom:16,
              transition:'all .3s ease'
            }}>
              <div style={{ 
                fontSize:12, 
                fontWeight:600, 
                marginBottom:14,
                display:'flex',
                alignItems:'center',
                gap:8,
                color:'#374151'
              }}>
                <Clock size={14} />
                Progress Pengajuan
              </div>

              {/* Progress bar */}
              <div style={{ 
                height:6, 
                background:'#f3f4f6', 
                borderRadius:3, 
                overflow:'hidden', 
                marginBottom:18 
              }}>
                <div style={{
                  height:'100%', 
                  borderRadius:3,
                  width: sudahHasil ? '100%' : alurIdx === 1 ? '50%' : '15%',
                  background: sudahTolak ? '#DC2626' : 'linear-gradient(90deg, #0F6E56, #22a67e)',
                  transition:'width .8s cubic-bezier(0.4, 0, 0.2, 1)',
                  position:'relative'
                }}>
                  {sudahHasil && (
                    <div style={{
                      position:'absolute',
                      right:-8,
                      top:'50%',
                      transform:'translateY(-50%)',
                      width:16,
                      height:16,
                      borderRadius:'50%',
                      background: sudahAcc ? '#0F6E56' : '#DC2626',
                      boxShadow:'0 0 0 4px rgba(15,110,86,.2)'
                    }} />
                  )}
                </div>
              </div>

              {/* Step tracker */}
              {ALUR_PUBLIK.map((step, i) => {
                const isDone    = i < alurIdx || (i === alurIdx && sudahHasil);
                const isCurrent = i === alurIdx && !sudahHasil;
                const isUpcoming = i > alurIdx;
                const StepIcon = step.icon;

                // Step terakhir (Keputusan) tampil kondisional
                if (i === 2 && sudahHasil) {
                  return (
                    <div key={step.key} style={{ 
                      display:'flex', 
                      gap:14, 
                      alignItems:'flex-start',
                      animation: 'fadeInUp 0.4s ease-out'
                    }}>
                      <div style={{ flexShrink:0, paddingTop:2 }}>
                        <div style={{
                          width:40, 
                          height:40, 
                          borderRadius:'50%', 
                          display:'flex', 
                          alignItems:'center', 
                          justifyContent:'center', 
                          fontSize:18,
                          background: sudahAcc ? '#0F6E56' : '#DC2626',
                          color:'#fff',
                          boxShadow: sudahAcc ? '0 0 0 4px #D1FAE5' : '0 0 0 4px #FEE2E2',
                          transition:'all .3s ease'
                        }}>
                          {sudahAcc ? <Check size={20} /> : <X size={20} />}
                        </div>
                      </div>
                      <div style={{ flex:1, paddingTop:2 }}>
                        <div style={{ 
                          fontSize:14, 
                          fontWeight:700, 
                          color: sudahAcc ? '#065F46' : '#991B1B', 
                          marginBottom:6,
                          display:'flex',
                          alignItems:'center',
                          gap:8
                        }}>
                          {sudahAcc ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                          {sudahAcc ? 'Dokumen Disetujui' : 'Dokumen Ditolak'}
                        </div>

                        {/* ACC */}
                        {sudahAcc && (
                          <div style={{ 
                            background:'linear-gradient(135deg, #F0FDF4, #D1FAE5)', 
                            border:'1px solid #86EFAC', 
                            borderRadius:12, 
                            padding:'16px',
                            boxShadow:'0 2px 8px rgba(15,110,86,.08)'
                          }}>
                            <div style={{ 
                              fontSize:13, 
                              color:'#065F46', 
                              lineHeight:1.7, 
                              marginBottom:12
                            }}>
                              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                                <Info size={16} style={{ flexShrink:0, marginTop:2 }} />
                                <span>
                                  Selamat! Pengajuan kerja sama <strong>{hasil.jenis}</strong> dari <strong>{hasil.namaInstitusi}</strong> 
                                  telah disetujui oleh Admin Pokja BNN.
                                </span>
                              </div>
                              <div style={{ paddingLeft:24 }}>
                                Tim Pokja akan segera menghubungi Anda untuk menyampaikan <strong>Kode Akses Dokumen</strong>. 
                                Gunakan kode tersebut untuk login dan mengerjakan draft dokumen.
                              </div>
                            </div>
                            <a href="/login-mitra" style={{
                              display:'inline-flex', 
                              alignItems:'center', 
                              gap:8,
                              padding:'10px 20px', 
                              borderRadius:10,
                              background:'#0F6E56', 
                              color:'#fff',
                              textDecoration:'none', 
                              fontSize:13, 
                              fontWeight:600,
                              transition:'all .3s ease',
                              boxShadow:'0 2px 8px rgba(15,110,86,.3)'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,110,86,.4)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,110,86,.3)';
                            }}
                            >
                              <Lock size={16} />
                              Login Mitra
                              <ArrowRight size={14} />
                            </a>
                          </div>
                        )}

                        {/* TOLAK */}
                        {sudahTolak && (
                          <div style={{ 
                            background:'#FEF2F2', 
                            border:'1px solid #FCA5A5', 
                            borderRadius:12, 
                            padding:'16px',
                            boxShadow:'0 2px 8px rgba(220,38,38,.08)'
                          }}>
                            <div style={{ 
                              fontSize:13, 
                              color:'#991B1B', 
                              lineHeight:1.7, 
                              marginBottom: hasil.catatan ? 10 : 0,
                              display:'flex',
                              gap:8
                            }}>
                              <AlertCircle size={16} style={{ flexShrink:0, marginTop:2 }} />
                              <span>Mohon maaf, pengajuan kerja sama ini tidak dapat diproses saat ini.</span>
                            </div>
                            {hasil.catatan && (
                              <div style={{ 
                                fontSize:13, 
                                padding:'10px 14px', 
                                background:'#fff', 
                                borderRadius:8, 
                                color:'#991B1B', 
                                border:'1px solid #FCA5A5', 
                                marginBottom:12,
                                display:'flex',
                                alignItems:'flex-start',
                                gap:8
                              }}>
                                <FileX size={16} style={{ flexShrink:0, marginTop:2 }} />
                                <div>
                                  <strong>Alasan:</strong> {hasil.catatan}
                                </div>
                              </div>
                            )}
                            <a href="/pengajuan" style={{ 
                              fontSize:13, 
                              color:'#DC2626', 
                              fontWeight:600, 
                              textDecoration:'none',
                              display:'inline-flex',
                              alignItems:'center',
                              gap:6,
                              padding:'6px 12px',
                              borderRadius:6,
                              background:'#fff',
                              border:'1px solid #FCA5A5',
                              transition:'all .2s ease'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#FEF2F2';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#fff';
                            }}
                            >
                              <FilePlus size={14} />
                              Ajukan kembali
                              <ArrowRight size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={step.key} style={{ 
                    display:'flex', 
                    alignItems:'flex-start', 
                    gap:14,
                    opacity: isUpcoming ? 0.6 : 1,
                    transition:'all .3s ease'
                  }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                      <div style={{
                        width:40, 
                        height:40, 
                        borderRadius:'50%', 
                        display:'flex', 
                        alignItems:'center', 
                        justifyContent:'center', 
                        fontSize:16,
                        background: isDone ? '#0F6E56' : isCurrent ? '#F0FDF4' : '#f3f4f6',
                        color: isDone ? '#fff' : isCurrent ? '#0F6E56' : '#9ca3af',
                        border: isCurrent ? '2px solid #0F6E56' : 'none',
                        boxShadow: isCurrent ? '0 0 0 4px #D1FAE5' : 'none',
                        transition:'all .3s ease'
                      }}>
                        {isDone ? <Check size={18} /> : <StepIcon size={18} />}
                      </div>
                      {i < ALUR_PUBLIK.length - 1 && (
                        <div style={{ 
                          width:2, 
                          height:32, 
                          background: isDone ? 'linear-gradient(180deg, #0F6E56, #22a67e)' : '#e5e7eb',
                          marginTop:4,
                          transition:'all .5s ease'
                        }} />
                      )}
                    </div>
                    <div style={{ paddingTop:6, flex:1 }}>
                      <div style={{ 
                        fontSize:14, 
                        fontWeight: isCurrent ? 700 : isDone ? 600 : 400, 
                        color: isUpcoming ? '#9ca3af' : '#1a1a2e',
                        marginBottom:2,
                        display:'flex',
                        alignItems:'center',
                        gap:6,
                        flexWrap:'wrap'
                      }}>
                        {step.label}
                        {isCurrent && (
                          <span style={{ 
                            fontSize:9, 
                            color:'#0F6E56', 
                            background:'#D1FAE5', 
                            padding:'2px 8px', 
                            borderRadius:100,
                            fontWeight:600
                          }}>
                            Proses
                          </span>
                        )}
                      </div>
                      <div style={{ 
                        fontSize:12, 
                        color: isUpcoming ? '#d1d5db' : '#6b7280',
                        lineHeight:1.5
                      }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol Aksi */}
            <div style={{ 
              display:'flex', 
              gap:8,
              animation: 'fadeInUp 0.5s ease-out 0.2s both'
            }}>
              <button 
                onClick={handleReset} 
                style={{ 
                  ...btnSm, 
                  flex:1,
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:6,
                  transition:'all .2s ease'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#fff';
                }}
              >
                <RefreshCw size={14} />
                Cek Kode Lain
              </button>
              {!sudahHasil && (
                <a href="/pengajuan" style={{ 
                  ...btnSm, 
                  flex:1, 
                  textDecoration:'none', 
                  textAlign:'center',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:6,
                  transition:'all .2s ease'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#fff';
                }}
                >
                  <FilePlus size={14} />
                  Ajukan Baru
                </a>
              )}
              {sudahAcc && (
                <a href="/login-mitra" style={{ 
                  ...btnPrimary, 
                  flex:1, 
                  textDecoration:'none', 
                  textAlign:'center', 
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:6,
                  transition:'all .3s ease'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(15,110,86,.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
                >
                  <Lock size={16} />
                  Login Mitra
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer link */}
        {!hasil && (
          <div style={{ 
            textAlign:'center', 
            fontSize:12, 
            color:'#9ca3af', 
            marginTop:16,
            animation: 'fadeInUp 0.5s ease-out 0.2s both'
          }}>
            Belum punya kode?{' '}
            <a href="/pengajuan" style={{ 
              color:'#0F6E56', 
              textDecoration:'none',
              fontWeight:600,
              display:'inline-flex',
              alignItems:'center',
              gap:4,
              transition:'all .2s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#065F46';
              (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#0F6E56';
              (e.currentTarget as HTMLElement).style.textDecoration = 'none';
            }}
            >
              Ajukan kerja sama
              <ArrowRight size={12} />
            </a>
          </div>
        )}
      </div>

      {/* Animasi CSS */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-16px);
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
  maxWidth:500, 
  background:'#fff', 
  borderRadius:20, 
  padding:'1.75rem', 
  border:'1px solid #e5e7eb', 
  boxShadow:'0 4px 24px rgba(0,0,0,.06)',
  transition:'all .3s ease'
};

const sectionCard: React.CSSProperties = { 
  background:'#f9fafb', 
  borderRadius:14, 
  padding:'1.25rem 1.5rem', 
  border:'1px solid #e5e7eb' 
};

const label: React.CSSProperties = { 
  display:'flex', 
  alignItems:'center',
  fontSize:11, 
  fontWeight:600, 
  color:'#374151', 
  marginBottom:6, 
  textTransform:'uppercase', 
  letterSpacing:0.5 
};

const input: React.CSSProperties = { 
  padding:'12px 16px', 
  borderRadius:10, 
  border:'2px solid #e5e7eb', 
  fontSize:14, 
  fontFamily:'monospace',
  fontWeight:600,
  letterSpacing:1.5,
  boxSizing:'border-box',
  width:'100%',
  background:'#fafbfc',
  transition:'all .3s ease'
};

const btnPrimary: React.CSSProperties = { 
  padding:'10px 24px', 
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
  fontSize:12, 
  cursor:'pointer', 
  fontFamily:'sans-serif',
  transition:'all .2s ease'
};