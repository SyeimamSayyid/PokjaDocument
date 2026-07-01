'use client';

import { useEffect, useState } from 'react';

interface AdminItem {
  id: string; nama: string; email: string; status: string;
  tanggalDibuat: string; terakhirLogin: string;
}

export default function KelolaAdminPage() {
  const [data, setData] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Form tambah
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset password inline
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPass, setResetPass] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/superadmin/admin')
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => { setError('Gagal memuat data admin.'); setLoading(false); });
  };

  useEffect(() => {
    const raw = localStorage.getItem('paktasign_user');
    if (!raw) { window.location.href = '/login'; return; }
    const u = JSON.parse(raw);
    if (u.role !== 'superadmin') { window.location.href = '/login'; return; }
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMsg(''); setError('');
    try {
      const res = await fetch('/api/superadmin/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, password, dibuatOleh: 'Superadmin' }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal menambah admin.'); return; }
      setMsg('Admin Pokja berhasil ditambahkan.');
      setNama(''); setEmail(''); setPassword('');
      load();
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string) => {
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'toggle' }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal mengubah status.'); return; }
      setMsg(d.message);
      load();
    } catch {
      setError('Terjadi kesalahan koneksi.');
    }
  };

  const submitReset = async (id: string) => {
    if (resetPass.length < 6) { setError('Password baru minimal 6 karakter.'); return; }
    setError(''); setMsg('');
    try {
      const res = await fetch('/api/superadmin/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'reset', newPassword: resetPass }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Gagal reset password.'); return; }
      setMsg('Password berhasil direset.');
      setResetId(null); setResetPass('');
    } catch {
      setError('Terjadi kesalahan koneksi.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <nav style={navStyle}>
        <a href="/dashboard/superadmin" style={backLink}>← Dashboard</a>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Kelola Admin Pokja</div>
        <div style={{ width: 80 }}></div>
      </nav>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.25rem' }}>

        {msg && <div style={msgBox('#085041', '#E1F5EE')}>{msg}</div>}
        {error && <div style={msgBox('#A32D2D', '#FCEBEB')}>{error}</div>}

        {/* Form tambah */}
        <div style={card}>
          <div style={cardTitle}>Tambah Admin Pokja Baru</div>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
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
            <button type="submit" disabled={submitting} style={btnPrimary}>
              {submitting ? 'Menambah...' : '+ Tambah'}
            </button>
          </form>
        </div>

        {/* Tabel */}
        <div style={card}>
          <div style={cardTitle}>Daftar Admin Pokja ({data.length})</div>
          {loading ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Memuat...</p>
          ) : data.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Belum ada admin terdaftar.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={th}>Nama</th>
                    <th style={th}>Email</th>
                    <th style={th}>Status</th>
                    <th style={th}>Dibuat</th>
                    <th style={th}>Login Terakhir</th>
                    <th style={th}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={td}>{a.nama}</td>
                      <td style={td}>{a.email}</td>
                      <td style={td}>
                        <span style={{
                          fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 100,
                          background: a.status.toLowerCase() === 'aktif' ? '#E1F5EE' : '#f3f4f6',
                          color: a.status.toLowerCase() === 'aktif' ? '#085041' : '#6b7280',
                        }}>{a.status}</span>
                      </td>
                      <td style={td}>{a.tanggalDibuat}</td>
                      <td style={td}>{a.terakhirLogin}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => toggleStatus(a.id)} style={btnSm}>
                            {a.status.toLowerCase() === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          {resetId === a.id ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <input
                                style={{ ...input, width: 110, padding: '5px 8px' }}
                                type="text"
                                placeholder="Password baru"
                                value={resetPass}
                                onChange={e => setResetPass(e.target.value)}
                              />
                              <button onClick={() => submitReset(a.id)} style={btnSm}>OK</button>
                              <button onClick={() => { setResetId(null); setResetPass(''); }} style={btnSmGhost}>Batal</button>
                            </div>
                          ) : (
                            <button onClick={() => { setResetId(a.id); setResetPass(''); setMsg(''); setError(''); }} style={btnSm}>
                              Reset Password
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const navStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 100 };
const backLink: React.CSSProperties = { fontSize: 12, color: '#6b7280', textDecoration: 'none' };
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #e5e7eb', marginBottom: '1rem' };
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 12 };
const label: React.CSSProperties = { display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 };
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0F6E56', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'sans-serif', whiteSpace: 'nowrap', height: 36 };
const btnSm: React.CSSProperties = { padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 11, cursor: 'pointer', fontFamily: 'sans-serif' };
const btnSmGhost: React.CSSProperties = { ...btnSm, background: 'transparent', color: '#9ca3af' };
const th: React.CSSProperties = { padding: '8px 6px', fontWeight: 500 };
const td: React.CSSProperties = { padding: '8px 6px' };
const msgBox = (color: string, bg: string): React.CSSProperties => ({
  fontSize: 12, color, background: bg, padding: '8px 12px', borderRadius: 8, marginBottom: 10,
});