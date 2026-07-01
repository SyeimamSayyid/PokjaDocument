'use client';

import { useEffect, useState, useCallback } from 'react';
import LoaderPage from '@/components/LoaderPage';
import { 
  FiFolder, FiFile, FiEdit, FiTrash2, FiSearch, FiFilter,
  FiEye, FiExternalLink, FiCheckCircle, FiClock, FiAlertCircle,
  FiCalendar, FiUser, FiTag, FiGrid, FiList, FiPlus,
  FiX, FiSave, FiArrowLeft, FiImage, FiInfo, FiDatabase,
  FiFileText, FiFolderPlus, FiLayers, FiActivity
} from 'react-icons/fi';
import { 
  FaFileAlt, FaFileSignature, FaUser, FaBuilding,
  FaGoogleDrive, FaFolderOpen,
  FaFolder, FaRegFile, FaRegFolder
} from 'react-icons/fa';
import { SiGoogledocs } from 'react-icons/si';
import { STATUS_DOKUMEN, STATUS_COLOR } from '@/lib/constants';

interface DokumenItem {
  id: string; jenis: string; judul: string; namaMitra: string;
  tglDibuat: string; tglBerlaku: string; tglBerakhir: string;
  durasi: string; status: string; kode: string; kodeExpire: string;
  docsId: string; docsUrl: string; folderId: string; dibuatOleh: string;
}

// Gunakan STATUS_DOKUMEN sebagai STATUS_LIST
const STATUS_LIST = STATUS_DOKUMEN;

// Buat STATUS_ICON lokal karena tidak ada di constants
const STATUS_ICON: Record<string, React.ReactNode> = {
  'Draft': <FiFileText size={10} />,
  'Dalam Proses': <FiActivity size={10} />,
  'Selesai': <FiCheckCircle size={10} />,
  'Kegiatan Berlangsung': <FiClock size={10} />,
  'Kegiatan Selesai': <FiCheckCircle size={10} />,
  'Kedaluwarsa': <FiAlertCircle size={10} />,
};

export default function DokumenPage() {
  const [role, setRole]       = useState('');
  const [data, setData]       = useState<DokumenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [msg, setMsg]         = useState('');
  const [search, setSearch]   = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [viewMode, setViewMode] = useState<'folder' | 'table'>('folder');

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

  const openEdit = (d: DokumenItem) => {
    setEditItem(d); setEStatus(d.status); setECatatan('');
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
    if (!confirm(`Hapus "${judul}"?\nIni akan menghapus dari Sheets, Google Docs, dan Drive.`)) return;
    setError(''); setMsg('');
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

  const filtered = data.filter(d => {
    const matchSearch =
      d.namaMitra?.toLowerCase().includes(search.toLowerCase()) ||
      d.judul?.toLowerCase().includes(search.toLowerCase()) ||
      d.status?.toLowerCase().includes(search.toLowerCase()) ||
      d.kode?.toLowerCase().includes(search.toLowerCase());
    const matchJenis = filterJenis ? d.jenis === filterJenis : true;
    return matchSearch && matchJenis;
  });

  if (loading) return <LoaderPage text="Memuat Semua Dokumen Kerja Sama..." />; 

  const mouList = filtered.filter(d => d.jenis === 'MOU');
  const pksList = filtered.filter(d => d.jenis === 'PKS');

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        :root{--font:system-ui,-apple-system,sans-serif}
        .tree-ul{list-style:none;padding:0;margin:0}
        .tree-ul ul{margin-left:11px;padding-left:11px;border-left:2px solid #e5e7eb}
        .tree-item{position:relative;margin-top:3px}
        .tree-ul ul .tree-item::before{content:"";position:absolute;left:-11px;top:14px;width:11px;height:1px;background:#e5e7eb}
        .tree-toggle{display:none}
        .tree-label{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer;font-size:13px;color:#1a1a2e;user-select:none;transition:background .15s;height:32px}
        .tree-label:hover{background:#f4f4f5}
        .folder-open-icon{display:none}
        .folder-closed-icon{display:block}
        .tree-toggle:checked ~ .tree-label .folder-open-icon{display:block;color:#0F6E56}
        .tree-toggle:checked ~ .tree-label .folder-closed-icon{display:none}
        .tree-children-wrapper{display:grid;grid-template-rows:0fr;transition:grid-template-rows .25s ease}
        .tree-children{overflow:hidden}
        .tree-toggle:checked ~ .tree-children-wrapper{grid-template-rows:1fr}
        .file-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:12px;color:#1a1a2e;transition:background .15s;flex-wrap:wrap}
        .file-row:hover{background:#f9fafb}
        .file-left{display:flex;align-items:center;gap:8px;flex:1;min-width:0}
        .file-actions{display:flex;gap:4px;flex-shrink:0;opacity:0;transition:opacity .15s}
        .file-row:hover .file-actions{opacity:1}
        .icon{width:16px;height:16px;color:#6b7280;flex-shrink:0}
        .icon-folder{color:#0F6E56}
        .icon-mou{color:#185FA5}
        .icon-pks{color:#854F0B}
        .jenis-root{font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px}
        .jenis-root.mou{background:#E6F1FB;color:#0C447C}
        .jenis-root.pks{background:#FAEEDA;color:#633806}
        .badge-status{font-size:10px;font-weight:500;padding:2px 8px;border-radius:10px}
        .act-btn{font-size:10px;padding:4px 10px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;color:#374151;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s}
        .act-btn:hover{background:#f9fafb}
        .act-btn.red{border-color:#FCEBEB;color:#A32D2D}
        .act-btn.red:hover{background:#FCEBEB}
      `}</style>

      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #f5f5f5 0%, #e8f0f8 100%)', fontFamily:'system-ui,sans-serif' }}>
        <nav style={navStyle}>
          <a href={backUrl} style={backLink}>
            <FiArrowLeft size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Dashboard
          </a>
          <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap: 6 }}>
            <FiDatabase size={16} style={{ color: '#0F6E56' }} />
            Daftar Dokumen MOU/PKS
          </div>
          <a href="/dashboard/superadmin/generate-kode" style={{ ...btnOutline, display:'flex', alignItems:'center', gap:4 }}>
            <FiPlus size={14} /> Generate
          </a>
        </nav>

        <div style={{ maxWidth:1000, margin:'0 auto', padding:'1.25rem' }}>

          {msg && (
            <div style={{ ...msgBox('#085041','#E1F5EE'), display:'flex', alignItems:'center', gap:6 }}>
              <FiCheckCircle size={14} /> {msg}
            </div>
          )}
          {error && (
            <div style={{ ...msgBox('#A32D2D','#FCEBEB'), display:'flex', alignItems:'center', gap:6 }}>
              <FiAlertCircle size={14} /> {error}
            </div>
          )}

          {/* Toolbar */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:180 }}>
              <FiSearch size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
              <input
                style={{ 
                  padding:'9px 12px 9px 32px', 
                  borderRadius:8, 
                  border:'2px solid #e5e7eb', 
                  fontSize:12, 
                  flex:1, 
                  minWidth:180, 
                  fontFamily:'inherit',
                  width:'100%',
                  outline:'none',
                  transition:'border-color .2s'
                }}
                placeholder="Cari mitra, judul, kode, status..."
                value={search} 
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display:'flex', gap:4 }}>
              {['','MOU','PKS'].map(j => (
                <button 
                  key={j} 
                  onClick={() => setFilterJenis(j)} 
                  style={{
                    padding:'8px 14px', 
                    borderRadius:7, 
                    border:'2px solid', 
                    fontSize:12, 
                    cursor:'pointer', 
                    fontFamily:'inherit',
                    background: filterJenis === j ? 'linear-gradient(135deg, #0F6E56 0%, #1a8f70 100%)' : '#fff',
                    color: filterJenis === j ? '#fff' : '#374151',
                    borderColor: filterJenis === j ? '#0F6E56' : '#e5e7eb',
                    transition:'all .2s',
                    fontWeight: filterJenis === j ? 600 : 400,
                    display:'flex',
                    alignItems:'center',
                    gap:4
                  }}
                >
                  {j === 'MOU' && <FaFileSignature size={12} />}
                  {j === 'PKS' && <FaFileAlt size={12} />}
                  {j || 'Semua'}
                </button>
              ))}
            </div>
            {/* Toggle view */}
            <div style={{ display:'flex', border:'2px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
              <button
                onClick={() => setViewMode('folder')}
                style={{ 
                  padding:'8px 14px', 
                  border:'none', 
                  fontSize:13, 
                  cursor:'pointer', 
                  fontFamily:'inherit',
                  background: viewMode === 'folder' ? 'linear-gradient(135deg, #0F6E56 0%, #1a8f70 100%)' : '#fff',
                  color: viewMode === 'folder' ? '#fff' : '#374151',
                  transition:'all .2s',
                  display:'flex',
                  alignItems:'center',
                  gap:4
                }}
                title="Tampilan Folder"
              >
                <FiFolder size={14} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{ 
                  padding:'8px 14px', 
                  border:'none', 
                  fontSize:13, 
                  cursor:'pointer', 
                  fontFamily:'inherit',
                  background: viewMode === 'table' ? 'linear-gradient(135deg, #0F6E56 0%, #1a8f70 100%)' : '#fff',
                  color: viewMode === 'table' ? '#fff' : '#374151',
                  transition:'all .2s',
                  display:'flex',
                  alignItems:'center',
                  gap:4
                }}
                title="Tampilan Tabel"
              >
                <FiGrid size={14} />
              </button>
            </div>
            <div style={{ fontSize:12, color:'#9ca3af', display:'flex', alignItems:'center', gap:4 }}>
              <FiDatabase size={12} /> {filtered.length} dokumen
            </div>
          </div>

          {loading ? (
            <div style={{ ...card, textAlign:'center', padding:'2rem', color:'#9ca3af' }}>Memuat...</div>
          ) : filtered.length === 0 ? (
            <div style={{ ...card, textAlign:'center', padding:'2rem', color:'#9ca3af' }}>
              <FiFileText size={32} style={{ opacity:0.3, marginBottom:8 }} />
              <div>Belum ada dokumen.</div>
              <a href="/dashboard/superadmin/generate-kode" style={{ color:'#0F6E56', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4, marginTop:8 }}>
                <FiPlus size={14} /> Generate
              </a>
            </div>
          ) : viewMode === 'folder' ? (

            /* ══ MODE FOLDER ══ */
            <div style={card}>
              <ul className="tree-ul">
                <li className="tree-item">
                  <input type="checkbox" id="root" className="tree-toggle" defaultChecked />
                  <label htmlFor="root" className="tree-label">
                    <FaFolderOpen size={16} style={{ color: '#0F6E56' }} />
                    <strong>PaktaSign_Arsip</strong>
                    <span style={{ fontSize:11, color:'#9ca3af' }}>{filtered.length} dokumen</span>
                  </label>
                  <div className="tree-children-wrapper">
                    <ul className="tree-children">

                      {/* Folder MOU */}
                      {(!filterJenis || filterJenis === 'MOU') && mouList.length > 0 && (
                        <li className="tree-item">
                          <input type="checkbox" id="mou-root" className="tree-toggle" defaultChecked />
                          <label htmlFor="mou-root" className="tree-label">
                            <FaFolder size={16} style={{ color: '#185FA5' }} />
                            <span className="jenis-root mou">MOU</span>
                            <span style={{ fontSize:11, color:'#9ca3af' }}>{mouList.length} dokumen</span>
                          </label>
                          <div className="tree-children-wrapper">
                            <ul className="tree-children">
                              {mouList.map(d => <DokFileRow key={d.id} d={d} onEdit={openEdit} onHapus={hapus} />)}
                            </ul>
                          </div>
                        </li>
                      )}

                      {/* Folder PKS */}
                      {(!filterJenis || filterJenis === 'PKS') && pksList.length > 0 && (
                        <li className="tree-item">
                          <input type="checkbox" id="pks-root" className="tree-toggle" defaultChecked />
                          <label htmlFor="pks-root" className="tree-label">
                            <FaFolder size={16} style={{ color: '#854F0B' }} />
                            <span className="jenis-root pks">PKS</span>
                            <span style={{ fontSize:11, color:'#9ca3af' }}>{pksList.length} dokumen</span>
                          </label>
                          <div className="tree-children-wrapper">
                            <ul className="tree-children">
                              {pksList.map(d => <DokFileRow key={d.id} d={d} onEdit={openEdit} onHapus={hapus} />)}
                            </ul>
                          </div>
                        </li>
                      )}

                    </ul>
                  </div>
                </li>
              </ul>
            </div>

          ) : (

            /* ══ MODE TABEL ══ */
            <div style={{ ...card, padding:0, overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f9fafb', borderBottom:'2px solid #e5e7eb' }}>
                      <th style={th}><FiTag size={12} style={{ marginRight:4 }} />Jenis</th>
                      <th style={th}><FiFileText size={12} style={{ marginRight:4 }} />Judul</th>
                      <th style={th}><FaBuilding size={12} style={{ marginRight:4 }} />Mitra</th>
                      <th style={th}><FiCalendar size={12} style={{ marginRight:4 }} />Berlaku s.d.</th>
                      <th style={th}><FiActivity size={12} style={{ marginRight:4 }} />Status</th>
                      <th style={th}><FiTag size={12} style={{ marginRight:4 }} />Kode</th>
                      <th style={{ ...th, textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d, i) => {
                      const sc = STATUS_COLOR[d.status] || { bg:'#f3f4f6', color:'#6b7280' };
                      return (
                        <tr key={d.id} style={{ borderBottom:'1px solid #f3f4f6', transition:'background .15s' }}>
                          <td style={td}>
                            <span style={{ fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:4, background:d.jenis==='MOU'?'#E6F1FB':'#FAEEDA', color:d.jenis==='MOU'?'#0C447C':'#854F0B', display:'inline-flex', alignItems:'center', gap:4 }}>
                              {d.jenis === 'MOU' ? <FaFileSignature size={10} /> : <FaFileAlt size={10} />}
                              {d.jenis}
                            </span>
                          </td>
                          <td style={{ ...td, fontWeight:500, maxWidth:200 }}>
                            <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.judul}</div>
                          </td>
                          <td style={{ ...td, color:'#6b7280' }}>
                            <FaUser size={10} style={{ marginRight:4 }} />
                            {d.namaMitra}
                          </td>
                          <td style={{ ...td, color:'#6b7280', whiteSpace:'nowrap' }}>
                            <FiCalendar size={10} style={{ marginRight:4 }} />
                            {d.tglBerakhir}
                          </td>
                          <td style={td}>
                            <span style={{ fontSize:10, fontWeight:500, padding:'3px 10px', borderRadius:100, background:sc.bg, color:sc.color, display:'inline-flex', alignItems:'center', gap:4 }}>
                              {STATUS_ICON[d.status]}
                              {d.status}
                            </span>
                          </td>
                          <td style={{ ...td, fontFamily:'monospace', color:'#0F6E56', fontWeight:600 }}>
                            {d.kode}
                          </td>
                          <td style={td}>
                            <div style={{ display:'flex', gap:4, justifyContent:'center', flexWrap:'wrap' }}>
                              {/* Detail Button */}
                              <a 
                                href={`/dashboard/dokumen/${d.id}`}
                                style={{ 
                                  ...btnSm, 
                                  textDecoration:'none', 
                                  fontSize:11,
                                  padding:'5px 10px',
                                  display:'inline-flex',
                                  alignItems:'center',
                                  gap:4
                                }}
                              >
                                <FiEye size={12} /> Detail
                              </a>
                              {d.docsUrl && (
                                <a href={d.docsUrl} target="_blank" rel="noopener noreferrer" style={{ ...actBtn, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
                                  <SiGoogledocs size={12} /> Docs
                                </a>
                              )}
                              <a href={`/dashboard/dokumen/foto?id=${d.id}&judul=${encodeURIComponent(d.judul)}`} style={{ ...actBtn, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
                                <FiImage size={12} /> Foto
                              </a>
                              <button onClick={() => openEdit(d)} style={{ ...actBtn, display:'inline-flex', alignItems:'center', gap:4 }}>
                                <FiEdit size={12} />
                              </button>
                              <button onClick={() => hapus(d.id, d.judul)} style={{ ...actBtn, color:'#A32D2D', borderColor:'#FCEBEB', display:'inline-flex', alignItems:'center', gap:4 }}>
                                <FiTrash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal edit status */}
      {editItem && (
        <div style={overlay} onClick={() => setEditItem(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
              <FiEdit size={18} style={{ color: '#0F6E56' }} />
              Edit Status Dokumen
            </div>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:14 }}>
              <FiFileText size={12} style={{ marginRight:4 }} />
              {editItem.judul} · <FaUser size={12} style={{ marginRight:4 }} />
              {editItem.namaMitra}
            </div>
            {error && (
              <div style={{ ...msgBox('#A32D2D','#FCEBEB'), display:'flex', alignItems:'center', gap:6 }}>
                <FiAlertCircle size={14} /> {error}
              </div>
            )}
            <label style={labelSt}>
              <FiActivity size={12} style={{ marginRight:4 }} />
              Status Baru
            </label>
            <select style={{ ...inputFull, marginBottom:10 }} value={eStatus} onChange={e => setEStatus(e.target.value)}>
              {STATUS_LIST.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label style={labelSt}>
              <FiInfo size={12} style={{ marginRight:4 }} />
              Catatan (opsional)
            </label>
            <textarea
              style={{ ...inputFull, height:70, resize:'none', marginBottom:14 }}
              value={eCatatan} onChange={e => setECatatan(e.target.value)}
              placeholder="Catatan perubahan status..."
            />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setEditItem(null)} style={btnSm}>
                <FiX size={14} style={{ marginRight:4, verticalAlign:'middle' }} />
                Batal
              </button>
              <button onClick={submitEdit} disabled={submitting} style={btnPrimary}>
                <FiSave size={14} style={{ marginRight:4, verticalAlign:'middle' }} />
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Komponen baris file di tree ────────────────────────────
function DokFileRow({ d, onEdit, onHapus }: {
  d: DokumenItem;
  onEdit: (d: DokumenItem) => void;
  onHapus: (id: string, judul: string) => void;
}) {
  const sc = STATUS_COLOR[d.status] || { bg:'#f3f4f6', color:'#6b7280' };
  return (
    <li className="tree-item">
      <input type="checkbox" id={`dok-${d.id}`} className="tree-toggle" />
      <label htmlFor={`dok-${d.id}`} className="tree-label">
        <FaRegFile size={14} style={{ color: '#6b7280' }} />
        <span style={{ fontSize:12, fontWeight:500, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.judul}</span>
        <span style={{ fontSize:9, fontWeight:500, padding:'2px 8px', borderRadius:10, background:sc.bg, color:sc.color, flexShrink:0, display:'inline-flex', alignItems:'center', gap:3 }}>
          {STATUS_ICON[d.status]}
          {d.status}
        </span>
      </label>
      <div className="tree-children-wrapper">
        <ul className="tree-children">
          {/* Detail */}
          <li className="tree-item">
            <div className="file-row">
              <div className="file-left" style={{ fontSize:11, color:'#6b7280', paddingLeft:4 }}>
                <FaBuilding size={12} style={{ marginRight:4 }} />
                {d.namaMitra} · <FiCalendar size={12} style={{ marginRight:4 }} />
                {d.tglBerlaku} s.d. {d.tglBerakhir} · Kode: <strong style={{ color:'#0F6E56' }}>{d.kode}</strong>
              </div>
            </div>
          </li>
          {/* Docs */}
          <li className="tree-item">
            <div className="file-row">
              <div className="file-left">
                <SiGoogledocs size={14} style={{ color: '#1a73e8' }} />
                <span style={{ fontSize:11 }}>{d.judul}.docx</span>
              </div>
              <div className="file-actions" style={{ opacity:1 }}>
                {d.docsUrl && (
                  <a href={d.docsUrl} target="_blank" rel="noopener noreferrer" className="act-btn" style={{ textDecoration:'none', fontSize:10, padding:'3px 8px', borderRadius:5, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:4 }}>
                    <FiExternalLink size={10} /> Buka Docs
                  </a>
                )}
              </div>
            </div>
          </li>
          {/* Foto Kegiatan */}
          <li className="tree-item">
            <div className="file-row">
              <div className="file-left">
                <FiImage size={14} style={{ color: '#6b7280' }} />
                <span style={{ fontSize:11 }}>Foto_Kegiatan/</span>
              </div>
              <div className="file-actions" style={{ opacity:1 }}>
                <a href={`/dashboard/dokumen/foto?id=${d.id}&judul=${encodeURIComponent(d.judul)}`}
                  className="act-btn" style={{ textDecoration:'none', fontSize:10, padding:'3px 8px', borderRadius:5, border:'1px solid #e5e7eb', background:'#fff', color:'#374151', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:4 }}>
                  <FiFolder size={10} /> Kelola Foto
                </a>
              </div>
            </div>
          </li>
          {/* Aksi - Added Detail button here too */}
          <li className="tree-item">
            <div className="file-row">
              <div className="file-left" style={{ gap:6, flexWrap:'wrap' }}>
                <a 
                  href={`/dashboard/dokumen/${d.id}`}
                  style={{ 
                    textDecoration:'none', 
                    fontSize:10, 
                    padding:'4px 10px', 
                    borderRadius:5, 
                    border:'1px solid #e5e7eb', 
                    background:'#fff', 
                    color:'#374151', 
                    fontFamily:'inherit',
                    display:'inline-flex',
                    alignItems:'center',
                    gap:4,
                    transition:'all .15s'
                  }}
                  className="act-btn"
                >
                  <FiEye size={10} /> Detail
                </a>
                <button onClick={() => onEdit(d)} className="act-btn" style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                  <FiEdit size={10} /> Edit Status
                </button>
                <button onClick={() => onHapus(d.id, d.judul)} className="act-btn red" style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                  <FiTrash2 size={10} /> Hapus
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </li>
  );
}

// ── Styles ─────────────────────────────────────────────────
const navStyle: React.CSSProperties = { 
  display:'flex', 
  alignItems:'center', 
  justifyContent:'space-between', 
  padding:'0.85rem 1.5rem', 
  background:'#fff', 
  borderBottom:'2px solid #e5e7eb', 
  position:'sticky', 
  top:0, 
  zIndex:100,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
};

const backLink: React.CSSProperties = { 
  fontSize:12, 
  color:'#6b7280', 
  textDecoration:'none',
  display:'flex',
  alignItems:'center'
};

const card: React.CSSProperties = { 
  background:'#fff', 
  borderRadius:12, 
  padding:'1rem 1.25rem', 
  border:'2px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};

const labelSt: React.CSSProperties = { 
  display:'flex',
  alignItems:'center',
  fontSize:11, 
  color:'#6b7280', 
  marginBottom:4,
  fontWeight:500
};

const inputFull: React.CSSProperties = { 
  width:'100%', 
  padding:'9px 12px', 
  borderRadius:8, 
  border:'2px solid #e5e7eb', 
  fontSize:12, 
  fontFamily:'inherit', 
  boxSizing:'border-box',
  outline:'none',
  transition:'border-color .2s'
};

const btnPrimary: React.CSSProperties = { 
  padding:'9px 18px', 
  borderRadius:8, 
  border:'none', 
  background:'linear-gradient(135deg, #0F6E56 0%, #1a8f70 100%)', 
  color:'#fff', 
  fontSize:12, 
  fontWeight:500, 
  cursor:'pointer', 
  fontFamily:'inherit',
  display:'inline-flex',
  alignItems:'center',
  transition:'all .2s',
  boxShadow: '0 2px 8px rgba(15, 110, 86, 0.2)'
};

const btnSm: React.CSSProperties = { 
  padding:'8px 16px', 
  borderRadius:8, 
  border:'2px solid #e5e7eb', 
  background:'#fff', 
  color:'#374151', 
  fontSize:12, 
  cursor:'pointer', 
  fontFamily:'inherit',
  display:'inline-flex',
  alignItems:'center',
  transition:'all .2s'
};

const btnOutline: React.CSSProperties = { 
  fontSize:12, 
  padding:'7px 14px', 
  borderRadius:8, 
  border:'2px solid #e5e7eb', 
  textDecoration:'none', 
  color:'#374151', 
  background:'#fff',
  transition:'all .2s'
};

const overlay: React.CSSProperties = { 
  position:'fixed', 
  inset:0, 
  background:'rgba(0,0,0,0.5)', 
  backdropFilter:'blur(4px)',
  display:'flex', 
  alignItems:'center', 
  justifyContent:'center', 
  zIndex:200, 
  padding:'1rem' 
};

const modalBox: React.CSSProperties = { 
  background:'#fff', 
  borderRadius:16, 
  padding:'1.5rem', 
  width:'100%', 
  maxWidth:440,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
};

const th: React.CSSProperties = { 
  padding:'12px 12px', 
  fontWeight:600, 
  fontSize:11, 
  color:'#6b7280', 
  textAlign:'left',
  textTransform:'uppercase',
  letterSpacing:0.3
};

const td: React.CSSProperties = { 
  padding:'12px 12px' 
};

const actBtn: React.CSSProperties = { 
  fontSize:11, 
  padding:'5px 10px', 
  borderRadius:6, 
  border:'2px solid #e5e7eb', 
  background:'#fff', 
  color:'#374151', 
  cursor:'pointer', 
  fontFamily:'inherit',
  transition:'all .15s'
};

const msgBox = (color: string, bg: string): React.CSSProperties => ({ 
  fontSize:13, 
  color, 
  background:bg, 
  padding:'10px 14px', 
  borderRadius:8, 
  marginBottom:10,
  border:`1px solid ${color}20`
});