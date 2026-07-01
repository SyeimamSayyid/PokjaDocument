import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, updateCell } from '@/lib/sheet';

const SHEET = 'Pengajuan Mitra';
const COL_ID = 0;
const COL_DIVISI = 17; // kolom R (index 17) — sesuai header yang dirapikan

const DIVISI_VALID = ['pencegahan', 'pemberantasan', 'rehabilitasi', 'pemberdayaan'];

// ── PATCH: Assign / ubah divisi pengajuan ──────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { id, divisi } = await req.json();
    if (!id) return NextResponse.json({ message: 'ID pengajuan wajib.' }, { status: 400 });

    if (divisi && !DIVISI_VALID.includes(divisi)) {
      return NextResponse.json({ message: 'Divisi tidak valid.' }, { status: 400 });
    }

    const rows = await getSheetData(SHEET);
    const idx  = rows.findIndex(r => String(r[COL_ID]).trim() === id.trim());
    if (idx === -1) return NextResponse.json({ message: 'Pengajuan tidak ditemukan.' }, { status: 404 });

    const rowNumber = idx + 2;
    await updateCell(SHEET, rowNumber, COL_DIVISI + 1, divisi || ''); // kolom R = 18 (1-based)

    return NextResponse.json({ message: 'Divisi pengajuan diperbarui.', divisi: divisi || '' });
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
      divisi:       String(r[COL_DIVISI] || ''),
    })).reverse();

    if (divisiFilter === 'belum') data = data.filter(d => !d.divisi);
    else if (divisiFilter)        data = data.filter(d => d.divisi === divisiFilter);

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}