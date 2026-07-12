import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireSession } from '@/lib/auth';
import { getSheetData } from '@/lib/sheet';

const LOKASI_VALID = ['BNNP Sulsel', 'BNNK Palopo', 'BNNK Toraja', 'BNNK Bone', 'BNNK Sidrap'];

export async function POST(req: NextRequest) {
  const session = await requireSession(req, ['admin', 'superadmin']);
  if (!session) {
    return NextResponse.json({ message: 'Tidak diizinkan.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ message: 'File tidak ditemukan.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Cek NIP yang sudah ada di sheet Pegawai BNN, supaya preview kasih tahu mana yang bakal dilewati
    const existingRows = await getSheetData('Pegawai BNN');
    const existingNip = new Set(existingRows.map(r => String(r[0]).trim()).filter(Boolean));

    const hasil = rows
      .map((r, i) => {
        const nip = String(r['NIP/NRP Pegawai'] ?? r['NIP/NRP'] ?? r['NIP'] ?? '').trim();
        const lokasi = String(r['Lokasi BNN'] ?? r['Lokasi'] ?? '').trim();

        let error = '';
        if (!nip) error = 'NIP/NRP kosong';
        else if (!LOKASI_VALID.includes(lokasi)) error = `Lokasi tidak dikenali: "${lokasi}"`;
        else if (existingNip.has(nip)) error = 'NIP sudah terdaftar';

        return { baris: i + 2, nip, lokasi, valid: !error, error };
      })
      .filter(r => r.nip || r.lokasi); // buang baris yang benar-benar kosong

    return NextResponse.json({ data: hasil });
  } catch (err) {
    return NextResponse.json(
      { message: 'Gagal membaca file Excel. Pastikan format sesuai template.', error: String(err) },
      { status: 400 }
    );
  }
}