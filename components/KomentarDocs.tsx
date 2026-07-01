'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Reply {
  id: string; content: string; author: string; createdTime: string;
}
interface DocComment {
  id: string; content: string; createdTime: string;
  resolved: boolean; author: string; quoted: string; replies: Reply[];
}

interface Props {
  docsId: string;
  /** Nama pengirim yang disisipkan ke teks (penulis resmi di Docs tetap service account). */
  namaPengirim: string;
}

const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";

export default function KomentarDocs({ docsId, namaPengirim }: Props) {
  const [list, setList]       = useState<DocComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [pesan, setPesan]     = useState('');
  const [sending, setSending] = useState(false);
  const [replyBox, setReplyBox] = useState<string | null>(null); // id komentar yg sedang dibalas
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [open, setOpen] = useState(false); // collapsed by default — panel sekunder
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!docsId) return;
    setLoading(true); setError('');
    try {
      const r = await fetch(`/api/komentar-revisi/docs?docsId=${encodeURIComponent(docsId)}`);
      const d = await r.json();
      if (!r.ok) { setError(d.message || 'Gagal memuat komentar Docs.'); return; }
      setList(Array.isArray(d.data) ? d.data : []);
    } catch {
      setError('Gagal memuat komentar Docs.');
    } finally {
      setLoading(false);
    }
  }, [docsId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const kirim = async () => {
    const teks = pesan.trim();
    if (!teks || sending || !docsId) return;
    setSending(true); setError('');
    try {
      const r = await fetch('/api/komentar-revisi/docs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docsId, content: teks, namaPengirim }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.message || 'Gagal mengirim ke Docs.'); return; }
      setPesan('');
      await load();
    } catch {
      setError('Gagal mengirim ke Docs.');
    } finally {
      setSending(false);
    }
  };

  const kirimBalasan = async (commentId: string) => {
    const teks = replyText.trim();
    if (!teks || sendingReply) return;
    setSendingReply(true); setError('');
    try {
      const r = await fetch('/api/komentar-revisi/docs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docsId, content: teks, namaPengirim, replyToCommentId: commentId }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.message || 'Gagal membalas.'); return; }
      setReplyText(''); setReplyBox(null);
      await load();
    } catch {
      setError('Gagal membalas.');
    } finally {
      setSendingReply(false);
    }
  };

  if (!docsId) return null;

  return (
    <div style={card}>
      <button onClick={() => setOpen(o => !o)} style={toggleBtn}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 3v4a1 1 0 0 0 1 1h4M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"
              stroke="#0F6E56" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0a2e24' }}>Komentar di Naskah (Google Docs)</span>
          {list.length > 0 && <span style={countPill}>{list.length}</span>}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
          <path d="m6 9 6 6 6-6" stroke="#9aa5a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={noteBox}>
            Komentar di sini muncul langsung di naskah Google Docs (bisa terkait teks yang disorot). Karena dikirim lewat sistem, nama pengirim disisipkan di awal teks — penulis resmi di Docs tetap tercatat sebagai akun sistem.
          </div>

          <div ref={listRef} style={threadBox}>
            {loading ? (
              <div style={emptyState}>Memuat komentar dari Docs…</div>
            ) : list.length === 0 ? (
              <div style={emptyState}>Belum ada komentar di naskah dokumen ini.</div>
            ) : (
              list.map(c => (
                <div key={c.id} style={commentBlock}>
                  {c.quoted && (
                    <div style={quoteBox}>&ldquo;{c.quoted}&rdquo;</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#283330' }}>{c.author}</div>
                      <div style={{ fontSize: 12, color: '#3a4742', marginTop: 2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.content}</div>
                      <div style={{ fontSize: 9.5, color: '#b7bfbb', marginTop: 3 }}>{c.createdTime ? new Date(c.createdTime).toLocaleString('id-ID') : ''}</div>
                    </div>
                    {c.resolved && <span style={resolvedPill}>Selesai</span>}
                  </div>

                  {c.replies.length > 0 && (
                    <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #eef1f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {c.replies.map(rp => (
                        <div key={rp.id}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#283330' }}>{rp.author}</div>
                          <div style={{ fontSize: 11.5, color: '#3a4742', marginTop: 1, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{rp.content}</div>
                          <div style={{ fontSize: 9, color: '#b7bfbb', marginTop: 2 }}>{rp.createdTime ? new Date(rp.createdTime).toLocaleString('id-ID') : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyBox === c.id ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <input
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') kirimBalasan(c.id); }}
                        placeholder="Balas komentar ini…"
                        style={replyInput}
                        autoFocus
                      />
                      <button onClick={() => kirimBalasan(c.id)} disabled={sendingReply || !replyText.trim()} style={miniBtn}>
                        {sendingReply ? '…' : 'Kirim'}
                      </button>
                      <button onClick={() => { setReplyBox(null); setReplyText(''); }} style={miniBtnGhost}>Batal</button>
                    </div>
                  ) : (
                    <button onClick={() => setReplyBox(c.id)} style={replyLink}>Balas</button>
                  )}
                </div>
              ))
            )}
          </div>

          {error && <div style={errBox}>{error}</div>}

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input
              value={pesan}
              onChange={e => setPesan(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') kirim(); }}
              placeholder="Tulis komentar baru ke naskah…"
              style={replyInput}
            />
            <button onClick={kirim} disabled={sending || !pesan.trim()} style={miniBtn}>
              {sending ? '…' : 'Kirim'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: '0.85rem 1.1rem', border: '1px solid rgba(10,46,36,0.08)', fontFamily: FONT, marginTop: 12 };
const toggleBtn: React.CSSProperties = { width: '100%', background: 'none', border: 'none', padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: FONT };
const countPill: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#0F6E56', background: '#eef9f4', borderRadius: 100, padding: '1px 7px', marginLeft: 6 };
const noteBox: React.CSSProperties = { fontSize: 10.5, color: '#78716c', background: '#fafaf9', border: '1px solid #f0efec', borderRadius: 10, padding: '8px 10px', marginBottom: 10, lineHeight: 1.5 };
const threadBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' };
const emptyState: React.CSSProperties = { fontSize: 11.5, color: '#9aa5a1', textAlign: 'center', padding: '1rem', background: '#f9fafb', borderRadius: 8 };
const commentBlock: React.CSSProperties = { paddingBottom: 10, borderBottom: '1px solid #f2f4f3' };
const quoteBox: React.CSSProperties = { fontSize: 11, color: '#854F0B', background: '#FEF3E2', borderLeft: '3px solid #d97706', padding: '5px 9px', borderRadius: 6, marginBottom: 6, fontStyle: 'italic' };
const resolvedPill: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: '#065F46', background: '#D1FAE5', borderRadius: 100, padding: '2px 8px', flexShrink: 0 };
const replyLink: React.CSSProperties = { fontSize: 10.5, color: '#0F6E56', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 6, fontWeight: 600, fontFamily: FONT };
const replyInput: React.CSSProperties = { flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(10,46,36,0.10)', fontSize: 11.5, fontFamily: FONT, outline: 'none' };
const miniBtn: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: 'none', background: '#0F6E56', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, flexShrink: 0 };
const miniBtnGhost: React.CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 11, cursor: 'pointer', fontFamily: FONT, flexShrink: 0 };
const errBox: React.CSSProperties = { fontSize: 11, color: '#A32D2D', background: 'rgba(220,38,38,0.06)', padding: '7px 11px', borderRadius: 8, marginTop: 8 };