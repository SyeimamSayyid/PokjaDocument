'use client';

import { useEffect, useState } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiFileText, FiEdit2, FiSave, FiX,
  FiCalendar, FiInbox, FiEye,
  FiGrid, FiInbox as FiInboxNav, FiKey, FiFolder, FiActivity,
  FiUsers, FiList, FiArchive, FiShield, FiMessageCircle, FiMessageSquare, FiDroplet,
} from 'react-icons/fi';
import { FaFilePdf } from 'react-icons/fa';

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';
const CREAM = '#FAF8F0';

interface BaristData {
  no: number; sumber: 'Sistem' | 'Arsip'; tglBerlaku: string; jenis: string; instansi: string; judul: string;
  namaPIC: string; noPIC: string; emailPIC: string;
  bidang: { pemberantasan: boolean; rehabilitasi: boolean; pencegahan: boolean; pemberdayaan: boolean };
  durasi: string; tglBerakhir: string;
}

export default function LaporanKerjasamaPage() {
  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [sumberFilter, setSumberFilter] = useState<'semua' | 'sistem' | 'arsip'>('semua');
  const [data, setData] = useState<BaristData[] | null>(null);
  const [tren, setTren] = useState<{ tahun: number; jumlah: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [level, setLevel] = useState<'utama' | 'bnnp_bnnk' | ''>('');
  const [checking, setChecking] = useState(true);

  const [namaKepala, setNamaKepala] = useState('');
  const [pangkat, setPangkat] = useState('');
  const [editPengaturan, setEditPengaturan] = useState(false);
  const [savingPengaturan, setSavingPengaturan] = useState(false);

  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        // Laporan resmi ini khusus urusan BNNP/BNNK (tanda tangan Kepala BNNP)
        // — BNN Utama punya struktur laporan sendiri, jadi tidak relevan di sini.
        if (u.level === 'utama') { window.location.href = '/dashboard/bnn-utama'; return; }
        setNamaAdmin(u.nama || u.email || 'Admin');
        setLevel(u.level === 'utama' ? 'utama' : 'bnnp_bnnk');
        setChecking(false);

        fetch('/api/superadmin/laporan/pengaturan')
          .then(r => r.json())
          .then(d => { setNamaKepala(d.namaKepala || ''); setPangkat(d.pangkat || ''); })
          .catch(() => {});
      })
      .catch(() => { window.location.href = '/login'; });
  }, []);

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInboxNav size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/dokumen-basah', icon: <FiDroplet size={17} />, label: 'Dokumen Basah' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiList size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/laporan', icon: <FiFileText size={17} />, label: 'Laporan' },
    { href: '/dashboard/kelola-chatbot', icon: <FiMessageCircle size={17} />, label: 'Kelola Chatbot' },
    { href: '/dashboard/kotak-saran', icon: <FiMessageSquare size={17} />, label: 'Kotak Saran' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' },
  ];

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  const tampilkan = async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const res = await fetch(`/api/superadmin/laporan/kerjasama?tahun=${tahun}&sumber=${sumberFilter}`);
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal memuat laporan.'); return; }
      setData(d.data || []);
      setTren(d.tren || []);
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  const simpanPengaturan = async () => {
    if (!namaKepala.trim() || !pangkat.trim()) { setError('Nama dan pangkat Kepala wajib diisi.'); return; }
    setSavingPengaturan(true); setError('');
    try {
      const res = await fetch('/api/superadmin/laporan/pengaturan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaKepala: namaKepala.trim(), pangkat: pangkat.trim(), diubahOleh: namaAdmin }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal menyimpan.'); return; }
      setEditPengaturan(false);
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setSavingPengaturan(false);
    }
  };

  const download = (isi: 'ringkas' | 'lengkap') => {
    window.location.href = `/api/superadmin/laporan/kerjasama/download?tahun=${tahun}&format=pdf&sumber=${sumberFilter}&isi=${isi}`;
  };

  const bukaPreview = async () => {
    setPreviewLoading(true); setError('');
    try {
      const res = await fetch(`/api/superadmin/laporan/kerjasama/download?tahun=${tahun}&format=pdf&mode=inline&sumber=${sumberFilter}`);
      if (!res.ok) { setError('Gagal membuat preview.'); return; }
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setError('Terjadi kesalahan saat membuat preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const tutupPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
  };

  if (checking) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily: FONT, color: '#64748b', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(30,58,95,0.1)', borderTop: `3px solid ${INDIGO}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13 }}>Memuat laporan...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); filter:blur(4px); } to { opacity:1; transform:none; filter:blur(0); } }
        .rise { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        .btn-hover:active:not(:disabled) { transform: scale(0.97); }
        input::placeholder { color: rgba(30,58,95,0.3); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/superadmin/laporan"
        brandLabel="E-POKJA HUKER"
        brandSub="Admin BNNP/BNNK"
        userName={namaAdmin}
        userTag="Admin BNNP/BNNK"
        accent="#B5813F"
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 1100, margin: '0 auto', padding: '1.4rem 1.5rem 0' }}>
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(250,248,240,0.75)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(30,58,95,0.1)', borderRadius: 100, padding: '10px 14px',
          boxShadow: '0 10px 30px -18px rgba(30,58,95,0.3)',
        }} className="rise">
          <div style={{ fontWeight: 800, fontSize: 14, color: INDIGO }}>Laporan Data Arsip Kerja Sama</div>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth: 1100, margin: '0 auto', padding: '1.4rem 1.5rem 3rem' }}>

        {error && <div style={{ ...msgBox('#A32D2D', '#FCEBEB'), marginBottom: 16 }} className="rise">{error}</div>}

        {/* Pengaturan Kepala BNNP */}
        <div style={{ ...shell, marginBottom: 14 }} className="rise">
          <div style={{ ...core, padding: '1.2rem 1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editPengaturan ? 14 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: INDIGO }}>Kepala BNNP (Penanda Tangan Laporan)</div>
              {!editPengaturan && (
                <button onClick={() => setEditPengaturan(true)} className="btn-hover" style={btnGhostSm}>
                  <FiEdit2 size={11} /> Ubah
                </button>
              )}
            </div>

            {editPengaturan ? (
              <>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={fieldLabel}>Nama Kepala</label>
                    <input style={fieldInput} value={namaKepala} onChange={e => setNamaKepala(e.target.value)} placeholder="Drs. Nama Kepala" />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={fieldLabel}>Pangkat</label>
                    <input style={fieldInput} value={pangkat} onChange={e => setPangkat(e.target.value)} placeholder="Brigadir Jenderal Polisi" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={simpanPengaturan} disabled={savingPengaturan} className="btn-hover" style={btnPrimarySm}>
                    <FiSave size={11} /> {savingPengaturan ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button onClick={() => setEditPengaturan(false)} className="btn-hover" style={btnGhostSm}>
                    <FiX size={11} /> Batal
                  </button>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: 'rgba(30,58,95,0.6)' }}>
                {namaKepala || <span style={{ fontStyle: 'italic', color: 'rgba(30,58,95,0.35)' }}>Belum diisi</span>}
                {pangkat && <span> — {pangkat}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Pilih tahun + sumber */}
        <div style={{ ...shell, marginBottom: 16 }} className="rise">
          <div style={{ ...core, padding: '1.2rem 1.4rem', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={fieldLabel}><FiCalendar size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Tahun</label>
              <input
                type="number"
                style={{ ...fieldInput, width: 110 }}
                value={tahun}
                onChange={e => setTahun(parseInt(e.target.value) || now.getFullYear())}
              />
            </div>
            <div>
              <label style={fieldLabel}><FiArchive size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Sumber Data</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { key: 'semua' as const, label: 'Semua' },
                  { key: 'sistem' as const, label: 'Sistem' },
                  { key: 'arsip' as const, label: 'Arsip' },
                ].map(o => (
                  <button
                    key={o.key}
                    onClick={() => setSumberFilter(o.key)}
                    className="btn-hover"
                    style={{
                      ...btnGhostSm,
                      background: sumberFilter === o.key ? INDIGO : 'rgba(30,58,95,0.03)',
                      color: sumberFilter === o.key ? CREAM : INDIGO,
                      borderColor: sumberFilter === o.key ? INDIGO : 'rgba(30,58,95,0.12)',
                      fontWeight: sumberFilter === o.key ? 700 : 600,
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={tampilkan} disabled={loading} className="btn-hover" style={btnPrimarySm}>
              {loading ? 'Memuat...' : 'Tampilkan'}
            </button>
          </div>
        </div>

        {data !== null && (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }} className="rise">
            {[
              { lbl: 'Total Kerja Sama', val: data.length, bg: INDIGO },
              { lbl: 'MOU', val: data.filter(d => d.jenis.toUpperCase() === 'MOU').length, bg: '#4A7FB5' },
              { lbl: 'PKS', val: data.filter(d => d.jenis.toUpperCase() === 'PKS').length, bg: '#4A7FB5' },
              { lbl: 'Dari Arsip', val: data.filter(d => d.sumber === 'Arsip').length, bg: '#8C5F27' },
            ].map(c => (
              <div key={c.lbl} style={{ background: c.bg, borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{c.val}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{c.lbl}</div>
              </div>
            ))}
          </div>

          {tren.length > 1 && (
            <div style={{ ...shell, marginBottom: 16 }} className="rise">
              <div style={{ ...core, padding: '1.3rem 1.4rem' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: INDIGO, marginBottom: 14 }}>Tren Dokumen per Tahun (Sistem + Arsip)</div>
                <TrenChart data={tren} />
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(30,58,95,0.08)' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: INDIGO }}>
                    Jumlah Kerja Sama BNNP Sulsel mencapai {data.length} dokumen.
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Sebanyak {data.filter(d => d.jenis.toUpperCase() === 'MOU').length} dari MOU, sebanyak {data.filter(d => d.jenis.toUpperCase() === 'PKS').length} dari PKS.
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Terdiri dari {data.filter(d => d.sumber === 'Sistem').length} dari pengajuan mitra melalui sistem dan {data.filter(d => d.sumber === 'Arsip').length} dari yang telah diarsipkan.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={shell} className="rise">
            <div style={{ ...core, padding: '1.3rem 1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: INDIGO, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiFileText size={16} /> Data Kerja Sama Tahun {tahun} ({data.length})
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={bukaPreview} disabled={previewLoading} className="btn-hover" style={btnGhostSm}>
                    <FiEye size={12} /> {previewLoading ? 'Menyiapkan...' : 'Preview'}
                  </button>
                  <button onClick={() => download('ringkas')} className="btn-hover" style={btnGhostSm} title="Cuma halaman ringkasan + chart tren, tanpa tabel data lengkap">
                    <FaFilePdf size={13} /> PDF Ringkas
                  </button>
                  <button onClick={() => download('lengkap')} className="btn-hover" style={{ ...btnDownload, background: '#A32D2D' }} title="Ringkasan + chart tren + tabel data lengkap semua dokumen">
                    <FaFilePdf size={13} /> PDF Lengkap
                  </button>
                </div>
              </div>

              {data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(30,58,95,0.4)' }}>
                  <FiInbox size={30} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Data PKS/MOU saat itu tidak ditemukan</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <tr>
                        {['No', 'Sumber', 'Tgl Berlaku', 'Jenis', 'Instansi', 'Judul', 'Nama PIC', 'Bidang', 'Durasi', 'Berakhir'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(d => {
                        const bidangList = [
                          d.bidang.pencegahan && 'Pencegahan',
                          d.bidang.pemberantasan && 'Pemberantasan',
                          d.bidang.rehabilitasi && 'Rehabilitasi',
                          d.bidang.pemberdayaan && 'Pemberdayaan',
                        ].filter(Boolean).join(', ');
                        return (
                          <tr key={d.no} style={{ borderBottom: '1px solid rgba(30,58,95,0.06)' }}>
                            <td style={td}>{d.no}</td>
                            <td style={td}>
                              <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: d.sumber === 'Arsip' ? '#F5EFE0' : '#EAF2FC', color: d.sumber === 'Arsip' ? '#8C5F27' : '#1D4ED8' }}>{d.sumber}</span>
                            </td>
                            <td style={td}>{d.tglBerlaku}</td>
                            <td style={td}>{d.jenis}</td>
                            <td style={td}>{d.instansi}</td>
                            <td style={td}>{d.judul}</td>
                            <td style={td}>{d.namaPIC || '—'}</td>
                            <td style={td}>{bidangList || '—'}</td>
                            <td style={td}>{d.durasi ? `${d.durasi} Th` : '—'}</td>
                            <td style={td}>{d.tglBerakhir}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Modal Preview PDF */}
      {previewUrl && (
        <div onClick={tutupPreview} style={{
          position: 'fixed', inset: 0, background: 'rgba(30,58,95,0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '2rem',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 1000, height: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 40px 90px -30px rgba(30,58,95,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid rgba(30,58,95,0.08)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: INDIGO, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiEye size={14} /> Preview Laporan Tahun {tahun}
              </div>
              <button onClick={tutupPreview} className="btn-hover" style={{ ...btnGhostSm, padding: '6px 10px' }}>
                <FiX size={14} />
              </button>
            </div>
            <iframe src={previewUrl} style={{ flex: 1, border: 'none', width: '100%' }} title="Preview Laporan" />
          </div>
        </div>
      )}
    </div>
  );
}

// Line chart tren dokumen per tahun — gaya sederhana meniru referensi
// (garis merah, marker diamond, gridlines horizontal, angka & tahun di sumbu).
function TrenChart({ data }: { data: { tahun: number; jumlah: number }[] }) {
  const W = 640, H = 260, padL = 36, padR = 20, padT = 16, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(2, ...data.map(d => d.jumlah));
  const yMax = Math.ceil(maxVal / 5) * 5 || 5; // bulatkan ke atas ke kelipatan 5, mirip referensi (skala 0-20)
  const yTicks = 5;

  const x = (i: number) => padL + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / yMax) * innerH;

  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.jumlah)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', fontFamily: FONT }}>
      {/* Gridlines horizontal + label sumbu Y */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = (yMax / yTicks) * i;
        const yy = y(val);
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#e2e8f0" strokeWidth={1} />
            <text x={padL - 8} y={yy + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{Math.round(val)}</text>
          </g>
        );
      })}
      {/* Garis tren + marker diamond */}
      <path d={pathD} fill="none" stroke="#DC2626" strokeWidth={2} />
      {data.map((d, i) => (
        <g key={d.tahun} transform={`translate(${x(i)},${y(d.jumlah)})`}>
          <rect x={-4} y={-4} width={8} height={8} fill="#DC2626" transform="rotate(45)" />
          <text x={0} y={-12} textAnchor="middle" fontSize={9} fontWeight={700} fill={INDIGO}>{d.jumlah}</text>
        </g>
      ))}
      {/* Label sumbu X (tahun) */}
      {data.map((d, i) => (
        <text key={d.tahun} x={x(i)} y={H - padB + 16} textAnchor="middle" fontSize={9.5} fill="#64748b">{d.tahun}</text>
      ))}
      {/* Garis sumbu */}
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#cbd5e1" strokeWidth={1} />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#cbd5e1" strokeWidth={1} />
    </svg>
  );
}

const shell: React.CSSProperties = { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(30,58,95,0.07)', borderRadius: 24, padding: 7, boxShadow: '0 1px 2px rgba(30,58,95,0.04), 0 30px 60px -38px rgba(30,58,95,0.18)' };
const core: React.CSSProperties = { background: '#fff', borderRadius: 18, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)' };
const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: INDIGO, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' };
const fieldInput: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(30,58,95,0.1)', background: 'rgba(30,58,95,0.02)', fontSize: 12.5, fontFamily: FONT, outline: 'none', color: INDIGO, boxSizing: 'border-box' };
const btnPrimarySm: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 100, border: 'none', background: INDIGO, color: CREAM, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT };
const btnGhostSm: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 100, border: '1px solid rgba(30,58,95,0.12)', background: 'rgba(30,58,95,0.03)', color: INDIGO, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT };
const btnDownload: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 100, border: 'none', background: INDIGO, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT };
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: 'rgba(30,58,95,0.45)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(30,58,95,0.1)' };
const td: React.CSSProperties = { padding: '8px 10px', color: INDIGO };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize: 12.5, color, background: bg, padding: '10px 14px', borderRadius: 10 });