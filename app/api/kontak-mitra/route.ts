import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

// Kolom Pengajuan Mitra (0-based): 2 Nama Institusi, 3 Jenis, 7 Email,
// 8 No.Wa, 9 Status, 11 Tgl Submit, 13 Jurusan, 17 Divisi, 18 Nama PIC
const P = { NAMA:2, JENIS:3, EMAIL:7, WA:8, STATUS:9, TGL:11, JURUSAN:13, DIVISI:17, PIC:18 };

const DIVISI_LABEL: Record<string, string> = {
  pencegahan:'Pencegahan', pemberantasan:'Pemberantasan',
  rehabilitasi:'Rehabilitasi', pemberdayaan:'Pemberdayaan',
};

export async function GET() {
  try {
    const rows = await getSheetData('Pengajuan Mitra');
    const data = rows
      .filter(r => r[P.NAMA])
      .map(r => ({
        namaInstitusi: String(r[P.NAMA] || ''),
        jenis:         String(r[P.JENIS] || ''),
        email:         String(r[P.EMAIL] || ''),
        noWa:          String(r[P.WA] || ''),
        status:        String(r[P.STATUS] || ''),
        tglSubmit:     String(r[P.TGL] || ''),
        jurusan:       String(r[P.JURUSAN] || ''),
        divisi:        String(r[P.DIVISI] || ''),
        divisiLabel:   DIVISI_LABEL[String(r[P.DIVISI] || '')] || '',
        namaPIC:       String(r[P.PIC] || ''),
      }))
      .reverse(); // terbaru di atas
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}