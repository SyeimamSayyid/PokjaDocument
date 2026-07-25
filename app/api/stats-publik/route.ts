import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

// Kolom Dokumen Kerja sama (sistem)
const DOK_COL = { ID: 0, JENIS: 1, NAMA_MITRA: 4 };
// Kolom Arsip Dokumen
const ARS_COL = { ID: 0, NAMA_INSTITUSI: 1, JENIS: 2 };
// Kolom Pengajuan Mitra (sumber Kontak Mitra)
const PJ_COL = { NAMA: 2 };

function normNama(s: unknown): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Statistik publik ringan untuk landing page — cuma hitungan, tidak ada data
// personal/sensitif. Digabung dari 3 sumber (Dokumen Kerja sama/sistem, Arsip
// Dokumen, dan Pengajuan Mitra/Kontak Mitra) biar angkanya mencerminkan
// SELURUH riwayat kerja sama, bukan cuma yang masih aktif di sistem saja.
export async function GET() {
  try {
    const [dokRows, arsipRows, pjRows] = await Promise.all([
      getSheetData('Dokumen Kerja sama').catch(() => []),
      getSheetData('Arsip Dokumen').catch(() => []),
      getSheetData('Pengajuan Mitra').catch(() => []),
    ]);

    let totalMOU = 0;
    let totalPKS = 0;
    const namaInstitusiSet = new Set<string>();

    dokRows.forEach(r => {
      if (!r[DOK_COL.ID]) return;
      const jenis = String(r[DOK_COL.JENIS] || '').toUpperCase();
      if (jenis === 'MOU') totalMOU++;
      else if (jenis === 'PKS') totalPKS++;
      const nama = normNama(r[DOK_COL.NAMA_MITRA]);
      if (nama) namaInstitusiSet.add(nama);
    });

    arsipRows.forEach(r => {
      if (!r[ARS_COL.ID]) return;
      const jenis = String(r[ARS_COL.JENIS] || '').toUpperCase();
      if (jenis === 'MOU') totalMOU++;
      else if (jenis === 'PKS') totalPKS++;
      const nama = normNama(r[ARS_COL.NAMA_INSTITUSI]);
      if (nama) namaInstitusiSet.add(nama);
    });

    pjRows.forEach(r => {
      const nama = normNama(r[PJ_COL.NAMA]);
      if (nama) namaInstitusiSet.add(nama);
    });

    return NextResponse.json({
      totalMitra: namaInstitusiSet.size,
      totalDokumen: totalMOU + totalPKS,
      totalMOU,
      totalPKS,
    });
  } catch (err) {
    return NextResponse.json({ totalMitra: 0, totalDokumen: 0, totalMOU: 0, totalPKS: 0 });
  }
}