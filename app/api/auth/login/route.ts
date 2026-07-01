// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, username, password, kode } = body;

    console.log('Login attempt:', { role, username, kode });

    // ── LOGIN MITRA (via kode akses) ──────────────────────────
    if (role === 'mitra') {
      if (!kode) {
        return NextResponse.json({ message: 'Kode akses wajib diisi.' }, { status: 400 });
      }

      const rows = await getSheetData('Dokumen Kerja sama');
      
      // Cari dokumen dengan kode akses yang sesuai
      const dokRow = rows.find((r) => r[10]?.toUpperCase() === kode.toUpperCase());
      
      if (!dokRow) {
        return NextResponse.json({ message: 'Kode tidak ditemukan.' }, { status: 401 });
      }

      // Cek masa berlaku
      const expireDate = new Date(dokRow[11]);
      const now = new Date();
      
      if (now > expireDate) {
        return NextResponse.json({ message: 'Kode sudah kedaluwarsa.' }, { status: 401 });
      }

      return NextResponse.json({
        user: {
          role: 'mitra',
          id: dokRow[0],
          nama: dokRow[4],
          email: dokRow[5],
          kodeAkses: kode,
          judulDokumen: dokRow[2],
          jenis: dokRow[1]
        }
      });
    }

    // ── LOGIN SUPERADMIN / ADMIN ──────────────────────────────
    if (!username || !password) {
      return NextResponse.json({ message: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    // Pilih sheet berdasarkan role
    const sheetName = role === 'superadmin' ? 'Superadmin' : 'Admin';
    const rows = await getSheetData(sheetName);

    // Debug log
    console.log(`Checking ${sheetName} sheet, total rows:`, rows.length);
    if (rows.length === 0) {
      console.log('Sheet is empty or not accessible');
    } else {
      console.log('First row sample:', rows[0]);
    }

    // Cari user berdasarkan username (kolom C = email/username)
    const userRow = rows.find(
      (r) => String(r[2]).toLowerCase().trim() === username.toLowerCase().trim()
    );

    if (!userRow) {
      console.log('User not found:', username);
      return NextResponse.json({ message: 'Username tidak ditemukan.' }, { status: 401 });
    }

    console.log('User found:', userRow[1], '| Status:', userRow[4]);

    // Cek status akun
    if (String(userRow[4]).toLowerCase().trim() !== 'aktif') {
      return NextResponse.json({ message: 'Akun tidak aktif. Hubungi Superadmin.' }, { status: 403 });
    }

    // Cek password
    if (String(userRow[3]).trim() !== password.trim()) {
      console.log('Password mismatch');
      return NextResponse.json({ message: 'Password salah.' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        role: role,
        id: userRow[0],
        nama: userRow[1],
        username: userRow[2],
        email: userRow[2]
      }
    });

  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return NextResponse.json(
      { message: 'Terjadi kesalahan server.', detail: String(err) },
      { status: 500 }
    );
  }
}