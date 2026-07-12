import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';

function normNama(s: unknown): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const mitraRows = await getSheetData('Mitra');
    const dokRows   = await getSheetData('Dokumen Kerja sama');

    let rowsPengajuan: any[] = [];
    try { rowsPengajuan = await getSheetData('Pengajuan Mitra'); } catch { rowsPengajuan = []; }
    let rowsArsip: any[] = [];
    try { rowsArsip = await getSheetData('Arsip Dokumen'); } catch { rowsArsip = []; }

    const now = new Date();
    const ninetyDays = new Date(now.getTime() + 90*24*60*60*1000);
    const tahunIni = now.getFullYear();
    const bulanLabel = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

    const dokAktif  = dokRows.filter(r => String(r[9]).toLowerCase() === 'mou/pks berlaku');
    const dokDraft  = dokRows.filter(r => String(r[9]).toLowerCase() === 'draft');
    const dokReview = dokRows.filter(r => ['dalam proses','selesai','kegiatan akan berlangsung','kegiatan berlangsung','kegiatan selesai'].includes(String(r[9]).toLowerCase()));
    const dokExp    = dokRows.filter(r => String(r[9]).toLowerCase() === 'kedaluwarsa');
    const dokHampir  = dokRows.filter(r => {
      const tgl = new Date(r[7]);
      return tgl > now && tgl <= ninetyDays && String(r[9]).toLowerCase() === 'mou/pks berlaku';
    });

    const grafik = bulanLabel.map((label, i) => ({
      label,
      mou: dokRows.filter(r => { const d = new Date(r[5]); return d.getFullYear()===tahunIni && d.getMonth()===i && String(r[1]).toUpperCase()==='MOU'; }).length,
      pks: dokRows.filter(r => { const d = new Date(r[5]); return d.getFullYear()===tahunIni && d.getMonth()===i && String(r[1]).toUpperCase()==='PKS'; }).length,
      exp: dokRows.filter(r => { const d = new Date(r[7]); return d.getFullYear()===tahunIni && d.getMonth()===i && String(r[9]).toLowerCase()==='kedaluwarsa'; }).length,
    }));

    const mitraRowsValid = mitraRows.filter(r => r[0]);

    const mitraData = mitraRowsValid.map((r, i) => ({
      id:        String(r[0]),
      nama:      String(r[1]),
      singkatan: String(r[2] || r[1]).substring(0,2).toUpperCase(),
      jumlahDok: dokRows.filter(d => String(d[3]) === String(r[0])).length,
      index:     i,
    }));

    const namaSet = new Set<string>();
    mitraRowsValid.forEach(r => { if (r[1]) namaSet.add(normNama(r[1])); });
    rowsPengajuan.forEach(r => { if (r[2]) namaSet.add(normNama(r[2])); });
    rowsArsip.forEach(r => { if (r[1]) namaSet.add(normNama(r[1])); });
    dokRows.forEach(r => { if (r[4]) namaSet.add(normNama(r[4])); });
    const totalMitraGabungan = namaSet.size;

    return NextResponse.json({
      metrics: {
        totalMitra: totalMitraGabungan,
        dokAktif:   dokAktif.length,
        dokHampir:  dokHampir.length,
        dokDraft:   dokDraft.length,
        totalDok:   dokRows.length,
      },
      status: {
        aktif:       dokAktif.length,
        draft:       dokDraft.length,
        review:      dokReview.length,
        kedaluwarsa: dokExp.length,
      },
      grafik,
      mitraData,
    });

  } catch (err) {
    console.error('[SUPERADMIN API]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}