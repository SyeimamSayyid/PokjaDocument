import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateCell } from '@/lib/sheet';
import { formatTanggalWaktu } from '@/lib/utils';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

// Kolom "Dokumen Kerja sama" (0-based)
const COL = {
  ID:0, JENIS:1, JUDUL:2, ID_MITRA:3, NAMA_MITRA:4, TGL_DIBUAT:5,
  TGL_BERLAKU:6, TGL_BERAKHIR:7, DURASI:8, STATUS:9, KODE:10,
  KODE_EXP:11, DOCS_ID:12, DOCS_URL:13, FOLDER_ID:14,
  DIBUAT_OLEH:15, CATATAN:16, TERAKHIR_DIAKSES:17, FOTO_FOLDER:18,
};
// Kolom "Pengajuan Mitra" (0-based) — sumber email mitra, dicocokkan ke
// Dokumen Kerja sama lewat nama institusi (dokumen sendiri tidak punya
// kolom email langsung).
const PJ_COL = { NAMA: 2, EMAIL: 7 };

function normNama(s: unknown): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function bentukUser(row: string[], kodeExpireStr: string) {
  return {
    role: 'mitra' as const,
    idDokumen:   row[COL.ID],
    jenis:       row[COL.JENIS],
    judul:       row[COL.JUDUL],
    namaMitra:   String(row[COL.NAMA_MITRA]),
    status:      row[COL.STATUS],
    docsId:      row[COL.DOCS_ID],
    docsUrl:     row[COL.DOCS_URL],
    folderId:    row[COL.FOLDER_ID],
    fotoFolderId: row[COL.FOTO_FOLDER] || '',
    tglBerlaku:  row[COL.TGL_BERLAKU],
    tglBerakhir: row[COL.TGL_BERAKHIR],
    kodeExpire:  kodeExpireStr,
  };
}

// Bikin response berisi user + SET cookie sesi httpOnly (JWT) — ini yang
// sebelumnya KELEWATAN, jadi login "berhasil" di respons API tapi halaman
// berikutnya (dashboard mitra, detail dokumen) tetap nolak karena tidak ada
// sesi valid yang bisa dicek server-side, balik lagi ke halaman login.
async function responDenganSesi(user: ReturnType<typeof bentukUser>) {
  const token = await signSession(user as any);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const { kode, email } = await req.json();

    // ── Login via EMAIL + KODE AKSES (gabungan) — buat institusi yang punya
    // BEBERAPA dokumen (misal 7 MOU/PKS berbeda). Kode menentukan dokumen
    // SPESIFIK mana yang diakses (tidak auto-pilih terbaru lagi), email jadi
    // verifikasi tambahan memastikan mitra memang dari institusi pemilik
    // kode itu — jadi tidak keliru/nyasar ke dokumen institusi lain. ──
    if (email?.trim() && kode?.trim()) {
      const emailBersih = String(email).trim().toLowerCase();
      const kodeBersih = String(kode).trim().toUpperCase();

      const rows = await getSheetData('Dokumen Kerja sama');
      const idx = rows.findIndex(r => String(r[COL.KODE]).trim().toUpperCase() === kodeBersih);
      if (idx === -1) {
        return NextResponse.json({ message: 'Kode akses tidak ditemukan.' }, { status: 404 });
      }

      const row = rows[idx];
      const namaMitraRow = String(row[COL.NAMA_MITRA]);

      const pjRows = await getSheetData('Pengajuan Mitra');
      const emailCocokInstitusi = pjRows.some(r =>
        String(r[PJ_COL.EMAIL] || '').trim().toLowerCase() === emailBersih &&
        normNama(r[PJ_COL.NAMA]) === normNama(namaMitraRow)
      );
      if (!emailCocokInstitusi) {
        return NextResponse.json({
          message: 'Email tidak sesuai dengan institusi pemilik kode akses ini. Periksa kembali email dan kode yang Anda masukkan.',
        }, { status: 403 });
      }

      const rowNumber = idx + 2;
      const kodeExpireStr = String(row[COL.KODE_EXP]);
      const kodeExpire = new Date(kodeExpireStr);
      const now = new Date();
      if (!isNaN(kodeExpire.getTime()) && now > kodeExpire) {
        return NextResponse.json({
          message: 'Kode akses sudah kedaluwarsa. Hubungi Pokja Kerja Sama untuk kode baru.',
        }, { status: 410 });
      }

      await updateCell('Dokumen Kerja sama', rowNumber, COL.TERAKHIR_DIAKSES + 1,
        `${formatTanggalWaktu(now)} oleh Mitra (${namaMitraRow}) — login via email+kode`
      );

      return await responDenganSesi(bentukUser(row, kodeExpireStr));
    }

    // ── Login via EMAIL saja — opsi tambahan buat kasus kode akses tidak mau
    // terbaca/kepencet salah walau datanya sama persis di spreadsheet. Mitra
    // cukup masukkan email yang dipakai waktu pengajuan kerja sama. ──
    if (email?.trim() && !kode?.trim()) {
      const emailBersih = String(email).trim().toLowerCase();

      const pjRows = await getSheetData('Pengajuan Mitra');
      const namaCocok = new Set(
        pjRows
          .filter(r => String(r[PJ_COL.EMAIL] || '').trim().toLowerCase() === emailBersih)
          .map(r => normNama(r[PJ_COL.NAMA]))
      );

      if (namaCocok.size === 0) {
        return NextResponse.json({ message: 'Email ini tidak ditemukan di data pengajuan kerja sama.' }, { status: 404 });
      }

      const rows = await getSheetData('Dokumen Kerja sama');
      const dokCocok = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r[COL.ID] && namaCocok.has(normNama(r[COL.NAMA_MITRA])));

      if (dokCocok.length === 0) {
        return NextResponse.json({ message: 'Belum ada dokumen kerja sama yang terhubung dengan email ini.' }, { status: 404 });
      }

      // Kalau institusi ini punya beberapa dokumen (MOU & PKS terpisah, atau
      // pernah mengajukan lebih dari sekali), pilih yang PALING BARU dibuat —
      // itu yang paling mungkin sedang dicari mitra.
      dokCocok.sort((a, b) => new Date(String(b.r[COL.TGL_DIBUAT])).getTime() - new Date(String(a.r[COL.TGL_DIBUAT])).getTime());
      const { r: row, i: idx } = dokCocok[0];
      const rowNumber = idx + 2;

      const kodeExpireStr = String(row[COL.KODE_EXP]);
      const kodeExpire = new Date(kodeExpireStr);
      const now = new Date();
      if (!isNaN(kodeExpire.getTime()) && now > kodeExpire) {
        return NextResponse.json({
          message: 'Kode akses dokumen ini sudah kedaluwarsa. Hubungi Pokja Kerja Sama untuk kode baru.',
        }, { status: 410 });
      }

      const namaMitra = String(row[COL.NAMA_MITRA]);
      await updateCell('Dokumen Kerja sama', rowNumber, COL.TERAKHIR_DIAKSES + 1,
        `${formatTanggalWaktu(now)} oleh Mitra (${namaMitra}) — login via email`
      );

      return await responDenganSesi(bentukUser(row, kodeExpireStr));
    }

    // ── Login via KODE AKSES — alur asli, tidak diubah ──
    if (!kode?.trim()) {
      return NextResponse.json({ message: 'Kode akses atau email wajib diisi.' }, { status: 400 });
    }

    const rows = await getSheetData('Dokumen Kerja sama');
    const idx  = rows.findIndex(r => String(r[COL.KODE]).trim().toUpperCase() === kode.trim().toUpperCase());

    if (idx === -1) {
      return NextResponse.json({ message: 'Kode akses tidak ditemukan.' }, { status: 404 });
    }

    const row = rows[idx];
    const rowNumber = idx + 2; // +2 karena header di baris 1, array 0-based

    // Cek expire
    const kodeExpireStr = String(row[COL.KODE_EXP]);
    const kodeExpire = new Date(kodeExpireStr);
    const now = new Date();

    if (!isNaN(kodeExpire.getTime()) && now > kodeExpire) {
      return NextResponse.json({
        message: 'Kode akses sudah kedaluwarsa. Hubungi Pokja Kerja Sama untuk kode baru.',
      }, { status: 410 });
    }

    // Catat akses (manual log karena mitra tidak punya akun Google)
    const namaMitra = String(row[COL.NAMA_MITRA]);
    await updateCell('Dokumen Kerja sama', rowNumber, COL.TERAKHIR_DIAKSES + 1,
      `${formatTanggalWaktu(now)} oleh Mitra (${namaMitra})`
    );

    return await responDenganSesi(bentukUser(row, kodeExpireStr));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}