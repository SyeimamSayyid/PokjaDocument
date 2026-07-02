import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

// Statistik publik ringan untuk landing page — cuma hitungan, tidak ada data personal/sensitif
export async function GET() {
  try {
    let totalMitra = 0;
    let totalMOU = 0;
    let totalPKS = 0;

    try {
      const mitraRows = await getSheetData('Mitra');
      totalMitra = mitraRows.filter(r => r[0]).length;
    } catch {}

    try {
      const dokRows = await getSheetData('Dokumen Kerja sama');
      dokRows.forEach(r => {
        if (!r[0]) return;
        const jenis = String(r[1] || '');
        if (jenis === 'MOU') totalMOU++;
        else if (jenis === 'PKS') totalPKS++;
      });
    } catch {}

    return NextResponse.json({
      totalMitra,
      totalDokumen: totalMOU + totalPKS,
      totalMOU,
      totalPKS,
    });
  } catch (err) {
    return NextResponse.json({ totalMitra: 0, totalDokumen: 0, totalMOU: 0, totalPKS: 0 });
  }
}