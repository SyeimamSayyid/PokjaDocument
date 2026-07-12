import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheet';

const PEGAWAI_COL = { NIP: 0, LOKASI: 1, STATUS: 2 };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nip = String(searchParams.get('nip') || '').trim();

    if (!nip) {
      return NextResponse.json({ message: 'NIP/NRP wajib diisi.' }, { status: 400 });
    }

    const rows = await getSheetData('Pegawai BNN');
    const row = rows.find(r => String(r[PEGAWAI_COL.NIP]).trim() === nip);

    if (!row) {
      return NextResponse.json({ ditemukan: false });
    }

    return NextResponse.json({
      ditemukan: true,
      nip: row[PEGAWAI_COL.NIP],
      lokasi: row[PEGAWAI_COL.LOKASI] || '',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}