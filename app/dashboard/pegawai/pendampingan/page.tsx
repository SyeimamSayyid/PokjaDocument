'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiClipboard, FiTrendingUp,
  FiFileText, FiMail, FiCalendar, FiClock, FiMapPin, FiBookOpen, FiEdit3,
  FiSend, FiCheckCircle, FiAlertCircle, FiInbox, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';

interface PegawaiUser { role: string; nip: string; lokasi?: string; }
interface Pengajuan {
  id: string; nama: string; tglKejadian: string; waktuKejadian: string;
  tempatKejadian: string; pasal: string; deskripsi: string; status: string;
  tglDiajukan: string; catatanAdmin: string;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';
const CREAM = '#FAF8F0';
const GOLD = '#B5813F';

const STATUS_INFO: Record<string, { color: string; bg: string }> = {
  'Diajukan': { color: INDIGO, bg: 'rgba(30,58,95,0.08)' },
  'Ditinjau': { color: GOLD, bg: '#F5EFE0' },
  'Diproses': { color: '#1D4ED8', bg: '#DBEAFE' },
  'Selesai':  { color: '#0a5c47', bg: 'rgba(10,92,71,0.1)' },
  'Ditolak':  { color: '#A32D2D', bg: '#FCEBEB' },
};

export default function PendampinganPengajuanPage() {
  const [user, setUser] = useState<PegawaiUser | null>(null);
  const [riwayat, setRiwayat] = useState<Pengajuan[]>([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [tglKejadian, setTglKejadian] = useState('');
  const [waktuKejadian, setWaktuKejadian] = useState('');
  const [tempatKejadian, setTempatKejadian] = useState('');
  const [pasal, setPasal] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadRiwayat = useCallback(() => {
    setLoadingRiwayat(true);
    fetch('/api/hukum/pendampingan')
      .then(r => r.json())
      .then(d => setRiwayat(d.data || []))
      .catch(() => {})
      .finally(() => setLoadingRiwayat(false));
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (u.role !== 'pegawai_bnn') { window.location.href = '/login'; return; }
    setUser(u);
    loadRiwayat();
  }, [loadRiwayat]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('paktasign_user');
    window.location.href = '/login';
  };

  const resetForm = () => {
    setNama(''); setEmail(''); setTglKejadian(''); setWaktuKejadian(''); setTempatKejadian('');
    setPasal(''); setDeskripsi(''); setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (!nama.trim() || !email.trim() || !tglKejadian || !waktuKejadian.trim() || !tempatKejadian.trim() || !pasal.trim() || !deskripsi.trim()) {
      setError('Semua kolom wajib diisi.'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hukum/pendampingan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: nama.trim(), email: email.trim(), tglKejadian, waktuKejadian: waktuKejadian.trim(), tempatKejadian: tempatKejadian.trim(), pasal: pasal.trim(), deskripsi: deskripsi.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengirim pengajuan.'); return; }
      setMsg(d.message);
      resetForm();
      setShowForm(false);
      loadRiwayat();
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setSubmitting(false); }
  };

  if (!user) return null;

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/pegawai', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/pegawai/pendampingan', icon: <FiClipboard size={17} />, label: 'Pendampingan / Pengajuan' },
    { href: '/dashboard/pegawai/tindak-lanjut', icon: <FiTrendingUp size={17} />, label: 'Tindak Lanjut' },
  ];

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        .btn-hover:active:not(:disabled) { transform: scale(0.97); }
        input::placeholder, textarea::placeholder { color: rgba(30,58,95,0.3); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/pegawai/pendampingan"
        brandLabel="SI-POKJA HUMKER"
        brandSub="Modul Penegak Hukum"
        navSectionTitle="Menu"
        userName={`Pegawai ${user.nip}`}
        userTag={user.lokasi || 'Pegawai BNN'}
        accent="#2C5580"
        onLogout={handleLogout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 760, margin: '0 auto', padding: '1.6rem 1.5rem 4rem' }}>
        <div style={{ marginBottom: 22 }} className="fld">
          <h1 style={{ fontSize: 24, fontWeight: 800, color: INDIGO, letterSpacing: '-0.03em', margin: 0 }}>Pengajuan Pendampingan Hukum</h1>
          <p style={{ fontSize: 12.5, color: 'rgba(30,58,95,0.55)', margin: '5px 0 0' }}>
            Ajukan permohonan pendampingan hukum untuk kejadian yang Anda alami sebagai pegawai BNN.
          </p>
        </div>

        {msg && <div style={{ ...msgBox('#0a5c47', 'rgba(10,92,71,0.1)'), marginBottom: 14 }} className="fld"><FiCheckCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{msg}</div>}

        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="btn-hover" style={{
            width: '100%', padding: '16px', borderRadius: 16, border: `1.5px dashed ${INDIGO}55`, background: 'rgba(30,58,95,0.03)',
            color: INDIGO, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24,
          }}>
            <FiEdit3 size={15} /> Ajukan Pendampingan Baru
          </button>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', border: '1px solid rgba(30,58,95,0.06)', marginBottom: 24 }} className="fld">
            <div style={{ fontSize: 14.5, fontWeight: 800, color: INDIGO, marginBottom: 14 }}>Formulir Pengajuan</div>

            {error && <div style={{ ...msgBox('#A32D2D', '#FCEBEB'), marginBottom: 12 }}><FiAlertCircle size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />{error}</div>}

            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}><FiFileText size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Nama Lengkap</label>
              <input style={inputFull} value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap Anda" />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}><FiMail size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Email Aktif</label>
              <input type="email" style={inputFull} value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" />
              <div style={{ fontSize: 10, color: 'rgba(30,58,95,0.4)', marginTop: 4 }}>Admin akan mengirim update status pengajuan ke email ini.</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}><FiMapPin size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Lokasi BNN</label>
              <input
                style={{ ...inputFull, background: 'rgba(30,58,95,0.05)', color: 'rgba(30,58,95,0.6)', cursor: 'not-allowed' }}
                value={user.lokasi || '—'}
                readOnly
                disabled
              />
              <div style={{ fontSize: 10, color: 'rgba(30,58,95,0.4)', marginTop: 4 }}>Terkunci — mengikuti data akun Anda, tidak bisa diubah manual.</div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={labelSt}><FiCalendar size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Tanggal Kejadian</label>
                <input type="date" style={inputFull} value={tglKejadian} onChange={e => setTglKejadian(e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={labelSt}><FiClock size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Waktu Kejadian (Jam)</label>
                <input type="time" style={inputFull} value={waktuKejadian} onChange={e => setWaktuKejadian(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}><FiMapPin size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Tempat Kejadian</label>
              <input style={inputFull} value={tempatKejadian} onChange={e => setTempatKejadian(e.target.value)} placeholder="Contoh: Jl. Sudirman No. 10, Makassar" />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}><FiBookOpen size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Pasal Yang Berlaku</label>
              <input style={inputFull} value={pasal} onChange={e => setPasal(e.target.value)} placeholder="Contoh: Pasal 351 KUHP" />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelSt}><FiEdit3 size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Deskripsi Kejadian</label>
              <textarea style={{ ...inputFull, height: 100, resize: 'none' }} value={deskripsi} onChange={e => setDeskripsi(e.target.value)} placeholder="Jelaskan kronologi kejadian secara ringkas..." />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} disabled={submitting} className="btn-hover" style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid rgba(30,58,95,0.1)', background: '#fff', color: '#334155', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>
                Batal
              </button>
              <button type="submit" disabled={submitting} className="btn-hover" style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: INDIGO, color: CREAM, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <FiSend size={13} /> {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
            </div>
          </form>
        )}

        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 800, color: INDIGO, display: 'flex', alignItems: 'center', gap: 8 }} className="fld">
          <FiInbox size={15} /> Riwayat Pengajuan Saya ({riwayat.length})
        </div>

        {loadingRiwayat ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: 12.5 }}>Memuat riwayat...</div>
        ) : riwayat.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }} className="fld">
            <FiInbox size={28} style={{ color: '#cbd5e1', marginBottom: 8 }} />
            <div style={{ fontSize: 12.5, color: '#64748b' }}>Belum ada pengajuan pendampingan hukum.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {riwayat.map(p => {
              const info = STATUS_INFO[p.status] || STATUS_INFO['Diajukan'];
              const expanded = expandedId === p.id;
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(30,58,95,0.06)', overflow: 'hidden' }} className="fld">
                  <button onClick={() => setExpandedId(expanded ? null : p.id)} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FONT }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: info.bg, color: info.color, flexShrink: 0 }}>{p.status}</span>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#0f1f3d' }}>{p.tempatKejadian} · {p.tglKejadian}</span>
                    {expanded ? <FiChevronUp size={14} color="#94a3b8" /> : <FiChevronDown size={14} color="#94a3b8" />}
                  </button>
                  {expanded && (
                    <div style={{ padding: '0 16px 14px', fontSize: 12, color: '#334155', lineHeight: 1.7 }}>
                      <div><strong>Waktu:</strong> {p.waktuKejadian}</div>
                      <div><strong>Pasal:</strong> {p.pasal}</div>
                      <div style={{ marginTop: 6 }}><strong>Deskripsi:</strong> {p.deskripsi}</div>
                      <div style={{ marginTop: 6, fontSize: 10.5, color: '#94a3b8' }}>Diajukan: {p.tglDiajukan}</div>
                      {p.catatanAdmin && (
                        <div style={{ marginTop: 8, background: '#F5EFE0', borderRadius: 10, padding: '8px 12px', fontSize: 11.5, color: '#78350F' }}>
                          <strong>Catatan Admin:</strong> {p.catatanAdmin}
                        </div>
                      )}
                      <a href={`/dashboard/pegawai/tindak-lanjut?id=${p.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11.5, fontWeight: 700, color: '#1D4ED8', textDecoration: 'none' }}>
                        <FiTrendingUp size={12} /> Lihat progres tindak lanjut
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: INDIGO, marginBottom: 5 };
const inputFull: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(30,58,95,0.1)', background: 'rgba(30,58,95,0.02)', fontSize: 12.5, fontFamily: FONT, outline: 'none', color: INDIGO, boxSizing: 'border-box' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize: 12, color, background: bg, padding: '10px 14px', borderRadius: 10 });