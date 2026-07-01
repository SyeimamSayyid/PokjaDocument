'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface FotoItem {
  fileId: string; nama: string; ukuran: number; url: string;
  thumbnailUrl: string; tanggalUpload: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function barColor(persen: number): string {
  if (persen >= 90) return '#A32D2D';
  if (persen >= 70) return '#854F0B';
  return '#0F6E56';
}

export default function FotoKegiatanPage() {
  const [idDokumen, setIdDokumen] = useState('');
  const [files, setFiles]         = useState<FotoItem[]>([]);
  const [terpakai, setTerpakai]   = useState(0);
  const [maksimal, setMaksimal]   = useState(5 * 1024 * 1024);
  const [persen, setPersen]       = useState(0);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const [msg, setMsg]             = useState('');
  const [judulDok, setJudulDok]   = useState('');
  const fileInputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const judul = params.get('judul');
    if (id) setIdDokumen(id);
    if (judul) setJudulDok(judul);
  }, []);

  const load = useCallback(() => {
    if (!idDokumen) return;
    setLoading(true); setError('');
    fetch(`/api/dokumen/foto?idDokumen=${idDokumen}`)
      .then(r => r.json())
      .then(d => {
        if (!d.files) { setError(d.message || 'Gagal memuat foto.'); setLoading(false); return; }
        setFiles(d.files);
        setTerpakai(d.terpakai);
        setMaksimal(d.maksimal);
        setPersen(d.persenTerpakai);
        setLoading(false);
      })
      .catch(() => { setError('Gagal memuat foto.'); setLoading(false); });
  }, [idDokumen]);

  useEffect(() => { if (idDokumen) load(); }, [idDokumen, load]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !idDokumen) return;

    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMime.includes(file.type)) {
      setError('Tipe file harus JPG, PNG, atau WEBP.');
      return;
    }

    setUploading(true); setError(''); setMsg('');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];

        const res = await fetch('/api/dokumen/foto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idDokumen, namaFile: file.name, base64Data: base64, mimeType: file.type,
          }),
        });
        const d = await res.json();

        if (!res.ok) { setError(d.message || 'Gagal upload.'); setUploading(false); return; }

        setMsg('Foto berhasil diupload.');
        load();
      } catch {
        setError('Terjadi kesalahan koneksi.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const hapus = async (fileId: string, nama: string) => {
    if (!confirm(`Hapus foto "${nama}"?`)) return;
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/dokumen/foto', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen, fileId }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal hapus.'); return; }
      setMsg('Foto berhasil dihapus.');
      load();
    } catch { setError('Terjadi kesalahan koneksi.'); }
  };

  if (!idDokumen) {
    return (
      <div style={centerStyle}>
        <div>ID dokumen tidak ditemukan. Buka halaman ini melalui tautan "Kelola Foto" dari daftar dokumen.</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <nav style={navStyle}>
        <a href="/dashboard/dokumen" style={backLink}>← Daftar Dokumen</a>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Foto Kegiatan</div>
        <div style={{ width: 100 }}></div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.25rem' }}>

        {msg && <div style={msgBox('#085041', '#E1F5EE')}>{msg}</div>}
        {error && <div style={msgBox('#A32D2D', '#FCEBEB')}>{error}</div>}

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{judulDok || 'Dokumentasi Kegiatan'}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>ID Dokumen: {idDokumen}</div>
        </div>

        {/* Bar penyimpanan */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Penyimpanan Foto</div>
            <div style={{ fontSize: 12, color: barColor(persen), fontWeight: 600 }}>
              {formatBytes(terpakai)} / {formatBytes(maksimal)}
            </div>
          </div>
          <div style={{ height: 10, background: '#f3f4f6', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 100,
              width: `${Math.min(100, persen)}%`,
              background: barColor(persen),
              transition: 'width .4s, background .4s',
            }}></div>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
            {persen}% terpakai · {files.length} foto
            {persen >= 90 && <span style={{ color: '#A32D2D', fontWeight: 500 }}> · Kuota hampir penuh!</span>}
          </div>
        </div>

        {/* Upload */}
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Upload Foto Baru</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading || persen >= 100}
            style={{ fontSize: 12 }}
          />
          {uploading && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>Mengupload...</div>}
          {persen >= 100 && (
            <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 6 }}>
              Kuota penyimpanan sudah penuh. Hapus foto lama untuk upload yang baru.
            </div>
          )}
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
            Format: JPG, PNG, WEBP. Total maksimal 5MB untuk seluruh foto dokumen ini.
          </div>
        </div>

        {/* Galeri */}
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Galeri Foto ({files.length})</div>

          {loading ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Memuat...</p>
          ) : files.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Belum ada foto diupload.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
              {files.map(f => (
                <div key={f.fileId} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={f.thumbnailUrl}
                      alt={f.nama}
                      style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block', background: '#f3f4f6' }}
                    />
                  </a>
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.nama}
                    </div>
                    <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>{formatBytes(f.ukuran)}</div>
                    <button
                      onClick={() => hapus(f.fileId, f.nama)}
                      style={{ marginTop: 4, width: '100%', fontSize: 10, padding: '4px', borderRadius: 6, border: '1px solid #FCEBEB', background: '#fff', color: '#A32D2D', cursor: 'pointer', fontFamily: 'sans-serif' }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const navStyle: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 1.5rem', background:'#fff', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:100 };
const backLink: React.CSSProperties = { fontSize:12, color:'#6b7280', textDecoration:'none' };
const card: React.CSSProperties = { background:'#fff', borderRadius:12, padding:'1rem 1.25rem', border:'1px solid #e5e7eb', marginBottom:'1rem' };
const centerStyle: React.CSSProperties = { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif', color:'#6b7280', fontSize:13, padding:'2rem', textAlign:'center' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({ fontSize:12, color, background:bg, padding:'8px 12px', borderRadius:8, marginBottom:10 });