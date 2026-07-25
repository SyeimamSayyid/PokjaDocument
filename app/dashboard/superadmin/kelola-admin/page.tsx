'use client';

import { useEffect, useState } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiCalendar, FiInbox, FiKey, FiFolder, FiActivity, FiFileText,
  FiList as FiListSidebar, FiArchive, FiMessageCircle, FiMessageSquare, FiDroplet,
} from 'react-icons/fi';
import {
  FiShield, FiUserPlus, FiUsers, FiCheck, FiX, FiEdit2,
  FiMapPin, FiMail, FiClock, FiArrowLeft,
  FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi';

interface AdminItem {
  id: string; nama: string; email: string; status: string;
  tanggalDibuat: string; terakhirLogin: string; level: 'BNN Utama' | 'BNNP/BNNK'; wilayah: string;
}

const LOKASI_BNN_LIST = ['BNNP Sulsel', 'BNNK Palopo', 'BNNK Toraja', 'BNNK Bone', 'BNNK Sidrap'];

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';
const INDIGO_LIGHT = '#3D6690';
const CREAM = '#FAF8F0';
const GOLD = '#B5813F';
const GOLD_DARK = '#8C5F27';
const SAGE = '#5C7A5E';
const RED = '#A32D2D';

export default function KelolaAdminPage() {
  const [data, setData] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [namaSaya, setNamaSaya] = useState('Admin');
  const [readOnly, setReadOnly] = useState(false);

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState<'BNNP/BNNK' | 'BNN Utama'>('BNNP/BNNK');
  const [wilayah, setWilayah] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [kirimEmailLoadingId, setKirimEmailLoadingId] = useState<string | null>(null);
  const [editNamaEmailId, setEditNamaEmailId] = useState<string | null>(null);
  const [editNamaValue, setEditNamaValue] = useState('');
  const [editEmailValue, setEditEmailValue] = useState('');
  const [savingNamaEmail, setSavingNamaEmail] = useState(false);
  const [editLevelId, setEditLevelId] = useState<string | null>(null);
  const [editLevelValue, setEditLevelValue] = useState<'BNNP/BNNK' | 'BNN Utama'>('BNNP/BNNK');
  const [editWilayahId, setEditWilayahId] = useState<string | null>(null);
  const [editWilayahValue, setEditWilayahValue] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/superadmin/admin')
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat data admin.'); setLoading(false); });
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setReadOnly(u.level === 'utama');
        if (u.level === 'utama') setLevel('BNN Utama');
        setNamaSaya(u.nama || u.email || 'Admin');
        load();
      })
      .catch(() => { window.location.href = '/login'; });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (level === 'BNNP/BNNK' && !wilayah) { setError('Wilayah wajib dipilih untuk Admin BNNP/BNNK.'); return; }
    setSubmitting(true); setMsg(''); setError('');
    try {
      const res = await fetch('/api/superadmin/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, password, level, wilayah: level === 'BNN Utama' ? '' : wilayah, dibuatOleh: namaSaya }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal menambah admin.'); return; }
      setMsg('Admin berhasil ditambahkan.');
      setNama(''); setEmail(''); setPassword(''); setLevel('BNNP/BNNK'); setWilayah('');
      load();
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setSubmitting(false); }
  };

  const kirimAksesEmail = async (id: string) => {
    setKirimEmailLoadingId(id);
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'kirimAksesEmail' }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengirim email akses.'); return; }
      setMsg(d.message);
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setKirimEmailLoadingId(null); }
  };

  const mulaiEditNamaEmail = (a: AdminItem) => {
    setEditNamaEmailId(a.id);
    setEditNamaValue(a.nama);
    setEditEmailValue(a.email);
    setMsg(''); setError('');
  };

  const simpanNamaEmail = async (id: string) => {
    if (!editNamaValue.trim() || !editEmailValue.trim()) { setError('Nama dan email wajib diisi.'); return; }
    setSavingNamaEmail(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'ubahNamaEmail', nama: editNamaValue.trim(), email: editEmailValue.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal memperbarui nama/email.'); return; }
      setMsg(d.message);
      setEditNamaEmailId(null);
      load();
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setSavingNamaEmail(false); }
  };

  const submitUbahLevel = async (id: string) => {
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'ubahLevel', level: editLevelValue }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengubah level.'); return; }
      setMsg(d.message); setEditLevelId(null); load();
    } catch { setError('Terjadi kesalahan koneksi.'); }
  };

  const submitUbahWilayah = async (id: string) => {
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'ubahWilayah', wilayah: editWilayahValue }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengubah wilayah.'); return; }
      setMsg(d.message); setEditWilayahId(null); load();
    } catch { setError('Terjadi kesalahan koneksi.'); }
  };

  const sidebarItems: SidebarItem[] = readOnly ? [
    { href: '/dashboard/bnn-utama', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Dokumen & Tata Kelola' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Daftar Admin' },
  ] : [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/dokumen-basah', icon: <FiDroplet size={17} />, label: 'Dokumen Basah' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiListSidebar size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/laporan', icon: <FiFileText size={17} />, label: 'Laporan' },
    { href: '/dashboard/kelola-chatbot', icon: <FiMessageCircle size={17} />, label: 'Kelola Chatbot' },
    { href: '/dashboard/kotak-saran', icon: <FiMessageSquare size={17} />, label: 'Kotak Saran' },
    { href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' },
  ];

  const logoutSidebar = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily:FONT, color:'#64748b', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid rgba(30,58,95,0.1)', borderTop:'3px solid #1E3A5F', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13 }}>Memuat daftar admin...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{
      minHeight: '100dvh', fontFamily: FONT,
      background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); filter:blur(4px);} to { opacity:1; transform:none; filter:blur(0);} }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
        .rise { animation: fadeUp 0.6s cubic-bezier(0.32,0.72,0,1) both; }
        .lift { transition: all 0.4s cubic-bezier(0.32,0.72,0,1); }
        .lift:hover { transform: translateY(-3px); box-shadow: 0 24px 46px -26px rgba(30,58,95,0.28) !important; }
        .btn-hover { transition: all 0.25s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover { transform: translateY(-1px); filter: brightness(1.06); }
        .btn-hover:active { transform: translateY(0) scale(0.98); }
        .trow { transition: background 0.25s ease; }
        .trow:hover { background: rgba(30,58,95,0.025); }
        input:focus, select:focus { outline: none; border-color: rgba(30,58,95,0.35) !important; box-shadow: 0 0 0 3px rgba(30,58,95,0.06); }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/superadmin/kelola-admin"
        brandLabel="E-POKJA HUKER"
        brandSub={readOnly ? 'BNN Utama' : 'Admin BNNP/BNNK'}
        userName={namaSaya}
        userTag={readOnly ? 'Admin BNN Utama' : 'Admin BNNP/BNNK'}
        accent={readOnly ? '#ABD1C6' : GOLD}
        onLogout={logoutSidebar}
      />

      <div className="main-content-wrap" style={{ maxWidth: 1040, margin: '0 auto', padding: '1.4rem 1.5rem 0' }}>
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(240,231,213,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(30,58,95,0.1)', borderRadius: 100, padding: '10px 14px 10px 18px',
          boxShadow: '0 10px 30px -18px rgba(30,58,95,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 14.5, color: INDIGO, letterSpacing: '-0.02em' }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiShield size={14} color={CREAM} />
            </div>
            Kelola Admin
          </div>
        </nav>
      </div>

      <div className="main-content-wrap" style={{ maxWidth: 1040, margin: '0 auto', padding: '1.5rem' }}>

        {msg && (
          <div className="rise" style={{ ...msgBox, background: 'rgba(92,122,94,0.1)', border: '1px solid rgba(92,122,94,0.25)', color: SAGE }}>
            <FiCheckCircle size={14} style={{ flexShrink: 0 }} /> {msg}
          </div>
        )}
        {error && (
          <div className="rise" style={{ ...msgBox, background: '#FCEBEB', border: '1px solid #F3B8B8', color: RED }}>
            <FiAlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {readOnly && (
          <div className="rise" style={{ ...msgBox, background: 'rgba(171,209,198,0.15)', border: '1px solid rgba(47,84,73,0.2)', color: '#2F5449' }}>
            <FiShield size={14} style={{ flexShrink: 0 }} /> Admin BNN Utama hanya dapat menambahkan sesama akun BNN Utama, dan tidak dapat mengubah/menonaktifkan admin BNNP/BNNK.
          </div>
        )}

        {/* Form tambah — Admin BNNP/BNNK bisa tambah BNNP/BNNK, Admin BNN
            Utama bisa tambah sesama BNN Utama. Opsi Level di bawah dibatasi
            sesuai level yang sedang login, biar tidak salah pilih. */}
        <div style={shell} className="rise">
            <div style={{ ...core, padding: '1.5rem 1.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <FiUserPlus size={15} style={{ color: GOLD_DARK }} />
                <span style={{ fontSize: 14.5, fontWeight: 800, color: INDIGO, letterSpacing: '-0.01em' }}>Tambah Admin Baru</span>
              </div>
              <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={label}>Nama</label>
                  <input style={input} value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap" required />
                </div>
                <div>
                  <label style={label}>Email</label>
                  <input style={input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@bnn.go.id" required />
                </div>
                <div>
                  <label style={label}>Password</label>
                  <input style={input} type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 karakter" required minLength={6} />
                </div>
                <div>
                  <label style={label}>Level</label>
                  {readOnly ? (
                    <select style={input} value="BNN Utama" disabled>
                      <option value="BNN Utama">BNN Utama</option>
                    </select>
                  ) : (
                    <select style={input} value={level} onChange={e => { setLevel(e.target.value as 'BNNP/BNNK' | 'BNN Utama'); setWilayah(''); }}>
                      <option value="BNNP/BNNK">BNNP/BNNK</option>
                    </select>
                  )}
                </div>
                {!readOnly && level === 'BNNP/BNNK' && (
                  <div>
                    <label style={label}>Wilayah</label>
                    <select style={input} value={wilayah} onChange={e => setWilayah(e.target.value)} required>
                      <option value="">Pilih wilayah...</option>
                      {LOKASI_BNN_LIST.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                )}
                <button type="submit" disabled={submitting} style={{ ...btnPrimary, gridColumn: 'span 1' }} className="btn-hover">
                  <FiUserPlus size={13} /> {submitting ? 'Menambah…' : 'Tambah'}
                </button>
              </form>
            </div>
        </div>

            {/* Daftar admin */}
            <div style={{ ...shell, marginTop: 16 }} className="rise">
              <div style={{ ...core, padding: '1.5rem 1.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <FiUsers size={15} style={{ color: GOLD_DARK }} />
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: INDIGO, letterSpacing: '-0.01em' }}>Daftar Admin</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: 'rgba(30,58,95,0.06)', color: 'rgba(30,58,95,0.6)' }}>{data.length}</span>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(30,58,95,0.4)', fontSize: 13 }}>Memuat…</div>
                ) : data.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(30,58,95,0.4)', fontSize: 13 }}>Belum ada admin terdaftar.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {data.map((a, i) => {
                      const aktif = a.status.toLowerCase() === 'aktif';
                      return (
                        <div key={a.id} className="trow rise" style={{ ...rowCard, animationDelay: `${0.03 * i}s` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              {editNamaEmailId === a.id ? (
                                <div style={{ background: 'rgba(30,58,95,0.04)', borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
                                  <label style={{ ...label, marginBottom: 3 }}>Nama</label>
                                  <input style={{ ...input, marginBottom: 8 }} value={editNamaValue} onChange={e => setEditNamaValue(e.target.value)} placeholder="Nama lengkap" />
                                  <label style={{ ...label, marginBottom: 3 }}>Email</label>
                                  <input style={{ ...input, marginBottom: 8 }} type="email" value={editEmailValue} onChange={e => setEditEmailValue(e.target.value)} placeholder="admin@bnn.go.id" />
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => setEditNamaEmailId(null)} disabled={savingNamaEmail} style={{ ...btnSm, flex: 1 }} className="btn-hover">Batal</button>
                                    <button onClick={() => simpanNamaEmail(a.id)} disabled={savingNamaEmail} style={{ ...btnSm, flex: 1, background: INDIGO, color: '#fff', borderColor: INDIGO }} className="btn-hover">
                                      {savingNamaEmail ? 'Menyimpan…' : 'Simpan'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                              <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: INDIGO }}>{a.nama}</span>
                                {!readOnly && (
                                  <button onClick={() => mulaiEditNamaEmail(a)} style={iconBtnSmGhost} className="btn-hover" title="Edit nama & email">
                                    <FiEdit2 size={11} />
                                  </button>
                                )}

                                {readOnly ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: a.level === 'BNN Utama' ? GOLD : 'rgba(29,78,216,0.1)', color: a.level === 'BNN Utama' ? '#fff' : '#1D4ED8' }}>
                                    {a.level}
                                  </span>
                                ) : editLevelId === a.id ? (
                                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <select style={{ ...input, width: 110, padding: '4px 8px', fontSize: 10.5 }} value={editLevelValue}
                                      onChange={e => setEditLevelValue(e.target.value as 'BNNP/BNNK' | 'BNN Utama')}>
                                      <option value="BNNP/BNNK">BNNP/BNNK</option>
                                      <option value="BNN Utama">BNN Utama</option>
                                    </select>
                                    <button onClick={() => submitUbahLevel(a.id)} style={iconBtnSm} className="btn-hover" title="Simpan"><FiCheck size={12} /></button>
                                    <button onClick={() => setEditLevelId(null)} style={iconBtnSmGhost} className="btn-hover" title="Batal"><FiX size={12} /></button>
                                  </div>
                                ) : (
                                  <button onClick={() => { setEditLevelId(a.id); setEditLevelValue(a.level); setMsg(''); setError(''); }}
                                    className="btn-hover"
                                    style={{
                                      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, border: 'none', cursor: 'pointer',
                                      background: a.level === 'BNN Utama' ? GOLD : 'rgba(29,78,216,0.1)',
                                      color: a.level === 'BNN Utama' ? '#fff' : '#1D4ED8',
                                    }}>
                                    {a.level}
                                  </button>
                                )}

                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
                                  background: aktif ? 'rgba(92,122,94,0.12)' : 'rgba(30,58,95,0.06)',
                                  color: aktif ? SAGE : 'rgba(30,58,95,0.45)',
                                }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: aktif ? SAGE : '#9ca3af', animation: aktif ? 'pulse 2s infinite' : 'none' }} />
                                  {a.status}
                                </span>
                              </div>

                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11.5, color: 'rgba(30,58,95,0.55)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiMail size={11} /> {a.email}</span>

                                {a.level === 'BNN Utama' ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(30,58,95,0.4)' }}><FiMapPin size={11} /> Semua wilayah</span>
                                ) : readOnly ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiMapPin size={11} /> {a.wilayah || 'Belum diatur'}</span>
                                ) : editWilayahId === a.id ? (
                                  <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <select style={{ ...input, width: 120, padding: '3px 7px', fontSize: 10.5 }} value={editWilayahValue}
                                      onChange={e => setEditWilayahValue(e.target.value)}>
                                      <option value="">Pilih...</option>
                                      {LOKASI_BNN_LIST.map(w => <option key={w} value={w}>{w}</option>)}
                                    </select>
                                    <button onClick={() => submitUbahWilayah(a.id)} style={iconBtnSm} className="btn-hover" title="Simpan"><FiCheck size={11} /></button>
                                    <button onClick={() => setEditWilayahId(null)} style={iconBtnSmGhost} className="btn-hover" title="Batal"><FiX size={11} /></button>
                                  </span>
                                ) : (
                                  <button onClick={() => { setEditWilayahId(a.id); setEditWilayahValue(a.wilayah || ''); setMsg(''); setError(''); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: FONT, fontSize: 11.5, color: a.wilayah ? 'rgba(30,58,95,0.55)' : RED, textDecoration: 'underline dotted' }}>
                                    <FiMapPin size={11} /> {a.wilayah || 'Belum diatur'}
                                  </button>
                                )}

                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiCalendar size={11} /> {a.tanggalDibuat}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiClock size={11} /> {a.terakhirLogin || '—'}</span>
                              </div>
                              </>
                              )}
                            </div>

                            {!readOnly && (
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button onClick={() => kirimAksesEmail(a.id)} disabled={kirimEmailLoadingId === a.id} style={{ ...btnSm, background: '#212842', color: '#fff', borderColor: '#212842', display: 'flex', alignItems: 'center', gap: 5 }} className="btn-hover">
                                {kirimEmailLoadingId === a.id ? (
                                  <>
                                    <span style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                                    Mengirim…
                                  </>
                                ) : (
                                  <>
                                    <FiMail size={11} /> Kirim Email Akses dan Password
                                  </>
                                )}
                              </button>
                            </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const shell: React.CSSProperties = { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(30,58,95,0.07)', borderRadius: 24, padding: 7, boxShadow: '0 1px 2px rgba(30,58,95,0.04), 0 30px 60px -38px rgba(30,58,95,0.18)' };
const core: React.CSSProperties = { background: '#fff', borderRadius: 18, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)' };
const rowCard: React.CSSProperties = { background: '#FBF9F4', border: '1px solid rgba(30,58,95,0.06)', borderRadius: 16, padding: '14px 16px' };
const label: React.CSSProperties = { display: 'block', fontSize: 10.5, color: 'rgba(30,58,95,0.5)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' };
const input: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid rgba(30,58,95,0.12)', fontSize: 12.5, fontFamily: FONT, boxSizing: 'border-box', background: '#fff', color: INDIGO, transition: 'all 0.2s ease' };
const btnPrimary: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 18px', borderRadius: 100, border: 'none', background: INDIGO, color: CREAM, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap', height: 38, boxShadow: '0 8px 18px -8px rgba(30,58,95,0.5)' };
const btnSm: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 100, border: '1px solid rgba(30,58,95,0.12)', background: '#fff', color: '#3a4a5c', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT };
const iconBtnSm: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', border: 'none', background: SAGE, color: '#fff', cursor: 'pointer' };
const iconBtnSmGhost: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(30,58,95,0.12)', background: 'transparent', color: 'rgba(30,58,95,0.4)', cursor: 'pointer' };
const msgBox: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, padding: '11px 15px', borderRadius: 14, marginBottom: 14 };