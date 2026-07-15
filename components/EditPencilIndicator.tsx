'use client';

const ADMIN_COLOR = '#082567';
const MITRA_COLOR = '#FFF9EB';

interface Props {
  manualLog?: string | null;
  size?: number;
}

type Pelaku = 'admin' | 'mitra' | null;

// manualLog datang dari /api/dokumen/aktivitas, formatnya:
// "12/07/2026 14:30 oleh Admin (Nama)" atau "... oleh Mitra (Nama)"
function parsePelaku(log?: string | null): Pelaku {
  if (!log) return null;
  if (log.includes('oleh Mitra')) return 'mitra';
  if (log.includes('oleh Admin')) return 'admin';
  return null;
}

export default function EditPencilIndicator({ manualLog, size = 30 }: Props) {
  const pelaku = parsePelaku(manualLog);
  if (!pelaku) return null;

  const isMitra = pelaku === 'mitra';
  const bg = isMitra ? MITRA_COLOR : ADMIN_COLOR;
  const fg = isMitra ? ADMIN_COLOR : MITRA_COLOR;
  const teks = isMitra
    ? 'Mitra telah melakukan perubahan pada docs'
    : 'Admin telah melakukan perubahan pada docs';

  return (
    <div
      className="epi-wrap"
      style={{
        ['--epi-bg' as any]: bg,
        ['--epi-fg' as any]: fg,
        ['--epi-size' as any]: `${size}px`,
        ['--epi-border' as any]: isMitra ? '1px solid rgba(8,37,103,0.14)' : '1px solid rgba(255,249,235,0.18)',
      }}
    >
      <style>{`
        .epi-wrap {
          display: inline-flex;
          align-items: center;
          height: var(--epi-size);
          border-radius: 100px;
          background: var(--epi-bg);
          border: var(--epi-border);
          overflow: hidden;
          max-width: var(--epi-size);
          transition: max-width 0.35s cubic-bezier(0.32,0.72,0,1), box-shadow 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          cursor: default;
          white-space: nowrap;
          vertical-align: middle;
        }
        .epi-wrap:hover {
          max-width: 340px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.18);
        }
        .epi-icon {
          width: var(--epi-size);
          height: var(--epi-size);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .epi-icon svg { width: 44%; height: 44%; }
        .epi-icon svg path { fill: var(--epi-fg); }
        .epi-label {
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: var(--epi-fg);
          padding-right: 14px;
          opacity: 0;
          transition: opacity 0.25s ease 0.1s;
        }
        .epi-wrap:hover .epi-label { opacity: 1; }
      `}</style>
      <span className="epi-icon">
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
        </svg>
      </span>
      <span className="epi-label">{teks}</span>
    </div>
  );
}