'use client';

import { useEffect, useState, useCallback } from 'react';
import { FiBell, FiTrash2, FiZap, FiInfo, FiSend, FiFileText } from 'react-icons/fi';

interface NotifAdmin {
  id: string; idDokumen: string; tipe: string; judul: string; pesan: string;
  dibaca: boolean; tglDibuat: string;
}

const BLUE = '#1D4ED8';
const GOLD = '#D97706';

const IKON_TIPE: Record<string, React.ReactNode> = {
  'pengajuan-baru':  <FiFileText size={15} style={{ color: BLUE }} />,
  'selesai-mengisi': <FiSend size={15} style={{ color: BLUE }} />,
  'ttd-basah':       <FiFileText size={15} style={{ color: GOLD }} />,
  'ttd-online':      <FiZap size={15} style={{ color: GOLD }} />,
};

// Tempel komponen ini di nav halaman admin manapun. Polling otomatis tiap 30 detik.
export default function NotifikasiAdminBell({ pollMs = 30000 }: { pollMs?: number }) {
  const [notif, setNotif] = useState<NotifAdmin[]>([]);
  const [show, setShow] = useState(false);

  const load = useCallback(() => {
    fetch('/api/notifikasi-admin')
      .then(r => r.json())
      .then(d => setNotif(d.notifikasi || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, pollMs);
    return () => clearInterval(interval);
  }, [load, pollMs]);

  const belumDibaca = notif.filter(n => !n.dibaca).length;

  const buka = async () => {
    setShow(s => !s);
    if (!show && belumDibaca > 0) {
      try {
        await fetch('/api/notifikasi-admin', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ semua: true }),
        });
        setNotif(prev => prev.map(n => ({ ...n, dibaca: true })));
      } catch {}
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={buka} style={btnBell} title="Notifikasi Admin">
        <FiBell size={15} strokeWidth={1.8} />
        {belumDibaca > 0 && <span style={badge}>{belumDibaca}</span>}
      </button>

      {show && (
        <>
          <div onClick={() => setShow(false)} style={overlay} />
          <div style={panel}>
            <div style={panelHeader}>
              <span style={{ fontWeight: 700, fontSize: 12.5, color: '#0f1f3d' }}>Notifikasi</span>
              <button onClick={() => setShow(false)} style={closeBtn}>Tutup</button>
            </div>
            {notif.length === 0 ? (
              <div style={emptyState}>Belum ada notifikasi.</div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {notif.map(n => (
                  <a key={n.id} href={n.tipe === 'pengajuan-baru' ? '/dashboard/pengajuan' : (n.idDokumen ? `/dashboard/dokumen/${n.idDokumen}` : '#')} style={itemRow}>
                    {IKON_TIPE[n.tipe] || <FiInfo size={15} style={{ color: '#94a3b8' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{n.judul}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>{n.pesan}</div>
                      <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 4 }}>{n.tglDibuat}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const btnBell: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 34, height: 34, borderRadius: 100, border: '1px solid rgba(29,78,216,0.10)',
  background: '#fff', color: '#54635e', cursor: 'pointer', position: 'relative',
};
const badge: React.CSSProperties = {
  position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, padding: '0 4px',
  borderRadius: 100, background: '#A32D2D', color: '#fff', fontSize: 9.5, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 199 };
const panel: React.CSSProperties = {
  position: 'absolute', top: 42, right: 0, width: 320, background: '#fff', borderRadius: 16,
  border: '1px solid rgba(29,78,216,0.08)', boxShadow: '0 20px 50px -20px rgba(15,23,42,0.35)',
  zIndex: 200, overflow: 'hidden',
};
const panelHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 14px', borderBottom: '1px solid rgba(29,78,216,0.06)',
};
const closeBtn: React.CSSProperties = {
  fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(29,78,216,0.10)',
  background: '#fff', color: '#334155', cursor: 'pointer',
};
const emptyState: React.CSSProperties = { padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: 12 };
const itemRow: React.CSSProperties = {
  display: 'flex', gap: 10, padding: '11px 14px', borderBottom: '1px solid rgba(29,78,216,0.05)',
  textDecoration: 'none', cursor: 'pointer',
};