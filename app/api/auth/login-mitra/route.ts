import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, findRow, updateCell } from '@/lib/sheet';
import { formatTanggalWaktu } from '@/lib/utils';

// Kolom "Dokumen Kerja sama" (0-based)
const COL = {
  ID:0, JENIS:1, JUDUL:2, ID_MITRA:3, NAMA_MITRA:4, TGL_DIBUAT:5,
  TGL_BERLAKU:6, TGL_BERAKHIR:7, DURASI:8, STATUS:9, KODE:10,
  KODE_EXP:11, DOCS_ID:12, DOCS_URL:13, FOLDER_ID:14,
  DIBUAT_OLEH:15, CATATAN:16, TERAKHIR_DIAKSES:17, FOTO_FOLDER:18,
};

export async function POST(req: NextRequest) {
  try {
    const { kode } = await req.json();

    if (!kode?.trim()) {
      return NextResponse.json({ message: 'Kode akses wajib diisi.' }, { status: 400 });
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

    return NextResponse.json({
      user: {
        role: 'mitra',
        idDokumen:   row[COL.ID],
        jenis:       row[COL.JENIS],
        judul:       row[COL.JUDUL],
        namaMitra:   namaMitra,
        status:      row[COL.STATUS],
        docsId:      row[COL.DOCS_ID],
        docsUrl:     row[COL.DOCS_URL],
        folderId:    row[COL.FOLDER_ID],
        fotoFolderId: row[COL.FOTO_FOLDER] || '',
        tglBerlaku:  row[COL.TGL_BERLAKU],
        tglBerakhir: row[COL.TGL_BERAKHIR],
        kodeExpire:  kodeExpireStr,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}