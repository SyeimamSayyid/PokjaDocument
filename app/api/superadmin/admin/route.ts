import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, updateCell, findRow } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;

const COL = { ID: 0, NAMA: 1, EMAIL: 2, PASSWORD: 3, STATUS: 4, DIBUAT_OLEH: 5, TGL_DIBUAT: 6, TERAKHIR_LOGIN: 7, LEVEL: 8, WILAYAH: 9 };

const LOKASI_BNN_LIST = ['BNNP Sulsel', 'BNNK Palopo', 'BNNK Toraja', 'BNNK Bone', 'BNNK Sidrap'];

// Kelola Admin — Admin BNNP/BNNK bisa tambah admin (khusus level BNNP/BNNK,
// TIDAK BISA bikin akun BNN Utama). Admin BNN Utama JUGA bisa tambah admin,
// TAPI cuma sesama level BNN Utama (tidak masuk campur tangan wilayah
// BNNP/BNNK). Validasi kombinasi "siapa bikin siapa" ada di POST handler.
const levelDiizinkan = ['bnnp_bnnk', 'utama'];

async function cekAksesAdmin(req: NextRequest, butuhTulis: boolean) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return { ok: false as const, status: 401, message: 'Tidak diizinkan. Silakan login.' };
  const s = session as Record<string, unknown>;
  // Token lama role:'superadmin' (masa transisi) otomatis dianggap 'bnnp_bnnk'.
  const level = session.role === 'superadmin' ? 'bnnp_bnnk' : (String(s.level || '') === 'utama' ? 'utama' : 'bnnp_bnnk');
  if (butuhTulis && !levelDiizinkan.includes(level)) {
    return { ok: false as const, status: 403, message: 'Anda tidak memiliki akses untuk mengubah data admin.' };
  }
  return { ok: true as const, session, level };
}

export async function GET(req: NextRequest) {
  const akses = await cekAksesAdmin(req, false);
  if (!akses.ok) return NextResponse.json({ message: akses.message }, { status: akses.status });

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
        level: String(r[COL.LEVEL] || '').trim() === 'BNN Utama' ? 'BNN Utama' : 'BNNP/BNNK',
        wilayah: String(r[COL.WILAYAH] || '').trim(),
      }));
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const akses = await cekAksesAdmin(req, true);
  if (!akses.ok) return NextResponse.json({ message: akses.message }, { status: akses.status });

  try {
    const { nama, email, password, level, wilayah, dibuatOleh } = await req.json();

    if (!nama?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ message: 'Nama, email, dan password wajib diisi.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ message: 'Password minimal 6 karakter.' }, { status: 400 });
    }
    const levelBersih = level === 'BNN Utama' ? 'BNN Utama' : 'BNNP/BNNK';

    // Validasi silang — Admin BNNP/BNNK cuma boleh bikin akun BNNP/BNNK
    // (tidak boleh bikin BNN Utama). Admin BNN Utama levelnya lebih tinggi,
    // jadi BOLEH bikin akun level apa pun (BNNP/BNNK maupun sesama BNN Utama).
    if (akses.level === 'bnnp_bnnk' && levelBersih === 'BNN Utama') {
      return NextResponse.json({ message: 'Admin BNNP/BNNK tidak dapat membuat akun dengan level BNN Utama.' }, { status: 403 });
    }

    // Wilayah cuma wajib buat admin BNNP/BNNK — BNN Utama mengawasi semua wilayah.
    if (levelBersih === 'BNNP/BNNK' && !LOKASI_BNN_LIST.includes(String(wilayah || ''))) {
      return NextResponse.json({ message: 'Wilayah wajib dipilih untuk Admin BNNP/BNNK.' }, { status: 400 });
    }
    const wilayahBersih = levelBersih === 'BNN Utama' ? '' : String(wilayah || '');

    const existing = await findRow('Admin', COL.EMAIL, email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ message: 'Email sudah terdaftar sebagai Admin.' }, { status: 409 });
    }

    const id = generateId('ADM');
    await appendRow('Admin', [
      id,
      nama.trim(),
      email.trim().toLowerCase(),
      password,
      'Aktif',
      dibuatOleh || 'Admin',
      formatTanggalWaktu(new Date()),
      '',
      levelBersih,
      wilayahBersih,
    ]);

    return NextResponse.json({ message: 'Admin berhasil ditambahkan.', id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const akses = await cekAksesAdmin(req, true);
  if (!akses.ok) return NextResponse.json({ message: akses.message }, { status: akses.status });

  try {
    const { id, action, level, wilayah, nama, email } = await req.json();

    if (!id || !action) {
      return NextResponse.json({ message: 'ID dan action wajib diisi.' }, { status: 400 });
    }

    const found = await findRow('Admin', COL.ID, id);
    if (!found) {
      return NextResponse.json({ message: 'Admin tidak ditemukan.' }, { status: 404 });
    }

    if (action === 'kirimAksesEmail') {
      const email = String(found.data[COL.EMAIL] || '').trim();
      const nama  = String(found.data[COL.NAMA] || '').trim();
      const password = String(found.data[COL.PASSWORD] || '').trim();
      if (!email) return NextResponse.json({ message: 'Admin ini tidak punya alamat email.' }, { status: 400 });
      if (!password) return NextResponse.json({ message: 'Admin ini tidak punya password tersimpan.' }, { status: 400 });

      const r = await fetch(APPS_SCRIPT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kirimEmailAdminAkses', email, nama, password }),
        redirect: 'follow',
      });
      const d = await r.json();
      if (!d.success) return NextResponse.json({ message: d.error || 'Gagal mengirim email.' }, { status: 400 });

      return NextResponse.json({ message: `Email akses berhasil dikirim ke ${email}.` });
    }

    if (action === 'ubahNamaEmail') {
      const levelTarget = String(found.data[COL.LEVEL] || '').trim();
      if (akses.level === 'bnnp_bnnk' && levelTarget === 'BNN Utama') {
        return NextResponse.json({ message: 'Admin BNNP/BNNK tidak dapat mengubah nama/email milik Admin BNN Utama.' }, { status: 403 });
      }
      const namaBersih = String(nama || '').trim();
      const emailBersih = String(email || '').trim().toLowerCase();
      if (!namaBersih || !emailBersih) {
        return NextResponse.json({ message: 'Nama dan email wajib diisi.' }, { status: 400 });
      }
      // Cek duplikat email — kecuali kalau email-nya emang punya baris ini sendiri
      const existing = await findRow('Admin', COL.EMAIL, emailBersih);
      if (existing && String(existing.data[COL.ID]).trim() !== String(id).trim()) {
        return NextResponse.json({ message: 'Email sudah dipakai admin lain.' }, { status: 409 });
      }
      await updateCell('Admin', found.rowNumber, COL.NAMA + 1, namaBersih);
      await updateCell('Admin', found.rowNumber, COL.EMAIL + 1, emailBersih);
      return NextResponse.json({ message: 'Nama dan email berhasil diperbarui.', nama: namaBersih, email: emailBersih });
    }

    if (action === 'ubahLevel') {
      const levelBersih = level === 'BNN Utama' ? 'BNN Utama' : 'BNNP/BNNK';
      if (akses.level === 'bnnp_bnnk' && levelBersih === 'BNN Utama') {
        return NextResponse.json({ message: 'Admin BNNP/BNNK tidak dapat mengubah level akun menjadi BNN Utama.' }, { status: 403 });
      }
      await updateCell('Admin', found.rowNumber, COL.LEVEL + 1, levelBersih);
      return NextResponse.json({ message: `Level diubah menjadi ${levelBersih}.`, level: levelBersih });
    }

    if (action === 'ubahWilayah') {
      const wilayahBersih = String(wilayah || '');
      if (!LOKASI_BNN_LIST.includes(wilayahBersih)) {
        return NextResponse.json({ message: 'Wilayah tidak valid.' }, { status: 400 });
      }
      await updateCell('Admin', found.rowNumber, COL.WILAYAH + 1, wilayahBersih);
      return NextResponse.json({ message: `Wilayah diubah menjadi ${wilayahBersih}.`, wilayah: wilayahBersih });
    }

    return NextResponse.json({ message: 'Action tidak dikenali.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}