import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const ALG = 'HS256';
const EXPIRES_IN = '24h';

export const SESSION_COOKIE = 'paktasign_session';
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24 jam, samakan dgn EXPIRES_IN

export type SessionRole = 'superadmin' | 'admin' | 'mitra' | 'pegawai_bnn';

export interface SessionPayload {
  role: SessionRole;
  [key: string]: unknown;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null; // signature invalid, expired, atau token rusak
  }
}

// Helper siap pakai untuk proteksi API route satu-per-satu (belum diterapkan otomatis).
// Contoh pakai di dalam route handler:
//   const session = await requireSession(req, ['admin', 'superadmin']);
//   if (!session) return NextResponse.json({ message: 'Tidak diizinkan.' }, { status: 401 });
export async function requireSession(
  req: NextRequest,
  allowedRoles?: SessionRole[]
): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  if (allowedRoles && !allowedRoles.includes(session.role as SessionRole)) return null;
  return session;
}