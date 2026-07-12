import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const PEGAWAI_COL = { NIP: 0, LOKASI: 1, STATUS: 2 };

// Maksimal 5 percobaan login per 15 menit, per alamat IP.
const LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

type AdminSheetResult =
  | { user: Record<string, unknown> }
  | { error: string; status: number }
  | null;

async function cekSheetAdmin(
  sheetName: string,
  actualRole: 'superadmin' | 'admin',
  username: string,
  password: string
): Promise<AdminSheetResult> {
  const rows = await getSheetData(sheetName);
  const userRow = rows.find(
    r => String(r[2]).toLowerCase().trim() === username.toLowerCase().trim()
  );
  if (!userRow) return null;

  if (String(userRow[4]).toLowerCase().trim() !== 'aktif') {
    return { error: 'Akun tidak aktif. Hubungi Superadmin.', status: 403 };
  }
  if (String(userRow[3]).trim() !== password.trim()) {
    return { error: 'Password salah.', status: 401 };
  }

  return {
    user: {
      role: actualRole,
      id: userRow[0],
      nama: userRow[1],
      username: userRow[2],
      email: userRow[2],
    },
  };
}

async function setSessionCookie(res: NextResponse, user: Record<string, unknown>) {
  const token = await signSession(user as any);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limitResult = checkRateLimit(`login:${ip}`, LIMIT, WINDOW_MS);

  if (!limitResult.allowed) {
    return NextResponse.json(
      { message: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(limitResult.retryAfterSeconds / 60)} menit.` },
      { status: 429, headers: { 'Retry-After': String(limitResult.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const { role } = body;

    if (role === 'pegawai_bnn') {
      const nip = String(body.nip || '').trim();
      if (!nip) {
        return NextResponse.json({ message: 'NIP/NRP wajib diisi.' }, { status: 400 });
      }

      const rows = await getSheetData('Pegawai BNN');
      const row = rows.find(r => String(r[PEGAWAI_COL.NIP]).trim() === nip);

      if (!row) {
        return NextResponse.json({ message: 'NIP/NRP tidak ditemukan.' }, { status: 401 });
      }
      if (String(row[PEGAWAI_COL.STATUS]).toLowerCase().trim() !== 'aktif') {
        return NextResponse.json({ message: 'Akun tidak aktif. Hubungi Superadmin.' }, { status: 403 });
      }

      const user = {
        role: 'pegawai_bnn' as const,
        nip: row[PEGAWAI_COL.NIP],
        lokasi: row[PEGAWAI_COL.LOKASI] || '',
      };

      const res = NextResponse.json({ user });
      await setSessionCookie(res, user);
      return res;
    }

    if (role === 'admin') {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');

      if (!username || !password) {
        return NextResponse.json({ message: 'Email dan password wajib diisi.' }, { status: 400 });
      }

      let hasil = await cekSheetAdmin('Superadmin', 'superadmin', username, password);
      if (!hasil) hasil = await cekSheetAdmin('Admin', 'admin', username, password);

      if (!hasil) {
        return NextResponse.json({ message: 'Email tidak ditemukan.' }, { status: 401 });
      }
      if ('error' in hasil) {
        return NextResponse.json({ message: hasil.error }, { status: hasil.status });
      }

      const res = NextResponse.json({ user: hasil.user });
      await setSessionCookie(res, hasil.user);
      return res;
    }

    return NextResponse.json({ message: 'Role tidak dikenali.' }, { status: 400 });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return NextResponse.json({ message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}