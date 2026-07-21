import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateCell } from '@/lib/sheet';
import { formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const rows = await getSheetData('Pengaturan Laporan');
    const row = rows[0] || [];
    return NextResponse.json({
      namaKepala: String(row[0] || ''),
      pangkat: String(row[1] || ''),
      terakhirDiubah: String(row[2] || ''),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { namaKepala, pangkat, diubahOleh } = await req.json();
    if (!namaKepala?.trim() || !pangkat?.trim()) {
      return NextResponse.json({ message: 'Nama dan pangkat Kepala wajib diisi.' }, { status: 400 });
    }

    // Baris data selalu baris 2 (1 baris tunggal, di-update di tempat)
    await updateCell('Pengaturan Laporan', 2, 1, namaKepala.trim());
    await updateCell('Pengaturan Laporan', 2, 2, pangkat.trim());
    await updateCell('Pengaturan Laporan', 2, 3, formatTanggalWaktu(new Date()));
    await updateCell('Pengaturan Laporan', 2, 4, diubahOleh || '');

    return NextResponse.json({ message: 'Pengaturan berhasil disimpan.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}