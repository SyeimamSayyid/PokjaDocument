import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

const SHEET = 'Kegiatan Eplanning';

const COL = {
  ID:0, KATEGORI:1, DIVISI:2, JUDUL:3, DESKRIPSI:4, JENIS:5,
  TARGET:6, TERISI:7, WILAYAH:8, BIAYA:9, TGL_MULAI:10, TGL_TARGET:11,
  STATUS:12, TAMPIL_PUBLIK:13, DIBUAT_OLEH:14, TGL_DIBUAT:15, CATATAN:16,
  TGL_DITETAPKAN:17, TGL_BERAKHIR_MOU:18,
};

const DIVISI_LABEL: Record<string, string> = {
  'pencegahan':'Pencegahan', 'pemberantasan':'Pemberantasan',
  'rehabilitasi':'Rehabilitasi', 'pemberdayaan':'Pemberdayaan',
};

function parseDivisi(raw: string): string[] {
  return String(raw || '').split(',').map(s => s.trim()).filter(Boolean);
}

// ── GET publik: detail satu kegiatan (untuk halaman daftar) ──
// Hanya mengembalikan kegiatan yang tampilPublik = Ya
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const rows = await getSheetData(SHEET);

    const mapKegiatan = (r: any[]) => {
      const target = parseInt(String(r[COL.TARGET]||'0'))||0;
      const terisi = parseInt(String(r[COL.TERISI]||'0'))||0;
      const divisiArr = parseDivisi(String(r[COL.DIVISI]||''));
      return {
        id:              String(r[COL.ID]),
        kategori:        String(r[COL.KATEGORI]),
        divisi:          divisiArr,
        divisiLabel:     divisiArr.map(d => DIVISI_LABEL[d] || d),
        judul:           String(r[COL.JUDUL]),
        deskripsi:       String(r[COL.DESKRIPSI]),
        jenis:           String(r[COL.JENIS]),
        target, terisi,
        sisaKuota:       target - terisi,
        wilayah:         String(r[COL.WILAYAH]||''),
        biaya:           String(r[COL.BIAYA]||''),
        tglMulai:        String(r[COL.TGL_MULAI]||''),
        tglTarget:       String(r[COL.TGL_TARGET]||''),
        tglDitetapkan:   String(r[COL.TGL_DITETAPKAN]||''),
        tglBerakhirMou:  String(r[COL.TGL_BERAKHIR_MOU]||''),
        status:          String(r[COL.STATUS]),
        tampilPublik:    String(r[COL.TAMPIL_PUBLIK]) === 'Ya',
      };
    };

    // Detail satu kegiatan
    if (id) {
      const row = rows.find(r => String(r[COL.ID]).trim() === id.trim());
      if (!row) return NextResponse.json({ message: 'Kegiatan tidak ditemukan.' }, { status: 404 });
      const keg = mapKegiatan(row);
      if (!keg.tampilPublik) {
        return NextResponse.json({ message: 'Kegiatan ini tidak menerima pendaftaran.' }, { status: 403 });
      }
      return NextResponse.json({ data: keg });
    }

    // List semua kegiatan publik aktif (kerja sama kelembagaan)
    const data = rows
      .filter(r => r[COL.ID]
        && String(r[COL.KATEGORI]) === 'kerja-sama-kelembagaan'
        && String(r[COL.TAMPIL_PUBLIK]) === 'Ya'
        && !['Ditutup','Selesai'].includes(String(r[COL.STATUS])))
      .map(mapKegiatan);

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}