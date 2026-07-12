import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Batas longgar — logout bukan target brute force, ini cuma jaga-jaga dari flood.
const LIMIT = 20;
const WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limitResult = checkRateLimit(`logout:${ip}`, LIMIT, WINDOW_MS);

  if (!limitResult.allowed) {
    return NextResponse.json(
      { message: 'Terlalu banyak permintaan. Coba lagi sesaat lagi.' },
      { status: 429, headers: { 'Retry-After': String(limitResult.retryAfterSeconds) } }
    );
  }

  const res = NextResponse.json({ message: 'Berhasil keluar.' });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}