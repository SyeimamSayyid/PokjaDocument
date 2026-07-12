import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheet';
import { formatTanggalWaktu } from '@/lib/utils';
import { requireSession } from '@/lib/auth';

const LOKASI_VALID = ['BNNP Sulsel', 'BNNK Palopo', 'BNNK Toraja', 'BNNK Bone', 'BNNK Sidrap'];

export async function GET(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan.' }, { status: 401 });
  }

  const rows = await getSheetData('Pegawai BNN');
  const data = rows
    .filter(r => r[0])
    .map(r => ({
      nip: String(r[0] || ''),
      lokasi: String(r[1] || ''),
      status: String(r[2] || ''),
      tglDibuat: String(r[3] || ''),
      terakhirLogin: String(r[4] || ''),
    }));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const list: { nip: string; lokasi: string }[] = body.data || [];
    if (!Array.isArray(list) || list.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data untuk disimpan.' }, { status: 400 });
    }

    const existingRows = await getSheetData('Pegawai BNN');
    const existingNip = new Set(existingRows.map(r => String(r[0]).trim()).filter(Boolean));

    let berhasil = 0, dilewati = 0;
    const detail: { nip: string; status: string }[] = [];

    for (const item of list) {
      const nip = String(item.nip || '').trim();
      const lokasi = String(item.lokasi || '').trim();

      // Validasi ulang di server — jangan percaya validasi yang sudah dilakukan di preview client.
      if (!nip || !LOKASI_VALID.includes(lokasi) || existingNip.has(nip)) {
        dilewati++;
        detail.push({ nip, status: 'dilewati' });
        continue;
      }

      await appendRow('Pegawai BNN', [nip, lokasi, 'Aktif', formatTanggalWaktu(new Date()), '']);
      existingNip.add(nip); // cegah duplikat di dalam batch yang sama
      berhasil++;
      detail.push({ nip, status: 'berhasil' });
    }

    return NextResponse.json({
      message: `${berhasil} akun berhasil dibuat${dilewati > 0 ? `, ${dilewati} dilewati (duplikat/tidak valid).` : '.'}`,
      berhasil, dilewati, detail,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}