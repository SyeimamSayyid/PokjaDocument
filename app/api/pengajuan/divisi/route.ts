import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateCell } from '@/lib/sheet';

const SHEET = 'Pengajuan Mitra';
const COL_ID = 0;
const COL_DIVISI = 17; // kolom R (index 17) — sesuai header yang dirapikan

const DIVISI_VALID = ['pencegahan', 'pemberantasan', 'rehabilitasi', 'pemberdayaan'];
const MAKS_DIVISI = 4;

function parseDivisi(raw: string): string[] {
  return String(raw || '').split(',').map(s => s.trim()).filter(Boolean);
}

// ── PATCH: Assign / ubah divisi pengajuan (mendukung multi, maks 4) ──
export async function PATCH(req: NextRequest) {
  try {
    const { id, divisi } = await req.json();
    if (!id) return NextResponse.json({ message: 'ID pengajuan wajib.' }, { status: 400 });

    // Terima array (baru) ATAU string tunggal (kompatibilitas lama)
    const divisiArr: string[] = Array.isArray(divisi)
      ? divisi.filter(Boolean)
      : (divisi ? [divisi] : []);

    if (divisiArr.length > MAKS_DIVISI) {
      return NextResponse.json({ message: `Maksimal ${MAKS_DIVISI} divisi.` }, { status: 400 });
    }
    if (divisiArr.some(d => !DIVISI_VALID.includes(d))) {
      return NextResponse.json({ message: 'Ada divisi yang tidak valid.' }, { status: 400 });
    }

    const rows = await getSheetData(SHEET);
    const idx  = rows.findIndex(r => String(r[COL_ID]).trim() === id.trim());
    if (idx === -1) return NextResponse.json({ message: 'Pengajuan tidak ditemukan.' }, { status: 404 });

    const rowNumber = idx + 2;
    const nilaiSimpan = divisiArr.join(',');
    await updateCell(SHEET, rowNumber, COL_DIVISI + 1, nilaiSimpan);

    return NextResponse.json({ message: 'Divisi pengajuan diperbarui.', divisi: divisiArr });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── GET: List pengajuan + divisi (filter admin) ────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const divisiFilter = searchParams.get('divisi');

    const rows = await getSheetData(SHEET);
    let data = rows.filter(r => r[COL_ID]).map(r => ({
      id:           String(r[COL_ID]),
      namaMitra:    String(r[2] || ''),
      jenis:        String(r[3] || ''),
      status:       String(r[9] || ''),
      kodeTracking: String(r[10] || ''),
      tglSubmit:    String(r[11] || ''),
      divisi:       parseDivisi(String(r[COL_DIVISI] || '')),
    })).reverse();

    if (divisiFilter === 'belum') data = data.filter(d => d.divisi.length === 0);
    else if (divisiFilter)        data = data.filter(d => d.divisi.includes(divisiFilter));

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}