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

// Login dari sheet "Admin" — sekarang baca kolom Level (index 8) buat
// bedain 'utama' (BNN Utama) vs 'bnnp_bnnk' (BNNP/BNNK). Kosong/tidak
// dikenali dianggap 'bnnp_bnnk' (aman, level paling terbatas).
async function cekSheetAdmin(username: string, password: string): Promise<AdminSheetResult> {
  const rows = await getSheetData('Admin');
  const userRow = rows.find(
    r => String(r[2]).toLowerCase().trim() === username.toLowerCase().trim()
  );
  if (!userRow) return null;

  if (String(userRow[4]).toLowerCase().trim() !== 'aktif') {
    return { error: 'Akun tidak aktif. Hubungi Admin BNN Utama.', status: 403 };
  }
  if (String(userRow[3]).trim() !== password.trim()) {
    return { error: 'Password salah.', status: 401 };
  }

  const levelRaw = String(userRow[8] || '').trim().toLowerCase();
  const level = levelRaw === 'bnn utama' ? 'utama' : 'bnnp_bnnk';
  const wilayah = level === 'bnnp_bnnk' ? String(userRow[9] || '').trim() : '';

  return {
    user: {
      role: 'admin',
      level,
      wilayah,
      id: userRow[0],
      nama: userRow[1],
      username: userRow[2],
      email: userRow[2],
    },
  };
}

// Login dari sheet "Superadmin" — DILEBUR ke role 'admin' dengan level
// 'bnnp_bnnk' (setara Admin BNNP/BNNK penuh, termasuk fitur yang dulu
// superadmin-only kayak Kelola Admin). Sheet "Superadmin" TIDAK dihapus,
// akun lama tetap bisa login lewat sini — cuma perannya sekarang disamakan.
async function cekSheetSuperadmin(username: string, password: string): Promise<AdminSheetResult> {
  const rows = await getSheetData('Superadmin');
  const userRow = rows.find(
    r => String(r[2]).toLowerCase().trim() === username.toLowerCase().trim()
  );
  if (!userRow) return null;

  if (String(userRow[4]).toLowerCase().trim() !== 'aktif') {
    return { error: 'Akun tidak aktif. Hubungi Admin BNN Utama.', status: 403 };
  }
  if (String(userRow[3]).trim() !== password.trim()) {
    return { error: 'Password salah.', status: 401 };
  }

  return {
    user: {
      role: 'admin',
      level: 'bnnp_bnnk', // dilebur — bukan lagi role terpisah 'superadmin'
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

      // Coba sheet Admin dulu, baru Superadmin (keduanya sekarang jadi role
      // 'admin' — bedanya cuma di field 'level').
      let hasil = await cekSheetAdmin(username, password);
      if (!hasil) hasil = await cekSheetSuperadmin(username, password);

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