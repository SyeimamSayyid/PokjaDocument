import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

// Kolom Pengajuan Mitra (0-based): 2 Nama Institusi, 3 Jenis, 7 Email,
// 8 No.Wa, 9 Status, 11 Tgl Submit, 13 Jurusan, 17 Divisi, 18 Nama PIC
const P = { NAMA:2, JENIS:3, EMAIL:7, WA:8, STATUS:9, TGL:11, JURUSAN:13, DIVISI:17, PIC:18 };

// Kolom Arsip Dokumen (0-based): 1 Nama Institusi, 2 Jenis, 4 Tgl Berlaku,
// 9 Nama PIC, 10 Email PIC, 11 No WA PIC, 14 Tgl Diarsipkan
const A = { NAMA:1, JENIS:2, TGL_BERLAKU:4, PIC:9, EMAIL:10, WA:11, TGL_ARSIP:14 };

const DIVISI_LABEL: Record<string, string> = {
  pencegahan:'Pencegahan', pemberantasan:'Pemberantasan',
  rehabilitasi:'Rehabilitasi', pemberdayaan:'Pemberdayaan',
};

interface KontakItem {
  namaInstitusi: string;
  jenis: string;
  email: string;
  noWa: string;
  status: string;
  tglSubmit: string;
  jurusan: string;
  divisi: string;
  divisiLabel: string;
  namaPIC: string;
  sumber: 'pengajuan' | 'arsip';
}

export async function GET() {
  try {
    // ── Sumber 1: Pengajuan Mitra (alur normal via sistem) ──
    const rowsPengajuan = await getSheetData('Pengajuan Mitra');
    const dataPengajuan: KontakItem[] = rowsPengajuan
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
        sumber:        'pengajuan',
      }));

    // ── Sumber 2: Arsip Dokumen (kerja sama lama, diarsipkan manual admin) ──
    let dataArsip: KontakItem[] = [];
    try {
      const rowsArsip = await getSheetData('Arsip Dokumen');
      dataArsip = rowsArsip
        .filter(r => r[A.NAMA])
        .map(r => ({
          namaInstitusi: String(r[A.NAMA] || ''),
          jenis:         String(r[A.JENIS] || ''),
          email:         String(r[A.EMAIL] || ''),
          noWa:          String(r[A.WA] || ''),
          status:        'Diarsipkan',
          tglSubmit:     String(r[A.TGL_ARSIP] || r[A.TGL_BERLAKU] || ''),
          jurusan:       '',
          divisi:        '',
          divisiLabel:   '',
          namaPIC:       String(r[A.PIC] || ''),
          sumber:        'arsip',
        }));
    } catch {
      dataArsip = []; // sheet Arsip Dokumen belum ada — aman, tetap tampilkan Pengajuan Mitra saja
    }

    const data = [...dataPengajuan, ...dataArsip].reverse(); // terbaru di atas

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}