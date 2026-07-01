import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, findRow } from '@/lib/sheet';

// Kolom Sheet "Pengajuan Mitra" (0-based):
const PCOL = {
  ID: 0, ID_MITRA: 1, NAMA_MITRA: 2, JENIS: 3, ARAH: 4, PERIHAL: 5,
  TGL: 6, STATUS: 7, ALASAN: 8, KODE_TRACKING: 9, ID_DOKUMEN: 10, DICATAT_OLEH: 11,
};

// Kolom Sheet "Dokumen Kerja sama" (0-based) — hanya yang dibutuhkan:
const DCOL = { ID: 0, KODE_AKSES: 10, KODE_EXPIRE: 11 };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kode = searchParams.get('kode')?.trim().toUpperCase();

    if (!kode) {
      return NextResponse.json({ message: 'Kode tracking wajib diisi.' }, { status: 400 });
    }

    const rows = await getSheetData('Pengajuan Mitra');
    const row  = rows.find(r => String(r[PCOL.KODE_TRACKING]).trim().toUpperCase() === kode);

    if (!row) {
      return NextResponse.json({ ditemukan: false, message: 'Kode tracking tidak ditemukan.' });
    }

    const status = String(row[PCOL.STATUS]).trim();

    const result: Record<string, unknown> = {
      ditemukan: true,
      namaMitra: row[PCOL.NAMA_MITRA],
      jenis:     row[PCOL.JENIS],
      perihal:   row[PCOL.PERIHAL],
      tanggal:   row[PCOL.TGL],
      status,
    };

    if (status === 'Ditolak') {
      result.alasan = row[PCOL.ALASAN] || '-';
    }

    if (status === 'Diterima') {
      const idDokumen = String(row[PCOL.ID_DOKUMEN] || '');
      if (idDokumen) {
        const dok = await findRow('Dokumen Kerja sama', DCOL.ID, idDokumen);
        if (dok) {
          result.kodeAksesDraft = dok.data[DCOL.KODE_AKSES];
          result.kodeExpire     = dok.data[DCOL.KODE_EXPIRE];
        }
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}