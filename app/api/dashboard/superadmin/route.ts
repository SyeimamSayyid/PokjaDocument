import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

export async function GET() {
  try {
    const [adminRows, mitraRows, dokRows] = await Promise.all([
      getSheetData('Admin'),
      getSheetData('Mitra'),
      getSheetData('Dokumen Kerja sama'),
    ]);

    const now = new Date();
    const ninetyDays = new Date(now.getTime() + 90*24*60*60*1000);
    const tahunIni = now.getFullYear();
    const bulanLabel = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

    // Metrics
    const adminAktif  = adminRows.filter(r => String(r[4]).toLowerCase().trim() === 'aktif');
    const dokAktif    = dokRows.filter(r => String(r[9]).toLowerCase() === 'aktif');
    const dokDraft    = dokRows.filter(r => String(r[9]).toLowerCase() === 'draft');
    const dokReview   = dokRows.filter(r => ['review','terkirim'].includes(String(r[9]).toLowerCase()));
    const dokExp      = dokRows.filter(r => String(r[9]).toLowerCase() === 'kedaluwarsa');
    const dokHampir   = dokRows.filter(r => {
      const tgl = new Date(r[7]);
      return tgl > now && tgl <= ninetyDays && String(r[9]).toLowerCase() === 'aktif';
    });

    // Grafik per bulan
    const grafik = bulanLabel.map((label, i) => ({
      label,
      mou: dokRows.filter(r => { const d = new Date(r[5]); return d.getFullYear()===tahunIni && d.getMonth()===i && String(r[1]).toUpperCase()==='MOU'; }).length,
      pks: dokRows.filter(r => { const d = new Date(r[5]); return d.getFullYear()===tahunIni && d.getMonth()===i && String(r[1]).toUpperCase()==='PKS'; }).length,
      exp: dokRows.filter(r => { const d = new Date(r[7]); return d.getFullYear()===tahunIni && d.getMonth()===i && String(r[9]).toLowerCase()==='kedaluwarsa'; }).length,
    }));

    // Admin list
    const adminData = adminRows.map(r => ({
      id:       String(r[0]),
      nama:     String(r[1]),
      status:   String(r[4]),
      jumlahDok: dokRows.filter(d => String(d[14]) === String(r[0]) || String(d[14]) === String(r[1])).length,
    }));

    // Mitra list
    const mitraData = mitraRows.map((r, i) => ({
      id:        String(r[0]),
      nama:      String(r[1]),
      singkatan: String(r[2] || r[1]).substring(0,2).toUpperCase(),
      jumlahDok: dokRows.filter(d => String(d[3]) === String(r[0])).length,
      index:     i,
    }));

    // Implementasi stats dari kolom Dokumen
    const totalAudiens   = dokRows.reduce((sum, r) => sum + (parseInt(String(r[15]||'0'))||0), 0);
    const totalKegiatan  = dokRows.filter(r => String(r[16]||'').trim() !== '').length;
    const totalFoto      = dokRows.reduce((sum, r) => sum + (parseInt(String(r[17]||'0'))||0), 0);

    return NextResponse.json({
      metrics: {
        adminAktif:   adminAktif.length,
        totalMitra:   mitraRows.length,
        dokAktif:     dokAktif.length,
        dokHampir:    dokHampir.length,
        dokDraft:     dokDraft.length,
        totalDok:     dokRows.length,
      },
      status: {
        aktif:       dokAktif.length,
        draft:       dokDraft.length,
        review:      dokReview.length,
        kedaluwarsa: dokExp.length,
      },
      grafik,
      adminData,
      mitraData,
      implementasi: { totalAudiens, totalKegiatan, totalFoto },
    });

  } catch (err) {
    console.error('[SUPERADMIN API]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}