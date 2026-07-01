import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipe  = (searchParams.get('tipe') || 'bulanan') as 'bulanan' | 'tahunan';
    const bulan = parseInt(searchParams.get('bulan') || '0');
    const tahun = parseInt(searchParams.get('tahun') || '0');

    if (!tahun || (tipe === 'bulanan' && !bulan)) {
      return NextResponse.json({ message: 'Parameter tidak lengkap.' }, { status: 400 });
    }

    const dokRows = await getSheetData('Dokumen Kerja sama');

    const filtered = dokRows.filter(r => {
      const d = new Date(String(r[5]));
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== tahun) return false;
      if (tipe === 'bulanan') return (d.getMonth() + 1) === bulan;
      return true;
    });

    const rows = filtered.map(r => ({
      'ID Dokumen': r[0],
      'Jenis': r[1],
      'Judul': r[2],
      'Mitra': r[4],
      'Tanggal Dibuat': r[5],
      'Tanggal Berlaku': r[6],
      'Tanggal Berakhir': r[7],
      'Durasi (Tahun)': r[8],
      'Status': r[9],
    }));

    // Sheet kosong tetap punya header
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{
      'ID Dokumen': '', 'Jenis': '', 'Judul': '', 'Mitra': '', 'Tanggal Dibuat': '',
      'Tanggal Berlaku': '', 'Tanggal Berakhir': '', 'Durasi (Tahun)': '', 'Status': '',
    }]);

    const wb = XLSX.utils.book_new();
    const sheetName = (tipe === 'tahunan' ? `Laporan ${tahun}` : `Laporan ${bulan}-${tahun}`).substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = tipe === 'tahunan'
      ? `Laporan_Tahunan_${tahun}.xlsx`
      : `Laporan_Bulanan_${bulan}-${tahun}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}