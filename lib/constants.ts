// lib/constants.ts
// ── Status Dokumen Kerja Sama (urutan resmi BARU — 8 tahap) ─────────
export const STATUS_DOKUMEN = [
  'Draft',
  'Dalam Proses',
  'Selesai',
  'Kegiatan Akan Berlangsung',
  'Kegiatan Berlangsung',
  'Kegiatan Selesai',
  'MOU/PKS Berlaku',
  'Kedaluwarsa',
] as const;

export type StatusDokumen = typeof STATUS_DOKUMEN[number];

export const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  'Draft':                     { bg: '#f3f4f6', color: '#6b7280' },
  'Dalam Proses':              { bg: '#EDE9FE', color: '#5B21B6' },
  'Selesai':                   { bg: '#FEF3E2', color: '#854F0B' },
  'Kegiatan Akan Berlangsung': { bg: '#E6F1FB', color: '#0C447C' },
  'Kegiatan Berlangsung':      { bg: '#D1FAE5', color: '#065F46' },
  'Kegiatan Selesai':          { bg: '#A7F3D0', color: '#065F46' },
  'MOU/PKS Berlaku':           { bg: '#E1F5EE', color: '#0F6E56' },
  'Kedaluwarsa':               { bg: '#FCEBEB', color: '#A32D2D' },
};

export const STATUS_DESC: Record<string, string> = {
  'Draft':                     'Dokumen sedang disusun oleh admin & mitra',
  'Dalam Proses':              'Mitra selesai mengisi, menunggu review admin',
  'Selesai':                   'Dokumen disetujui, menunggu jadwal kegiatan',
  'Kegiatan Akan Berlangsung': 'Dokumen final, menunggu tanggal kegiatan dimulai',
  'Kegiatan Berlangsung':      'Kegiatan sedang berlangsung — upload foto dibuka',
  'Kegiatan Selesai':          'Kegiatan telah selesai dilaksanakan',
  'MOU/PKS Berlaku':           'Dokumen aktif & berlaku (hitung mundur masa berlaku)',
  'Kedaluwarsa':               'Masa berlaku dokumen telah berakhir',
};

// Transisi MANUAL yang diizinkan (sisanya otomatis via trigger harian)
export const TRANSISI_MANUAL: Record<string, { next: string; label: string; siapa: string }[]> = {
  'Draft': [
    { next: 'Dalam Proses', label: 'Mitra Selesai Mengisi', siapa: 'mitra' },
  ],
  'Dalam Proses': [
    { next: 'Selesai', label: 'Setujui Dokumen (Acc)', siapa: 'admin' },
    { next: 'Draft',   label: 'Kembalikan ke Draft',   siapa: 'admin' },
  ],
};

export function hitungSisaHari(tglBerakhir: string): number | null {
  if (!tglBerakhir) return null;
  try {
    const akhir = new Date(tglBerakhir);
    const now   = new Date();
    const diff  = Math.ceil((akhir.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  } catch { return null; }
}