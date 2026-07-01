import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, findRow, updateCell, deleteRow } from '@/lib/sheet';
import { generateId, formatTanggalWaktu } from '@/lib/utils';

const SHEET = 'Kegiatan Eplanning';

// Kolom (0-based)
const COL = {
  ID:0, KATEGORI:1, DIVISI:2, JUDUL:3, DESKRIPSI:4, JENIS:5,
  TARGET:6, TERISI:7, WILAYAH:8, BIAYA:9, TGL_MULAI:10, TGL_TARGET:11,
  STATUS:12, TAMPIL_PUBLIK:13, DIBUAT_OLEH:14, TGL_DIBUAT:15, CATATAN:16,
};

const DIVISI_VALID: Record<string, string[]> = {
  'penegak-hukum':            ['bantuan-hukum', 'pendampingan-hukum'],
  'kerja-sama-kelembagaan':   ['pencegahan', 'pemberantasan', 'rehabilitasi', 'pemberdayaan'],
};

// ── GET: List kegiatan (filter kategori/divisi opsional) ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kategori = searchParams.get('kategori');
    const divisi   = searchParams.get('divisi');
    const id       = searchParams.get('id');

    const rows = await getSheetData(SHEET);

    let data = rows.filter(r => r[COL.ID]).map(r => ({
      id:           String(r[COL.ID]),
      kategori:     String(r[COL.KATEGORI]),
      divisi:       String(r[COL.DIVISI]),
      judul:        String(r[COL.JUDUL]),
      deskripsi:    String(r[COL.DESKRIPSI]),
      jenis:        String(r[COL.JENIS]),
      target:       parseInt(String(r[COL.TARGET] || '0')) || 0,
      terisi:       parseInt(String(r[COL.TERISI] || '0')) || 0,
      wilayah:      String(r[COL.WILAYAH] || ''),
      biaya:        String(r[COL.BIAYA] || ''),
      tglMulai:     String(r[COL.TGL_MULAI] || ''),
      tglTarget:    String(r[COL.TGL_TARGET] || ''),
      status:       String(r[COL.STATUS] || 'Rencana'),
      tampilPublik: String(r[COL.TAMPIL_PUBLIK] || 'Tidak') === 'Ya',
      dibuatOleh:   String(r[COL.DIBUAT_OLEH] || ''),
      tglDibuat:    String(r[COL.TGL_DIBUAT] || ''),
      catatan:      String(r[COL.CATATAN] || ''),
      sisaKuota:    (parseInt(String(r[COL.TARGET]||'0'))||0) - (parseInt(String(r[COL.TERISI]||'0'))||0),
    })).reverse();

    if (id)       data = data.filter(d => d.id === id);
    if (kategori) data = data.filter(d => d.kategori === kategori);
    if (divisi)   data = data.filter(d => d.divisi === divisi);

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: Buat kegiatan baru ──────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const {
      kategori, divisi, judul, deskripsi, jenis,
      target, wilayah, biaya, tglMulai, tglTarget,
      tampilPublik, dibuatOleh,
    } = b;

    // Validasi
    if (!kategori || !DIVISI_VALID[kategori]) {
      return NextResponse.json({ message: 'Kategori tidak valid.' }, { status: 400 });
    }
    if (!divisi || !DIVISI_VALID[kategori].includes(divisi)) {
      return NextResponse.json({ message: 'Divisi/layanan tidak sesuai kategori.' }, { status: 400 });
    }
    if (!judul?.trim()) {
      return NextResponse.json({ message: 'Judul kegiatan wajib diisi.' }, { status: 400 });
    }
    // Jenis & target wajib hanya untuk kerja sama kelembagaan
    if (kategori === 'kerja-sama-kelembagaan') {
      if (!['MOU','PKS'].includes(jenis)) {
        return NextResponse.json({ message: 'Jenis dokumen (MOU/PKS) wajib.' }, { status: 400 });
      }
    }

    const id = generateId('KGT');
    await appendRow(SHEET, [
      id, kategori, divisi, judul.trim(), deskripsi || '',
      jenis || '', String(target || 0), '0', // kuota terisi mulai 0
      wilayah || '', biaya || '', tglMulai || '', tglTarget || '',
      'Rencana', tampilPublik ? 'Ya' : 'Tidak',
      dibuatOleh || 'Admin', formatTanggalWaktu(new Date()), '',
    ]);

    return NextResponse.json({ message: 'Kegiatan berhasil dibuat.', id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: Update kegiatan / status / kuota ───────────────
export async function PATCH(req: NextRequest) {
  try {
    const { id, fields } = await req.json();
    if (!id || !fields) return NextResponse.json({ message: 'ID & fields wajib.' }, { status: 400 });

    const found = await findRow(SHEET, COL.ID, id);
    if (!found) return NextResponse.json({ message: 'Kegiatan tidak ditemukan.' }, { status: 404 });

    const map: Record<string, number> = {
      judul:        COL.JUDUL + 1,
      deskripsi:    COL.DESKRIPSI + 1,
      jenis:        COL.JENIS + 1,
      target:       COL.TARGET + 1,
      terisi:       COL.TERISI + 1,
      wilayah:      COL.WILAYAH + 1,
      biaya:        COL.BIAYA + 1,
      tglMulai:     COL.TGL_MULAI + 1,
      tglTarget:    COL.TGL_TARGET + 1,
      status:       COL.STATUS + 1,
      tampilPublik: COL.TAMPIL_PUBLIK + 1,
      catatan:      COL.CATATAN + 1,
    };

    for (const [key, val] of Object.entries(fields)) {
      const col = map[key];
      if (col) {
        let v = val;
        if (key === 'tampilPublik') v = val ? 'Ya' : 'Tidak';
        await updateCell(SHEET, found.rowNumber, col, String(v));
      }
    }

    return NextResponse.json({ message: 'Kegiatan berhasil diperbarui.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── DELETE: Hapus kegiatan ────────────────────────────────
export async function DELETE(req: NextRequest) {
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