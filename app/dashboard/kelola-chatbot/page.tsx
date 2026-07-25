'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar, { SidebarItem } from '@/components/Sidebar';
import {
  FiGrid, FiMessageCircle, FiInbox, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck,
  FiEye, FiEyeOff, FiHelpCircle, FiCalendar, FiKey, FiFolder, FiActivity,
  FiUsers, FiList, FiArchive, FiFileText, FiShield, FiMessageSquare, FiDroplet,
} from 'react-icons/fi';

interface FaqItem {
  id: string; pertanyaan: string; jawaban: string; idLanjutan: string[];
  tampilAwal: boolean; aktif: boolean; urutan: number;
}
interface PertanyaanItem {
  id: string; pertanyaan: string; status: string; idFaqTerkait: string;
  tglDiajukan: string; diprosesOleh: string; tglDiproses: string; sumberHalaman: string;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const INDIGO = '#1E3A5F';
const CREAM = '#FAF8F0';

export default function KelolaChatbotPage() {
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [level, setLevel] = useState('');
  const [checking, setChecking] = useState(true);
  const [saranBelumDibaca, setSaranBelumDibaca] = useState(0);
  const [tab, setTab] = useState<'faq' | 'masuk'>('faq');

  const [faqList, setFaqList] = useState<FaqItem[]>([]);
  const [loadingFaq, setLoadingFaq] = useState(true);
  const [pertanyaanList, setPertanyaanList] = useState<PertanyaanItem[]>([]);
  const [loadingPertanyaan, setLoadingPertanyaan] = useState(true);

  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fPertanyaan, setFPertanyaan] = useState('');
  const [fJawaban, setFJawaban] = useState('');
  const [fTampilAwal, setFTampilAwal] = useState(false);
  const [fLanjutan, setFLanjutan] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadFaq = useCallback(() => {
    setLoadingFaq(true);
    fetch('/api/chatbot/faq?semua=1')
      .then(r => r.json())
      .then(d => setFaqList((d.data || []).sort((a: FaqItem, b: FaqItem) => a.urutan - b.urutan)))
      .catch(() => setError('Gagal memuat FAQ.'))
      .finally(() => setLoadingFaq(false));
  }, []);

  const loadPertanyaan = useCallback(() => {
    setLoadingPertanyaan(true);
    fetch('/api/chatbot/pertanyaan-masuk')
      .then(r => r.json())
      .then(d => setPertanyaanList(d.data || []))
      .catch(() => setError('Gagal memuat pertanyaan masuk.'))
      .finally(() => setLoadingPertanyaan(false));
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => {
        if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
        setNamaAdmin(u.nama || u.email || 'Admin');
        setLevel(String(u.level || 'bnnp_bnnk'));
        setChecking(false);
        loadFaq(); loadPertanyaan();
        fetch('/api/masukan-saran')
          .then(r => r.json())
          .then(d => setSaranBelumDibaca(d.ringkasan?.belumDibaca || 0))
          .catch(() => {});
      })
      .catch(() => { window.location.href = '/login'; });
  }, [loadFaq, loadPertanyaan]);

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  const bukaForm = (item?: FaqItem) => {
    if (item) {
      setEditId(item.id); setFPertanyaan(item.pertanyaan); setFJawaban(item.jawaban);
      setFTampilAwal(item.tampilAwal); setFLanjutan(item.idLanjutan);
    } else {
      setEditId(null); setFPertanyaan(''); setFJawaban(''); setFTampilAwal(false); setFLanjutan([]);
    }
    setFormTerbuka(true);
  };

  const tutupForm = () => { setFormTerbuka(false); setEditId(null); };

  const toggleLanjutan = (id: string) => {
    setFLanjutan(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const simpanFaq = async () => {
    setError(''); setMsg('');
    if (!fPertanyaan.trim() || !fJawaban.trim()) { setError('Pertanyaan dan jawaban wajib diisi.'); return; }
    setSaving(true);
    try {
      if (editId) {
        const res = await fetch('/api/chatbot/faq', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, fields: { pertanyaan: fPertanyaan, jawaban: fJawaban, tampilAwal: fTampilAwal, idLanjutan: fLanjutan } }),
        });
        const d = await res.json();
        if (!res.ok) { setError(d.message || 'Gagal menyimpan.'); return; }
        setMsg(d.message);
      } else {
        const res = await fetch('/api/chatbot/faq', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pertanyaan: fPertanyaan, jawaban: fJawaban, tampilAwal: fTampilAwal, idLanjutan: fLanjutan, urutan: faqList.length }),
        });
        const d = await res.json();
        if (!res.ok) { setError(d.message || 'Gagal menyimpan.'); return; }
        setMsg(d.message);
      }
      tutupForm();
      loadFaq();
    } catch { setError('Terjadi kesalahan koneksi.'); }
    finally { setSaving(false); }
  };

  const toggleAktif = async (item: FaqItem) => {
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/chatbot/faq', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, fields: { aktif: !item.aktif } }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengubah status.'); return; }
      loadFaq();
    } catch { setError('Terjadi kesalahan koneksi.'); }
  };

  const hapusFaq = async (id: string) => {
    if (!confirm('Nonaktifkan FAQ ini? (tidak akan tampil lagi di chatbot, tapi tetap tersimpan)')) return;
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/chatbot/faq', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal menghapus.'); return; }
      loadFaq();
    } catch { setError('Terjadi kesalahan koneksi.'); }
  };

  const jadikanFaq = (item: PertanyaanItem) => {
    setTab('faq');
    setEditId(null);
    setFPertanyaan(item.pertanyaan);
    setFJawaban('');
    setFTampilAwal(false);
    setFLanjutan([]);
    setFormTerbuka(true);
    fetch('/api/chatbot/pertanyaan-masuk', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: 'Dijawab' }),
    }).then(loadPertanyaan).catch(() => {});
  };

  const abaikanPertanyaan = async (id: string) => {
    try {
      await fetch('/api/chatbot/pertanyaan-masuk', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Diabaikan' }),
      });
      loadPertanyaan();
    } catch { setError('Terjadi kesalahan koneksi.'); }
  };

  const sidebarItems: SidebarItem[] = [
    { href: '/dashboard/admin', icon: <FiGrid size={17} />, label: 'Dashboard' },
    { href: '/dashboard/rencana', icon: <FiCalendar size={17} />, label: 'E-Planning' },
    { href: '/dashboard/pengajuan', icon: <FiInbox size={17} />, label: 'Kelola Pengajuan' },
    { href: '/dashboard/superadmin/generate-kode', icon: <FiKey size={17} />, label: 'Generate Kode' },
    { href: '/dashboard/dokumen', icon: <FiFolder size={17} />, label: 'Daftar Dokumen' },
    { href: '/dashboard/dokumen-basah', icon: <FiDroplet size={17} />, label: 'Dokumen Basah' },
    { href: '/dashboard/kelola-kegiatan', icon: <FiActivity size={17} />, label: 'Kelola Kegiatan' },
    { href: '/dashboard/kontak', icon: <FiUsers size={17} />, label: 'Kontak Mitra' },
    { href: '/dashboard/dokumen/extract-poin', icon: <FiList size={17} />, label: 'Extract Poin Publik' },
    { href: '/dashboard/arsip', icon: <FiArchive size={17} />, label: 'Arsip Dokumen' },
    { href: '/dashboard/superadmin/laporan', icon: <FiFileText size={17} />, label: 'Laporan' },
    { href: '/dashboard/kelola-chatbot', icon: <FiMessageCircle size={17} />, label: 'Kelola Chatbot', notifCount: pertanyaanList.filter(p => p.status === 'Menunggu').length },
    { href: '/dashboard/kotak-saran', icon: <FiMessageSquare size={17} />, label: 'Kotak Saran', notifCount: saranBelumDibaca },
    ...(level === 'bnnp_bnnk' ? [{ href: '/dashboard/superadmin/kelola-admin', icon: <FiShield size={17} />, label: 'Kelola Admin' }] : []),
  ];

  if (checking) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#FCFAF4,#F5F1E8)', fontFamily: FONT, color: '#64748b', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(30,58,95,0.1)', borderTop: `3px solid ${INDIGO}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13 }}>Memuat...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const menunggu = pertanyaanList.filter(p => p.status === 'Menunggu');

  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, background: 'radial-gradient(1100px 520px at 85% -8%, rgba(30,58,95,0.05) 0%, rgba(30,58,95,0) 55%), linear-gradient(180deg,#FCFAF4,#F5F1E8)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .fld { animation: fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        textarea, input { font-family: ${FONT}; }
        @media (min-width: 901px) {
          .main-content-wrap { margin-left: 236px !important; width: calc(100% - 236px) !important; box-sizing: border-box !important; }
        }
      `}</style>

      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard/kelola-chatbot"
        brandLabel="E-POKJA HUKER"
        brandSub="Admin BNNP/BNNK"
        navSectionTitle="Navigasi"
        userName={namaAdmin}
        userTag="Admin"
        accent={INDIGO}
        onLogout={logout}
      />

      <div className="main-content-wrap" style={{ maxWidth: 900, margin: '0 auto', padding: '1.4rem 1.5rem 3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }} className="fld">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: INDIGO, margin: 0 }}>Kelola Chatbot</h1>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 0' }}>Atur pertanyaan & jawaban yang muncul di asisten chatbot</p>
          </div>
          {tab === 'faq' && (
            <button onClick={() => bukaForm()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: 'none', background: INDIGO, color: CREAM, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }} className="btn-hover">
              <FiPlus size={14} /> Tambah FAQ
            </button>
          )}
        </div>

        {msg && <div style={{ fontSize: 12, color: '#0a5c47', background: 'rgba(10,92,71,0.08)', padding: '10px 14px', borderRadius: 10, marginBottom: 14 }} className="fld">{msg}</div>}
        {error && <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', padding: '10px 14px', borderRadius: 10, marginBottom: 14 }} className="fld">{error}</div>}

        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }} className="fld">
          <button onClick={() => setTab('faq')} style={{
            padding: '9px 18px', borderRadius: 100, border: tab === 'faq' ? 'none' : '1px solid rgba(30,58,95,0.1)',
            background: tab === 'faq' ? INDIGO : '#fff', color: tab === 'faq' ? CREAM : '#334155',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <FiHelpCircle size={13} /> Daftar FAQ ({faqList.length})
          </button>
          <button onClick={() => setTab('masuk')} style={{
            padding: '9px 18px', borderRadius: 100, border: tab === 'masuk' ? 'none' : '1px solid rgba(30,58,95,0.1)',
            background: tab === 'masuk' ? INDIGO : '#fff', color: tab === 'masuk' ? CREAM : '#334155',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <FiInbox size={13} /> Pertanyaan Masuk
            {menunggu.length > 0 && (
              <span style={{ fontSize: 9.5, fontWeight: 800, background: tab === 'masuk' ? 'rgba(250,248,240,0.25)' : '#DC2626', color: tab === 'masuk' ? CREAM : '#fff', padding: '1px 7px', borderRadius: 100 }}>{menunggu.length}</span>
            )}
          </button>
        </div>

        {formTerbuka && (
          <div style={{ background: '#fff', borderRadius: 18, padding: '18px 20px', border: '1.5px solid rgba(30,58,95,0.15)', marginBottom: 18 }} className="fld">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: INDIGO }}>{editId ? 'Edit FAQ' : 'Tambah FAQ Baru'}</span>
              <button onClick={tutupForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><FiX size={17} /></button>
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>Pertanyaan</label>
            <input value={fPertanyaan} onChange={e => setFPertanyaan(e.target.value)} placeholder='Misal: "Apa itu MOU?"'
              style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid rgba(30,58,95,0.12)', fontSize: 12.5, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />

            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>Jawaban</label>
            <textarea value={fJawaban} onChange={e => setFJawaban(e.target.value)} rows={4} placeholder="Jelaskan jawabannya di sini..."
              style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid rgba(30,58,95,0.12)', fontSize: 12.5, marginBottom: 12, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', marginBottom: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={fTampilAwal} onChange={e => setFTampilAwal(e.target.checked)} />
              Tampilkan sebagai pilihan awal saat chatbot dibuka
            </label>

            {faqList.filter(f => f.id !== editId && f.aktif).length > 0 && (
              <>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 7 }}>Pertanyaan lanjutan (opsional — muncul setelah jawaban ini)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {faqList.filter(f => f.id !== editId && f.aktif).map(f => (
                    <button key={f.id} type="button" onClick={() => toggleLanjutan(f.id)} style={{
                      padding: '6px 12px', borderRadius: 100, fontSize: 11, cursor: 'pointer', fontFamily: FONT,
                      border: fLanjutan.includes(f.id) ? 'none' : '1px solid rgba(30,58,95,0.15)',
                      background: fLanjutan.includes(f.id) ? INDIGO : '#fff',
                      color: fLanjutan.includes(f.id) ? CREAM : '#334155', fontWeight: 600,
                    }}>
                      {f.pertanyaan}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button onClick={simpanFaq} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#0a5c47', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }} className="btn-hover">
              <FiCheck size={14} /> {saving ? 'Menyimpan...' : 'Simpan FAQ'}
            </button>
          </div>
        )}

        {tab === 'faq' && (
          loadingFaq ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: 13 }}>Memuat FAQ...</div>
          ) : faqList.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 18, padding: '3rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }}>
              <FiHelpCircle size={28} style={{ color: '#cbd5e1', marginBottom: 10 }} />
              <div style={{ fontSize: 13, color: '#64748b' }}>Belum ada FAQ. Klik &quot;Tambah FAQ&quot; untuk mulai.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {faqList.map(f => (
                <div key={f.id} style={{ background: '#fff', borderRadius: 14, padding: '13px 16px', border: '1px solid rgba(30,58,95,0.06)', opacity: f.aktif ? 1 : 0.5 }} className="fld">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: INDIGO }}>{f.pertanyaan}</span>
                        {f.tampilAwal && <span style={{ fontSize: 9, fontWeight: 700, background: '#DBEAFE', color: '#1D4ED8', padding: '1px 8px', borderRadius: 100 }}>Pilihan Awal</span>}
                        {!f.aktif && <span style={{ fontSize: 9, fontWeight: 700, background: '#FEE2E2', color: '#991B1B', padding: '1px 8px', borderRadius: 100 }}>Nonaktif</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.5 }}>{f.jawaban}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button onClick={() => toggleAktif(f)} title={f.aktif ? 'Nonaktifkan' : 'Aktifkan'} style={{ padding: 7, borderRadius: 8, border: '1px solid rgba(30,58,95,0.1)', background: '#fff', cursor: 'pointer', color: '#64748b' }} className="btn-hover">
                        {f.aktif ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                      </button>
                      <button onClick={() => bukaForm(f)} title="Edit" style={{ padding: 7, borderRadius: 8, border: '1px solid rgba(30,58,95,0.1)', background: '#fff', cursor: 'pointer', color: '#1D4ED8' }} className="btn-hover">
                        <FiEdit2 size={13} />
                      </button>
                      <button onClick={() => hapusFaq(f.id)} title="Nonaktifkan permanen" style={{ padding: 7, borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)', background: '#fff', cursor: 'pointer', color: '#DC2626' }} className="btn-hover">
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'masuk' && (
          loadingPertanyaan ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: 13 }}>Memuat pertanyaan...</div>
          ) : pertanyaanList.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 18, padding: '3rem', textAlign: 'center', border: '1px solid rgba(30,58,95,0.06)' }}>
              <FiInbox size={28} style={{ color: '#cbd5e1', marginBottom: 10 }} />
              <div style={{ fontSize: 13, color: '#64748b' }}>Belum ada pertanyaan yang diajukan pengguna chatbot.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pertanyaanList.map(p => (
                <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: '13px 16px', border: '1px solid rgba(30,58,95,0.06)' }} className="fld">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: INDIGO, marginBottom: 4 }}>{p.pertanyaan}</div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Diajukan {p.tglDiajukan}{p.sumberHalaman ? ` · dari ${p.sumberHalaman}` : ''}</div>
                      {p.diprosesOleh && <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Diproses oleh {p.diprosesOleh} pada {p.tglDiproses}</div>}
                    </div>
                    {p.status === 'Menunggu' ? (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => abaikanPertanyaan(p.id)} style={{ padding: '7px 13px', borderRadius: 9, border: '1px solid rgba(220,38,38,0.2)', background: '#FCEBEB', color: '#A32D2D', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 5 }} className="btn-hover">
                          <FiX size={12} /> Abaikan
                        </button>
                        <button onClick={() => jadikanFaq(p)} style={{ padding: '7px 13px', borderRadius: 9, border: 'none', background: '#0a5c47', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 5 }} className="btn-hover">
                          <FiPlus size={12} /> Jadikan FAQ
                        </button>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '4px 11px', borderRadius: 100, flexShrink: 0,
                        background: p.status === 'Dijawab' ? 'rgba(10,92,71,0.1)' : '#f1f5f9',
                        color: p.status === 'Dijawab' ? '#0a5c47' : '#64748b',
                      }}>
                        {p.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}