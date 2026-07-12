import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, findRow } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

// Kolom Sheet "Mitra" (0-based):
// 0 ID Mitra | 1 Nama Institusi | 2 Singkatan | 3 Email PIC | 4 Nama PIC | 5 Jabatan PIC
// 6 Alamat | 7 No Telepon | 8 Status | 9 Tanggal Daftar | 10 Folder Drive ID
const COL = {
  ID: 0, NAMA: 1, SINGKATAN: 2, EMAIL: 3, PIC: 4, JABATAN: 5,
  ALAMAT: 6, TELP: 7, STATUS: 8, TGL_DAFTAR: 9, FOLDER: 10,
};

export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const rows = await getSheetData('Mitra');
    const data = rows
      .filter(r => r[COL.ID])
      .map(r => ({
        id: String(r[COL.ID]).trim(),
        nama: r[COL.NAMA],
        singkatan: r[COL.SINGKATAN] || String(r[COL.NAMA]).substring(0, 2).toUpperCase(),
        email: r[COL.EMAIL],
        pic: r[COL.PIC],
        status: r[COL.STATUS] || 'Aktif',
        tglDaftar: r[COL.TGL_DAFTAR] || '',
      }));
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { namaInstitusi, singkatan, emailPIC, namaPIC, jabatan, alamat, noTelp } = await req.json();

    if (!namaInstitusi?.trim() || !emailPIC?.trim()) {
      return NextResponse.json({ message: 'Nama institusi dan email PIC wajib diisi.' }, { status: 400 });
    }

    const existing = await findRow('Mitra', COL.NAMA, namaInstitusi.trim());
    if (existing) {
      return NextResponse.json({ message: 'Mitra dengan nama ini sudah terdaftar.' }, { status: 409 });
    }

    const id = generateId('MTR');
    await appendRow('Mitra', [
      id,
      namaInstitusi.trim(),
      (singkatan?.trim() || namaInstitusi.substring(0, 2)).toUpperCase(),
      emailPIC.trim().toLowerCase(),
      namaPIC || '',
      jabatan || '',
      alamat || '',
      noTelp || '',
      'Aktif',
      formatTanggalWaktu(new Date()),
      '',
    ]);

    return NextResponse.json({ message: 'Mitra berhasil ditambahkan.', id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}