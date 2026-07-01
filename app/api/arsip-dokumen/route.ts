import { NextRequest, NextResponse } from 'next/server';
import { appendRow, getSheetData } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEBAPP_URL!;
const SHEET = 'Arsip Dokumen';

// Kolom (0-based): 0 ID, 1 Nama Institusi, 2 Jenis, 3 Judul, 4 Tgl Berlaku,
// 5 Tgl Berakhir, 6 File ID, 7 File URL, 8 Nama File, 9 Nama PIC,
// 10 Email PIC, 11 No WA PIC, 12 Catatan, 13 Diarsipkan Oleh, 14 Tgl Diarsipkan
const C = {
  ID: 0, NAMA: 1, JENIS: 2, JUDUL: 3, TGL_BERLAKU: 4, TGL_BERAKHIR: 5,
  FILE_ID: 6, FILE_URL: 7, NAMA_FILE: 8, PIC: 9, EMAIL: 10, WA: 11,
  CATATAN: 12, OLEH: 13, TGL_ARSIP: 14,
};

async function uploadFileArsip(params: { namaFile: string; base64Data: string; mimeType: string }) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'uploadArsipDokumen', ...params }),
    redirect: 'follow',
  });
  return res.json();
}

// ── GET: daftar arsip (opsional filter: jenis, cari) ───────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jenis = searchParams.get('jenis')?.trim();
    const cari  = searchParams.get('cari')?.trim().toLowerCase();

    let rows: string[][] = [];
    try {
      rows = await getSheetData(SHEET);
    } catch {
      return NextResponse.json({ data: [] }); // sheet belum ada
    }

    let data = rows
      .filter(r => r[C.ID])
      .map(r => ({
        id:            String(r[C.ID] || ''),
        namaInstitusi: String(r[C.NAMA] || ''),
        jenis:         String(r[C.JENIS] || ''),
        judul:         String(r[C.JUDUL] || ''),
        tglBerlaku:    String(r[C.TGL_BERLAKU] || ''),
        tglBerakhir:   String(r[C.TGL_BERAKHIR] || ''),
        fileId:        String(r[C.FILE_ID] || ''),
        fileUrl:       String(r[C.FILE_URL] || ''),
        namaFile:      String(r[C.NAMA_FILE] || ''),
        namaPIC:       String(r[C.PIC] || ''),
        emailPIC:      String(r[C.EMAIL] || ''),
        waPIC:         String(r[C.WA] || ''),
        catatan:       String(r[C.CATATAN] || ''),
        diarsipkanOleh: String(r[C.OLEH] || ''),
        tglDiarsipkan: String(r[C.TGL_ARSIP] || ''),
      }))
      .reverse(); // terbaru di atas

    if (jenis) data = data.filter(d => d.jenis === jenis);
    if (cari) {
      data = data.filter(d =>
        d.namaInstitusi.toLowerCase().includes(cari) ||
        d.judul.toLowerCase().includes(cari) ||
        d.namaPIC.toLowerCase().includes(cari)
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: tambah arsip baru ─────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      namaInstitusi, jenis, judul, tglBerlaku, tglBerakhir,
      namaPIC, emailPIC, waPIC, catatan, diarsipkanOleh,
      fileBase64, fileName, fileMime,
    } = body;

    if (!namaInstitusi?.trim()) return NextResponse.json({ message: 'Nama institusi wajib diisi.' }, { status: 400 });
    if (!jenis || !['MOU', 'PKS'].includes(jenis)) return NextResponse.json({ message: 'Jenis wajib dipilih.' }, { status: 400 });
    if (!judul?.trim()) return NextResponse.json({ message: 'Judul wajib diisi.' }, { status: 400 });
    if (!tglBerlaku) return NextResponse.json({ message: 'Tanggal berlaku wajib diisi.' }, { status: 400 });
    if (!tglBerakhir) return NextResponse.json({ message: 'Tanggal berakhir wajib diisi.' }, { status: 400 });
    if (!namaPIC?.trim()) return NextResponse.json({ message: 'Nama PIC wajib diisi.' }, { status: 400 });
    if (!emailPIC?.trim() && !waPIC?.trim()) return NextResponse.json({ message: 'Email atau No. WA PIC wajib diisi.' }, { status: 400 });
    if (!fileBase64 || !fileName || !fileMime) return NextResponse.json({ message: 'Berkas dokumen wajib diunggah.' }, { status: 400 });

    const uploaded = await uploadFileArsip({ namaFile: fileName, base64Data: fileBase64, mimeType: fileMime });
    if (!uploaded.success) {
      return NextResponse.json({ message: uploaded.message || 'Gagal mengunggah berkas.' }, { status: 400 });
    }

    const id = generateId('ARS');
    const now = formatTanggalWaktu(new Date());

    await appendRow(SHEET, [
      id,                          // 0
      namaInstitusi.trim(),        // 1
      jenis,                       // 2
      judul.trim(),                // 3
      tglBerlaku,                  // 4
      tglBerakhir,                 // 5
      uploaded.fileId,             // 6
      uploaded.fileUrl,            // 7
      uploaded.namaFile,           // 8
      namaPIC.trim(),              // 9
      emailPIC?.trim() || '',      // 10
      waPIC?.trim() || '',         // 11
      catatan?.trim() || '',       // 12
      diarsipkanOleh || '',        // 13
      now,                         // 14
    ]);

    return NextResponse.json({
      message: 'Dokumen berhasil diarsipkan.',
      data: {
        id, namaInstitusi: namaInstitusi.trim(), jenis, judul: judul.trim(),
        tglBerlaku, tglBerakhir, fileId: uploaded.fileId, fileUrl: uploaded.fileUrl,
        namaFile: uploaded.namaFile, namaPIC: namaPIC.trim(),
        emailPIC: emailPIC?.trim() || '', waPIC: waPIC?.trim() || '',
        catatan: catatan?.trim() || '', diarsipkanOleh: diarsipkanOleh || '', tglDiarsipkan: now,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}