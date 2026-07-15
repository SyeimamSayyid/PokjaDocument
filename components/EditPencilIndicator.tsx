'use client';

import { useState } from 'react';

// Warna disamakan persis dengan konstanta di dashboard admin (Indigo/Cream/Espresso)
const INDIGO = '#212842';
const CREAM = '#F0E7D5';
const ESPRESSO = '#6B4A32';
const SUNBURST = '#F8C61E';
const MIDNIGHT = '#252C37';
const FONT = "'Plus Jakarta Sans', -apple-system, sans-serif";

interface Props {
  /** Format dari server: "role|nama|waktu", mis. "admin|Admin1|2026-07-15 10:30:00" */
  manualLog?: string;
  size?: number;
  /** true kalau mitra memilih TTD Basah dan masih menunggu dokumen fisik diterima admin */
  ttdBasahPending?: boolean;
}

// Waktu relatif sederhana ("5 menit lalu", "2 hari lalu") — tanpa dependency tambahan
function waktuRelatif(waktuStr: string): string {
  const waktu = new Date(waktuStr.replace(' ', 'T'));
  if (isNaN(waktu.getTime())) return waktuStr;
  const detik = Math.floor((Date.now() - waktu.getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  if (detik < 2592000) return `${Math.floor(detik / 86400)} hari lalu`;
  return waktu.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Pensil biru (admin), krem (mitra), abu-abu (edit anonim), atau — kalau
// ttdBasahPending true — pensil Sunburst/Midnight yang animasinya berdenyut
// (nunjukin ada tindakan fisik yang masih ditunggu: dokumen TTD basah).
//
// PENTING: lingkaran dasarnya SELALU ukuran tetap (tidak melebar sama sekali).
// Label nama/waktu muncul sebagai tooltip "position: absolute" yang MELAYANG
// di atas konten lain (z-index tinggi) — jadi aman dipasang di tempat sempit
// kayak sel tabel, tanpa mendorong/merusak elemen di sampingnya.
export default function EditPencilIndicator({ manualLog, size = 26, ttdBasahPending = false }: Props) {
  const [hover, setHover] = useState(false);
  if (!manualLog && !ttdBasahPending) return null;

  const [role, nama, waktu] = manualLog ? manualLog.split('|') : ['', '', ''];
  const isAdmin = role === 'admin';
  const isMitra = role === 'mitra';

  const bg = ttdBasahPending ? undefined : (isAdmin ? INDIGO : isMitra ? CREAM : '#CBD5E1');
  const iconColor = ttdBasahPending ? MIDNIGHT : (isAdmin ? CREAM : isMitra ? ESPRESSO : '#475569');
  const label = ttdBasahPending ? 'Menunggu TTD Basah' : (isAdmin ? 'Admin' : isMitra ? 'Mitra' : 'Tidak dikenali');
  const waktuLabel = waktu ? waktuRelatif(waktu) : '';
  const teksTooltip = ttdBasahPending
    ? 'Menunggu dokumen fisik TTD Basah diterima admin'
    : `${nama || label}${waktuLabel ? ` · ${waktuLabel}` : ''}`;

  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={teksTooltip}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    >
      <style>{`
        @keyframes pencilTtdPulse {
          0%, 100% { background-color: ${SUNBURST}; }
          50% { background-color: ${MIDNIGHT}; }
        }
        .pencil-ttd-pulse { animation: pencilTtdPulse 1.8s ease-in-out infinite; }
        @keyframes pencilTooltipIn { from { opacity: 0; transform: translateX(-50%) translateY(3px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>

      {/* Lingkaran dasar — ukuran TETAP, tidak pernah melebar */}
      <span
        className={ttdBasahPending ? 'pencil-ttd-pulse' : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: '50%',
          flexShrink: 0,
          ...(bg ? { background: bg } : {}),
          border: ttdBasahPending ? 'none' : (isAdmin ? 'none' : '1px solid rgba(33,40,66,0.14)'),
          boxShadow: ttdBasahPending ? `0 2px 14px -2px ${SUNBURST}80` : '0 2px 10px -2px rgba(33,40,66,0.25)',
          cursor: 'default',
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          transform: hover ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        <svg
          viewBox="0 0 512 512"
          style={{
            width: size * 0.5,
            height: size * 0.5,
            flexShrink: 0,
            transform: hover ? 'rotate(360deg)' : 'rotate(0deg)',
            transition: 'transform 0.4s cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          <path
            fill={iconColor}
            d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"
          />
        </svg>
      </span>

      {/* Tooltip melayang — TIDAK ikut memengaruhi ukuran/posisi elemen lain
          di sekitarnya, tampil di atas (z-index tinggi), auto-hilang kalau
          tidak di-hover. Aman di tabel sempit sekalipun. */}
      {hover && (
        <span
          style={{
            position: 'absolute',
            bottom: '125%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f1f3d',
            color: '#fff',
            fontSize: 10.5,
            fontWeight: 600,
            fontFamily: FONT,
            padding: '6px 10px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 20px -6px rgba(15,23,42,0.4)',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'pencilTooltipIn 0.15s ease-out',
          }}
        >
          {teksTooltip}
          <span
            style={{
              position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
              borderWidth: 5, borderStyle: 'solid',
              borderColor: '#0f1f3d transparent transparent transparent',
            }}
          />
        </span>
      )}
    </span>
  );
}