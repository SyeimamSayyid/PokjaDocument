import { NextResponse } from 'next/server';

// ⛔ Endpoint upload/hapus foto dari halaman publik DINONAKTIFKAN.
// Alasan keamanan: halaman /beranda/[id] bersifat publik tanpa autentikasi
// server yang andal (role dari localStorage bisa dipalsukan).
// Upload foto kegiatan hanya boleh lewat halaman mitra yang sudah login
// melalui /api/dokumen/foto/upload (yang memvalidasi status dokumen di server).

export async function POST() {
  return NextResponse.json(
    { message: 'Upload foto tidak tersedia di halaman ini. Gunakan dashboard mitra.' },
    { status: 403 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { message: 'Hapus foto tidak tersedia di halaman ini. Gunakan dashboard admin.' },
    { status: 403 }
  );
}