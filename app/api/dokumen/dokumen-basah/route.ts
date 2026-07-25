import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateCell, findRow } from '@/lib/sheet';
import { formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const SHEET = 'Dokumen Kerja sama';

// Kolom yang dipakai di sini saja (0-based)
const COL = {
  ID: 0, JENIS: 1, JUDUL: 2, NAMA_MITRA: 4, STATUS: 9,
  TTD_TIPE: 24, TTD_TGL_DIAJUKAN: 25, TTD_STATUS: 26, TTD_TGL_FINAL: 27, TTD_CATATAN: 28,
  SCAN_TTD: 32,
};

interface DokumenBasahItem {
  id: string; jenis: string; judul: string; namaMitra: string; status: string;
  ttdStatus: string; ttdTglDiajukan: string; ttdTglFinal: string;
  scanTtdId: string; scanTtdUrl: string;
}

// ── GET: daftar semua dokumen bertipe TTD Basah — bisa diakses Admin
// BNNP/BNNK maupun Admin BNN Utama (transparansi lintas wilayah). ──
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });

  try {
    const rows = await getSheetData(SHEET);
    const data: DokumenBasahItem[] = rows
      .filter(r => r[COL.ID] && String(r[COL.TTD_TIPE] || '').trim() === 'basah')
      .map(r => ({
        id: String(r[COL.ID]),
        jenis: String(r[COL.JENIS]),
        judul: String(r[COL.JUDUL]),
        namaMitra: String(r[COL.NAMA_MITRA]),
        status: String(r[COL.STATUS] || ''),
        ttdStatus: String(r[COL.TTD_STATUS] || ''),
        ttdTglDiajukan: String(r[COL.TTD_TGL_DIAJUKAN] || ''),
        ttdTglFinal: String(r[COL.TTD_TGL_FINAL] || ''),
        scanTtdId: String(r[COL.SCAN_TTD] || ''),
        scanTtdUrl: r[COL.SCAN_TTD] ? `https://drive.google.com/file/d/${String(r[COL.SCAN_TTD])}/view` : '',
      }))
      .sort((a, b) => {
        // Urutkan: yang MENUNGGU dulu (perlu tindakan), baru yang sudah Disetujui
        const prioritas = (s: string) => s === 'Menunggu Basah' ? 0 : 1;
        return prioritas(a.ttdStatus) - prioritas(b.ttdStatus);
      });

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: hapus scan yang salah upload (tanpa arsip) — sama seperti action
// 'hapusScan' di /api/dokumen/[id], disediakan juga di sini biar halaman
// Dokumen Basah tidak perlu bolak-balik ke halaman detail. ──
export async function PATCH(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });

  const s = session as Record<string, unknown>;
  // Cuma Admin BNNP/BNNK yang bisa hapus scan (BNN Utama cuma lihat, sama
  // pola seperti fitur Kelola Admin) — kalau BNN Utama juga perlu hapus,
  // tinggal hapus blokir ini.
  if (String(s.level || '') === 'utama') {
    return NextResponse.json({ message: 'Admin BNN Utama tidak dapat menghapus scan — hubungi Admin BNNP/BNNK terkait.' }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: 'ID dokumen wajib diisi.' }, { status: 400 });

    const found = await findRow(SHEET, COL.ID, id);
    if (!found) return NextResponse.json({ message: 'Dokumen tidak ditemukan.' }, { status: 404 });

    await updateCell(SHEET, found.rowNumber, COL.SCAN_TTD + 1, '');

    return NextResponse.json({ message: 'Scan berhasil dihapus (bukan diarsipkan — file salah upload langsung dibuang).' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}