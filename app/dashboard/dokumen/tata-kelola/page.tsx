'use client';

import { useEffect, useState, useCallback } from 'react';
import { STATUS_DOKUMEN, STATUS_COLOR } from '@/lib/constants';

// Daftar status untuk dropdown edit (8 tahap)
const STATUS_LIST: string[] = [...STATUS_DOKUMEN];

interface DokumenItem {
  id: string; jenis: string; judul: string; namaMitra: string;
  tglDibuat: string; tglBerlaku: string; tglBerakhir: string;
  durasi: string; status: string; kode: string; kodeExpire: string;
  docsId: string; docsUrl: string; folderId: string; dibuatOleh: string;
  catatan?: string;
}

// statuses bertipe string[] eksplisit supaya .includes() tidak jadi never[]
const STATUS_FILTER: { key: string; label: string; statuses: string[] }[] = [
  { key: 'draft',       label: 'Draft',       statuses: ['Draft'] },
  { key: 'proses',      label: 'Proses',      statuses: ['Dalam Proses'] },
  { key: 'berlangsung', label: 'Berlangsung', statuses: ['Selesai', 'Kegiatan Akan Berlangsung', 'Kegiatan Berlangsung'] },
  { key: 'selesai',     label: 'Selesai',     statuses: ['Kegiatan Selesai', 'MOU/PKS Berlaku', 'Kedaluwarsa'] },
];

// Poin kerja sama yang diambil dari judul/deskripsi dokumen (simulasi preview)
function generatePreviewPoin(d: DokumenItem): string[] {
  return [
    `Jenis kerja sama: ${d.jenis === 'MOU' ? 'Memorandum of Understanding' : 'Perjanjian Kerja Sama'}`,
    `Mitra: ${d.namaMitra}`,
    `Masa berlaku: ${d.tglBerlaku} s.d. ${d.tglBerakhir} (${d.durasi} tahun)`,
    `Dibuat oleh: ${d.dibuatOleh}`,
    d.catatan ? `Catatan: ${d.catatan}` : `Perihal: ${d.judul}`,
  ];
}

export default function TataKelolaPage() {
  const [role, setRole]         = useState('');
  const [data, setData]         = useState<DokumenItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [msg, setMsg]           = useState('');
  const [search, setSearch]     = useState('');
  const [activeFilter, setActiveFilter] = useState('draft');
  const [expandedMitra, setExpandedMitra] = useState<Set<string>>(new Set());
  const [hoverId, setHoverId]   = useState<string | null>(null);

  // Edit modal
  const [editItem, setEditItem]     = useState<DokumenItem | null>(null);
  const [eStatus, setEStatus]       = useState('');
  const [eCatatan, setECatatan]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/superadmin/generate-kode')
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat dokumen.'); setLoading(false); });
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (!['admin','superadmin'].includes(u.role)) { window.location.href = '/login'; return; }
    setRole(u.role);
    load();
  }, [load]);

  const backUrl = role === 'superadmin' ? '/dashboard/superadmin' : '/dashboard/admin';

  // Filter berdasarkan tab aktif + search
  const activeStatuses: string[] = STATUS_FILTER.find(f => f.key === activeFilter)?.statuses ?? [];
  const filtered = data.filter(d => {
    const matchStatus = activeStatuses.includes(d.status);
    const matchSearch = !search ||
      d.namaMitra?.toLowerCase().includes(search.toLowerCase()) ||
      d.judul?.toLowerCase().includes(search.toLowerCase()) ||
      d.kode?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Group by mitra
  const grouped = filtered.reduce((acc, d) => {
    if (!acc[d.namaMitra]) acc[d.namaMitra] = [];
    acc[d.namaMitra].push(d);
    return acc;
  }, {} as Record<string, DokumenItem[]>);

  // Auto expand semua mitra
  useEffect(() => {
    setExpandedMitra(new Set(Object.keys(grouped)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, search, data.length]);

  const openEdit = (d: DokumenItem) => {
    setEditItem(d); setEStatus(d.status); setECatatan(d.catatan || '');
    setMsg(''); setError('');
  };

  const submitEdit = async () => {
    if (!editItem) return;
    setSubmitting(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editItem.id, fields: { status: eStatus, catatan: eCatatan } }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }
      setMsg(d.message); setEditItem(null); load();
    } catch { setError('Terjadi kesalahan.'); }
    finally { setSubmitting(false); }
  };

  const hapus = async (id: string, judul: string) => {
    if (!confirm(`Hapus "${judul}"?\nAkan menghapus dari Sheets, Docs, dan Drive.`)) return;
    try {
      const res = await fetch('/api/superadmin/generate-kode', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal.'); return; }
      setMsg(d.message); load();
    } catch { setError('Terjadi kesalahan.'); }
  };

  const mitraKeys = Object.keys(grouped).sort();

  // Hitung jumlah per filter
  const countPerFilter = STATUS_FILTER.map(f => ({
    ...f,
    count: data.filter(d => f.statuses.includes(d.status)).length,
  }));

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f5f5', fontFamily:'sans-serif', color:'#6b7280', fontSize:13 }}>
      Memuat tata kelola...
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:'sans-serif' }}>
      <nav style={navStyle}>
        <a href={backUrl} style={backLink}>← Dashboard</a>
        <div style={{ fontWeight:600, fontSize:14 }}>Tata Kelola Kerja Sama</div>
        <a href="/dashboard/superadmin/generate-kode" style={btnOutline}>+ Generate Kode</a>
      </nav>

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'1.25rem' }}>
        {msg   && <div style={msgBox('#085041','#E1F5EE')}>{msg}</div>}
        {error && <div style={msgBox('#A32D2D','#FCEBEB')}>{error}</div>}

        {/* Search */}
        <input
          style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e5e7eb', fontSize:12, fontFamily:'sans-serif', boxSizing:'border-box', marginBottom:12 }}
          placeholder="🔍 Cari nama mitra, judul dokumen, atau kode akses..."
          value={search} onChange={e => setSearch(e.target.value)}
        />

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          {countPerFilter.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                padding:'8px 16px', borderRadius:20, border:'1px solid', fontSize:12, cursor:'pointer', fontFamily:'sans-serif', fontWeight: activeFilter === f.key ? 600 : 400,
                background: activeFilter === f.key ? '#0F6E56' : '#fff',
                color: activeFilter === f.key ? '#fff' : '#374151',
                borderColor: activeFilter === f.key ? '#0F6E56' : '#e5e7eb',
              }}
            >
              {f.label}
              <span style={{ marginLeft:6, fontSize:11, padding:'1px 6px', borderRadius:10, background: activeFilter === f.key ? 'rgba(255,255,255,.25)' : '#f3f4f6', color: activeFilter === f.key ? '#fff' : '#6b7280' }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Konten */}
        {mitraKeys.length === 0 ? (
          <div style={{ ...card, textAlign:'center', padding:'2.5rem', color:'#9ca3af' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
            <div>Tidak ada dokumen pada filter ini.</div>
          </div>
        ) : (
          mitraKeys.map(namaMitra => {
            const dokList = grouped[namaMitra];
            const isExpanded = expandedMitra.has(namaMitra);

            return (
              <div key={namaMitra} style={{ ...card, marginBottom:10 }}>
                {/* Header folder mitra */}
                <div
                  onClick={() => {
                    const next = new Set(expandedMitra);
                    if (isExpanded) next.delete(namaMitra); else next.add(namaMitra);
                    setExpandedMitra(next);
                  }}
                  style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
                >
                  <span style={{ fontSize:18 }}>📁</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{namaMitra}</div>
                    <div style={{ fontSize:11, color:'#6b7280' }}>{dokList.length} dokumen</div>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    {Array.from(new Set(dokList.map(d => d.jenis))).map(j => (
                      <span key={j} style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:j==='MOU'?'#E6F1FB':'#FAEEDA', color:j==='MOU'?'#0C447C':'#854F0B' }}>
                        {j}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize:14, color:'#9ca3af' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* List dokumen */}
                {isExpanded && (
                  <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                    {dokList.map(d => {
                      const sc = STATUS_COLOR[d.status] || { bg:'#f3f4f6', color:'#6b7280' };
                      const isDraftSelesai = d.status === 'Kegiatan Selesai' || d.status === 'Draft';
                      const showTooltip = hoverId === d.id && isDraftSelesai;
                      const poin = generatePreviewPoin(d);

                      return (
                        <div
                          key={d.id}
                          style={{ position:'relative' }}
                          onMouseEnter={() => { if (isDraftSelesai) setHoverId(d.id); }}
                          onMouseLeave={() => setHoverId(null)}
                        >
                          {/* Tooltip hover preview */}
                          {showTooltip && (
                            <div style={{
                              position:'absolute', bottom:'calc(100% + 8px)', left:0, zIndex:50,
                              background:'#1a1a2e', color:'#fff', borderRadius:10, padding:'10px 14px',
                              fontSize:11, lineHeight:1.6, minWidth:260, maxWidth:340,
                              boxShadow:'0 8px 24px rgba(0,0,0,.25)',
                            }}>
                              <div style={{ fontWeight:600, marginBottom:6, color:'#9FE1CB' }}>
                                📋 Ringkasan {d.jenis}
                              </div>
                              {poin.map((p, i) => (
                                <div key={i} style={{ display:'flex', gap:6, marginBottom:2 }}>
                                  <span style={{ color:'#9FE1CB', flexShrink:0 }}>·</span>
                                  <span>{p}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'10px 12px', background:'#f9fafb', borderRadius:8, border:'1px solid #f3f4f6', flexWrap:'wrap' }}>
                            <div style={{ flex:1, minWidth:180 }}>
                              <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                                <span style={{ fontSize:16 }}>📄</span>
                                <span style={{ fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:4, background:d.jenis==='MOU'?'#E6F1FB':'#FAEEDA', color:d.jenis==='MOU'?'#0C447C':'#854F0B' }}>
                                  {d.jenis}
                                </span>
                                <span style={{ fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:100, background:sc.bg, color:sc.color }}>
                                  {d.status}
                                </span>
                              </div>
                              <div style={{ fontSize:13, fontWeight:500 }}>{d.judul}</div>
                              <div style={{ fontSize:11, color:'#9ca3af', marginTop:3 }}>
                                {d.tglBerlaku} s.d. {d.tglBerakhir} · Kode: <strong style={{ color:'#0F6E56' }}>{d.kode}</strong>
                              </div>
                            </div>

                            <div style={{ display:'flex', gap:5, alignItems:'center', flexShrink:0 }}>
                              {d.docsUrl && (
                                <a href={d.docsUrl} target="_blank" rel="noopener noreferrer"
                                  style={{ ...btnSm, textDecoration:'none', fontSize:11 }}>
                                  📄 Docs
                                </a>
                              )}
                              <a href={`/dashboard/dokumen/foto?id=${d.id}&judul=${encodeURIComponent(d.judul)}`}
                                style={{ ...btnSm, textDecoration:'none', fontSize:11 }}>
                                📷 Foto
                              </a>
                              <button onClick={() => openEdit(d)} style={{ ...btnSm, fontSize:11 }}>✏️ Edit</button>
                              <button onClick={() => hapus(d.id, d.judul)} style={{ ...btnSm, color:'#A32D2D', borderColor:'#FCEBEB', fontSize:11 }}>🗑</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal edit status */}
      {editItem && (
        <div style={overlay} onClick={() => setEditItem(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Edit Status Dokumen</div>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:14 }}>{editItem.judul} · {editItem.namaMitra}</div>
            {error && <div style={msgBox('#A32D2D','#FCEBEB')}>{error}</div>}
            <label style={labelSt}>Status Baru</label>
            <select style={{ ...inputFull, marginBottom:10 }} value={eStatus} onChange={e => setEStatus(e.target.value)}>
              {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label style={labelSt}>Catatan</label>
            <textarea style={{ ...inputFull, height:70, resize:'none', marginBottom:14 }}
              value={eCatatan} onChange={e => setECatatan(e.target.value)}
              placeholder="Catatan perubahan status..." />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setEditItem(null)} style={btnSm}>Batal</button>
              <button onClick={submitEdit} disabled={submitting} style={btnPrimary}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 1.5rem', background:'#fff', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:100 };
const backLink: React.CSSProperties = { fontSize:12, color:'#6b7280', textDecoration:'none' };
const card: React.CSSProperties = { background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'1px solid #e5e7eb' };
const labelSt: React.CSSProperties = { display:'block', fontSize:11, color:'#6b7280', marginBottom:4 };
const inputFull: React.CSSProperties = { width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:12, fontFamily:'sans-serif', boxSizing:'border-box' };
const btnPrimary: React.CSSProperties = { padding:'8px 16px', borderRadius:8, border:'none', background:'#0F6E56', color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'sans-serif' };
const btnSm: React.CSSProperties = { padding:'6px 10px', borderRadius:7, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:11, cursor:'pointer', fontFamily:'sans-serif' };
const btnOutline: React.CSSProperties = { fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid #e5e7eb', textDecoration:'none', color:'#374151', background:'#fff' };
const overlay: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'1rem' };
const modalBox: React.CSSProperties = { background:'#fff', borderRadius:12, padding:'1.5rem', width:'100%', maxWidth:440 };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'8px 12px', borderRadius:8, marginBottom:10 });