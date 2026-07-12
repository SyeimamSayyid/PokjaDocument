import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateCell, findRow } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const COL = { ID: 0, NAMA: 1, EMAIL: 2, PASSWORD: 3, STATUS: 4, DIBUAT_OLEH: 5, TGL_DIBUAT: 6, TERAKHIR_LOGIN: 7 };

export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const rows = await getSheetData('Admin');
    const data = rows
      .filter(r => r[COL.ID])
      .map(r => ({
        id: String(r[COL.ID]).trim(),
        nama: r[COL.NAMA],
        email: r[COL.EMAIL],
        status: r[COL.STATUS],
        tanggalDibuat: r[COL.TGL_DIBUAT] || '-',
        terakhirLogin: r[COL.TERAKHIR_LOGIN] || '-',
      }));
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { nama, email, password, dibuatOleh } = await req.json();

    if (!nama?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ message: 'Nama, email, dan password wajib diisi.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ message: 'Password minimal 6 karakter.' }, { status: 400 });
    }

    const existing = await findRow('Admin', COL.EMAIL, email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ message: 'Email sudah terdaftar sebagai Admin Pokja.' }, { status: 409 });
    }

    const id = generateId('ADM');
    await appendRow('Admin', [
      id,
      nama.trim(),
      email.trim().toLowerCase(),
      password,
      'Aktif',
      dibuatOleh || 'Superadmin',
      formatTanggalWaktu(new Date()),
      '',
    ]);

    return NextResponse.json({ message: 'Admin Pokja berhasil ditambahkan.', id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession(req, ['superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { id, action, newPassword } = await req.json();

    if (!id || !action) {
      return NextResponse.json({ message: 'ID dan action wajib diisi.' }, { status: 400 });
    }

    const found = await findRow('Admin', COL.ID, id);
    if (!found) {
      return NextResponse.json({ message: 'Admin tidak ditemukan.' }, { status: 404 });
    }

    if (action === 'toggle') {
      const current = String(found.data[COL.STATUS]).toLowerCase().trim();
      const newStatus = current === 'aktif' ? 'Nonaktif' : 'Aktif';
      await updateCell('Admin', found.rowNumber, COL.STATUS + 1, newStatus);
      return NextResponse.json({ message: `Status diubah menjadi ${newStatus}.`, status: newStatus });
    }

    if (action === 'reset') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ message: 'Password baru minimal 6 karakter.' }, { status: 400 });
      }
      await updateCell('Admin', found.rowNumber, COL.PASSWORD + 1, newPassword);
      return NextResponse.json({ message: 'Password berhasil direset.' });
    }

    return NextResponse.json({ message: 'Action tidak dikenali.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}