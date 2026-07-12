'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  FaUserPlus, FaFileExcel, FaDownload, FaTrash,
  FaCheckCircle, FaTimesCircle, FaArrowLeft,
} from 'react-icons/fa';
import { FiUpload, FiSave, FiPlus, FiUsers, FiArrowUpRight } from 'react-icons/fi';

const INDIGO = '#212842';
const CREAM = '#F0E7D5';
const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";

const LOKASI_LIST = ['BNNP Sulsel', 'BNNK Palopo', 'BNNK Toraja', 'BNNK Bone', 'BNNK Sidrap'];

interface PendingItem {
  id: string;
  nip: string;
  lokasi: string;
  valid: boolean;
  error: string;
  source: 'manual' | 'excel';
}

function genId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function PembuatanAkunPegawaiPage() {
  const [role, setRole] = useState('');
  const [existingNip, setExistingNip] = useState<Set<string>>(new Set());
  const [totalPegawai, setTotalPegawai] = useState(0);
  const [pending, setPending] = useState<PendingItem[]>([]);

  const [manualNip, setManualNip] = useState('');
  const [manualLokasi, setManualLokasi] = useState('');
  const [manualError, setManualError] = useState('');

  const [parsingExcel, setParsingExcel] = useState(false);
  const [excelError, setExcelError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [resultError, setResultError] = useState('');

  const loadExisting = useCallback(() => {
    fetch('/api/hukum/pegawai')
      .then(r => r.json())
      .then(d => {
        const list = d.data || [];
        setExistingNip(new Set(list.map((x: any) => String(x.nip))));
        setTotalPegawai(list.length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin', 'superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    loadExisting();
  }, [loadExisting]);

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

  const tambahManual = () => {
    setManualError('');
    const nip = manualNip.trim();
    if (!nip) { setManualError('NIP/NRP wajib diisi.'); return; }
    if (!manualLokasi) { setManualError('Pilih lokasi BNN.'); return; }
    if (existingNip.has(nip)) { setManualError('NIP ini sudah terdaftar di sistem.'); return; }
    if (pending.some(p => p.nip === nip)) { setManualError('NIP ini sudah ada di daftar pratinjau.'); return; }

    setPending(prev => [...prev, {
      id: genId(), nip, lokasi: manualLokasi, valid: true, error: '', source: 'manual',
    }]);
    setManualNip('');
    setManualLokasi('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setExcelError('');
    setParsingExcel(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/hukum/pegawai/parse', { method: 'POST', body: formData });
      const d = await res.json();
      if (!res.ok) { setExcelError(d.message || 'Gagal membaca file.'); return; }

      const rows: PendingItem[] = (d.data || []).map((r: any) => ({
        id: genId(), nip: r.nip, lokasi: r.lokasi, valid: r.valid, error: r.error, source: 'excel',
      }));
      setPending(prev => [...prev, ...rows]);
    } catch {
      setExcelError('Terjadi kesalahan saat membaca file.');
    } finally {
      setParsingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hapusItem = (id: string) => setPending(prev => prev.filter(p => p.id !== id));
  const bersihkanSemua = () => setPending([]);

  const validCount = pending.filter(p => p.valid).length;
  const invalidCount = pending.length - validCount;

  const simpanSemua = async () => {
    const validItems = pending.filter(p => p.valid);
    if (validItems.length === 0) return;

    setSaving(true); setResultMsg(''); setResultError('');
    try {
      const res = await fetch('/api/hukum/pegawai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: validItems.map(p => ({ nip: p.nip, lokasi: p.lokasi })) }),
      });
      const d = await res.json();
      if (!res.ok) { setResultError(d.message || 'Gagal menyimpan.'); return; }

      setResultMsg(d.message);
      setPending([]);
      loadExisting();
    } catch {
      setResultError('Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px);filter:blur(5px)} to{opacity:1;transform:none;filter:blur(0)} }
        .fld { animation: fadeUp 0.7s cubic-bezier(0.32,0.72,0,1) both; }
        .btn-hover { transition: all 0.35s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover:not(:disabled) { transform: translateY(-2px); }
        .btn-hover:active:not(:disabled) { transform: scale(0.97); }
        .arrow-circ { transition: transform 0.4s cubic-bezier(0.32,0.72,0,1); }
        .btn-hover:hover .arrow-circ { transform: translate(2px,-2px) scale(1.08); }
        input::placeholder { color: rgba(33,40,66,0.3); }
        .split-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 4rem; }
        @media (max-width: 900px) {
          .split-grid { grid-template-columns: 1fr; gap: 2rem; }
          .split-left { position: static !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>

        <a href={backUrl} className="btn-hover fld" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600,
          color: 'rgba(33,40,66,0.55)', textDecoration: 'none', marginBottom: 40,
        }}>
          <FaArrowLeft size={11} /> Dashboard
        </a>

        <div className="split-grid">
          {/* ── KIRI: Editorial heading, sticky di desktop ── */}
          <div className="split-left fld" style={{ position: 'sticky', top: 40, alignSelf: 'start' }}>
            <div style={{
              display: 'inline-block', fontSize: 10, color: INDIGO, textTransform: 'uppercase',
              letterSpacing: '0.24em', fontWeight: 700, background: 'rgba(33,40,66,0.06)',
              padding: '7px 16px', borderRadius: 100, marginBottom: 22,
            }}>
              Modul Penegak Hukum
            </div>
            <h1 style={{
              fontSize: 44, fontWeight: 900, color: INDIGO, letterSpacing: '-0.03em',
              lineHeight: 1.02, margin: '0 0 20px',
            }}>
              Pembuatan<br />Akun Pegawai
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(33,40,66,0.6)', lineHeight: 1.75, maxWidth: 380, marginBottom: 32 }}>
              Daftarkan pegawai BNN satu-per-satu, atau impor sekaligus lewat berkas Excel. Semua entri masuk ke pratinjau lebih dulu — tidak ada yang tersimpan tanpa konfirmasi.
            </p>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 20px',
              borderRadius: 18, background: 'rgba(33,40,66,0.05)', border: '1px solid rgba(33,40,66,0.08)',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, background: INDIGO,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: CREAM, flexShrink: 0,
              }}>
                <FiUsers size={16} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: INDIGO, letterSpacing: '-0.02em' }}>{totalPegawai}</div>
                <div style={{ fontSize: 10.5, color: 'rgba(33,40,66,0.5)', fontWeight: 600 }}>Pegawai Terdaftar</div>
              </div>
            </div>
          </div>

          {/* ── KANAN: area fungsional ── */}
          <div>
            {resultMsg && (
              <div style={{ ...msgBox('#0a5c47', 'rgba(10,92,71,0.08)'), marginBottom: 16 }} className="fld">{resultMsg}</div>
            )}
            {resultError && (
              <div style={{ ...msgBox('#A32D2D', 'rgba(163,45,45,0.08)'), marginBottom: 16 }} className="fld">{resultError}</div>
            )}

            {/* Tambah manual — double bezel */}
            <div style={outerShell} className="fld">
              <div style={{ ...innerCore, padding: '1.5rem 1.6rem' }}>
                <div style={cardHeader}><FaUserPlus size={13} /> Tambah Manual</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    style={{ ...inputStyle, flex: 1, minWidth: 160 }}
                    placeholder="NIP / NRP"
                    value={manualNip}
                    onChange={e => setManualNip(e.target.value)}
                  />
                  <select
                    style={{ ...inputStyle, flex: 1, minWidth: 150 }}
                    value={manualLokasi}
                    onChange={e => setManualLokasi(e.target.value)}
                  >
                    <option value="">Pilih Lokasi BNN</option>
                    {LOKASI_LIST.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <button onClick={tambahManual} className="btn-hover" style={btnPrimary}>
                    <FiPlus size={13} /> Tambah
                  </button>
                </div>
                {manualError && <div style={{ fontSize: 11.5, color: '#A32D2D', marginTop: 10 }}>{manualError}</div>}
              </div>
            </div>

            {/* Upload Excel — double bezel */}
            <div style={{ ...outerShell, marginTop: 16 }} className="fld">
              <div style={{ ...innerCore, padding: '1.5rem 1.6rem' }}>
                <div style={cardHeader}><FaFileExcel size={13} /> Impor dari Excel</div>
                <p style={{ fontSize: 11.5, color: 'rgba(33,40,66,0.5)', margin: '0 0 14px', lineHeight: 1.6 }}>
                  Kolom: <strong style={{ color: INDIGO }}>No, NIP/NRP Pegawai, Lokasi BNN</strong>. Lokasi harus salah satu dari daftar yang tersedia.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <a href="/api/hukum/pegawai/template" className="btn-hover" style={btnGhost}>
                    <FaDownload size={11} /> Unduh Template
                  </a>
                  <label className="btn-hover" style={{ ...btnGhost, cursor: 'pointer' }}>
                    <FiUpload size={13} /> {parsingExcel ? 'Membaca file...' : 'Upload Excel'}
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} disabled={parsingExcel} />
                  </label>
                  {fileName && <span style={{ fontSize: 11.5, color: 'rgba(33,40,66,0.45)' }}>{fileName}</span>}
                </div>
                {excelError && <div style={{ fontSize: 11.5, color: '#A32D2D', marginTop: 10 }}>{excelError}</div>}
              </div>
            </div>

            {/* Preview — double bezel */}
            <div style={{ ...outerShell, marginTop: 16 }} className="fld">
              <div style={{ ...innerCore, padding: '1.5rem 1.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={cardHeader}>Pratinjau ({pending.length})</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                    <span style={{ color: '#0a5c47', display: 'flex', alignItems: 'center', gap: 4 }}><FaCheckCircle size={10} />{validCount} valid</span>
                    {invalidCount > 0 && <span style={{ color: '#A32D2D', display: 'flex', alignItems: 'center', gap: 4 }}><FaTimesCircle size={10} />{invalidCount} bermasalah</span>}
                  </div>
                </div>

                {pending.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.4rem 1rem', color: 'rgba(33,40,66,0.3)', fontSize: 12.5 }}>
                    Belum ada data. Tambah manual atau upload Excel di atas.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 360, overflowY: 'auto' }}>
                      {pending.map(p => (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
                          borderRadius: 12, background: p.valid ? 'rgba(33,40,66,0.03)' : 'rgba(163,45,45,0.06)',
                          border: `1px solid ${p.valid ? 'rgba(33,40,66,0.07)' : 'rgba(163,45,45,0.18)'}`,
                        }}>
                          {p.valid ? <FaCheckCircle size={12} color="#0a5c47" style={{ flexShrink: 0 }} /> : <FaTimesCircle size={12} color="#A32D2D" style={{ flexShrink: 0 }} />}
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: INDIGO, minWidth: 140 }}>{p.nip || '—'}</span>
                          <span style={{ fontSize: 11.5, color: 'rgba(33,40,66,0.55)', flex: 1 }}>{p.lokasi || '—'}</span>
                          {!p.valid && <span style={{ fontSize: 10.5, color: '#A32D2D' }}>{p.error}</span>}
                          <span style={{ fontSize: 9, color: 'rgba(33,40,66,0.3)', textTransform: 'uppercase', fontWeight: 700 }}>{p.source}</span>
                          <button onClick={() => hapusItem(p.id)} className="btn-hover" style={miniDeleteBtn} title="Hapus">
                            <FaTrash size={10} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                      <button onClick={bersihkanSemua} className="btn-hover" style={btnGhost}>Bersihkan Semua</button>
                      <button onClick={simpanSemua} disabled={saving || validCount === 0} className="btn-hover" style={{ ...btnPrimary, flex: 1, justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FiSave size={13} /> {saving ? 'Menyimpan...' : `Simpan ${validCount} Akun`}
                        </span>
                        <span className="arrow-circ" style={{
                          width: 26, height: 26, borderRadius: '50%', background: 'rgba(240,231,213,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <FiArrowUpRight size={13} />
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const outerShell: React.CSSProperties = {
  background: 'rgba(33,40,66,0.03)', border: '1px solid rgba(33,40,66,0.08)',
  borderRadius: 26, padding: 6,
};
const innerCore: React.CSSProperties = {
  background: '#fff', borderRadius: 20,
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), 0 1px 2px rgba(33,40,66,0.03)',
};
const cardHeader: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 700, color: INDIGO, textTransform: 'uppercase',
  letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
};
const inputStyle: React.CSSProperties = {
  padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(33,40,66,0.1)',
  background: 'rgba(33,40,66,0.02)', color: INDIGO, fontSize: 12.5, fontFamily: FONT, outline: 'none',
};
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px',
  borderRadius: 100, border: 'none', background: INDIGO, color: CREAM,
  fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
};
const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
  borderRadius: 100, border: '1px solid rgba(33,40,66,0.12)', background: 'rgba(33,40,66,0.03)',
  color: INDIGO, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, textDecoration: 'none',
};
const miniDeleteBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(163,45,45,0.2)',
  background: 'rgba(163,45,45,0.06)', color: '#A32D2D', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
const msgBox = (color: string, bg: string): React.CSSProperties => ({
  fontSize: 12.5, color, background: bg, padding: '11px 16px', borderRadius: 14,
});