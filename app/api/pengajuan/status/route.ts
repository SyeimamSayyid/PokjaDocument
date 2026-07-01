import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, findRow, updateCell } from '@/lib/sheet';

// Kolom sheet "Pengajuan Mitra" (0-based) — sesuai struktur asli:
const COL = {
  ID:0, ID_MITRA:1, NAMA:2, JENIS:3, DESKRIPSI:4, TGL_KEGIATAN:5,
  BIAYA:6, EMAIL:7, WA:8, STATUS:9, KODE:10, TGL_SUBMIT:11,
  CATATAN:12, JURUSAN:13, FILE_ID:14, FILE_URL:15, FILE_NAMA:16, DIVISI:17,
};

const STATUS_DOKUMEN = [
  'Draft', 'Dalam Proses', 'Selesai', 'Kegiatan Berlangsung',
  'Kegiatan Selesai', 'MOU/PKS Berlaku', 'Kedaluwarsa',
];

const STATUS_PENGAJUAN = ['Diajukan', 'Ditinjau', 'Disetujui', 'Ditolak'];

// ── GET: List pengajuan masuk (Admin) ──────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter       = searchParams.get('status') || '';
    const divisiFilter = searchParams.get('divisi') || '';

    const rows = await getSheetData('Pengajuan Mitra');
    let data = rows
      .filter(r => r[COL.ID])
      .map(r => ({
        id:              String(r[COL.ID]),
        idMitra:         String(r[COL.ID_MITRA] || ''),
        namaInstitusi:   String(r[COL.NAMA] || ''),
        jenis:           String(r[COL.JENIS] || ''),
        deskripsi:       String(r[COL.DESKRIPSI] || ''),
        tanggalKegiatan: String(r[COL.TGL_KEGIATAN] || ''),
        biaya:           String(r[COL.BIAYA] || ''),
        email:           String(r[COL.EMAIL] || ''),
        noWa:            String(r[COL.WA] || ''),
        status:          String(r[COL.STATUS] || ''),
        kodeTracking:    String(r[COL.KODE] || ''),
        tglSubmit:       String(r[COL.TGL_SUBMIT] || ''),
        catatan:         String(r[COL.CATATAN] || ''),
        jurusan:         String(r[COL.JURUSAN] || ''),
        fileDokumenId:   String(r[COL.FILE_ID] || ''),
        fileDokumenUrl:  String(r[COL.FILE_URL] || ''),
        fileDokumenNama: String(r[COL.FILE_NAMA] || ''),
        divisi:          String(r[COL.DIVISI] || ''),
      }))
      .reverse();

    if (filter)       data = data.filter(d => d.status === filter);
    if (divisiFilter === 'belum') data = data.filter(d => !d.divisi);
    else if (divisiFilter)        data = data.filter(d => d.divisi === divisiFilter);

    return NextResponse.json({ data, statusOptions: STATUS_PENGAJUAN });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: Update status pengajuan / dokumen ───────────────
export async function PATCH(req: NextRequest) {
  try {
    const { tipe, id, statusBaru, catatan } = await req.json();

    if (!id || !statusBaru) {
      return NextResponse.json({ message: 'ID dan status baru wajib diisi.' }, { status: 400 });
    }

    if (tipe === 'dokumen') {
      if (!STATUS_DOKUMEN.includes(statusBaru)) {
        return NextResponse.json({ message: `Status tidak valid. Pilihan: ${STATUS_DOKUMEN.join(', ')}` }, { status: 400 });
      }
      const found = await findRow('Dokumen Kerja sama', 0, id);
      if (!found) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });
      await updateCell('Dokumen Kerja sama', found.rowNumber, 10, statusBaru); // kolom J Status
      if (catatan) await updateCell('Dokumen Kerja sama', found.rowNumber, 17, catatan); // kolom Q Catatan
      return NextResponse.json({ message: `Status dokumen diubah ke "${statusBaru}".` });
    }

    if (tipe === 'pengajuan') {
      if (!STATUS_PENGAJUAN.includes(statusBaru)) {
        return NextResponse.json({ message: `Status tidak valid. Pilihan: ${STATUS_PENGAJUAN.join(', ')}` }, { status: 400 });
      }
      const rows = await getSheetData('Pengajuan Mitra');
      const idx  = rows.findIndex(r => String(r[COL.ID]).trim() === id.trim());
      if (idx === -1) return NextResponse.json({ message: 'Pengajuan tidak ditemukan.' }, { status: 404 });

      const rowNumber = idx + 2;
      await updateCell('Pengajuan Mitra', rowNumber, COL.STATUS + 1, statusBaru);   // J Status (kolom 10)
      if (catatan) await updateCell('Pengajuan Mitra', rowNumber, COL.CATATAN + 1, catatan); // M Catatan Admin (kolom 13)

      return NextResponse.json({ message: `Status pengajuan diubah ke "${statusBaru}".` });
    }

    return NextResponse.json({ message: 'Tipe harus "pengajuan" atau "dokumen".' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}