'use client';

// Badge kecil "Dokumen Basah" — versi mini dari kubus 3D berputar, dipakai
// di pojok kanan atas kartu arsip untuk dokumen yang TTD-nya basah (fisik).
// Ukurannya sengaja diperkecil drastis (18px) biar tidak mengganggu layout
// kartu, animasinya tetap jalan tapi halus (tidak mencolok).
export default function BadgeDokumenBasah({ size = 18 }: { size?: number }) {
  return (
    <div
      title="Dokumen Basah — TTD fisik"
      style={{
        position: 'absolute', top: 8, right: 8, width: size, height: size,
        zIndex: 5, pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes badgeBasahSpin {
          0% { transform: rotate(45deg) rotateX(-25deg) rotateY(25deg); }
          50% { transform: rotate(45deg) rotateX(-385deg) rotateY(25deg); }
          100% { transform: rotate(45deg) rotateX(-385deg) rotateY(385deg); }
        }
        .badge-basah-cube {
          width: 100%; height: 100%;
          animation: badgeBasahSpin 3.2s infinite ease;
          transform-style: preserve-3d;
        }
        .badge-basah-cube > div {
          background-color: rgba(247,197,159,0.15);
          height: 100%; width: 100%;
          position: absolute;
          border: 1px solid rgb(217,119,6);
        }
        .badge-basah-cube div:nth-of-type(1) { transform: translateZ(-9px) rotateY(180deg); }
        .badge-basah-cube div:nth-of-type(2) { transform: rotateY(-270deg) translateX(50%); transform-origin: top right; }
        .badge-basah-cube div:nth-of-type(3) { transform: rotateY(270deg) translateX(-50%); transform-origin: center left; }
        .badge-basah-cube div:nth-of-type(4) { transform: rotateX(90deg) translateY(-50%); transform-origin: top center; }
        .badge-basah-cube div:nth-of-type(5) { transform: rotateX(-90deg) translateY(50%); transform-origin: bottom center; }
        .badge-basah-cube div:nth-of-type(6) { transform: translateZ(9px); }
      `}</style>
      <div className="badge-basah-cube">
        <div /><div /><div /><div /><div /><div />
      </div>
    </div>
  );
}