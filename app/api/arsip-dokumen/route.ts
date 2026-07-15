import { NextRequest, NextResponse } from 'next/server';
import { appendRow, getSheetData, updateCell } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { google } from 'googleapis';

const SHEET = 'Arsip Dokumen';

// Kolom Arsip Dokumen (0-based, 17 kolom)
const C = {
  ID: 0, NAMA: 1, JENIS: 2, JUDUL: 3, TGL_BERLAKU: 4, TGL_BERAKHIR: 5,
  FILE_ID: 6, FILE_URL: 7, NAMA_FILE: 8, PIC: 9, EMAIL: 10, WA: 11,
  CATATAN: 12, OLEH: 13, TGL_ARSIP: 14, STATUS_KS: 15, DIVISI: 16,
};

// Kolom Dokumen Kerja sama (0-based) — yang dipakai di sini saja
const DOK_COL = {
  ID: 0, JENIS: 1, JUDUL: 2, ID_MITRA: 3, NAMA_MITRA: 4,
  TGL_BERLAKU: 6, TGL_BERAKHIR: 7, STATUS: 9, DOCS_URL: 13, DIBUAT_OLEH: 15,
  DIVISI: 23,
  TTD_TIPE: 24, TTD_STATUS: 26, TTD_TGL_FINAL: 27,
};
const PJ_COL = { ID_MITRA: 1, NAMA: 2, EMAIL: 7, WA: 8, PIC: 18 };

function normNama(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

interface ArsipItem {
  id: string; namaInstitusi: string; jenis: string; judul: string;
  tglBerlaku: string; tglBerakhir: string; fileId: string; fileUrl: string; namaFile: string;
  namaPIC: string; emailPIC: string; waPIC: string; catatan: string;
  diarsipkanOleh: string; tglDiarsipkan: string; statusKerjaSama: string;
  sumber: 'manual' | 'sistem';
  ttdTipe?: string; ttdTglFinal?: string; divisi?: string[];
}

// Resolve kontak PIC dari Pengajuan Mitra utk dokumen sistem (idMitra dulu, fallback nama)
async function resolveKontak(idMitra: string, namaInstitusi: string, pjRows: string[][]) {
  let matches = idMitra ? pjRows.filter(r => String(r[PJ_COL.ID_MITRA] || '').trim() === idMitra) : [];
  if (matches.length === 0 && namaInstitusi) {
    const target = normNama(namaInstitusi);
    matches = pjRows.filter(r => normNama(String(r[PJ_COL.NAMA] || '')) === target);
  }
  let namaPIC = '', email = '', waPIC = '';
  for (const r of matches) {
    const p = String(r[PJ_COL.PIC] || '').trim();
    const e = String(r[PJ_COL.EMAIL] || '').trim();
    const w = String(r[PJ_COL.WA] || '').trim();
    if (p) namaPIC = p;
    if (e) email = e;
    if (w) waPIC = w;
  }
  return { namaPIC, email, waPIC };
}

// ── GET: daftar arsip GABUNGAN — manual (Arsip Dokumen) + sistem (Dokumen Kerja sama) ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jenis  = searchParams.get('jenis')?.trim();
    const cari   = searchParams.get('cari')?.trim().toLowerCase();
    const sumber = searchParams.get('sumber')?.trim(); // 'manual' | 'sistem' | kosong=semua

    // 1) Arsip manual (kerja sama lama, diinput admin)
    let dataManual: ArsipItem[] = [];
    try {
      const rows = await getSheetData(SHEET);
      dataManual = rows
        .filter(r => r[C.ID])
        .map(r => ({
          id:             String(r[C.ID] || ''),
          namaInstitusi:  String(r[C.NAMA] || ''),
          jenis:          String(r[C.JENIS] || ''),
          judul:          String(r[C.JUDUL] || ''),
          tglBerlaku:     String(r[C.TGL_BERLAKU] || ''),
          tglBerakhir:    String(r[C.TGL_BERAKHIR] || ''),
          fileId:         String(r[C.FILE_ID] || ''),
          fileUrl:        String(r[C.FILE_URL] || ''),
          namaFile:       String(r[C.NAMA_FILE] || ''),
          namaPIC:        String(r[C.PIC] || ''),
          emailPIC:       String(r[C.EMAIL] || ''),
          waPIC:          String(r[C.WA] || ''),
          catatan:        String(r[C.CATATAN] || ''),
          diarsipkanOleh: String(r[C.OLEH] || ''),
          tglDiarsipkan:  String(r[C.TGL_ARSIP] || ''),
          statusKerjaSama: String(r[C.STATUS_KS] || 'Sudah Berakhir'),
          sumber: 'manual' as const,
          divisi: String(r[C.DIVISI] || '').split(',').map(s => s.trim()).filter(Boolean),
        }));
    } catch { dataManual = []; }

    // 2) Dokumen sistem — SEMUA dokumen apa pun statusnya (Draft, Aktif, Selesai, dst)
    let dataSistem: ArsipItem[] = [];
    try {
      const dokRows = await getSheetData('Dokumen Kerja sama');
      let pjRows: string[][] = [];
      try { pjRows = await getSheetData('Pengajuan Mitra'); } catch { pjRows = []; }

      dataSistem = await Promise.all(
        dokRows.filter(r => r[DOK_COL.ID]).map(async r => {
          const idMitra = String(r[DOK_COL.ID_MITRA] || '').trim();
          const namaInstitusi = String(r[DOK_COL.NAMA_MITRA] || '').trim();
          const kontak = await resolveKontak(idMitra, namaInstitusi, pjRows);
          return {
            id:             String(r[DOK_COL.ID]),
            namaInstitusi,
            jenis:          String(r[DOK_COL.JENIS] || ''),
            judul:          String(r[DOK_COL.JUDUL] || ''),
            tglBerlaku:     String(r[DOK_COL.TGL_BERLAKU] || ''),
            tglBerakhir:    String(r[DOK_COL.TGL_BERAKHIR] || ''),
            fileId:         '',
            fileUrl:        String(r[DOK_COL.DOCS_URL] || ''),
            namaFile:       `${String(r[DOK_COL.JUDUL] || 'Dokumen')} (Google Docs)`,
            namaPIC:        kontak.namaPIC,
            emailPIC:       kontak.email,
            waPIC:          kontak.waPIC,
            catatan:        '',
            diarsipkanOleh: String(r[DOK_COL.DIBUAT_OLEH] || ''),
            tglDiarsipkan:  '',
            statusKerjaSama: String(r[DOK_COL.STATUS] || 'Draft'),
            sumber: 'sistem' as const,
            ttdTipe:        String(r[DOK_COL.TTD_TIPE] || ''),
            ttdTglFinal:    String(r[DOK_COL.TTD_STATUS] || '') === 'Disetujui' ? String(r[DOK_COL.TTD_TGL_FINAL] || '') : '',
            divisi:         String(r[DOK_COL.DIVISI] || '').split(',').map(s => s.trim()).filter(Boolean),
          };
        })
      );
    } catch { dataSistem = []; }

    let data = [...dataManual, ...dataSistem];

    if (sumber) data = data.filter(d => d.sumber === sumber);
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

// ── POST: tambah arsip manual baru ──────────────────────────
// Catatan: upload berkas ke Drive sekarang dilakukan LANGSUNG dari browser ke
// Apps Script (lihat arsip-page.tsx) — bukan lewat route ini lagi. Ini supaya
// file besar (sampai puluhan MB) tidak kena limit body request Vercel Serverless
// Function (~4.5MB, hard limit platform, tidak bisa dinaikkan lewat kode).
// Route ini cuma terima metadata + hasil upload (fileId/fileUrl/namaFile) yang
// sudah jadi, lalu simpan barisnya ke sheet.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      namaInstitusi, jenis, judul, tglBerlaku, tglBerakhir,
      namaPIC, emailPIC, waPIC, catatan, diarsipkanOleh, statusKerjaSama, divisi,
      fileId, fileUrl, namaFile,
    } = body;

    if (!namaInstitusi?.trim()) return NextResponse.json({ message: 'Nama institusi wajib diisi.' }, { status: 400 });
    if (!jenis || !['MOU', 'PKS'].includes(jenis)) return NextResponse.json({ message: 'Jenis wajib dipilih.' }, { status: 400 });
    if (!judul?.trim()) return NextResponse.json({ message: 'Judul wajib diisi.' }, { status: 400 });
    if (!tglBerlaku) return NextResponse.json({ message: 'Tanggal berlaku wajib diisi.' }, { status: 400 });
    if (!tglBerakhir) return NextResponse.json({ message: 'Tanggal berakhir wajib diisi.' }, { status: 400 });
    if (!namaPIC?.trim()) return NextResponse.json({ message: 'Nama PIC wajib diisi.' }, { status: 400 });
    if (!emailPIC?.trim() && !waPIC?.trim()) return NextResponse.json({ message: 'Email atau No. WA PIC wajib diisi.' }, { status: 400 });
    if (!['Masih Berlaku', 'Sudah Berakhir'].includes(statusKerjaSama)) {
      return NextResponse.json({ message: 'Status kerja sama wajib dipilih.' }, { status: 400 });
    }
    if (!fileId || !fileUrl || !namaFile) {
      return NextResponse.json({ message: 'Berkas dokumen wajib diunggah terlebih dahulu.' }, { status: 400 });
    }

    const id = generateId('ARS');
    const now = formatTanggalWaktu(new Date());
    const divisiArr: string[] = Array.isArray(divisi) ? divisi.filter(Boolean) : [];
    const divisiStr = divisiArr.join(',');

    await appendRow(SHEET, [
      id, namaInstitusi.trim(), jenis, judul.trim(), tglBerlaku, tglBerakhir,
      fileId, fileUrl, namaFile,
      namaPIC.trim(), emailPIC?.trim() || '', waPIC?.trim() || '',
      catatan?.trim() || '', diarsipkanOleh || '', now, statusKerjaSama, divisiStr,
    ]);

    return NextResponse.json({
      message: 'Dokumen berhasil diarsipkan.',
      data: {
        id, namaInstitusi: namaInstitusi.trim(), jenis, judul: judul.trim(),
        tglBerlaku, tglBerakhir, fileId, fileUrl, namaFile,
        namaPIC: namaPIC.trim(),
        emailPIC: emailPIC?.trim() || '', waPIC: waPIC?.trim() || '',
        catatan: catatan?.trim() || '', diarsipkanOleh: diarsipkanOleh || '',
        tglDiarsipkan: now, statusKerjaSama, sumber: 'manual', divisi: divisiArr,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: ubah status kerja sama (Masih Berlaku / Sudah Berakhir) ─────────
// Cuma berlaku utk entri MANUAL — entri sistem statusnya ikut status dokumen
// asli di "Dokumen Kerja sama", bukan field independen yang bisa diedit di sini.
export async function PATCH(req: NextRequest) {
  try {
    const { id, statusKerjaSama } = await req.json();
    if (!id) return NextResponse.json({ message: 'id wajib diisi.' }, { status: 400 });
    if (!['Masih Berlaku', 'Sudah Berakhir'].includes(statusKerjaSama)) {
      return NextResponse.json({ message: 'Status kerja sama tidak valid.' }, { status: 400 });
    }

    const rows = await getSheetData(SHEET);
    const idx = rows.findIndex(r => String(r[C.ID] || '').trim() === id);
    if (idx === -1) {
      return NextResponse.json({ message: 'Data arsip tidak ditemukan (mungkin ini entri sistem, statusnya ikut dokumen asli).' }, { status: 404 });
    }

    const rowNumber = idx + 2; // +2 karena header di baris 1, array 0-based
    await updateCell(SHEET, rowNumber, C.STATUS_KS + 1, statusKerjaSama);

    return NextResponse.json({ message: 'Status kerja sama berhasil diperbarui.', statusKerjaSama });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── DELETE: hapus arsip MANUAL berdasarkan ID ───────────────
// Hanya berlaku utk entri manual — entri sistem tidak bisa dihapus dari sini
// karena itu representasi live dari dokumen asli, bukan data milik sheet Arsip.
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ message: 'id wajib diisi.' }, { status: 400 });

    const rows = await getSheetData(SHEET);
    const idx = rows.findIndex(r => String(r[C.ID] || '').trim() === id);
    if (idx === -1) return NextResponse.json({ message: 'Data arsip tidak ditemukan (mungkin ini entri sistem, bukan arsip manual).' }, { status: 404 });

    const rowNumber = idx + 2;

    const auth   = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      fields: 'sheets.properties',
    });
    const sheetProps = meta.data.sheets?.find(s => s.properties?.title === SHEET)?.properties;
    if (!sheetProps?.sheetId && sheetProps?.sheetId !== 0) {
      return NextResponse.json({ message: 'Sheet Arsip Dokumen tidak ditemukan.' }, { status: 404 });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId: sheetProps.sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber },
          },
        }],
      },
    });

    return NextResponse.json({ message: 'Arsip berhasil dihapus.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}