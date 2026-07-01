'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import LoaderPage from '@/components/LoaderPage';
import { 
  FiFileText, FiImage, FiDownload, FiTrash2, 
  FiClock, FiAlertCircle, FiCheckCircle, FiInfo, FiUpload,
  FiCalendar, FiDatabase, FiLogOut,
  FiGrid, FiRefreshCw, FiHome
} from 'react-icons/fi';
import { 
  FaBuilding, FaFileSignature, FaFileAlt, FaGoogleDrive,
  FaDatabase as FaDataBase
} from 'react-icons/fa';
import { SiGoogledocs } from 'react-icons/si';

interface MitraUser {
  role: string; idDokumen: string; jenis: string; judul: string;
  namaMitra: string; status: string; docsId: string; docsUrl: string;
  folderId: string; fotoFolderId: string; tglBerlaku: string;
  tglBerakhir: string; kodeExpire: string;
}
interface FotoItem {
  fileId: string; nama: string; ukuran: number;
  url: string; thumbnailUrl: string; tanggalUpload: string;
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

export default function DashboardMitraPage() {
  const [user, setUser]           = useState<MitraUser | null>(null);
  const [files, setFiles]         = useState<FotoItem[]>([]);
  const [terpakai, setTerpakai]   = useState(0);
  const [maksimal, setMaksimal]   = useState(5 * 1024 * 1024);
  const [persen, setPersen]       = useState(0);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const [msg, setMsg]             = useState('');
  const [aktivitas, setAktivitas] = useState('');
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const loadFoto = useCallback((idDokumen: string) => {
    fetch(`/api/dokumen/foto?idDokumen=${idDokumen}`)
      .then(r => r.json())
      .then(d => {
        if (d.files) {
          setFiles(d.files); setTerpakai(d.terpakai);
          setMaksimal(d.maksimal); setPersen(d.persenTerpakai);
        }
      })
      .catch(() => {});
  }, []);

  const loadAktivitas = useCallback((idDokumen: string) => {
    fetch(`/api/dokumen/aktivitas?idDokumen=${idDokumen}`)
      .then(r => r.json())
      .then(d => setAktivitas(d.manualLog || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_mitra');
    if (!raw) { window.location.href = '/login-mitra'; return; }

    try {
      const u: MitraUser = JSON.parse(raw);
      setUser(u);
      loadFoto(u.idDokumen);
      loadAktivitas(u.idDokumen);

      fetch('/api/dokumen/aktivitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: u.idDokumen, aktor: u.namaMitra, peran: 'mitra' }),
      }).catch(() => {});

      setLoading(false);
    } catch {
      window.location.href = '/login-mitra';
    }
  }, [loadFoto, loadAktivitas]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
            idDokumen: user.idDokumen, namaFile: file.name, base64Data: base64, mimeType: file.type,
          }),
        });
        const d = await res.json();

        if (!res.ok) { setError(d.message || 'Gagal upload.'); setUploading(false); return; }

        setMsg('Foto berhasil diupload.');
        loadFoto(user.idDokumen);
      } catch {
        setError('Terjadi kesalahan koneksi.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const hapusFoto = async (fileId: string, nama: string) => {
    if (!user || !confirm(`Hapus foto "${nama}"?`)) return;
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/dokumen/foto', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen: user.idDokumen, fileId }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal hapus.'); return; }
      setMsg('Foto berhasil dihapus.');
      loadFoto(user.idDokumen);
    } catch { setError('Terjadi kesalahan koneksi.'); }
  };

  const logout = () => {
    localStorage.removeItem('paktasign_mitra');
    window.location.href = '/login-mitra';
  };

  if (loading || !user) return <LoaderPage text="Memuat Dokumen Kerja Sama..." />;
  
  const statusColor: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    'draft':        { bg: '#f3f4f6', color: '#6b7280', icon: <FiFileText size={12} /> },
    'terkirim':     { bg: '#E6F1FB', color: '#0C447C', icon: <FiCheckCircle size={12} /> },
    'ditinjau':     { bg: '#FAEEDA', color: '#854F0B', icon: <FiClock size={12} /> },
    'menunggu ttd': { bg: '#EDE9FE', color: '#5B21B6', icon: <FiClock size={12} /> },
    'aktif':        { bg: '#E1F5EE', color: '#085041', icon: <FiCheckCircle size={12} /> },
    'selesai':      { bg: '#E1F5EE', color: '#085041', icon: <FiCheckCircle size={12} /> },
    'kedaluwarsa':  { bg: '#FCEBEB', color: '#A32D2D', icon: <FiAlertCircle size={12} /> },
  };
  const sc = statusColor[user.status.toLowerCase()] || statusColor['draft'];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f5f5 0%, #e8f0f8 100%)', fontFamily: 'sans-serif' }}>

      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 14 }}>
          <div style={{ 
            width: 36, height: 36, borderRadius: 10, 
            background: 'linear-gradient(135deg, #0F6E56 0%, #1a8f70 100%)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(15, 110, 86, 0.2)'
          }}>
            <FaBuilding size={16} color="#fff" />
          </div>
          <span style={{ color: '#1a1a1a' }}>{user.namaMitra}</span>
        </div>
        <button 
          onClick={logout} 
          style={{ 
            fontSize: 12, 
            padding: '8px 16px', 
            borderRadius: 8, 
            border: '2px solid #e5e7eb', 
            cursor: 'pointer', 
            background: '#fff', 
            color: '#374151', 
            fontFamily: 'sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s ease'
          }}
        >
          <FiLogOut size={14} /> Keluar
        </button>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.25rem' }}>

        {msg && (
          <div style={{ 
            ...msgBox('#085041', '#E1F5EE'),
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <FiCheckCircle size={16} /> {msg}
          </div>
        )}
        {error && (
          <div style={{ 
            ...msgBox('#A32D2D', '#FCEBEB'),
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        {/* Info dokumen */}
        <div style={{ ...card, border: '2px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ 
              fontSize: 11, 
              fontWeight: 600, 
              padding: '4px 12px', 
              borderRadius: 100, 
              background: user.jenis === 'MOU' ? '#E6F1FB' : '#FAEEDA', 
              color: user.jenis === 'MOU' ? '#0C447C' : '#854F0B',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              {user.jenis === 'MOU' ? <FaFileSignature size={12} /> : <FaFileAlt size={12} />}
              {user.jenis}
            </span>
            <span style={{ 
              fontSize: 11, 
              fontWeight: 500, 
              padding: '4px 12px', 
              borderRadius: 100, 
              background: sc.bg, 
              color: sc.color,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              {sc.icon}
              {user.status}
            </span>
            <span style={{ 
              fontSize: 10, 
              padding: '3px 10px', 
              borderRadius: 100, 
              background: '#f3f4f6', 
              color: '#6b7280',
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <FiHome size={10} /> ID: {user.idDokumen.slice(0, 8)}
            </span>
          </div>
          <div style={{ 
            fontSize: 18, 
            fontWeight: 700, 
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <FiFileText size={20} style={{ color: '#0F6E56' }} />
            {user.judul}
          </div>
          <div style={{ 
            fontSize: 13, 
            color: '#6b7280', 
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiCalendar size={14} /> Berlaku: {user.tglBerlaku}
            </span>
            <span style={{ opacity: 0.3 }}>→</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiClock size={14} /> {user.tglBerakhir}
            </span>
          </div>
          <div style={{ 
            fontSize: 12, 
            color: '#9ca3af', 
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <FiInfo size={12} /> Kode akses berlaku hingga: {user.kodeExpire}
          </div>
        </div>

        {/* Aktivitas terakhir */}
        {aktivitas && (
          <div style={{ 
            ...card, 
            padding: '0.75rem 1.25rem',
            background: 'linear-gradient(135deg, #f9fafb 0%, #f0f4f8 100%)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              fontSize: 12, 
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <FiClock size={14} style={{ color: '#0F6E56' }} />
              Terakhir diakses: <strong style={{ color: '#374151' }}>{aktivitas}</strong>
            </div>
          </div>
        )}

        {/* Dua ikon utama: Docs & Drive */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
          <a 
            href={`/mitra/dokumen/${user.idDokumen}`}
            style={{ 
              ...iconCard, 
              cursor: 'pointer', 
              border: '2px solid #e5e7eb',
              transition: 'all 0.2s ease',
              background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block'
            }}
          >
            <div style={{ 
              width: 56, 
              height: 56, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
              boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)'
            }}>
              <SiGoogledocs size={28} color="#fff" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Lihat Dokumen</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Preview & poin perjanjian</div>
          </a>

          <div style={{ 
            ...iconCard, 
            border: '2px solid #e5e7eb',
            background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)'
          }}>
            <div style={{ 
              width: 56, 
              height: 56, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #0F6E56 0%, #1a8f70 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
              boxShadow: '0 4px 12px rgba(15, 110, 86, 0.3)'
            }}>
              <FaGoogleDrive size={28} color="#fff" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Penyimpanan Foto</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
              <FiImage size={12} style={{ display: 'inline', marginRight: 4 }} />
              {files.length} foto · {formatBytes(terpakai)} / 5MB
            </div>
          </div>
        </div>

        {/* Bar kuota foto */}
        <div style={{ ...card, border: '2px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <FaDataBase size={14} style={{ color: '#0F6E56' }} />
              Penyimpanan Foto Kegiatan
            </div>
            <div style={{ 
              fontSize: 12, 
              color: barColor(persen), 
              fontWeight: 600,
              background: `${barColor(persen)}15`,
              padding: '4px 12px',
              borderRadius: 100
            }}>
              {formatBytes(terpakai)} / {formatBytes(maksimal)}
            </div>
          </div>
          <div style={{ height: 12, background: '#f3f4f6', borderRadius: 100, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ 
              height: '100%', 
              borderRadius: 100, 
              width: `${Math.min(100, persen)}%`, 
              background: `linear-gradient(90deg, ${barColor(persen)} 0%, ${barColor(persen)}dd 100%)`, 
              transition: 'width .6s ease, background .4s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}></div>
          </div>
          <div style={{ 
            fontSize: 12, 
            color: '#9ca3af', 
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <FiInfo size={12} />
            {persen}% terpakai · {files.length} foto
            {persen >= 100 && (
              <span style={{ color: '#A32D2D', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiAlertCircle size={12} /> Kuota penuh, hapus foto untuk upload baru
              </span>
            )}
          </div>

          <div style={{ 
            marginTop: 14, 
            paddingTop: 14, 
            borderTop: '2px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <label 
              htmlFor="file-upload"
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: persen >= 100 ? '#f3f4f6' : 'linear-gradient(135deg, #0F6E56 0%, #1a8f70 100%)',
                color: persen >= 100 ? '#9ca3af' : '#fff',
                borderRadius: 8,
                cursor: persen >= 100 ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                fontFamily: 'sans-serif',
                transition: 'all 0.2s ease',
                boxShadow: persen >= 100 ? 'none' : '0 2px 8px rgba(15, 110, 86, 0.2)'
              }}
            >
              <FiUpload size={16} />
              {uploading ? 'Mengupload...' : 'Upload Foto'}
            </label>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              disabled={uploading || persen >= 100}
              style={{ display: 'none' }}
            />
            {uploading && (
              <span style={{ 
                fontSize: 12, 
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <FiRefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Uploading...
              </span>
            )}
            <span style={{ 
              fontSize: 11, 
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <FiInfo size={12} />
              JPG, PNG, WEBP
            </span>
          </div>
        </div>

        {/* Galeri foto */}
        <div style={{ ...card, border: '2px solid #e5e7eb' }}>
          <div style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <FiGrid size={14} style={{ color: '#0F6E56' }} />
            Foto Kegiatan ({files.length})
          </div>
          {files.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem 1rem',
              background: '#f9fafb',
              borderRadius: 8,
              border: '2px dashed #e5e7eb'
            }}>
              <FiImage size={32} style={{ color: '#9ca3af', opacity: 0.5 }} />
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>
                Belum ada foto diupload. Upload bukti kegiatan di atas.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
              {files.map(f => (
                <div key={f.fileId} style={{ 
                  border: '2px solid #e5e7eb', 
                  borderRadius: 12, 
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  background: '#fff'
                }}>
                  <img
                    src={`/api/foto/${f.fileId}`}
                    alt={f.nama}
                    style={{ 
                      width: '100%', 
                      height: 130, 
                      objectFit: 'cover', 
                      display: 'block', 
                      background: '#f3f4f6' 
                    }}
                  />
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ 
                      fontSize: 11, 
                      fontWeight: 500, 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      color: '#1a1a1a'
                    }}>
                      {f.nama}
                    </div>
                    <div style={{ 
                      fontSize: 10, 
                      color: '#9ca3af', 
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <FiDatabase size={10} /> {formatBytes(f.ukuran)}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <a
                        href={`/api/foto/${f.fileId}?download=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          flex: 1, 
                          fontSize: 11, 
                          padding: '5px 8px', 
                          borderRadius: 6, 
                          border: '1px solid #e5e7eb', 
                          background: '#f9fafb', 
                          color: '#374151', 
                          cursor: 'pointer', 
                          fontFamily: 'sans-serif', 
                          textDecoration: 'none', 
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <FiDownload size={12} /> Unduh
                      </a>
                      <button
                        onClick={() => hapusFoto(f.fileId, f.nama)}
                        style={{ 
                          flex: 1, 
                          fontSize: 11, 
                          padding: '5px 8px', 
                          borderRadius: 6, 
                          border: '1px solid #FCEBEB', 
                          background: '#fff', 
                          color: '#A32D2D', 
                          cursor: 'pointer', 
                          fontFamily: 'sans-serif',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <FiTrash2 size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

const navStyle: React.CSSProperties = { 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'space-between', 
  padding: '0.85rem 1.5rem', 
  background: '#fff', 
  borderBottom: '2px solid #e5e7eb', 
  position: 'sticky', 
  top: 0, 
  zIndex: 100,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
};

const card: React.CSSProperties = { 
  background: '#fff', 
  borderRadius: 12, 
  padding: '1rem 1.25rem', 
  border: '1px solid #e5e7eb', 
  marginBottom: '1rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};

const iconCard: React.CSSProperties = { 
  background: '#fff', 
  borderRadius: 12, 
  padding: '1.5rem 1.25rem', 
  border: '1px solid #e5e7eb', 
  textAlign: 'center', 
  fontFamily: 'sans-serif', 
  color: 'inherit',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  transition: 'all 0.2s ease'
};

const msgBox = (color: string, bg: string): React.CSSProperties => ({ 
  fontSize: 13, 
  color, 
  background: bg, 
  padding: '10px 14px', 
  borderRadius: 8, 
  marginBottom: 10,
  border: `1px solid ${color}20`
});