import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

// ════════════════════════════════════════════════════════════
//  CATATAN ROUTE PUBLIK (tidak diproteksi middleware ini)
// ════════════════════════════════════════════════════════════
// Middleware ini HANYA berjalan untuk path yang cocok dengan `matcher`
// di bagian paling bawah file (/dashboard/* dan /mitra/*).
//
// Semua route publik berikut OTOMATIS lolos karena tidak masuk matcher:
//   Halaman publik:
//     /beranda, /beranda/[id], /daftar-kegiatan/[id]
//     /pengajuan, /cek-pengajuan, /login, /login-mitra
//   API publik:
//     /api/beranda, /api/rencana/publik, /api/rencana/daftar, /api/pengajuan/publik
//
//   API admin (TIDAK lewat middleware ini — perlu dijaga sendiri
//   di level route handler pakai requireSession() dari lib/auth.ts):
//     /api/rencana, /api/superadmin/*, dll.
// ════════════════════════════════════════════════════════════

// Sub-path SHARED di bawah /dashboard/superadmin yang boleh diakses admin juga.
// Dicek LEBIH DULU, sebelum fallback ke PROTECTED — supaya prefix match
// '/dashboard/superadmin' tidak keburu menolak admin sebelum sampai sini.
const SHARED_PATHS: Record<string, string[]> = {
  '/dashboard/superadmin/generate-kode': ['admin', 'superadmin'],
  '/dashboard/superadmin/laporan':       ['admin', 'superadmin'],
};

// Route yang butuh login + role tertentu (via cookie JWT, admin/superadmin).
const PROTECTED: Record<string, string[]> = {
  '/dashboard/superadmin':           ['superadmin'],
  '/dashboard/admin':                ['admin', 'superadmin'],
  '/dashboard/dokumen':              ['admin', 'superadmin'],
  '/dashboard/pengajuan':            ['admin', 'superadmin'],
  '/dashboard/rencana':              ['admin', 'superadmin'],
  '/dashboard/kontak':               ['admin', 'superadmin'],
  '/dashboard/kelola-kegiatan':      ['admin', 'superadmin'],
  '/dashboard/arsip':                ['admin', 'superadmin'],
  '/dashboard/tata-kelola-instansi': ['admin', 'superadmin'],
  '/dashboard/hukum':                ['admin', 'superadmin'],
};

// Path mitra — dicek via cookie JWT (role 'mitra').
const MITRA_PATHS = ['/dashboard/mitra', '/mitra/dokumen'];

// Path Pegawai BNN — dicek via cookie JWT (role 'pegawai_bnn').
const PEGAWAI_PATHS = ['/dashboard/pegawai'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  // ── PATH MITRA ──────────────────────────────────────────
  const isMitraPath = MITRA_PATHS.some(p => pathname.startsWith(p));
  if (isMitraPath) {
    if (!session || session.role !== 'mitra') {
      return NextResponse.redirect(new URL('/login-mitra', req.url));
    }
    return NextResponse.next();
  }

  // ── PATH PEGAWAI BNN ─────────────────────────────────────
  const isPegawaiPath = PEGAWAI_PATHS.some(p => pathname.startsWith(p));
  if (isPegawaiPath) {
    if (!session || session.role !== 'pegawai_bnn') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // ── PATH DASHBOARD ADMIN/SUPERADMIN ─────────────────────
  const sharedMatch = Object.entries(SHARED_PATHS).find(([path]) =>
    pathname.startsWith(path)
  )?.[1];

  const allowedRoles = sharedMatch ?? Object.entries(PROTECTED).find(([path]) =>
    pathname.startsWith(path)
  )?.[1];

  // Path tidak masuk daftar proteksi → lanjut.
  if (!allowedRoles) return NextResponse.next();

  // 1. Tidak ada sesi sama sekali (atau JWT invalid/expired) → wajib login dulu.
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. Ada sesi valid, tapi rolenya bukan admin/superadmin sama sekali
  //    (misal ternyata session.role === 'mitra' atau 'pegawai_bnn' nyasar ke sini)
  //    → tetap ke login.
  if (!['admin', 'superadmin'].includes(String(session.role))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 3. Sudah login sah sebagai admin/superadmin, TAPI rolenya kurang untuk
  //    path spesifik ini (misal admin coba akses area superadmin-only)
  //    → jangan lempar ke login, cukup lempar ke dashboard yang sesuai rolenya.
  if (!allowedRoles.includes(String(session.role))) {
    return NextResponse.redirect(new URL('/dashboard/admin', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/mitra/:path*'],
};