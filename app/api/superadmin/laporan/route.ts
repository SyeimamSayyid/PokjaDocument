import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipe  = (searchParams.get('tipe') || 'bulanan') as 'bulanan' | 'tahunan';
    const bulan = parseInt(searchParams.get('bulan') || '0'); // 1-12
    const tahun = parseInt(searchParams.get('tahun') || '0');

    if (!tahun || (tipe === 'bulanan' && !bulan)) {
      return NextResponse.json({ message: 'Parameter bulan dan tahun wajib diisi.' }, { status: 400 });
    }

    const [dokRows, mitraRows] = await Promise.all([
      getSheetData('Dokumen Kerja sama'),
      getSheetData('Mitra'),
    ]);

    const matchPeriod = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== tahun) return false;
      if (tipe === 'bulanan') return (d.getMonth() + 1) === bulan;
      return true; // tahunan = seluruh tahun
    };

    const dibuatPeriode = dokRows.filter(r => matchPeriod(String(r[5])));

    const mouBaru = dibuatPeriode.filter(r => String(r[1]).toUpperCase() === 'MOU').length;
    const pksBaru = dibuatPeriode.filter(r => String(r[1]).toUpperCase() === 'PKS').length;
    const aktif   = dibuatPeriode.filter(r => String(r[9]).toLowerCase() === 'aktif').length;

    const kedaluwarsaPeriode = dokRows.filter(
      r => matchPeriod(String(r[7])) && String(r[9]).toLowerCase() === 'kedaluwarsa'
    ).length;

    const mitraBaru = mitraRows.filter(r => matchPeriod(String(r[9]))).length;

    const listDokumen = dibuatPeriode.map(r => ({
      id: r[0], jenis: r[1], judul: r[2], mitra: r[4], tanggal: r[5], status: r[9],
    }));

    return NextResponse.json({
      tipe,
      periode: tipe === 'tahunan' ? `${tahun}` : `${bulan}/${tahun}`,
      ringkasan: { mouBaru, pksBaru, totalBaru: dibuatPeriode.length, aktif, kedaluwarsaPeriode, mitraBaru },
      listDokumen,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}