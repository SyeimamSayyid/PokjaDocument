// Helper functions — ID & kode generator
// Format tanggal dibuat ISO-like agar bisa di-parse ulang dengan new Date()

export function generateId(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${y}${m}-${rand}`;
}

export function generateKodeAkses(jenis: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let kode = '';
  for (let i = 0; i < 6; i++) {
    kode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${jenis}-${kode}`;
}

// Format: YYYY-MM-DD (parseable, tidak terpengaruh timezone shift)
export function formatTanggal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Format: YYYY-MM-DD HH:mm:ss (parseable oleh new Date())
export function formatTanggalWaktu(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${formatTanggal(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}