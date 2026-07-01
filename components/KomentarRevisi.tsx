'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Komentar {
  id: string;
  idDokumen: string;
  pengirim: 'admin' | 'mitra' | string;
  idPengirim: string;
  namaPengirim: string;
  pesan: string;
  tglDibuat: string;
  dibaca: boolean;
}

interface Props {
  idDokumen: string;
  pengirim: 'admin' | 'mitra';
  /** Identitas unik pengirim saat ini: id/email admin, atau 'mitra'. Membedakan antar-admin. */
  senderId: string;
  /** Nama tampilan (dipakai untuk admin; mitra di-resolve server dari PIC). */
  namaPengirim?: string;
  /** Auto-refresh tiap N detik. 0 = nonaktif. Default 0. */
  pollMs?: number;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

// Palet avatar deterministik per idPengirim — supaya tiap admin punya warna konsisten
const AVATAR_PALETTE = [
  { bg: '#0F6E56', fg: '#fff' },
  { bg: '#0C447C', fg: '#fff' },
  { bg: '#854F0B', fg: '#fff' },
  { bg: '#5B21B6', fg: '#fff' },
  { bg: '#A32D2D', fg: '#fff' },
  { bg: '#0E7490', fg: '#fff' },
];
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function avatarColor(id: string) {
  return AVATAR_PALETTE[hashStr(id || 'x') % AVATAR_PALETTE.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function KomentarRevisi({ idDokumen, pengirim, senderId, namaPengirim, pollMs = 0 }: Props) {
  const [list, setList]       = useState<Komentar[]>([]);
  const [pesan, setPesan]     = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');
  const [focused, setFocused] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`/api/komentar-revisi?idDokumen=${encodeURIComponent(idDokumen)}`);
      const d = await r.json();
      if (Array.isArray(d.data)) setList(d.data);
    } catch {
      if (!silent) setError('Gagal memuat komentar.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [idDokumen]);

  useEffect(() => {
    load();
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, pollMs);
    return () => clearInterval(t);
  }, [pollMs, load]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [list.length]);

  const myId = pengirim === 'mitra' ? 'mitra' : (senderId || namaPengirim || '');

  const kirim = async () => {
    const teks = pesan.trim();
    if (!teks || sending) return;
    setSending(true); setError('');
    const tmpId = `tmp-${Date.now()}`;
    const tmp: Komentar = {
      id: tmpId, idDokumen, pengirim, idPengirim: myId,
      namaPengirim: namaPengirim || (pengirim === 'mitra' ? 'Anda' : 'Admin'),
      pesan: teks, tglDibuat: '', dibaca: false,
    };
    setList(prev => [...prev, tmp]);
    setPesan('');
    try {
      const r = await fetch('/api/komentar-revisi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idDokumen, pengirim, senderId, namaPengirim, pesan: teks }),
      });
      const d = await r.json();
      if (!r.ok || !d.data) {
        setError(d.message || 'Gagal mengirim.');
        setList(prev => prev.filter(k => k.id !== tmpId));
        setPesan(teks);
        return;
      }
      setList(prev => prev.map(k => k.id === tmpId ? d.data : k));
    } catch {
      setError('Terjadi kesalahan koneksi.');
      setList(prev => prev.filter(k => k.id !== tmpId));
      setPesan(teks);
    } finally {
      setSending(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kirim(); }
  };

  // Kelompokkan bubble berurutan dari pengirim yang sama (rapatkan, sembunyikan label berulang)
  const grouped = list.map((k, i) => {
    const prev = list[i - 1];
    const sameAsPrev = prev && prev.idPengirim === k.idPengirim;
    return { ...k, showHeader: !sameAsPrev };
  });

  return (
    <div style={card}>
      <GlobalStyle />
      <div style={headerRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={titleIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0a2e24', letterSpacing: '-0.01em' }}>
            Komentar Revisi
          </span>
          {list.length > 0 && <span style={countPill}>{list.length}</span>}
        </div>
        <button onClick={() => load()} style={refreshBtn} title="Muat ulang" className="krv-refresh">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div ref={listRef} style={threadBox}>
        {loading ? (
          <div style={emptyState}>
            <div style={pulseDots}><span /><span /><span /></div>
            Memuat komentar…
          </div>
        ) : grouped.length === 0 ? (
          <div style={emptyState}>
            <div style={emptyIconWrap}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                  stroke="#0F6E56" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontWeight: 600, color: '#3a4742', fontSize: 12.5 }}>Belum ada komentar</div>
            <div style={{ fontSize: 11.5, color: '#9aa5a1', marginTop: 2 }}>Mulai diskusi revisi dokumen ini.</div>
          </div>
        ) : (
          grouped.map((k, idx) => {
            const mine = k.idPengirim === myId;
            const isAdmin = k.pengirim === 'admin';
            const ac = avatarColor(isAdmin ? k.idPengirim : 'mitra-fixed');
            const isLast = idx === grouped.length - 1;
            return (
              <div
                key={k.id}
                className="krv-row"
                style={{
                  display: 'flex',
                  justifyContent: mine ? 'flex-end' : 'flex-start',
                  gap: 8,
                  marginTop: k.showHeader ? 14 : 3,
                  animationDelay: isLast ? '0ms' : undefined,
                }}
              >
                {!mine && (
                  <div style={{ width: 26, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    {k.showHeader && (
                      <div style={{ ...avatar, background: ac.bg, color: ac.fg }}>
                        {initials(k.namaPengirim)}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  {k.showHeader && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexDirection: mine ? 'row-reverse' : 'row' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#283330' }}>
                        {mine ? 'Anda' : k.namaPengirim}
                      </span>
                      <span style={{ ...roleTag, ...(isAdmin ? roleAdmin : roleMitra) }}>
                        {isAdmin ? 'Admin' : 'Mitra'}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      ...bubble,
                      ...(mine ? bubbleMine : bubbleOther),
                      borderTopRightRadius: mine && k.showHeader ? 4 : bubble.borderRadius as number,
                      borderTopLeftRadius: !mine && k.showHeader ? 4 : bubble.borderRadius as number,
                    }}
                  >
                    {k.pesan}
                  </div>
                  <div style={{ fontSize: 9.5, color: '#b7bfbb', marginTop: 3, padding: '0 2px' }}>
                    {k.tglDibuat || 'mengirim…'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div style={errBox}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="9" stroke="#A32D2D" strokeWidth="1.8" />
            <path d="M12 8v5M12 16h.01" stroke="#A32D2D" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}

      <div style={composeRow}>
        <textarea
          value={pesan}
          onChange={e => setPesan(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Tulis komentar revisi…"
          rows={1}
          style={{ ...inputArea, ...(focused ? inputAreaFocus : {}) }}
        />
        <button
          onClick={kirim}
          disabled={sending || !pesan.trim()}
          style={{
            ...sendBtn,
            opacity: (sending || !pesan.trim()) ? 0.4 : 1,
            cursor: (sending || !pesan.trim()) ? 'not-allowed' : 'pointer',
            transform: (!sending && pesan.trim()) ? 'scale(1)' : 'scale(0.94)',
          }}
          className="krv-send"
        >
          {sending ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation: 'krv-spin 0.8s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
      <div style={{ fontSize: 10, color: '#b7bfbb', marginTop: 6, paddingLeft: 2 }}>
        Enter untuk kirim · Shift+Enter baris baru
      </div>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @keyframes krv-spin { to { transform: rotate(360deg); } }
      @keyframes krv-fadeUp { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
      @keyframes krv-pulse { 0%,80%,100% { opacity:.25; transform: scale(0.85); } 40% { opacity:1; transform: scale(1); } }
      .krv-row { animation: krv-fadeUp 0.35s cubic-bezier(0.32,0.72,0,1) both; }
      .krv-refresh { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .krv-refresh:hover { background:#f1fbf7; color:#0F6E56; transform: rotate(50deg); }
      .krv-send { transition: all 0.3s cubic-bezier(0.32,0.72,0,1); }
      .krv-send:hover:not(:disabled) { transform: translateY(-1px) scale(1.04) !important; box-shadow: 0 6px 16px -4px rgba(15,110,86,0.5); }
      .krv-send:active:not(:disabled) { transform: scale(0.92) !important; }
    `}</style>
  );
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: '1rem 1.1rem 0.9rem',
  border: '1px solid rgba(10,46,36,0.08)', fontFamily: FONT,
  boxShadow: '0 1px 2px rgba(10,46,36,0.03)',
};
const headerRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 };
const titleIcon: React.CSSProperties = { width: 24, height: 24, borderRadius: 8, background: '#eef9f4', color: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const countPill: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, color: '#0F6E56', background: '#eef9f4', borderRadius: 100, padding: '1px 7px' };
const refreshBtn: React.CSSProperties = { width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(10,46,36,0.08)', background: '#fff', color: '#9aa5a1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const threadBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', maxHeight: 340, minHeight: 90, overflowY: 'auto', padding: '2px 2px 4px' };
const emptyState: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.6rem 0.5rem', color: '#9aa5a1', fontSize: 11.5, gap: 2 };
const emptyIconWrap: React.CSSProperties = { width: 40, height: 40, borderRadius: '50%', background: '#f1fbf7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 };
const pulseDots: React.CSSProperties = { display: 'flex', gap: 4, marginBottom: 8 };

const avatar: React.CSSProperties = { width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 6px -1px rgba(10,46,36,0.25)' };
const roleTag: React.CSSProperties = { fontSize: 8.5, fontWeight: 700, padding: '1.5px 6px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.04em' };
const roleAdmin: React.CSSProperties = { background: '#E6F1FB', color: '#0C447C' };
const roleMitra: React.CSSProperties = { background: '#E1F5EE', color: '#0F6E56' };

const bubble: React.CSSProperties = { fontSize: 12.5, padding: '9px 13px', borderRadius: 16, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
const bubbleMine: React.CSSProperties = { background: 'linear-gradient(135deg,#13987a,#0F6E56)', color: '#fff' };
const bubbleOther: React.CSSProperties = { background: '#f3f6f5', color: '#1f2d2a' };

const errBox: React.CSSProperties = { fontSize: 11, color: '#A32D2D', background: 'rgba(220,38,38,0.06)', padding: '7px 11px', borderRadius: 10, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 };

const composeRow: React.CSSProperties = { display: 'flex', gap: 7, marginTop: 12, alignItems: 'flex-end' };
const inputArea: React.CSSProperties = {
  flex: 1, padding: '10px 13px', borderRadius: 13, fontSize: 12.5, fontFamily: FONT,
  boxSizing: 'border-box', resize: 'none', outline: 'none', lineHeight: 1.5, color: '#0a2e24',
  background: '#fafcfb', border: '1.5px solid rgba(10,46,36,0.10)', transition: `all 0.35s ${EASE}`, maxHeight: 90,
};
const inputAreaFocus: React.CSSProperties = { background: '#fff', border: '1.5px solid #0F6E56', boxShadow: '0 0 0 4px rgba(15,110,86,0.08)' };
const sendBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
  background: 'linear-gradient(135deg,#13987a,#0F6E56)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 12px -3px rgba(15,110,86,0.5)',
};