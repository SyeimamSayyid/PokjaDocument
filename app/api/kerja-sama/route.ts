import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, findRow, updateCell } from '@/lib/sheet';
import { requireSession } from '@/lib/auth';

// Kolom "Dokumen Kerja sama" (0-based)
const COL = {
  ID:0, JENIS:1, JUDUL:2, ID_MITRA:3, NAMA_MITRA:4, TGL_DIBUAT:5,
  TGL_BERLAKU:6, TGL_BERAKHIR:7, DURASI:8, STATUS:9, KODE:10,
  KODE_EXP:11, DOCS_ID:12, DOCS_URL:13, FOLDER_ID:14,
  DIBUAT_OLEH:15, CATATAN:16, TERAKHIR_DIAKSES:17, FOTO_FOLDER:18,
};

const STATUS_FILTER_MAP: Record<string, string[]> = {
  'draft':       ['Draft', 'Diajukan', 'Ditinjau'],
  'akan-mulai':  ['Disetujui'],
  'berlangsung': ['Dalam Proses', 'Kegiatan Berlangsung'],
  'selesai':     ['Kegiatan Selesai', 'Kedaluwarsa'],
};

const STATUS_LIST = [
  'Draft','Diajukan','Ditinjau','Disetujui',
  'Dalam Proses','Kegiatan Berlangsung','Kegiatan Selesai','Kedaluwarsa',
];

// ── GET: List dokumen dengan filter ───────────────────────
export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || '';
    const search = searchParams.get('search') || '';
    const mitra  = searchParams.get('mitra') || '';

    const rows = await getSheetData('Dokumen Kerja sama');

    let data = rows
      .filter(r => r[COL.ID])
      .map(r => ({
        id:           String(r[COL.ID]),
        jenis:        String(r[COL.JENIS]),
        judul:        String(r[COL.JUDUL]),
        idMitra:      String(r[COL.ID_MITRA]),
        namaMitra:    String(r[COL.NAMA_MITRA]),
        tglDibuat:    String(r[COL.TGL_DIBUAT]),
        tglBerlaku:   String(r[COL.TGL_BERLAKU]),
        tglBerakhir:  String(r[COL.TGL_BERAKHIR]),
        durasi:       String(r[COL.DURASI]),
        status:       String(r[COL.STATUS]),
        kode:         String(r[COL.KODE]),
        kodeExpire:   String(r[COL.KODE_EXP]),
        docsId:       String(r[COL.DOCS_ID] || ''),
        docsUrl:      String(r[COL.DOCS_URL] || ''),
        folderId:     String(r[COL.FOLDER_ID] || ''),
        dibuatOleh:   String(r[COL.DIBUAT_OLEH] || ''),
        catatan:      String(r[COL.CATATAN] || ''),
        fotoFolderId: String(r[COL.FOTO_FOLDER] || ''),
      }))
      .reverse();

    if (filter && STATUS_FILTER_MAP[filter]) {
      const statuses = STATUS_FILTER_MAP[filter];
      data = data.filter(d => statuses.includes(d.status));
    }

    if (mitra) {
      data = data.filter(d =>
        d.namaMitra.toLowerCase().includes(mitra.toLowerCase())
      );
    }

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(d =>
        d.judul.toLowerCase().includes(q) ||
        d.namaMitra.toLowerCase().includes(q) ||
        d.kode.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
      );
    }

    const allRows = rows.filter(r => r[COL.ID]).map(r => String(r[COL.STATUS]));
    const stats = {
      draft:       allRows.filter(s => STATUS_FILTER_MAP['draft'].includes(s)).length,
      'akan-mulai': allRows.filter(s => STATUS_FILTER_MAP['akan-mulai'].includes(s)).length,
      berlangsung: allRows.filter(s => STATUS_FILTER_MAP['berlangsung'].includes(s)).length,
      selesai:     allRows.filter(s => STATUS_FILTER_MAP['selesai'].includes(s)).length,
      total:       allRows.length,
    };

    return NextResponse.json({ data, stats, statusList: STATUS_LIST });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PATCH: Update status dokumen ──────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan. Silakan login.' }, { status: 401 });
  }

  try {
    const { id, status, catatan } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { message: 'ID dan status wajib diisi.' },
        { status: 400 }
      );
    }

    if (!STATUS_LIST.includes(status)) {
      return NextResponse.json(
        { message: `Status tidak valid. Pilihan: ${STATUS_LIST.join(', ')}` },
        { status: 400 }
      );
    }

    const found = await findRow('Dokumen Kerja sama', COL.ID, id);
    if (!found) {
      return NextResponse.json(
        { message: 'Dokumen tidak ditemukan.' },
        { status: 404 }
      );
    }

    await updateCell('Dokumen Kerja sama', found.rowNumber, COL.STATUS + 1, status);
    if (catatan) {
      await updateCell('Dokumen Kerja sama', found.rowNumber, COL.CATATAN + 1, catatan);
    }

    return NextResponse.json({ message: `Status berhasil diubah ke "${status}".` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}