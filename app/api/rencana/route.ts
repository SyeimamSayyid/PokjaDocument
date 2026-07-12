import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, findRow, updateCell, deleteRow } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const SHEET = 'Kegiatan Eplanning';

// Kolom (0-based). BIAYA (9) sengaja TIDAK dipakai lagi (dead column — demi
// kompatibilitas data lama, urutan kolom tidak digeser). Dua kolom baru
// (Tanggal Ditetapkan & Berakhir MOU/PKS) ditaruh di akhir (17, 18).
const COL = {
  ID:0, KATEGORI:1, DIVISI:2, JUDUL:3, DESKRIPSI:4, JENIS:5,
  TARGET:6, TERISI:7, WILAYAH:8, BIAYA:9, TGL_MULAI:10, TGL_TARGET:11,
  STATUS:12, TAMPIL_PUBLIK:13, DIBUAT_OLEH:14, TGL_DIBUAT:15, CATATAN:16,
  TGL_DITETAPKAN:17, TGL_BERAKHIR_MOU:18,
};

const DIVISI_VALID = ['pencegahan', 'pemberantasan', 'rehabilitasi', 'pemberdayaan'];
const KATEGORI_TETAP = 'kerja-sama-kelembagaan'; // Penegak Hukum dihapus dari modul ini

function parseDivisi(raw: string): string[] {
  return String(raw || '').split(',').map(s => s.trim()).filter(Boolean);
}

// ── GET: List kegiatan (filter divisi opsional) ────────────
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const divisi = searchParams.get('divisi');
    const id     = searchParams.get('id');

    const rows = await getSheetData(SHEET);

    let data = rows.filter(r => r[COL.ID]).map(r => ({
      id:             String(r[COL.ID]),
      kategori:       String(r[COL.KATEGORI] || KATEGORI_TETAP),
      divisi:         parseDivisi(String(r[COL.DIVISI] || '')),
      judul:          String(r[COL.JUDUL]),
      deskripsi:      String(r[COL.DESKRIPSI]),
      jenis:          String(r[COL.JENIS]),
      target:         parseInt(String(r[COL.TARGET] || '0')) || 0,
      terisi:         parseInt(String(r[COL.TERISI] || '0')) || 0,
      wilayah:        String(r[COL.WILAYAH] || ''),
      tglMulai:       String(r[COL.TGL_MULAI] || ''),
      tglTarget:      String(r[COL.TGL_TARGET] || ''),
      status:         String(r[COL.STATUS] || 'Rencana'),
      tampilPublik:   String(r[COL.TAMPIL_PUBLIK] || 'Tidak') === 'Ya',
      dibuatOleh:     String(r[COL.DIBUAT_OLEH] || ''),
      tglDibuat:      String(r[COL.TGL_DIBUAT] || ''),
      catatan:        String(r[COL.CATATAN] || ''),
      tglDitetapkan:  String(r[COL.TGL_DITETAPKAN] || ''),
      tglBerakhirMou: String(r[COL.TGL_BERAKHIR_MOU] || ''),
      sisaKuota:      (parseInt(String(r[COL.TARGET]||'0'))||0) - (parseInt(String(r[COL.TERISI]||'0'))||0),
    })).reverse();

    if (id)     data = data.filter(d => d.id === id);
    if (divisi) data = data.filter(d => d.divisi.includes(divisi));

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: Buat kegiatan baru ────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const b = await req.json();
    const {
      divisi, judul, deskripsi, jenis, target, wilayah,
      tglMulai, tglTarget, tglDitetapkan, tglBerakhirMou,
      tampilPublik, dibuatOleh,
    } = b;

    const divisiArr: string[] = Array.isArray(divisi) ? divisi : [];
    if (divisiArr.length === 0) {
      return NextResponse.json({ message: 'Pilih minimal 1 divisi.' }, { status: 400 });
    }
    if (divisiArr.length > 4) {
      return NextResponse.json({ message: 'Maksimal 4 divisi.' }, { status: 400 });
    }
    if (divisiArr.some(d => !DIVISI_VALID.includes(d))) {
      return NextResponse.json({ message: 'Ada divisi yang tidak valid.' }, { status: 400 });
    }
    if (!judul?.trim()) {
      return NextResponse.json({ message: 'Judul kegiatan wajib diisi.' }, { status: 400 });
    }
    if (!['MOU','PKS'].includes(jenis)) {
      return NextResponse.json({ message: 'Jenis dokumen (MOU/PKS) wajib.' }, { status: 400 });
    }

    const id = generateId('KGT');
    await appendRow(SHEET, [
      id, KATEGORI_TETAP, divisiArr.join(','), judul.trim(), deskripsi || '',
      jenis, String(target || 0), '0',           // kuota terisi mulai 0
      wilayah || '', '',                          // BIAYA dikosongkan (kolom mati)
      tglMulai || '', tglTarget || '',
      'Rencana', tampilPublik ? 'Ya' : 'Tidak',
      dibuatOleh || 'Admin', formatTanggalWaktu(new Date()), '',
      tglDitetapkan || '', tglBerakhirMou || '',
    ]);

    return NextResponse.json({ message: 'Kegiatan berhasil dibuat.', id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: Update kegiatan / status / kuota ────────────────
export async function PATCH(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { id, fields } = await req.json();
    if (!id || !fields) return NextResponse.json({ message: 'ID & fields wajib.' }, { status: 400 });

    const found = await findRow(SHEET, COL.ID, id);
    if (!found) return NextResponse.json({ message: 'Kegiatan tidak ditemukan.' }, { status: 404 });

    const map: Record<string, number> = {
      judul:          COL.JUDUL + 1,
      deskripsi:      COL.DESKRIPSI + 1,
      jenis:          COL.JENIS + 1,
      target:         COL.TARGET + 1,
      terisi:         COL.TERISI + 1,
      wilayah:        COL.WILAYAH + 1,
      tglMulai:       COL.TGL_MULAI + 1,
      tglTarget:      COL.TGL_TARGET + 1,
      status:         COL.STATUS + 1,
      tampilPublik:   COL.TAMPIL_PUBLIK + 1,
      catatan:        COL.CATATAN + 1,
      divisi:         COL.DIVISI + 1,
      tglDitetapkan:  COL.TGL_DITETAPKAN + 1,
      tglBerakhirMou: COL.TGL_BERAKHIR_MOU + 1,
    };

    for (const [key, val] of Object.entries(fields)) {
      const col = map[key];
      if (col) {
        let v = val;
        if (key === 'tampilPublik') v = val ? 'Ya' : 'Tidak';
        if (key === 'divisi' && Array.isArray(val)) v = val.join(',');
        await updateCell(SHEET, found.rowNumber, col, String(v));
      }
    }

    return NextResponse.json({ message: 'Kegiatan berhasil diperbarui.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── DELETE: Hapus kegiatan ──────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    const found = await findRow(SHEET, COL.ID, id);
    if (!found) return NextResponse.json({ message: 'Tidak ditemukan.' }, { status: 404 });
    await deleteRow(SHEET, found.rowNumber);
    return NextResponse.json({ message: 'Kegiatan berhasil dihapus.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}