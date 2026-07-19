import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

// Dipanggil dari halaman manapun buat tau "siapa yang login sekarang" — nama,
// role, dan level (khusus admin: 'utama' | 'bnnp_bnnk') — sejak auth pindah
// dari localStorage ke cookie session, frontend butuh cara resmi buat baca ini.
export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ message: 'Tidak ada sesi aktif.' }, { status: 401 });
  }

  const s = session as Record<string, unknown>;

  return NextResponse.json({
    role: s.role,
    level: s.level || null, // 'utama' | 'bnnp_bnnk' — cuma relevan kalau role === 'admin'
    wilayah: s.wilayah || null, // cuma relevan kalau level === 'bnnp_bnnk'
    nama: s.nama || s.email || s.username || '',
    email: s.email || '',
    username: s.username || '',
    id: s.id || '',
    // Field khusus mitra (kalau role === 'mitra')
    idDokumen: s.idDokumen || undefined,
    namaMitra: s.namaMitra || undefined,
    // Field khusus pegawai_bnn
    nip: s.nip || undefined,
    lokasi: s.lokasi || undefined,
  });
}