import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

// httpOnly cookie TIDAK BISA dihapus lewat document.cookie di client — harus
// lewat response server yang set maxAge:0. Dulu logout() di halaman admin
// cuma hapus localStorage + coba hapus cookie non-httpOnly yang sudah tidak
// dipakai lagi, jadi sesi sungguhan tetap aktif walau kelihatannya "logout".
export async function POST() {
  const res = NextResponse.json({ message: 'Berhasil keluar.' });
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}