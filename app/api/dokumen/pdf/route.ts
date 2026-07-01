import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { generatePdfTinggi } from '@/lib/pdfGenerator';

const COL = { ID:0, JENIS:1, JUDUL:2, NAMA_MITRA:4, STATUS:9, DOCS_ID:12 };

// ── POST: Generate & unduh PDF kualitas tinggi ─────────────
// Hanya untuk dokumen status Selesai ke atas
export async function POST(req: NextRequest) {
  try {
    const { idDokumen } = await req.json();
    if (!idDokumen) {
      return NextResponse.json({ message: 'ID dokumen wajib.' }, { status: 400 });
    }

    const rows = await getSheetData('Dokumen Kerja sama');
    const row  = rows.find(r => String(r[COL.ID]).trim() === idDokumen.trim());
    if (!row) {
      return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });
    }

    const status = String(row[COL.STATUS]).trim();
    const docsId = String(row[COL.DOCS_ID] || '');

    // PDF hanya boleh diunduh setelah status Selesai (atau lebih)
    const statusBolehUnduh = [
      'Selesai', 'Kegiatan Berlangsung', 'Kegiatan Selesai',
      'MOU/PKS Berlaku', 'Kedaluwarsa',
    ];
    if (!statusBolehUnduh.includes(status)) {
      return NextResponse.json({
        message: `PDF hanya bisa diunduh setelah dokumen berstatus "Selesai". Status saat ini: ${status}.`,
      }, { status: 403 });
    }

    if (!docsId) {
      return NextResponse.json({ message: 'Dokumen tidak punya Google Docs.' }, { status: 400 });
    }

    const jenis     = String(row[COL.JENIS]);
    const judul     = String(row[COL.JUDUL]);
    const namaMitra = String(row[COL.NAMA_MITRA]);
    const namaFile  = `${jenis}_${judul}_${namaMitra}`.replace(/[^a-zA-Z0-9_\- ]/g, '');

    const hasil = await generatePdfTinggi({ docsId, idDokumen, namaFile });

    return NextResponse.json({
      message:     'PDF berhasil dibuat.',
      pdfBase64:   hasil.pdfBase64,
      namaFile:    hasil.namaFile,
      pdfDriveUrl: hasil.pdfDriveUrl,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}