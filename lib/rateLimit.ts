// Rate limiter sederhana berbasis memori (per-instance server).
// Cukup untuk skala institusi seperti ini — bukan solusi kelas enterprise
// (di Vercel dengan banyak instance serverless, tiap instance punya
// hitungannya sendiri), tapi jauh lebih baik daripada tanpa batas sama sekali.

interface Bucket { count: number; resetAt: number; }

const buckets = new Map<string, Bucket>();

// Bersihkan bucket kedaluwarsa tiap 5 menit biar Map tidak membengkak selamanya.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000);
// unref() supaya interval ini tidak mencegah proses Node berhenti saat build/shutdown.
if (typeof cleanupInterval.unref === 'function') cleanupInterval.unref();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param key Identitas unik pembatas — biasanya `${ip}:${endpoint}`
 * @param limit Jumlah maksimal request yang diizinkan dalam windowMs
 * @param windowMs Panjang jendela waktu dalam milidetik
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

// Ambil IP client dari header proxy (Vercel selalu lewat proxy, jadi req.ip langsung tidak akurat).
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}