import { NextRequest, NextResponse } from 'next/server';

// ════════════════════════════════════════════════════════════
//  CATATAN ROUTE PUBLIK (tidak diproteksi middleware ini)
// ════════════════════════════════════════════════════════════
// Middleware ini HANYA berjalan untuk path yang cocok dengan `matcher`
// di bagian paling bawah file (/dashboard/* dan /mitra/*).
//
// Semua route publik berikut OTOMATIS lolos karena tidak masuk matcher:
//   Halaman publik:
//     /beranda                 → transparansi kegiatan
//     /beranda/[id]            → detail berita kegiatan
//     /daftar-kegiatan/[id]    → pendaftaran kegiatan (kuota)
//     /pengajuan               → form pengajuan kerja sama
//     /cek-pengajuan           → cek status pengajuan
//     /login, /login-mitra     → halaman login
//
//   API publik:
//     /api/beranda             → data tampilan beranda
//     /api/rencana/publik      → detail/list kegiatan untuk halaman daftar
//     /api/rencana/daftar      → submit pendaftaran + cek status by kode
//     /api/pengajuan/publik    → submit & cek pengajuan publik
//
//   API admin (TIDAK lewat middleware ini, tapi tetap perlu dijaga
//   di level route handler jika sensitif):
//     /api/rencana             → CRUD kegiatan (admin)
//     /api/superadmin/*        → operasi superadmin
//
// Kalau suatu saat matcher diperluas ke /api/*, tambahkan whitelist
// PUBLIC_API di bawah dan cek duluan sebelum proteksi.
// ════════════════════════════════════════════════════════════

// Sub-path SHARED di bawah /dashboard/superadmin yang boleh diakses admin juga.
// Dicek LEBIH DULU, sebelum fallback ke PROTECTED di bawah — supaya prefix match
// '/dashboard/superadmin' tidak keburu menolak admin sebelum sampai sini.
const SHARED_PATHS: Record<string, string[]> = {
  '/dashboard/superadmin/generate-kode': ['admin', 'superadmin'],
  '/dashboard/superadmin/laporan':       ['admin', 'superadmin'],
};

// Route yang butuh login + role tertentu (via cookie, untuk admin/superadmin).
// Mitra TIDAK dicek di sini karena memakai localStorage 'paktasign_mitra',
// bukan cookie — pengecekannya dilakukan di level komponen React (page.tsx).
const PROTECTED: Record<string, string[]> = {
  '/dashboard/superadmin': ['superadmin'],
  '/dashboard/admin':      ['admin', 'superadmin'],
  '/dashboard/dokumen':    ['admin', 'superadmin'],
  '/dashboard/pengajuan':  ['admin', 'superadmin'],
  '/dashboard/rencana':    ['admin', 'superadmin'],
};

// Path yang diizinkan untuk mitra (tanpa role check, ditangani client-side).
const MITRA_PATHS = [
  '/dashboard/mitra',
  '/mitra/dokumen',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── PATH MITRA ──────────────────────────────────────────
  // Skip middleware untuk semua path mitra; pengecekan dilakukan
  // di page.tsx (mitra pakai localStorage, bukan cookie).
  for (const mitraPath of MITRA_PATHS) {
    if (pathname.startsWith(mitraPath)) {
      return NextResponse.next();
    }
  }

  // ── PATH DASHBOARD ADMIN/SUPERADMIN ─────────────────────
  // 1. Cek SHARED_PATHS dulu (lebih spesifik — harus sebelum PROTECTED).
  const sharedMatch = Object.entries(SHARED_PATHS).find(([path]) =>
    pathname.startsWith(path)
  )?.[1];

  // 2. Fallback ke PROTECTED kalau tidak match SHARED_PATHS.
  const allowedRoles = sharedMatch ?? Object.entries(PROTECTED).find(([path]) =>
    pathname.startsWith(path)
  )?.[1];

  // Path tidak memerlukan proteksi → lanjut.
  if (!allowedRoles) return NextResponse.next();

  // Ambil user dari cookie (di-set saat login admin/superadmin).
  const userCookie = req.cookies.get('paktasign_user')?.value;

  if (!userCookie) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const user = JSON.parse(userCookie);
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Middleware hanya berjalan untuk path ini.
  // Route publik (/beranda, /daftar-kegiatan, /pengajuan, dll) TIDAK termasuk,
  // sehingga otomatis bisa diakses tanpa login.
  matcher: ['/dashboard/:path*', '/mitra/:path*'],
};